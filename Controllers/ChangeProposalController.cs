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
    private readonly int _itemsPerPage = config.Value.AdminItemsPerPage;

    /// <summary>Returns a paginated list of change proposals, optionally filtered by status.</summary>
    [HttpGet]
    public async Task<ActionResult<PaginatedResponse<EntryChangeProposal>>> GetProposals([FromQuery] EntryChangeProposalFilterRequest filter)
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

        return Ok(new PaginatedResponse<EntryChangeProposal>(items, more));
    }

    /// <summary>Returns a single change proposal by ID.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<EntryChangeProposal>> GetProposal(ObjectId id)
    {
        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");

        return Ok(proposal);
    }

    /// <summary>Accepts a proposal: applies the proposed changes to the entry and marks it Accepted.</summary>
    [HttpPatch("{id}/accept")]
    public async Task<IActionResult> AcceptProposal(ObjectId id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");
        if (proposal.Status != EEntryChangeProposalStatus.Open)
            return new InvalidRequestApiError("proposal already resolved");

        var result = await entryService.EditEntryAsync(proposal.EntryId, proposal.ChangeProposal);
        if (result.IsFailed)
        {
            return result.SelectApiError(
                expected: new NotFoundApiError(result.FailureDetails),
                unexpected: new OperationFailedApiError(result.FailureDetails)
            );
        }

        await databaseService.UpdateEntryChangeProposalStatusAsync(id, EEntryChangeProposalStatus.Accepted);
        await activityService.LogAsync(EntryActivity.ChangeAccepted(proposal.EntryId, userId, proposal.Id));

        return Ok();
    }

    /// <summary>Rejects a proposal with a mandatory comment explaining why.</summary>
    [HttpPatch("{id}/reject")]
    public async Task<IActionResult> RejectProposal(ObjectId id, [FromBody] CommentedRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        var proposal = await databaseService.GetEntryChangeProposalByIdAsync(id);
        if (proposal == null) return new NotFoundApiError("proposal not found");
        if (proposal.Status != EEntryChangeProposalStatus.Open) return new InvalidRequestApiError("proposal already resolved");

        await databaseService.UpdateEntryChangeProposalStatusAsync(id, EEntryChangeProposalStatus.Rejected);
        await activityService.LogAsync(EntryActivity.ChangeRejected(proposal.EntryId, userId, request.Comment, proposal.Id));

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
        await activityService.LogAsync(EntryActivity.ProposalDeleted(proposal.EntryId, userId, request.Comment, proposal.Id));

        return Ok();
    }
}
