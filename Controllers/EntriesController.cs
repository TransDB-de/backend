using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Bson;

using transdb_backend_net.Attributes;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Services;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("entries")]
public class EntriesController(
    IEntryService entryService,
    IEntryRevocationService revocationService,
    IEntryActivityService activityService) : ControllerBase
{
    /// <summary>
    /// Returns a paginated list of approved entries matching the given filters.
    /// Supports full-text search, type/offer/attribute filtering, and optional location-based sorting.
    /// </summary>
    [HttpGet]
    [ValidateCaptcha]
    public async Task<ActionResult<PaginatedEntryResponse<PublicEntryResponse>>> Filter([FromQuery] EntriesFilterRequest filter)
    {
        var result = await entryService.FilterEntriesForPublicUsageAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Submits a new entry for review. Creates a CMS ticket automatically.
    /// Rate-limited to prevent spam submissions.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("newEntry")]
    [ValidateCaptcha]
    public async Task<ActionResult<CreateEntryResponse>> CreateEntry([FromBody] CreateEntryRequest request)
    {
        var result = await entryService.CreateEntryAsync(request);
        if (result.IsFailed) return new OperationFailedApiError(result.FailureDetails);

        var entry = result.Value!;
        await activityService.LogAsync(EntryActivity.Submitted(entry.Id));
        if (entry.PossibleDuplicate != null)
            await activityService.LogAsync(EntryActivity.DuplicateDetected(entry.Id, entry.PossibleDuplicate));

        var userAgent = Request.Headers.UserAgent.ToString();
        var revocationToken = await revocationService.GenerateTokenAsync(entry.Id, userAgent);

        DuplicateMatch? possibleDuplicate = null;

        if (entry.PossibleDuplicate != null)
        {
            var dupResult = await entryService.GetEntryByIdAsync(entry.PossibleDuplicate.EntryId);
            if (dupResult.IsOk && dupResult.Value!.Status.ShouldBePubliclyVisible)
                possibleDuplicate = entry.PossibleDuplicate;
        }

        return Ok(new CreateEntryResponse(entry, revocationToken, possibleDuplicate));
    }

    /// <summary>Returns a single publicly visible entry by its ID.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<PublicEntryResponse>> GetEntry(ObjectId id)
    {
        var result = await entryService.GetPublicEntryByIdAsync(id);
        if (result.IsFailed) return new NotFoundApiError(result.FailureDetails);

        return Ok(new PublicEntryResponse(result.Value!));
    }

    /// <summary>Permanently deletes a newly created entry using a single-use revocation token.</summary>
    [HttpDelete("{id}/revoke/{token}")]
    [EnableRateLimiting("revoke")]
    public async Task<IActionResult> RevokeEntry(ObjectId id, string token)
    {
        var userAgent = Request.Headers.UserAgent.ToString();
        if (!await revocationService.ValidateTokenAsync(token, id, userAgent))
        {
            return new InvalidRequestApiError("revocation token not found or already used");
        }

        var result = await entryService.DeleteEntryAsync(id);
        if (result.IsFailed)
        {
            return new InvalidRequestApiError(result.FailureDetails);
        }

        await revocationService.InvalidateTokenAsync(token);

        return Ok();
    }
}
