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
}
