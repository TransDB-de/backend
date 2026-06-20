using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Services;

namespace transdb_backend_net.Attributes;

/// <summary>
/// Action filter that verifies the Cap CAPTCHA token from the X-Cap-Token request header
/// before allowing the action to execute. Verification is skipped when CAPTCHA is disabled in config.
/// Apply to public endpoints that should be protected against automated submissions.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public class ValidateCaptchaAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var config = context.HttpContext.RequestServices
            .GetRequiredService<IOptions<CaptchaConfig>>().Value;

        if (!config.Enabled)
        {
            await next();
            return;
        }

        var token = context.HttpContext.Request.Headers["X-Cap-Token"].FirstOrDefault();

        if (string.IsNullOrEmpty(token))
        {
            context.Result = new CaptchaVerificationError();
            return;
        }

        var captcha = context.HttpContext.RequestServices.GetRequiredService<ICaptchaService>();

        var valid = await captcha.VerifyAsync(token);
        
        if (!valid)
        {
            context.Result = new CaptchaVerificationError();
            return;
        }

        await next();
    }
}
