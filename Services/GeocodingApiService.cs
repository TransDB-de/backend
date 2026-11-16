using System.Globalization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

public record GeocodingResult
{
    public string Name { get; set; } = string.Empty;
    public GeoJsonPoint Location { get; set; } = new();
}

public interface IGeocodingService
{
    /// <summary>
    /// Resolve a location using the external geocoding service
    /// </summary>
    /// <param name="query">city name</param>
    /// <param name="location">geolocation coordinates</param>
    /// <returns>best fitting geocoding result</returns>
    public Task<Result<GeocodingResult>> ResolveLocationAsync(string? query, GeoJsonPoint? location);
}

public class GeocodingApiService : IGeocodingService
{
    private readonly HttpClient _httpClient;
    
    public GeocodingApiService(HttpClient httpClient, IOptions<GeocodingConfig> options)
    {
        this._httpClient = httpClient;
        this._httpClient.BaseAddress = new Uri(options.Value.Url);
        this._httpClient.DefaultRequestHeaders.Add("X-API-Key", options.Value.ApiKey);
    }

    /// <summary>
    /// Make an API call to the geolocation service.
    /// If both query and location are provided, the geocoding service will automatically prioritize the ccordinates
    /// </summary>
    /// <param name="query">string with a city name</param>
    /// <param name="location">geolocation coordinates</param>
    /// <returns>First geocoding result returned from the api</returns>
    private async Task<Result<GeocodingResult>> Geocode(string? query, GeoJsonPoint? location)
    {
        var queryDict = new Dictionary<string, string?>();

        if (location != null)
        {
            queryDict.Add("lat", location.Lat.ToString(CultureInfo.InvariantCulture));
            queryDict.Add("lon", location.Lng.ToString(CultureInfo.InvariantCulture));
        }

        if (query != null)
        {
            queryDict.Add("q", query);
        }

        if (queryDict.Count < 1)
        {
            return Result<GeocodingResult>.Failure(new Exception("no data for geocoding provided"));
        }
        
        var url = QueryHelpers.AddQueryString("/geocode", queryDict);
        
        try
        {
            var results = await this._httpClient.GetFromJsonAsync<GeocodingResult[]>(url);
            var result = results?.FirstOrDefault();

            if (result == null)
            {
                return Result<GeocodingResult>.Failure("geocoding failed");
            }
            
            return Result<GeocodingResult>.Success(result);
        }
        catch(Exception e)
        {
            return Result<GeocodingResult>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<Result<GeocodingResult>> ResolveLocationAsync(string? query, GeoJsonPoint? location)
    {
        var geo = await this.Geocode(query, location);

        if (geo.IsFailed)
        {
            return geo;
        }

        if (geo.Value != null && location != null)
        {
            geo.Value.Location = location;
        }

        return geo;
    }
}
