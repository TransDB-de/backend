using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Models.Database;

public enum EEntryChangeProposalStatus
{
    Open = 0,
    Accepted = 1,
    Rejected = 2,
}

public enum EDataOrigin
{
    User = 0,
    Member = 1,
    Machine = 2
}

public class EntryChangeProposal
{
    public EntryChangeProposal() {}

    public EntryChangeProposal(Entry entry, EditEntryRequest changeProposal, EDataOrigin origin, string? userId)
    {
        this.EntryId = entry.Id;
        this.OriginalEntryState = new CreateEntryRequest(entry);
        this.ChangeProposal = changeProposal;
        this.Origin = origin;
        this.Timestamp = DateTime.UtcNow;
        this.UserId = userId;
    }
    
    [BsonId]
    public ObjectId Id { get; set; }
    
    public ObjectId EntryId { get; set; }
    
    public CreateEntryRequest OriginalEntryState { get; set; }

    public EditEntryRequest ChangeProposal { get; set; }
    
    public string? UserId { get; set; } = null;

    public DateTime? Timestamp { get; set; } = null;
    
    public EEntryChangeProposalStatus Status { get; set; } = EEntryChangeProposalStatus.Open;

    public EDataOrigin Origin { get; set; }

    /// <summary>
    /// What the entry's content looked like right before this proposal was decided (accepted or
    /// rejected). Saved at that moment, so it stays correct even if the entry changes later.
    /// Null while the proposal is still open. Only keeps the actual content fields, not things
    /// like Status or Location.
    /// </summary>
    public CreateEntryRequest? DecisionEntryStateBefore { get; set; } = null;

    /// <summary>
    /// What the rebased proposal turned into at decision time. For an accepted proposal, this is
    /// exactly what got written to the entry. For a rejected one, it's what would have been
    /// written if it had been accepted instead - it was computed but never actually applied.
    /// Saved at decision time so it stays correct even if the entry changes later.
    /// Null while the proposal is still open.
    /// </summary>
    public CreateEntryRequest? DecisionEntryStateAfter { get; set; } = null;
    
    private static readonly DateTime SnowflakeEpoch = new(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>Short id used for display in the frontend. Made from the timestamp, doesn't mean anything on its own.</summary>
    [BsonIgnore]
    public string SnowflakeId => Base36.Encode(TokenUtil.CustomTimestampFromEpoch(this.Timestamp ?? DateTime.UtcNow, SnowflakeEpoch));
}