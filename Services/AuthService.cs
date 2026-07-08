using Microsoft.AspNetCore.Authentication.Cookies;
using System.Security.Claims;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

public interface IAuthService
{
    /// <summary>
    /// Authenticates a user against Directus and returns a claims principal for cookie sign-in.
    /// The Directus access token is only held in memory during this call and never persisted.
    /// </summary>
    Task<Result<LoginResult>> LoginAsync(LoginRequest credentials);
}

public record LoginResult(ClaimsPrincipal Principal, string Username, bool IsAdmin);

public class AuthService(ICmsService cms) : IAuthService
{
    /// <inheritdoc/>
    public async Task<Result<LoginResult>> LoginAsync(LoginRequest credentials)
    {
        var loginResult = await cms.DirectusLoginAsync(credentials);
        if (loginResult.IsFailed) return Result<LoginResult>.Failure(loginResult);

        var userResult = await cms.GetCurrentUserAsync(loginResult.Value!);
        if (userResult.IsFailed) return Result<LoginResult>.Failure(userResult);

        var managementUser = await cms.GetManagementUserAsync(userResult.Value!.Id);
        if (managementUser.IsFailed)  return Result<LoginResult>.Failure(managementUser);

        var isAdmin = managementUser.Value!.Admin;
        var user = userResult.Value!;
        
        var username = user.FirstName + (user.LastName != null ? " " + user.LastName : "");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, username),
            new("isAdmin", isAdmin  ? "true" : "false")
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

        return Result<LoginResult>.Success(new LoginResult(new ClaimsPrincipal(identity), username, isAdmin));
    }
}
