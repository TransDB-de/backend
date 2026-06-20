using System.Security.Cryptography;
using System.Text;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Services;

namespace transdb_backend_net.Models.Database;

public class EntryRevocationToken
{
    [BsonId]
    public ObjectId Id { get; set; }

    public string Token { get; set; } = string.Empty;
    public ObjectId EntryId { get; set; }
    public string UserAgentHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    
    public EntryRevocationToken() {}

    public EntryRevocationToken(ObjectId entryId, string userAgent, DateTime expiresAt)
    {
        this.Token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        this.UserAgentHash = EntryRevocationService.HashUserAgent(userAgent);
        this.ExpiresAt = expiresAt;
        this.EntryId = entryId;
    }
    
    
}
