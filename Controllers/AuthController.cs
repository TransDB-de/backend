using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using transdb_backend_net.Attributes;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Services;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>
    /// Authenticates a user via Directus and issues a session cookie on success.
    /// The cookie is not persistent and expires when the browser session ends.
    /// </summary>
    [HttpPost("login")]
    [ValidateCaptcha]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var loginResult = await authService.LoginAsync(request);

        if (loginResult.IsFailed)
        {
            return loginResult.SelectApiError(
                expected: new LoginFailedApiError(loginResult.FailureDetails),
                unexpected: new CmsInteractionFailedError(loginResult.FailureDetails)
            );
        }

        var login = loginResult.Value!;

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            login.Principal,
            new AuthenticationProperties { IsPersistent = false });

        var userId = login.Principal.FindFirstValue(ClaimTypes.NameIdentifier)!;

        return Ok(new LoginResponse
        {
            Id = userId,
            Username = login.Username,
            Admin = login.IsAdmin
        });
    }

    /// <summary>Signs the current user out by clearing the session cookie.</summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok();
    }
}
