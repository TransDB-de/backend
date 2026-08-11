using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
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
[Route("manage/proposals")]
[Authorize]
public class ChangeProposalController(
    IDatabaseService databaseService,
    IEntryService entryService,
    IEntryActivityService activityService,
    IOptions<EntryConfig> config) : ControllerBase
{
    private readonly int _itemsPerPage = config.Value.ProposalsPerPage;

    /// <summary>Returns a paginated list of change proposals, optionally filtered by status.</summary>
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<PublicChangeProposal>>> GetProposals([FromQuery] EntryChangeProposalFilterRequest filter)
    {
        var filters = new List<FilterDefinition<EntryChangeProposal>>();

        if (filter.Status != null)
        {
            filters.Add(Builders<EntryChangeProposal>.Filter.Eq(p => p.Status, filter.Status.Value));
        }

        if (filter.EntryId != null)
        {
            filters.Add(Builders<EntryChangeProposal>.Filter.Eq(p => p.EntryId, filter.EntryId));
        }
        
        var dbFilter =  Builders<EntryChangeProposal>.Filter.And(filters);

        var paginationHelper = new PaginationHelper<EntryChangeProposal>(_itemsPerPage, filter.Page);
        var (items, more) = await paginationHelper.Paginate(options => databaseService.FindEntryChangeProposalsAsync(dbFilter, options));

        var proposals = items.Select(i => new PublicChangeProposal(i)).ToList();
        
        return new PaginatedResponse<PublicChangeProposal>(proposals, more);
    }

    /// <summary>
    /// Returns a single change proposal by ID, together with the entry's current state and a live
    /// preview of applying the (rebased) proposal right now (<see cref="ChangeProposalDetailResponse.RebasedProposal"/>
    /// vs. <c>CurrentEntry</c>). Once the proposal has been decided (accepted or rejected), use
    /// <see cref="EntryChangeProposal.DecisionEntryStateBefore"/> and <see cref="EntryChangeProposal.DecisionEntryStateAfter"/>
    /// on <c>Proposal</c> instead, they hold what the entry actually looked like at that moment.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ChangeProposalDetailResponse>> GetProposal(ObjectId id)
    {
        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");

        var entry = await entryService.GetEntryByIdAsync(proposal.EntryId);
        if (entry.IsFailed) return new NotFoundApiError("entry not found");

        var rebased = new EntryChangeProposalRebase(proposal).Rebase(entry.Value!);

        return new ChangeProposalDetailResponse(proposal, entry.Value, rebased);
    }

    /// <summary>
    /// Accepts a proposal: applies the proposed changes to the entry and marks it Accepted.
    /// By default, only the fields the proposal actually changed get applied on top of the
    /// entry's current state, so unrelated changes made in the meantime don't get overwritten
    /// (see <see cref="AcceptProposalRequest.UseRebase"/>). Turning rebase off is only allowed
    /// for admins, since it can silently overwrite changes made in the meantime.
    /// </summary>
    [HttpPatch("{id}/accept")]
    public async Task<IActionResult> AcceptProposal(ObjectId id, [FromBody] AcceptProposalRequest? request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var useRebase = request?.UseRebase ?? true;
        if (!useRebase && !User.HasClaim("isAdmin", "true"))
        {
            return new ForbiddenApiError("only admins can accept a proposal without rebase");
        }

        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");
        if (proposal.Status != EEntryChangeProposalStatus.Open)
            return new InvalidRequestApiError("proposal already resolved");

        var result = await entryService.AcceptChangeProposalAsync(proposal, useRebase);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new NotFoundApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails)
            );
        }

        await activityService.LogAsync(EntryActivity.ChangeAccepted(proposal.EntryId, userId, proposal.Id, proposal.SnowflakeId));

        return Ok();
    }

    /// <summary>
    /// Rejects a proposal with a mandatory comment explaining why. The entry itself is left
    /// untouched, but we still save what rebasing would have produced, so the proposal's history
    /// stays useful later on.
    /// </summary>
    [HttpPatch("{id}/reject")]
    public async Task<IActionResult> RejectProposal(ObjectId id, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");
        if (proposal.Status != EEntryChangeProposalStatus.Open) return new InvalidRequestApiError("proposal already resolved");

        var result = await entryService.RejectChangeProposalAsync(proposal);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new NotFoundApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails)
            );
        }

        await activityService.LogAsync(EntryActivity.ChangeRejected(proposal.EntryId, userId, request.Comment, proposal.Id, proposal.SnowflakeId));

        return Ok();
    }

    /// <summary>Deletes an unresolved or rejected proposal. Accepted proposals are kept as version history and cannot be deleted.</summary>
    [HttpDelete("{id}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> DeleteProposal(ObjectId id, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");
        if (proposal.Status == EEntryChangeProposalStatus.Accepted)
        {
            return new InvalidRequestApiError("accepted proposals are kept as version history and cannot be deleted");
        }

        await databaseService.DeleteEntryChangeProposalAsync(id);
        await activityService.LogAsync(EntryActivity.ProposalDeleted(proposal.EntryId, userId, request.Comment));

        return Ok();
    }
}
