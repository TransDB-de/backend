using MongoDB.Bson;
using MongoDB.Driver;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

public interface IEntryPatchService
{
    /// <summary>
    /// Persists a newly proposed patch and logs the proposal as entry activity
    /// </summary>
    Task<Result<EntryPatch>> ProposePatchAsync(EntryPatch entryPatch);

    /// <summary>
    /// Accepts an open patch: field patches are applied per decision; a removal proposal
    /// archives the entry. Fails if the patch was decided concurrently.
    /// </summary>
    Task<Result> AcceptEntryPatchAsync(EntryPatch patch, AcceptEntryPatchRequest request, string userId);

    /// <summary>
    /// Direct edit: proposes and immediately accepts the patch in one step, all fields accepted.
    /// </summary>
    Task<Result> ApplyDirectEditAsync(EntryPatch patch, string userId);

    /// <summary>
    /// Rejects an open patch with a comment. Fails if the patch was decided concurrently.
    /// </summary>
    Task<Result> RejectEntryPatchAsync(EntryPatch patch, CommentedRequest request, string userId);
}

public class EntryPatchService(
    IDatabaseService db,
    IEntryActivityService activityService,
    IEntryService entryService) : IEntryPatchService
{
    public async Task<Result<EntryPatch>> ProposePatchAsync(EntryPatch entryPatch)
    {
        var patch = await db.InsertEntryPatchAsync(entryPatch);

        await activityService.LogAsync(EntryActivity.EntryPatchProposed(patch));

        return new Result<EntryPatch>(patch);
    }

    public async Task<Result> AcceptEntryPatchAsync(EntryPatch patch, AcceptEntryPatchRequest request, string userId)
    {
        // direct edits accept everything, keep default flags
        if (patch.Type != EEntryPatchType.DirectEdit)
        {
            // apply before the guard to persist with the patch 
            patch.Patch?.ApplyDecisions(request.Decisions);
        }

        // guard: claim the patch as resolved before touching the entry
        var patchUpdated = await db.ResolveEntryPatchAsync(patch.Id, EEntryPatchStatus.Accepted, patch.Patch);

        if (!patchUpdated)
        {
            return Result.Failure("patch already decided");
        }

        if (patch.Type == EEntryPatchType.ProposedRemoval)
        {
            // removal proposal: archive the entry
            var archived = await db.UpdateEntryFieldsAsync(patch.EntryId,
                Builders<Entry>.Update.Set(e => e.Status.Archived, true));
            if (!archived) return Result.Failure("entry not found");
        }
        else
        {
            var current = await db.GetEntryByIdAsync(patch.EntryId);
            if (current == null) return Result.Failure("entry not found");

            patch.Patch!.ApplyTo(current);

            var replaced = await db.ReplaceEntryAsync(patch.EntryId, current);
            if (!replaced) return Result.Failure("entry not found");

            if (patch.Patch.Address?.AnyAcceptedField == true)
            {
                _ = UpdateGeoLocationAndLogAsync(patch.EntryId);
            }
        }

        await activityService.LogAsync(EntryActivity.EntryPatchAccepted(patch, userId, request.Comment));

        return Result.Ok();
    }

    public async Task<Result> ApplyDirectEditAsync(EntryPatch patch, string userId)
    {
        var proposed = await ProposePatchAsync(patch);
        if (proposed.IsFailed) return Result.Failure(proposed);

        return await AcceptEntryPatchAsync(proposed.Value!, new AcceptEntryPatchRequest { Comment = patch.Comment }, userId);
    }

    public async Task<Result> RejectEntryPatchAsync(EntryPatch patch, CommentedRequest request, string userId)
    {
        // Status guard in the update covers the race
        var updated = await db.ResolveEntryPatchAsync(patch.Id, EEntryPatchStatus.Rejected, null);
        
        if (!updated)
        {
            return Result.Failure("patch already decided");
        }

        await activityService.LogAsync(EntryActivity.EntryPatchRejected(patch, userId, request.Comment));

        return Result.Ok();
    }

    private async Task UpdateGeoLocationAndLogAsync(ObjectId id)
    {
        var result = await entryService.UpdateGeoLocationAsync(id);
        if (result.IsFailed)
        {
            await activityService.LogAsync(EntryActivity.GeoLocationFailed(id, result.FailureDetails));
        }
    }
}
