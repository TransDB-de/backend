using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;

namespace transdb_backend_net.Setup;

/// <summary>
/// Configures cookie authentication options via DI so Program.cs can call
/// <c>.AddCookie()</c> without an inline lambda.
/// </summary>
public class ConfigureCookieOptions : IConfigureNamedOptions<CookieAuthenticationOptions>
{
    public void Configure(CookieAuthenticationOptions options) =>
        Configure(CookieAuthenticationDefaults.AuthenticationScheme, options);

    public void Configure(string? name, CookieAuthenticationOptions options)
    {
        options.Cookie.Name = "transdb-auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        // Return 401/403 JSON responses instead of redirecting to a login page
        options.Events.OnRedirectToLogin = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    }
}
