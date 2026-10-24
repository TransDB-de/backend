using System.Security.Cryptography;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Services;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Models.Database;


public enum EActionTokenPurpose
{
    EntryRevocation
}

public class ActionToken
{
    [BsonId]
    public ObjectId Id { get; set; }

    public string Token { get; set; } = string.Empty;
    public ObjectId TargetId { get; set; }
    public string UserAgentHash { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    
    public EActionTokenPurpose Purpose { get; set; }
    
    public ActionToken() {}

    public ActionToken(EActionTokenPurpose purpose, ObjectId targetId, string userAgent, DateTime expiresAt)
    {
        this.Token = TokenUtil.Generate(48);
        this.UserAgentHash = ActionTokenService.HashUserAgent(userAgent);
        this.ExpiresAt = expiresAt;
        this.TargetId = targetId;
        this.Purpose = purpose;
    }
}
