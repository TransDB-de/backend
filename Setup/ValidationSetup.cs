using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.Extensions.Options;
using transdb_backend_net.Exceptions;

namespace transdb_backend_net.Setup;

/// <summary>
/// Configures MVC model binding to use camelCase JSON property names in validation errors
/// and maps all binding-level error messages to short codes for frontend i18n.
/// </summary>
public class ConfigureApiValidationMessages : IConfigureOptions<MvcOptions>
{
    public void Configure(MvcOptions options)
    {
        options.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider());

        // Map all model-binding-level errors to short codes
        options.ModelBindingMessageProvider.SetValueMustNotBeNullAccessor(_ => "required");
        options.ModelBindingMessageProvider.SetMissingBindRequiredValueAccessor(_ => "required");
        options.ModelBindingMessageProvider.SetValueMustBeANumberAccessor(_ => "format");
        options.ModelBindingMessageProvider.SetAttemptedValueIsInvalidAccessor((_, _) => "format");
        options.ModelBindingMessageProvider.SetNonPropertyValueMustBeANumberAccessor(() => "format");
        options.ModelBindingMessageProvider.SetNonPropertyAttemptedValueIsInvalidAccessor(_ => "format");
        options.ModelBindingMessageProvider.SetUnknownValueIsInvalidAccessor(_ => "format");
        options.ModelBindingMessageProvider.SetNonPropertyUnknownValueIsInvalidAccessor(() => "format");
        options.ModelBindingMessageProvider.SetMissingKeyOrValueAccessor(() => "required");
        options.ModelBindingMessageProvider.SetMissingRequestBodyRequiredValueAccessor(() => "required");
    }
}

/// <summary>
/// Replaces the default 400 ProblemDetails validation response with a structured
/// 422 response using short codes.
/// </summary>
public class ConfigureApiValidationBehaviour : IConfigureOptions<ApiBehaviorOptions>
{
    public void Configure(ApiBehaviorOptions options)
    {
        options.InvalidModelStateResponseFactory = BuildValidationResponse;
    }

    private static IActionResult BuildValidationResponse(ActionContext ctx)
    {
        // $. keys = JSON deserialiser errors (invalid type, unknown enum value, etc.)
        // non-$. keys with a known code = our DataAnnotations/IValidatableObject errors
        // If both are empty the body itself was missing or completely unparseable → 400
        var jsonProblems = GetJsonPathProblems(ctx);
        var validationProblems = GetValidationCodeProblems(ctx);

        if (jsonProblems.Count == 0 && validationProblems.Count == 0)
        {
            return new InvalidRequestApiError("request data could not be parsed");
        }

        return new ValidationApiError([.. jsonProblems, .. validationProblems]);
    }

    // Errors on $. keys come from the JSON deserialiser — always "format"
    private static List<ValidationProblem> GetJsonPathProblems(ActionContext ctx) =>
        ctx.ModelState
            .Where(kv => kv.Key.StartsWith("$.") && kv.Value?.Errors.Count > 0)
            .SelectMany(kv => kv.Value!.Errors.Select(_ => new ValidationProblem(kv.Key.Replace("$.", string.Empty), "format")))
            .ToList();

    // Errors on non-$. keys with a recognised code come from DataAnnotations/IValidatableObject
    private static List<ValidationProblem> GetValidationCodeProblems(ActionContext ctx) =>
        ctx.ModelState
            .Where(kv => !kv.Key.StartsWith("$.") && kv.Value?.Errors.Count > 0)
            .SelectMany(kv => kv.Value!.Errors
                .Select(e => new ValidationProblem(kv.Key.Replace("$.", string.Empty), e.ErrorMessage)))
            .ToList();
}
