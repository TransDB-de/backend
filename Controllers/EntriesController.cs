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
    IActionTokenService revocationService,
    ICmsService cmsService,
    ILogger<EntriesController> logger,
    IDatabaseService databaseService,
    IEntryActivityService activityService) : ControllerBase
{
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
    public async Task<ActionResult<EntryCreatedResponse>> CreateEntry([FromBody] CreateEntryRequest request)
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
        var revocationToken = await revocationService.GenerateTokenAsync(EActionTokenPurpose.EntryRevocation, entry.Id, userAgent);

        DuplicateMatch? possibleDuplicate = null;

        if (entry.PossibleDuplicate != null)
        {
            var dupResult = await entryService.GetEntryByIdAsync(entry.PossibleDuplicate.EntryId);
            if (dupResult.IsOk && dupResult.Value!.Status.ShouldBePubliclyVisible)
                possibleDuplicate = entry.PossibleDuplicate;
        }

        return Ok(new EntryCreatedResponse(entry, revocationToken, possibleDuplicate));
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
    
    /// <summary>
    /// Propose a change to an entry
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<ChangeProposalCreatedResponse>> ProposeChange(ObjectId id, [FromBody] EditEntryRequest request)
    {
        var existingResult = await entryService.GetEntryByIdAsync(id);
        if (existingResult.IsFailed) return new NotFoundApiError(existingResult.FailureDetails);
        var existing = existingResult.Value!;

        if (!request.HasChanged(existing))
        {
            return new NoChangesError();
        }

        var proposal = new EntryChangeProposal(existing, request, EDataOrigin.User, null);

        proposal = await databaseService.InsertEntryChangeProposal(proposal);

        await activityService.LogAsync(EntryActivity.ChangeProposed(existing.Id, null, request.Comment, proposal.Id, proposal.SnowflakeId));

        var userAgent = Request.Headers.UserAgent.ToString();
        var revocationToken = await revocationService.GenerateTokenAsync(EActionTokenPurpose.ChangeProposalRevocation, proposal.Id, userAgent);
        
        return new ChangeProposalCreatedResponse(proposal, revocationToken);
    }

    /// <summary>Permanently deletes a newly created entry using a single-use revocation token.</summary>
    [HttpDelete("{id}/revoke/{token}")]
    [EnableRateLimiting("revoke")]
    public async Task<IActionResult> RevokeEntry(ObjectId id, string token)
    {
        var userAgent = Request.Headers.UserAgent.ToString();
        if (!await revocationService.ValidateTokenAsync(token, EActionTokenPurpose.EntryRevocation, id, userAgent))
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
        await revocationService.InvalidateTokenAsync(token);

        return Ok();
    }

    /// <summary>
    /// get a change proposal by using an action token for authentication, meant for the user to view their own submitted change proposal
    /// </summary>
    [HttpGet("{id}/proposals/{proposalId}/{token}")]
    public async Task<ActionResult<EntryChangeProposal>> GetPublicEntryChangeProposal(ObjectId id, ObjectId proposalId, string token)
    {
        var userAgent = Request.Headers.UserAgent.ToString();
        if (!await revocationService.ValidateTokenAsync(token, EActionTokenPurpose.ChangeProposalRevocation, id, userAgent))
        {
            return new InvalidRequestApiError("action token not found or already used");
        }
        
        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(proposalId);
        if (proposal == null) return new NotFoundApiError("proposal not found");

        return proposal;
    }
    
    /// <summary>
    /// delete a change proposal by revoking it with an action token
    /// </summary>
    [HttpDelete("{id}/proposals/{proposalId}/{token}")]
    public async Task<ActionResult<PublicChangeProposal>> RevokeEntryChangeProposal(ObjectId id, ObjectId proposalId, string token)
    {
        var userAgent = Request.Headers.UserAgent.ToString();
        if (!await revocationService.ValidateTokenAsync(token, EActionTokenPurpose.ChangeProposalRevocation, id, userAgent))
        {
            return new InvalidRequestApiError("revocation token not found or already used");
        }

        var result = await databaseService.DeleteEntryChangeProposalAsync(proposalId);
        if (!result)
        {
            return new InvalidRequestApiError();
        }
        
        await revocationService.InvalidateTokenAsync(token);

        return Ok();
    }
}
