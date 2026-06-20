using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Services;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController(ICmsService cms, IMemoryCache cache) : ControllerBase
{
    private const string CacheKey = "cms_users";

    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponse>> GetUser(string id)
    {
        var users = await GetCachedUsersAsync();
        if (users == null)
        {
            return new OperationFailedApiError();
        }

        var user = users.FirstOrDefault(u => u.Id == id);
        
        if (user == null)
        {
            return new NotFoundApiError("user not found");
        }

        return Ok(new UserResponse(user));
    }

    private async Task<List<DirectusUser>?> GetCachedUsersAsync()
    {
        if (cache.TryGetValue(CacheKey, out List<DirectusUser>? cached))
        {
            return cached;
        }

        var result = await cms.GetAllUsersAsync();
        if (result.IsFailed)
        {
            return null;
        }

        cache.Set(CacheKey, result.Value, TimeSpan.FromHours(24));
        return result.Value;
    }
}
