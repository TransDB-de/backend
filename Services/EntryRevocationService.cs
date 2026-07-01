using Microsoft.Extensions.Options;
using MongoDB.Bson;
using System.Security.Cryptography;
using System.Text;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Services;

public interface IEntryRevocationService
{
    /// <summary>Generates a secure single-use token for the given entry and persists it.</summary>
    Task<string> GenerateTokenAsync(ObjectId entryId, string userAgent);

    /// <summary>Returns true if the token exists, maps to the given entry, and the user agent matches.</summary>
    Task<bool> ValidateTokenAsync(string token, ObjectId entryId, string userAgent);

    /// <summary>Removes the token from the database.</summary>
    Task InvalidateTokenAsync(string token);
}

public class EntryRevocationService(IDatabaseService db, IOptions<EntryConfig> config) : IEntryRevocationService
{
    private readonly TimeSpan _tokenTtl = config.Value.RevocationTokenLifetime;

    /// <inheritdoc/>
    public async Task<string> GenerateTokenAsync(ObjectId entryId, string userAgent)
    {
        var token = new EntryRevocationToken(entryId, userAgent,
            DateTime.UtcNow.Add(_tokenTtl));
        await db.InsertRevocationTokenAsync(token);
        return token.Token;
    }

    /// <inheritdoc/>
    public async Task<bool> ValidateTokenAsync(string token, ObjectId entryId, string userAgent)
    {
        var doc = await db.FindRevocationTokenAsync(token);
        return doc != null
            && doc.EntryId == entryId
            && doc.UserAgentHash == HashUserAgent(userAgent);
    }

    /// <inheritdoc/>
    public Task InvalidateTokenAsync(string token) => db.DeleteRevocationTokenAsync(token);

    public static string HashUserAgent(string userAgent) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(userAgent))).ToLowerInvariant();
}
