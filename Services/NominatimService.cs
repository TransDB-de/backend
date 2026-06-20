using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.WebUtilities;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

public interface INominatimService
{
    /// <summary>
    /// Geocodes a postal address to a GeoJSON point using the Nominatim API.
    /// Respects the Nominatim fair-use policy of at most one request per second.
    /// Returns a failed result if no match is found or the request fails.
    /// </summary>
    Task<Result<GeoJsonPoint>> GetCoordinatesAsync(Address address);
}

public class NominatimService(HttpClient httpClient) : INominatimService
{
    // Static so the queue and last-request timestamp are shared across all transient instances
    private static readonly SemaphoreSlim _queue = new(1, 1);
    private static DateTime _lastRequestAt = DateTime.MinValue;

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <inheritdoc/>
    public async Task<Result<GeoJsonPoint>> GetCoordinatesAsync(Address address)
    {
        await _queue.WaitAsync();
        try
        {
            var elapsed = DateTime.UtcNow - _lastRequestAt;
            var remaining = TimeSpan.FromMilliseconds(1100) - elapsed;
            if (remaining > TimeSpan.Zero)
            {
                await Task.Delay(remaining);
            }

            _lastRequestAt = DateTime.UtcNow;

            var url = BuildSearchUrl(address);
            var response = await httpClient.GetAsync(url);
            
            if (!response.IsSuccessStatusCode)
            {
                return Result<GeoJsonPoint>.Failure($"nominatim request failed with status {response.StatusCode}", EFailureType.Unexpected);
            }

            var json = await response.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<NominatimResult[]>(json, JsonOptions);
            if (results == null || results.Length == 0)
            {
                return Result<GeoJsonPoint>.Failure("no coordinates found for address");
            }

            return Result<GeoJsonPoint>.Success(new GeoJsonPoint
            {
                Coordinates =
                [
                    decimal.Parse(results[0].Lon, System.Globalization.CultureInfo.InvariantCulture),
                    decimal.Parse(results[0].Lat, System.Globalization.CultureInfo.InvariantCulture)
                ]
            });
        }
        catch (Exception e)
        {
            return Result<GeoJsonPoint>.Failure(e);
        }
        finally
        {
            _queue.Release();
        }
    }

    /// <summary>
    /// Builds the Nominatim search query URL from an <see cref="Address"/>.
    /// </summary>
    private static string BuildSearchUrl(Address address)
    {
        var query = new Dictionary<string, string?>
        {
            ["city"] = address.City,
            ["format"] = "json",
            ["limit"] = "1"
        };

        if (!string.IsNullOrWhiteSpace(address.Plz))
        {
            query["postalcode"] = address.Plz;
        }

        if (!string.IsNullOrWhiteSpace(address.Street))
            query["street"] = address.House != null
                ? address.Street + " " + address.House
                : address.Street;

        return QueryHelpers.AddQueryString("/search", query);
    }

    private class NominatimResult
    {
        [JsonPropertyName("lat")]
        public string Lat { get; set; } = string.Empty;

        [JsonPropertyName("lon")]
        public string Lon { get; set; } = string.Empty;
    }
}
