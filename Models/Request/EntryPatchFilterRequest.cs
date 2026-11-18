using MongoDB.Bson;
using MongoDB.Driver;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

public enum EEntryPatchStatusFilter
{
    All,
    Open,
    Finished,
}

public class EntryPatchFilterRequest
{
    public ObjectId? EntryId { get; set; }
    
    public EEntryPatchStatusFilter? Status { get; set; }

    public int Page { get; set; } = 0;
    
    public FilterDefinition<EntryPatch> GetDatabaseFilters()
    {
        var filters = new List<FilterDefinition<EntryPatch>>();

        switch (this.Status)
        {
            case EEntryPatchStatusFilter.All:
            {
                break;
            }
            case EEntryPatchStatusFilter.Open:
            {
                filters.Add(Builders<EntryPatch>.Filter.Lte(p => p.Status, EEntryPatchStatus.Open));
                break;
            }
            case EEntryPatchStatusFilter.Finished:
            {
                filters.Add(Builders<EntryPatch>.Filter.Gt(p => p.Status, EEntryPatchStatus.Open));
                break;
            }
            default:
            {
                break;
            }
        }

        if (this.EntryId != null)
        {
            filters.Add(Builders<EntryPatch>.Filter.Eq(p => p.EntryId, this.EntryId));
        }
        
        return filters.Count == 0
            ? Builders<EntryPatch>.Filter.Empty
            : Builders<EntryPatch>.Filter.And(filters);
    }
}