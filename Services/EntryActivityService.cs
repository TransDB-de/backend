using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Utils;


namespace transdb_backend_net.Services;

public interface IEntryActivityService
{
    /// <summary>Persists an activity event for an entry.</summary>
    Task LogAsync(EntryActivity activity);

    /// <summary>Compares the existing entry state with the given status changes and logs the appropriate activities.</summary>
    Task LogStatusChangesAsync(ObjectId entryId, string userId, Entry existing, EntryStatusChange changes);

    /// <summary>Returns a paginated list of all activity events across all entries, enriched with entry names.</summary>
    Task<PaginatedResponse<EntryActivityResponse>> GetAllAsync(int page);

    /// <summary>Returns a paginated list of activity events for a specific entry.</summary>
    Task<PaginatedResponse<EntryActivity>> GetByEntryAsync(ObjectId entryId, int page);

    /// <summary>
    /// Reverts the effect of a logged activity and logs the appropriate follow-up activity.
    /// Returns a failed result if the type cannot be reverted or a referenced entry is missing.
    /// </summary>
    Task<Result> RevertAsync(EntryActivity activity, string userId, string comment);
}

public class EntryActivityService(IDatabaseService db, IOptions<EntryConfig> config) : IEntryActivityService
{
    private readonly int _itemsPerPage = config.Value.ActivityItemsPerPage;

    /// <inheritdoc/>
    public Task LogAsync(EntryActivity activity) => db.InsertActivityAsync(activity);

    /// <inheritdoc/>
    public async Task LogStatusChangesAsync(ObjectId entryId, string userId, Entry existing, EntryStatusChange c)
    {
        if (!existing.Status.Approved && c.Approved == true)
        {
            await LogAsync(EntryActivity.Approved(entryId, userId));
        }

        if (!existing.Status.Blocked && c.Blocked == true)
        {
            await LogAsync(EntryActivity.Blocked(entryId, userId, c.Comment));
        }
        else if (existing.Status.Blocked && c.Blocked == false)
        {
            await LogAsync(EntryActivity.Unblocked(entryId, userId, c.Comment));
        }

        if (!existing.Status.Archived && c.Archived == true)
        {
            await LogAsync(EntryActivity.Archived(entryId, userId, c.Comment));
        }
        else if (existing.Status.Archived && c.Archived == false)
        {
            await LogAsync(EntryActivity.Restored(entryId, userId, c.Comment, null));
        }
    }

    /// <inheritdoc/>
    public async Task<PaginatedResponse<EntryActivityResponse>> GetAllAsync(int page)
    {
        var paginationHelper = new PaginationHelper<EntryActivityResponse>(_itemsPerPage, page);

        var (items, more) = await paginationHelper.Paginate(db.FindActivitiesAsync);
        var names = await db.FindEntryNamesByIdsAsync(items.Select(a => a.EntryId).Distinct());
        foreach (var item in items)
        {
            item.EntryName = names.GetValueOrDefault(item.EntryId);
        }
        return new PaginatedResponse<EntryActivityResponse>(items, more);
    }

    /// <inheritdoc/>
    public async Task<PaginatedResponse<EntryActivity>> GetByEntryAsync(ObjectId entryId, int page)
    {
        var paginationHelper = new PaginationHelper<EntryActivity>(_itemsPerPage, page);
        var (items, more) = await paginationHelper.Paginate(options => db.FindActivitiesByEntryAsync(entryId, options));
        return new PaginatedResponse<EntryActivity>(items, more);
    }

    /// <inheritdoc/>
    public async Task<Result> RevertAsync(EntryActivity activity, string userId, string comment)
    {
        switch (activity.Type)
        {
            case EntryActivityType.DuplicateDetected:
            {
                var updated = await db.UpdateEntryFieldsAsync(
                    activity.EntryId,
                    Builders<Entry>.Update.Unset(e => e.PossibleDuplicate));
                if (!updated) return Result.Failure("entry not found");
                break;
            }
            case EntryActivityType.Deleted:
            {
                if (!activity.Attachments.TryGetValue(EntryActivityAttachment.OriginalEntryState, out var state))
                    return Result.Failure("activity has no original state");
                await db.InsertEntryAsync((Entry)state);
                await LogAsync(EntryActivity.Restored(activity.EntryId, userId, comment, activity.Id));
                break;
            }
            case EntryActivityType.Blocked:
            {
                var updated = await db.UpdateEntryFieldsAsync(
                    activity.EntryId,
                    Builders<Entry>.Update.Set(e => e.Status.Blocked, false));
                if (!updated) return Result.Failure("entry not found");
                await LogAsync(EntryActivity.Unblocked(activity.EntryId, userId, comment));
                break;
            }
            case EntryActivityType.Unblocked:
            {
                var updated = await db.UpdateEntryFieldsAsync(
                    activity.EntryId,
                    Builders<Entry>.Update.Set(e => e.Status.Blocked, true));
                if (!updated) return Result.Failure("entry not found");
                await LogAsync(EntryActivity.Blocked(activity.EntryId, userId, comment));
                break;
            }
            case EntryActivityType.Archived:
            {
                var updated = await db.UpdateEntryFieldsAsync(
                    activity.EntryId,
                    Builders<Entry>.Update.Set(e => e.Status.Archived, false));
                if (!updated) return Result.Failure("entry not found");
                await LogAsync(EntryActivity.Restored(activity.EntryId, userId, comment, activity.Id));
                break;
            }
            default:
                return Result.Failure($"activity type {activity.Type} cannot be reverted");
        }

        return Result.Ok();
    }
}
