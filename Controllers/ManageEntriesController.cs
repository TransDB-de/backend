using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using System.Security.Claims;
using System.Text.Json;
using MongoDB.Bson.IO;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Services;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("manage/entries")]
[Authorize]
public class ManageEntriesController(
    IEntryService entryService,
    IEntryActivityService activityService) : ControllerBase
{
    /// <summary>
    /// Returns a paginated list of entries for admin review with full field visibility.
    /// Supports optional filtering by approved/blocked/archived status and full-text search.
    /// Returns all entries when no filters are applied.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PaginatedEntryResponse<Entry>>> GetEntries([FromQuery] AdminEntriesFilterRequest filter)
    {
        var result = await entryService.GetFullEntriesForElevatedUsageAsync(filter);
        return Ok(result);
    }

    /// <summary>Returns a single entry by ID with full field visibility.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<Entry>> GetEntry(ObjectId id)
    {
        var result = await entryService.GetEntryByIdAsync(id);
        if (result.IsFailed) return new NotFoundApiError(result.FailureDetails);

        return Ok(result.Value!);
    }

    /// <summary>Partially updates an entry's approved, blocked, and/or archived status.</summary>
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> PatchEntryStatus(ObjectId id, [FromBody] PatchEntryStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var existingResult = await entryService.GetEntryByIdAsync(id);
        if (existingResult.IsFailed) return new NotFoundApiError(existingResult.FailureDetails);
        var existing = existingResult.Value!;

        var result = await entryService.PatchEntryAsync(id, request);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new NotFoundApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails)
            );
        }

        await activityService.LogStatusChangesAsync(id, userId, existing,
            new EntryStatusChange(request.Approved, request.Blocked, request.Archived, request.Comment));

        return Ok();
    }

    /// <summary>
    /// Fully replaces an entry with the submitted data.
    /// A geo location update is triggered in the background if the address changed.
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> EditEntry(ObjectId id, [FromBody] EditEntryRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var existingResult = await entryService.GetEntryByIdAsync(id);
        if (existingResult.IsFailed) return new NotFoundApiError(existingResult.FailureDetails);
        var existing = existingResult.Value!;

        var originalEntry = JsonSerializer.Deserialize<Entry>(JsonSerializer.Serialize(existing));

        var result = await entryService.EditEntryAsync(id, request);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new NotFoundApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails)
            );
        }

        await activityService.LogAsync(EntryActivity.Edited(id, userId, request.Comment, originalEntry, request));
        await activityService.LogStatusChangesAsync(id, userId, existing,
            new EntryStatusChange(request.Status.Approved, request.Status.Blocked, null, request.Comment));

        return Ok();
    }

    /// <summary>Manually triggers a geo location update for an entry using its current address.</summary>
    [HttpPut("{id}/updateGeo")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> UpdateGeo(ObjectId id)
    {
        var result = await entryService.UpdateGeoLocationAsync(id);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new NotFoundApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails)
            );
        }

        return Ok();
    }
    

    /// <summary>Permanently deletes an entry from the database. This cannot be undone.</summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteEntry(ObjectId id, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var existingResult = await entryService.GetEntryByIdAsync(id);
        if (existingResult.IsFailed) return new NotFoundApiError(existingResult.FailureDetails);

        var result = await entryService.DeleteEntryAsync(id);
        if (result.IsFailed) return new NotFoundApiError(result.FailureDetails);

        await activityService.LogAsync(EntryActivity.Deleted(existingResult.Value!, userId, request.Comment));

        return Ok();
    }
}
