using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson.Serialization.Options;
using transdb_backend_net.Models.Request;

namespace transdb_backend_net.Models.Database;

/// <summary>Carries the fields the caller wants to change in a status patch. Null means "leave unchanged".</summary>
public record EntryStatusChange(bool? Approved, bool? Blocked, bool? Archived, string? Comment);

/// <summary>Audit event types that can be logged against an entry.</summary>
public enum EntryActivityType
{
    Submitted,
    DuplicateDetected,
    Approved,
    Archived,
    Edited,
    Blocked,
    Unblocked,
    Reported,
    Deleted,
    Restored,
    GeoLocationFailed
}

/// <summary>Keys for the <see cref="EntryActivity.Attachments"/> dictionary.</summary>
public enum EntryActivityAttachment
{
    CmsTicketId,
    ReportType,
    OriginalEntryState,
    EntryChangeState,
    PossibleDuplicate,
    RevertedActivityId
}

/// <summary>An immutable audit record describing a single state change on an entry.</summary>
public class EntryActivity
{
    [BsonId]
    public ObjectId Id { get; set; }
    public ObjectId EntryId { get; set; }
    public EntryActivityType Type { get; set; }
    public DateTime? Timestamp { get; set; } = null;

    [BsonIgnoreIfNull]
    public string? UserId { get; set; }

    [BsonIgnoreIfNull]
    public string? Comment { get; set; }
    
    [JsonIgnore]
    [BsonIgnoreIfDefault]
    [BsonDictionaryOptions(DictionaryRepresentation.ArrayOfArrays)]
    public Dictionary<EntryActivityAttachment, object> Attachments { get; set; } = new();

    private static readonly HashSet<EntryActivityAttachment> HiddenAttachments =
    [
        EntryActivityAttachment.OriginalEntryState,
        EntryActivityAttachment.EntryChangeState
    ];

    /// <summary>
    /// Filtered view of <see cref="Attachments"/> that is safe to expose via the API.
    /// Strips entry states to avoid returning full entry snapshots to clients.
    /// </summary>
    [BsonIgnore]
    [JsonPropertyName("attachments")]
    public Dictionary<EntryActivityAttachment, object> PublicAttachments =>
        Attachments.Where(kv => !HiddenAttachments.Contains(kv.Key))
                   .ToDictionary(kv => kv.Key, kv => kv.Value);

    [BsonConstructor]
    protected EntryActivity() { }

    public static EntryActivity Submitted(ObjectId entryId, string? cmsTicketId = null) => new()
    {
        EntryId = entryId,
        Type = EntryActivityType.Submitted,
        Timestamp = DateTime.UtcNow,
        Attachments = cmsTicketId != null ? new Dictionary<EntryActivityAttachment, object>
        {
            [EntryActivityAttachment.CmsTicketId] =  cmsTicketId
        } : new Dictionary<EntryActivityAttachment, object>()
    };

    public static EntryActivity DuplicateDetected(ObjectId entryId, DuplicateMatch duplicate) => new()
    {
        EntryId = entryId,
        Type = EntryActivityType.DuplicateDetected,
        Timestamp = DateTime.UtcNow,
        Attachments = new Dictionary<EntryActivityAttachment, object>
        {
            [EntryActivityAttachment.PossibleDuplicate] = duplicate
        }
    };

    public static EntryActivity Approved(ObjectId entryId, string userId) => new()
    {
        EntryId = entryId,
        UserId = userId,
        Type = EntryActivityType.Approved,
        Timestamp = DateTime.UtcNow
    };

    public static EntryActivity Archived(ObjectId entryId, string? userId, string? comment) => new()
    {
        EntryId = entryId,
        UserId = userId,
        Comment = comment,
        Type = EntryActivityType.Archived,
        Timestamp = DateTime.UtcNow
    };

    public static EntryActivity Edited(ObjectId entryId, string userId, string? comment, Entry original, EditEntryRequest changes) => new()
    {
        EntryId = entryId,
        UserId = userId,
        Comment = comment,
        Type = EntryActivityType.Edited,
        Timestamp = DateTime.UtcNow,
        Attachments = new Dictionary<EntryActivityAttachment, object>
        {
            [EntryActivityAttachment.OriginalEntryState] = original,
            [EntryActivityAttachment.EntryChangeState] = changes
        }
    };

    public static EntryActivity Blocked(ObjectId entryId, string userId, string? comment) => new()
    {
        EntryId = entryId,
        UserId = userId,
        Comment = comment,
        Type = EntryActivityType.Blocked,
        Timestamp = DateTime.UtcNow
    };

    public static EntryActivity Unblocked(ObjectId entryId, string userId, string? comment) => new()
    {
        EntryId = entryId,
        UserId = userId,
        Comment = comment,
        Type = EntryActivityType.Unblocked,
        Timestamp = DateTime.UtcNow
    };

    public static EntryActivity Reported(ObjectId entryId, ReportType reportType, string cmsTicketId, string comment) => new()
    {
        EntryId = entryId,
        Type = EntryActivityType.Reported,
        Timestamp = DateTime.UtcNow,
        Comment = comment,
        Attachments = new Dictionary<EntryActivityAttachment, object>
        {
            [EntryActivityAttachment.ReportType] = reportType.ToString(),
            [EntryActivityAttachment.CmsTicketId] = cmsTicketId
        }
    };
    
    public static EntryActivity Deleted(Entry entry, string userId, string? comment) => new()
    {
        EntryId = entry.Id,
        UserId = userId,
        Comment = comment,
        Type = EntryActivityType.Deleted,
        Timestamp = DateTime.UtcNow,
        Attachments = new Dictionary<EntryActivityAttachment, object>
        {
            [EntryActivityAttachment.OriginalEntryState] = entry
        }
    };

    public static EntryActivity Restored(ObjectId entryId, string userId, string? comment, ObjectId? revertedActivityId = null) => new()
    {
        EntryId = entryId,
        UserId = userId,
        Comment = comment,
        Type = EntryActivityType.Restored,
        Timestamp = DateTime.UtcNow,
        Attachments = revertedActivityId.HasValue ? new Dictionary<EntryActivityAttachment, object>
        {
            [EntryActivityAttachment.RevertedActivityId] =  revertedActivityId
        } : new Dictionary<EntryActivityAttachment, object>()
    };

    /// <summary>Logged when an automatic geocoding update fails after an entry is approved or edited.</summary>
    public static EntryActivity GeoLocationFailed(ObjectId entryId) => new()
    {
        EntryId = entryId,
        Type = EntryActivityType.GeoLocationFailed,
        Timestamp = DateTime.UtcNow
    };
}
