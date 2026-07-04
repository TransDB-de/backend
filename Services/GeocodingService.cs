using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
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
    /// Searches for a location by name and returns the best match with its coordinates.
    /// </summary>
    Task<Result<GeocodingResult>> SearchByNameAsync(string query);

    /// <summary>
    /// Reverse-geocodes a coordinate pair to a human-readable location name.
    /// </summary>
    Task<Result<string>> GetLocationNameAsync(GeoJsonPoint geoLocation);
    
    Task<Result<GeocodingResult>> ResolveLocationAsync(string? query, GeoJsonPoint? location);
}

public class GeocodingService(HttpClient httpClient) : IGeocodingService
{
    /// <inheritdoc/>
    public async Task<Result<GeocodingResult>> SearchByNameAsync(string query)
    {
        var url = QueryHelpers.AddQueryString("/geocode", "q", query);
        try
        {
            var results = await httpClient.GetFromJsonAsync<GeocodingResult[]>(url);
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
    public async Task<Result<string>> GetLocationNameAsync(GeoJsonPoint geoLocation)
    {
        var url = QueryHelpers.AddQueryString("/geocode", new Dictionary<string, string?>
        {
            ["lat"] = geoLocation.Lat.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["lon"] = geoLocation.Lng.ToString(System.Globalization.CultureInfo.InvariantCulture)
        });
        
        try
        {
            var results = await httpClient.GetFromJsonAsync<GeocodingResult[]>(url);
            var name = results?.FirstOrDefault()?.Name;

            if (name == null)
            {
                return Result<string>.Failure("geocoding failed");
            }
            
            return Result<string>.Success(name);
        }
        catch(Exception e)
        {
            return Result<string>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<Result<GeocodingResult>> ResolveLocationAsync(string? query, GeoJsonPoint? location)
    {
        // if user has provided geolocation, we only need to resolve the name.
        if (location != null)
        {
            var nameResult = await this.GetLocationNameAsync(location);
            if (nameResult.IsFailed)
            {
                return Result<GeocodingResult>.Failure(nameResult);
            }
            
            // reuse user's geolocation as it is more accurate
            return Result<GeocodingResult>.Success(new GeocodingResult() { Location = location,  Name = nameResult.Value! });
        }
        
        if (!string.IsNullOrWhiteSpace(query))
        {
            var geoResult = await this.SearchByNameAsync(query);
            if (geoResult.IsFailed)
            {
                return Result<GeocodingResult>.Failure(geoResult);
            }
            
            return Result<GeocodingResult>.Success(new GeocodingResult() { Location = geoResult.Value.Location,  Name = geoResult.Value.Name });
        }
        
        return  Result<GeocodingResult>.Failure("geocoding failed");
    }
}
