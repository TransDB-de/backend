using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Models.Request;

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
        this.OriginalEntryState = entry;
        this.ChangeProposal = changeProposal;
        this.Origin = origin;
        this.Timestamp =  DateTime.UtcNow;
        this.UserId = userId;
    }
    
    [BsonId]
    public ObjectId Id { get; set; }
    
    public ObjectId EntryId { get; set; }
    
    public Entry OriginalEntryState { get; set; }

    public EditEntryRequest ChangeProposal { get; set; }
    
    public string? UserId { get; set; } = null;

    public DateTime? Timestamp { get; set; } = null;
    
    public EEntryChangeProposalStatus Status { get; set; } = EEntryChangeProposalStatus.Open;
    
    public EDataOrigin Origin { get; set; }
}