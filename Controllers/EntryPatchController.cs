using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using System.Security.Claims;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Services;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("manage/entry-patches")]
[Authorize]
public class EntryPatchController(
    IEntryPatchService entryPatchService,
    IEntryActivityService activityService,
    IDatabaseService db,
    IOptions<EntryConfig> config) : ControllerBase
{
    private readonly int _itemsPerPage = config.Value.ItemsPerPage;
    
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<EntryPatch>>> FindAllPatchesAsync([FromQuery] EntryPatchFilterRequest filter)
    {
        var databaseFilters = filter.GetDatabaseFilters();
        var paginationHelper = new PaginationHelper<EntryPatch>(_itemsPerPage, filter.Page);

        var (items, more) = await paginationHelper.Paginate(options => db.FindEntryPatchesAsync(databaseFilters, options));

        return new PaginatedResponse<EntryPatch>(items, more);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EntryPatchDetailResponse>> GetEntryPatchById(ObjectId id)
    {
        var patch = await db.GetEntryPatchByIdAsync(id);

        if (patch == null)
        {
            return new NotFoundApiError();
        }

        var currentEntry = await db.GetEntryByIdAsync(patch.EntryId);

        if (currentEntry == null)
        {
            return new NotFoundApiError("entry for patch not found");
        }

        return new EntryPatchDetailResponse(patch, currentEntry);
    }


    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> DeleteEntryPatch(ObjectId id, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var patch = await db.GetEntryPatchByIdAsync(id);
        if (patch == null) return new NotFoundApiError();

        var deleted = await db.DeleteEntryPatchAsync(id);
        if (!deleted) return new InvalidRequestApiError("failed to delete entry patch");

        await activityService.LogAsync(EntryActivity.EntryPatchDeleted(patch, userId, request.Comment));

        return Ok();
    }
    
    [HttpPost("{id}/accept")]
    public async Task<IActionResult> AcceptEntryPatch(ObjectId id, [FromBody] AcceptEntryPatchRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var patch = await db.GetEntryPatchByIdAsync(id);
        if (patch == null) return new NotFoundApiError();

        if (patch.Status != EEntryPatchStatus.Open)
        {
            return new InvalidRequestApiError("patch already decided");
        }

        var result = await entryPatchService.AcceptEntryPatchAsync(patch, request, userId);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new InvalidRequestApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails));
        }

        return Ok();
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectEntryPatch(ObjectId id, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var patch = await db.GetEntryPatchByIdAsync(id);
        if (patch == null) return new NotFoundApiError();

        if (patch.Status != EEntryPatchStatus.Open)
        {
            return new InvalidRequestApiError("patch already decided");
        }

        var result = await entryPatchService.RejectEntryPatchAsync(patch, request, userId);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new InvalidRequestApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails));
        }

        return Ok();
    }
}