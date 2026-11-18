using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
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
public class EntryPatchController(IDatabaseService db, IOptions<EntryConfig> config) : ControllerBase
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
    public async Task<ActionResult<EntryPatch>> GetEntryPatchById(ObjectId id)
    {
        var patch = await db.GetEntryPatchByIdAsync(id);

        if (patch == null)
        {
            return new NotFoundApiError();
        }
        
        return patch;
    }
    
    
    [HttpDelete("{id}")]
    public async Task<ActionResult<EntryPatch>> DeleteEntryPatch(ObjectId id)
    {
        var patch = await db.DeleteEntryPatchAsync(id);

        if (!patch)
        {
            return new InvalidRequestApiError("Failed to delete entry patch");
        }
        
        return Ok();
    }
}