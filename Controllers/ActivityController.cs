using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using System.Security.Claims;
using System.Text.Json;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Services;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("activities")]
[Authorize]
public class ActivityController(IEntryActivityService activityService, IEntryService entryService, IDatabaseService databaseService) : ControllerBase
{
    /// <summary>Returns a paginated list of all activity events across all entries.</summary>
    [HttpGet]
    public async Task<ActionResult<List<EntryActivity>>> GetAll([FromQuery] int page = 0)
    {
        var activities = await activityService.GetAllAsync(page);
        return Ok(activities);
    }

    /// <summary>Returns a paginated list of activity events for a specific entry.</summary>
    [HttpGet("entry/{id}")]
    public async Task<ActionResult<List<EntryActivity>>> GetByEntry(ObjectId id, [FromQuery] int page = 0)
    {
        var entryResult = await entryService.GetEntryByIdAsync(id);
        if (entryResult.IsFailed) return NotFound();

        var activities = await activityService.GetByEntryAsync(id, page);
        return Ok(activities);
    }

    /// <summary>
    /// Reverts the effect of an activity.
    /// Supported: DuplicateDetected (removes duplicate link), Deleted (restores entry with original ID),
    /// Blocked/Unblocked (toggles blocked status), Archived (unarchives entry).
    /// </summary>
    [HttpPost("{activityId}/revert")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> RevertActivity(ObjectId activityId, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var activity = await databaseService.GetActivityByIdAsync(activityId);
        if (activity == null) return new NotFoundApiError("activity not found");

        var result = await activityService.RevertAsync(activity, userId, request.Comment);
        if (result.IsFailed)
        {
            return result.FailureDetails?.Contains("not found") == true
                ? new NotFoundApiError(result.FailureDetails)
                : new InvalidRequestApiError(result.FailureDetails);
        }

        return Ok();
    }
}
