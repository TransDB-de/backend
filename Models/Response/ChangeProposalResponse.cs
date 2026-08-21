using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;

namespace transdb_backend_net.Models.Response;

public class PublicChangeProposal
{
    public PublicChangeProposal() {}

    public PublicChangeProposal(EntryChangeProposal proposal)
    {
        this.Id = proposal.Id;
        this.EntryId = proposal.EntryId;
        this.UserId = proposal.UserId;
        this.Origin = proposal.Origin;
        this.Status = proposal.Status;
        this.Timestamp = proposal.Timestamp;
        this.Comment = proposal.ChangeProposal.Comment;
        this.SnowflakeId = proposal.SnowflakeId;
        this.EntryName = proposal.OriginalEntryState.Name;
    }

    [BsonId]
    public ObjectId Id { get; set; }

    public ObjectId EntryId { get; set; }

    public string? UserId { get; set; } = null;

    public string Comment { get; set; } = String.Empty;

    public string SnowflakeId { get; set; } = String.Empty;

    public DateTime? Timestamp { get; set; } = null;
    
    public EEntryChangeProposalStatus Status { get; set; } = EEntryChangeProposalStatus.Open;
    
    public EDataOrigin Origin { get; set; }
    
    public string EntryName { get; set; }
}

/// <summary>
/// A change proposal together with the entry's current state and the rebased changeset.
/// <see cref="RebasedProposal"/> is <see cref="EntryChangeProposal.ChangeProposal"/> rebased
/// against <see cref="CurrentEntry"/>, so it shows what applying this proposal right now would
/// look like. Once the proposal has been decided, use <c>Proposal.DecisionEntryStateBefore</c>
/// and <c>DecisionEntryStateAfter</c> instead (those were saved at decision time and stay
/// correct even as the entry keeps changing afterward)
/// </summary>
public class ChangeProposalDetailResponse(EntryChangeProposal proposal, Entry current, EditEntryRequest rebased)
{
    public EntryChangeProposal Proposal { get; set; } = proposal;
    public Entry CurrentEntry { get; set; } = current;
    public EditEntryRequest RebasedProposal { get; set; } = rebased;
}

public class ChangeProposalCreatedResponse(EntryChangeProposal proposal, string token)
{
    public string RevocationToken { get; } = token;
    public ObjectId ProposalId { get; } = proposal.Id;
}