using System.ComponentModel.DataAnnotations;
using MongoDB.Driver;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Request;

public enum EEntryStatusFilter
{
    All,
    Approve,
    Blocked,
    Archived
}

public class AdminEntriesFilterRequest : EntriesFilterRequest
{
    [EnumDataType(typeof(EEntryStatusFilter), ErrorMessage = "invalid_value")]
    public EEntryStatusFilter? ViewFilter { get; set; }
    
    protected override void AddExtraConditions(List<FilterDefinition<Entry>> conditions)
    {
        switch (this.ViewFilter)
        {
            case EEntryStatusFilter.Approve:
            {
                conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Approved, false));
                conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Blocked, false));
                conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Archived, false));
                break;
            }
            case EEntryStatusFilter.Blocked:
            {
                conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Blocked, true));
                break;
            }
            case EEntryStatusFilter.Archived:
            {
                conditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Archived, true));
                break;
            }
        }
    }
}
