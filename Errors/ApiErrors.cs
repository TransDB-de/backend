using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;

namespace transdb_backend_net.Exceptions;

/// <summary>
/// Base class for all structured API error responses.
/// </summary>
public class ApiError : ObjectResult
{
    public ApiError(int statusCode, string failure, string? details = null)
        : base(new { failure, details })
    {
        StatusCode = statusCode;
    }
}

/// <summary>401 — credentials were rejected by the CMS (wrong username or password).</summary>
public class LoginFailedApiError(string? details = null)
    : ApiError(StatusCodes.Status401Unauthorized, "login_failed", details);

/// <summary>404 — the requested resource does not exist.</summary>
public class NotFoundApiError(string? details = null)
    : ApiError(StatusCodes.Status404NotFound, "not_found", details);

/// <summary>400 — the request was syntactically valid but logically rejected (e.g. cannot revert this activity type).</summary>
public class InvalidRequestApiError(string? details = null)
    : ApiError(StatusCodes.Status400BadRequest, "invalid_request", details);

/// <summary>401 — the request requires authentication but none was provided.</summary>
public class UnauthorizedApiError(string? details = null)
    : ApiError(StatusCodes.Status401Unauthorized, "unauthorized", details);

/// <summary>403 — the authenticated user lacks permission for this action.</summary>
public class ForbiddenApiError(string? details = null)
    : ApiError(StatusCodes.Status403Forbidden, "forbidden", details);

/// <summary>403 — the CAPTCHA token was missing or failed verification.</summary>
public class CaptchaVerificationError(string? details = null)
    : ApiError(StatusCodes.Status403Forbidden, "captcha_verification_failed", details);

/// <summary>A single field-level constraint violation returned in <see cref="ValidationApiError"/>.</summary>
/// <param name="Property">camelCase JSON property path (e.g. <c>"email"</c>, <c>"address.city"</c>).</param>
/// <param name="Code">Machine-readable constraint code for frontend i18n (e.g. <c>"required"</c>, <c>"length"</c>, <c>"email"</c>).</param>
public partial class ValidationProblem(string property, string code)
{
    public string Property { get; set; } = property;
    public string Code { get; set; } = code;
}

/// <summary>422 — the request body failed model validation. Includes a structured <c>problems</c> list for frontend i18n.</summary>
public class ValidationApiError : ObjectResult
{
    public ValidationApiError(IList<ValidationProblem> problems)
        : base(new { failure = "validation_error", problems })
    {
        StatusCode = StatusCodes.Status422UnprocessableEntity;
    }
}

/// <summary>500 — an internal operation failed unexpectedly (e.g. a downstream service call).</summary>
public class OperationFailedApiError(string? details = null)
    : ApiError(StatusCodes.Status500InternalServerError, "operation_failed", details);

/// <summary>503 — the application or its dependencies are not healthy.</summary>
public class ApplicationUnhealthyApiError(string? details = null)
    : ApiError(StatusCodes.Status503ServiceUnavailable, "application_unhealthy", details);

/// <summary>400 — a CMS interaction was attempted but failed (e.g. ticket creation rejected by Directus).</summary>
public class CmsInteractionFailedError(string? details = null)
    : ApiError(StatusCodes.Status400BadRequest, "cms_interaction_failed", details);

public class NoChangesError(string? details = null)
    : ApiError(StatusCodes.Status400BadRequest, "no_changes", details);