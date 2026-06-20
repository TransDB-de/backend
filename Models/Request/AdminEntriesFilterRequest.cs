using MongoDB.Driver;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

public class AdminEntriesFilterRequest : EntriesFilterRequest
{
    public bool? Approved { get; set; }
    public bool? Blocked { get; set; }
    public bool? Archived { get; set; }

    protected override void AddExtraConditions(List<FilterDefinition<Entry>> conditions)
    {
        if (Approved.HasValue)
            conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Approved, Approved.Value));

        if (Blocked.HasValue)
            conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Blocked, Blocked.Value));

        if (Archived.HasValue)
            conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Archived, Archived.Value));
    }
}
