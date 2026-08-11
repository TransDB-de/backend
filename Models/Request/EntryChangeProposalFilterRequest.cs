using MongoDB.Bson;
using MongoDB.Driver;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

/// <summary>Query parameters for listing change proposals, optionally filtered by status.</summary>
public class EntryChangeProposalFilterRequest
{
    public EEntryChangeProposalStatus? Status { get; set; }
    public int Page { get; set; } = 0;
    public ObjectId? EntryId { get; set; }

    public FilterDefinition<EntryChangeProposal> GetDatabaseFilters()
    {
        var filters = new List<FilterDefinition<EntryChangeProposal>>();

        if (this.Status != null)
        {
            filters.Add(Builders<EntryChangeProposal>.Filter.Eq(p => p.Status, this.Status.Value));
        }

        if (this.EntryId != null)
        {
            filters.Add(Builders<EntryChangeProposal>.Filter.Eq(p => p.EntryId, this.EntryId));
        }
        
        return Builders<EntryChangeProposal>.Filter.And(filters);
    }
}
