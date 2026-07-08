using System.Text.Json;
using Microsoft.Extensions.Options;
using System.Web;
using transdb_backend_net.Models.Config;

namespace transdb_backend_net.Services;

public interface ICaptchaService
{
    /// <summary>
    /// Verifies a Cap CAPTCHA token against the configured Cap instance.
    /// Returns false if the token is invalid, expired, or the request fails.
    /// </summary>
    Task<bool> VerifyAsync(string token);
}

public record CaptchaVerifyResult(bool success);

public class CaptchaService(HttpClient httpClient, IOptions<CaptchaConfig> config) : ICaptchaService
{
    private readonly CaptchaConfig _config = config.Value;

    /// <inheritdoc/>
    public async Task<bool> VerifyAsync(string token)
    {
        var body = JsonSerializer.Serialize(new { secret = _config.Secret, response = token });
        var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");

        try
        {
            var uriBuilder = new UriBuilder(httpClient.BaseAddress!)
            {
                Path = string.Join("/", string.Empty, _config.SiteKey, "siteverify")
            };
            var response = await httpClient.PostAsync(uriBuilder.Uri, content);
            if (!response.IsSuccessStatusCode) return false;

            var json = await response.Content.ReadFromJsonAsync<CaptchaVerifyResult>();
            return json is { success: true };
        }
        catch
        {
            return false;
        }
    }
}
