using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using transdb_backend_net.Exceptions;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

[JsonConverter(typeof(JsonStringEnumConverter<CmsTicketType>))]
public enum CmsTicketType
{
    [JsonStringEnumMemberName("new-entry")]
    NewEntry,
    [JsonStringEnumMemberName("report")]
    Report,
    [JsonStringEnumMemberName("edit")]
    Edit,
    [JsonStringEnumMemberName("other")]
    Other,
}

public class DirectusUser
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
}

public class DirectusManagementUser
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("directus_user")]
    public string DirectusUserId { get; set; } = string.Empty;

    [JsonPropertyName("admin")]
    public bool Admin { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public interface ICmsService
{
    /// <summary>
    /// Authenticates against Directus and returns a short-lived access token.
    /// </summary>
    Task<Result<string>> DirectusLoginAsync(LoginRequest credentials);

    /// <summary>
    /// Fetches the currently authenticated Directus user using the given access token.
    /// </summary>
    Task<Result<DirectusUser>> GetCurrentUserAsync(string directusToken);

    /// <summary>
    /// Looks up the management_users entry for the given Directus user ID using the configured admin access token.
    /// Returns null if no entry exists.
    /// </summary>
    Task<Result<DirectusManagementUser>> GetManagementUserAsync(string userId);

    /// <summary>Fetches all users from the management_users collection with their Directus user details.</summary>
    Task<Result<List<DirectusUser>>> GetAllUsersAsync();

    /// <summary>
    /// Creates a review ticket in Directus CMS for the given entry.
    /// Returns the created ticket's ID.
    /// </summary>
    Task<Result<string>> CreateTicketAsync(string title, string? entryId, CmsTicketType type, string? description);
}

public class CmsService(HttpClient httpClient, IOptions<CmsConfig> config) : ICmsService
{
    private readonly CmsConfig _config = config.Value;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly JsonSerializerOptions CmsPostOptions = new() { Converters = { new JsonStringEnumConverter<CmsTicketType>() } };
    
    /// <inheritdoc/>
    public async Task<Result<string>> DirectusLoginAsync(LoginRequest credentials)
    {
        try
        {
            var response = await httpClient.PostAsJsonAsync("/auth/login", credentials);
            if (!response.IsSuccessStatusCode) return Result<string>.Failure($"cms login failed with status code {response.StatusCode}");

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            var token = doc.RootElement.GetProperty("data").GetProperty("access_token").GetString();

            if (token == null)
            {
                return Result<string>.Failure("token missing from response");
            }
            
            return new Result<string>(token);
        }
        catch (Exception e)
        {
            return Result<string>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<Result<DirectusUser>> GetCurrentUserAsync(string directusToken)
    {
        var meUrl = QueryHelpers.AddQueryString("/users/me", "fields", "id,first_name,last_name");
        var request = new HttpRequestMessage(HttpMethod.Get, meUrl);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", directusToken);

        try
        {
            var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return Result<DirectusUser>.Failure("cms user request failed");

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var user =  doc.RootElement.GetProperty("data").Deserialize<DirectusUser>(JsonOptions);
            return new Result<DirectusUser>(user);
        }
        catch(Exception e)
        {
            return Result<DirectusUser>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<Result<DirectusManagementUser>> GetManagementUserAsync(string userId)
    {
        var managementUrl = QueryHelpers.AddQueryString("/items/management_users", new Dictionary<string, string?>
        {
            ["fields"] = "id,user,admin,status",
            ["filter[user][_eq]"] = userId,
            ["limit"] = "1"
        });

        try
        {
            var response = await httpClient.GetAsync(managementUrl);
            if (!response.IsSuccessStatusCode) return Result<DirectusManagementUser>.Failure($"cms management user failed with status code {response.StatusCode}");

            var json = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(json);
            var data = doc.RootElement.GetProperty("data");

            if (data.GetArrayLength() == 0) return Result<DirectusManagementUser>.Failure("cms management user not found");
            var user = data[0].Deserialize<DirectusManagementUser>(JsonOptions);
            return new Result<DirectusManagementUser>(user);
        }
        catch(Exception e)
        {
            return Result<DirectusManagementUser>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<Result<List<DirectusUser>>> GetAllUsersAsync()
    {
        var url = QueryHelpers.AddQueryString("/items/management_users", new Dictionary<string, string?>
        {
            ["fields"] = "user.id,user.first_name,user.last_name",
            ["limit"] = "-1"
        });
        
        try
        {
            var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return Result<List<DirectusUser>>.Failure($"cms users request failed with status {response.StatusCode}");

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var users = doc.RootElement.GetProperty("data")
                .EnumerateArray()
                .Select(e => e.GetProperty("user").Deserialize<DirectusUser>(JsonOptions))
                .Where(u => u != null)
                .Select(u => u!)
                .ToList();

            return Result<List<DirectusUser>>.Success(users);
        }
        catch (Exception e)
        {
            return Result<List<DirectusUser>>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<Result<string>> CreateTicketAsync(string title, string? entryId, CmsTicketType type, string? description)
    {
        try
        {
            var url = QueryHelpers.AddQueryString($"/items/{_config.TicketCollection}", "fields", "id");
            var response = await httpClient.PostAsJsonAsync(url, new { title, description, type, entry_id = entryId }, CmsPostOptions);
            if (!response.IsSuccessStatusCode)
            {
                return Result<string>.Failure($"cms ticket creation failed with status {response.StatusCode}", EFailureType.Unexpected);
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var id = doc.RootElement.GetProperty("data").GetProperty("id").ToString();
            return Result<string>.Success(id);
        }
        catch (Exception e)
        {
            return Result<string>.Failure(e);
        }
    }
}
