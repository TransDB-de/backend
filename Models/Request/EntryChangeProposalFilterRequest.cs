using MongoDB.Bson;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

/// <summary>Query parameters for listing change proposals, optionally filtered by status.</summary>
public class EntryChangeProposalFilterRequest
{
    public EEntryChangeProposalStatus? Status { get; set; }
    public int Page { get; set; } = 0;
    public ObjectId? EntryId { get; set; }
}
