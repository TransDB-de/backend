using Microsoft.Extensions.Options;
using MongoDB.Bson;
using System.Security.Cryptography;
using System.Text;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Services;

public interface IActionTokenService
{
    /// <summary>Generates a secure single-use token and persists it.</summary>
    Task<string> GenerateTokenAsync(EActionTokenPurpose purpose, ObjectId targetId, string userAgent);

    /// <summary>Returns true if the token exists, maps to the given entry, and the user agent matches.</summary>
    Task<bool> ValidateTokenAsync(string token, EActionTokenPurpose purpose, ObjectId targetId, string userAgent);

    /// <summary>Removes the token from the database.</summary>
    Task InvalidateTokenAsync(string token);
}

public class ActionTokenService(IDatabaseService db, IOptions<EntryConfig> config) : IActionTokenService
{
    private readonly TimeSpan _tokenTtl = config.Value.RevocationTokenLifetime;
    
    public async Task<string> GenerateTokenAsync(EActionTokenPurpose purpose, ObjectId targetId, string userAgent)
    {
        var expires = DateTime.UtcNow.Add(_tokenTtl);
        var token = new ActionToken(purpose, targetId, userAgent, expires);
        await db.InsertRevocationTokenAsync(token);
        return token.Token;
    }
    
    /// <inheritdoc/>
    public async Task<bool> ValidateTokenAsync(string token, EActionTokenPurpose purpose, ObjectId targetId, string userAgent)
    {
        var revocationToken = await db.FindRevocationTokenAsync(token);

        if (revocationToken == null)
        {
            return false;
        }

        if (revocationToken.Purpose != purpose)
        {
            return false;
        }

        var uaHash = HashUserAgent(userAgent);
        
        if (revocationToken.UserAgentHash != uaHash)
        {
            return false;
        }

        return true;
    }

    /// <inheritdoc/>
    public Task InvalidateTokenAsync(string token) => db.DeleteRevocationTokenAsync(token);

    public static string HashUserAgent(string userAgent) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(userAgent))).ToLowerInvariant();
}
