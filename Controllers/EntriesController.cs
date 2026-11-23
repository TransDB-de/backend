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
    IActionTokenService actionTokenService,
    ICmsService cmsService,
    ILogger<EntriesController> logger,
    IDatabaseService db,
    IEntryActivityService activityService,
    IEntryPatchService entryPatchService) : ControllerBase
{
    /// <summary>
    /// Returns the current entry schema configuration and enums
    /// </summary>
    /// <returns></returns>
    [HttpGet("schema")]
    public ActionResult<EntrySchemaResponse> GetEntrySchema()
    {
        return Ok(new EntrySchemaResponse());
    }
    
    /// <summary>
    /// Returns a paginated list of approved entries matching the given filters.
    /// Supports full-text search, type/offer/attribute filtering, and optional location-based sorting.
    /// </summary>
    [HttpGet]
    [ValidateCaptcha]
    public async Task<ActionResult<PaginatedResponse<PublicEntryResponse>>> Filter([FromQuery] EntriesFilterRequest filter)
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
        
        var cmsResult = await cmsService.CreateTicketAsync(entry.Name, entry.Id.ToString(), CmsTicketType.NewEntry, null);

        if (cmsResult.IsFailed)
        {
            logger.LogCritical(cmsResult.FailureDetails);
        }
        
        await activityService.LogAsync(EntryActivity.Submitted(entry.Id, cmsResult.Value));
        if (entry.PossibleDuplicate != null)
        {
            await activityService.LogAsync(EntryActivity.DuplicateDetected(entry.Id, entry.PossibleDuplicate));
        }

        var userAgent = Request.Headers.UserAgent.ToString();
        var revocationToken = await actionTokenService.GenerateTokenAsync(EActionTokenPurpose.EntryRevocation, entry.Id, Request.Headers);

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
    [ValidateCaptcha]
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
        if (!await actionTokenService.ValidateTokenAsync(token, EActionTokenPurpose.EntryRevocation, id, Request.Headers))
        {
            return new InvalidRequestApiError("revocation token not found or already used");
        }

        var result = await entryService.DeleteEntryAsync(id);
        if (result.IsFailed)
        {
            return new InvalidRequestApiError(result.FailureDetails);
        }

        // revoking is meant to leave no trace, as if the entry was never submitted.
        await activityService.PurgeAsync(id);
        await actionTokenService.InvalidateTokenAsync(token);

        return Ok();
    }
    
    [HttpPut("{id}")]
    [EnableRateLimiting("report")]
    [ValidateCaptcha]
    public async Task<ActionResult<EntryPatchResponse>> ProposeEntryPatch(ObjectId id,
        [FromBody] EditEntryRequest request)
    {
        var existingResult = await entryService.GetEntryByIdAsync(id);
        if (existingResult.IsFailed) return new NotFoundApiError(existingResult.FailureDetails);
        var existing = existingResult.Value!;

        if (!request.DiffersFromDataField(existing))
        {
            return new NoChangesError();
        }

        var patch = new EntryPatch(request.Comment, existing, request);

        var patchResult = await entryPatchService.ProposePatchAsync(patch);

        if (patchResult.IsFailed)
        {
            return new OperationFailedApiError(patchResult.FailureDetails);
        }

        patch = patchResult.Value!;
        
        var revocationToken = await actionTokenService.GenerateTokenAsync(EActionTokenPurpose.EntryPatchRevocation, patch.Id, Request.Headers);
        
        return new EntryPatchResponse(patch, revocationToken);
    }
    
    [HttpGet("{id}/patches/{patchId}/{token}")]
    public async Task<ActionResult<EntryPatch>> GetPublicEntryChangeProposal(ObjectId id, ObjectId patchId, string token)
    {
        if (!await actionTokenService.ValidateTokenAsync(token, EActionTokenPurpose.EntryPatchRevocation, patchId, Request.Headers))
        {
            return new InvalidRequestApiError("action token not found or already used");
        }
        
        var patch = await db.GetEntryPatchByIdAsync(patchId);
        if (patch == null)
        {
            return new NotFoundApiError("patch not found");
        }

        return patch;
    }
    
    [HttpDelete("{id}/patches/{patchId}/{token}")]
    public async Task<ActionResult> RevokeEntryPatch(ObjectId id, ObjectId patchId, string token)
    {
        if (!await actionTokenService.ValidateTokenAsync(token, EActionTokenPurpose.EntryPatchRevocation, patchId, Request.Headers))
        {
            return new InvalidRequestApiError("revocation token not found or already used");
        }

        // only open patches can be revoked, resolved patches are part of the version history
        var patch = await db.GetEntryPatchByIdAsync(patchId);
        if (patch == null)
        {
            return new NotFoundApiError("patch not found");
        }

        if (patch.Status != EEntryPatchStatus.Open)
        {
            return new InvalidRequestApiError("patch already decided and cannot be revoked");
        }

        var deleted = await db.DeleteEntryPatchAsync(patchId);
        if (!deleted)
        {
            return new InvalidRequestApiError();
        }

        // revoking leaves no trace: remove the patch's activities too
        await db.DeleteActivitiesByRelatedIdAsync(patchId);
        await actionTokenService.InvalidateTokenAsync(token);

        return Ok();
    }
}
