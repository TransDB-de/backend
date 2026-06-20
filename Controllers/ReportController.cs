using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using transdb_backend_net.Attributes;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Services;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("report")]
public class ReportController(IEntryService entryService, ICmsService cms, IEntryActivityService activityService) : ControllerBase
{
    /// <summary>
    /// Submits a report about an existing entry and creates a CMS ticket for review.
    /// Rate-limited to prevent abuse.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("report")]
    [ValidateCaptcha]
    public async Task<IActionResult> Report([FromBody] ReportRequest request)
    {
        var entryResult = await entryService.GetEntryByIdAsync(request.Id);
        if (entryResult.IsFailed)
        {
            return new NotFoundApiError(entryResult.FailureDetails);
        }

        var cmsType = request.Type switch
        {
            ReportType.Edit => CmsTicketType.Edit,
            ReportType.Other => CmsTicketType.Other,
            _ => CmsTicketType.Report,
        };

        var ticketResult = await cms.CreateTicketAsync(entryResult.Value!.Name, request.Id.ToString(), cmsType, request.Message);
        if (ticketResult.IsFailed)
        {
            return new OperationFailedApiError(ticketResult.FailureDetails);
        }

        await activityService.LogAsync(EntryActivity.Reported(request.Id, request.Type, ticketResult.Value, request.Message));

        return Ok();
    }
}
