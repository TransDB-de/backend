using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Services;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("users")]
[Authorize]
public class UsersController(ICmsService cms, IMemoryCache cache, IConfiguration config) : ControllerBase
{
    private const string CacheKey = "cms_users";

    [HttpGet()]
    public async Task<ActionResult<List<UserResponse>>> GetUsers()
    {
        var directusUsers = await GetCachedUsersAsync();
        if (directusUsers == null)
        {
            return new OperationFailedApiError();
        }
        
        var users = directusUsers.Select(user => new UserResponse(user)).ToList();

        var legacyUsers = config.GetSection("LegacyUsers").Get<Dictionary<string, string>>();
        
        if (legacyUsers != null)
        {
            users.AddRange(legacyUsers.Select(u => new UserResponse(u.Key, u.Value)).ToList());
        }
        
        return users;
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
