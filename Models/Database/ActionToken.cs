using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Services;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Models.Database;

public enum EActionTokenPurpose
{
    EntryRevocation,
    ChangeProposalRevocation
}

/// <summary>
/// Represents a single-use, time-limited token that authorizes one specific action.
/// Unlike a session/access/identity token,
/// an <see cref="ActionToken"/> is a capability token:
/// possession of the token itself grants permission to perform the associated
/// action, scoped to a single resource. It is not tied to a user account or login state.
/// </summary>
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
    
    public ActionToken(EActionTokenPurpose purpose, ObjectId target, string userAgent, DateTime expiresAt)
    {
        this.Purpose = purpose;
        this.Token = TokenUtil.Generate(32);
        this.UserAgentHash = ActionTokenService.HashUserAgent(userAgent);
        this.ExpiresAt = expiresAt;
        this.TargetId = target;
    }
}
