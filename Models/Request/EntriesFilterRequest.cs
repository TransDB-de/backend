using System.ComponentModel.DataAnnotations;
using MongoDB.Driver;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Request;

/// <summary>
/// Query parameters for the public entry list endpoint.
/// Translates HTTP query values into a set of MongoDB filter definitions via <see cref="DatabaseConditions"/>.
/// </summary>
public class EntriesFilterRequest
{
    [EnumDataType(typeof(EEntryType), ErrorMessage = "invalid_value")]
    public EEntryType? Type { get; set; }
    public string? Text { get; set; }
    public string? Location { get; set; }

    public decimal? Lat { get; set; }
    public decimal? Long { get; set; }

    /// <summary>
    /// Constructs a <see cref="GeoJsonPoint"/> from <see cref="Lat"/> and <see cref="Long"/> when both are provided.
    /// GeoJSON coordinates are [longitude, latitude] — note the reversed order.
    /// </summary>
    public GeoJsonPoint? GeoLocation
    {
        get
        {
            if (this.Lat.HasValue && this.Long.HasValue)
            {
                return new GeoJsonPoint { Coordinates = [this.Long.Value, this.Lat.Value] };
            }

            return null;
        }
    }

    public List<EEntryOffer>? Offers { get; set; }
    public List<EEntryAttribute>? Attributes { get; set; }
    public bool? Accessible { get; set; }
    public int Page { get; set; } = 0;

    /// <summary>
    /// Lazily builds and caches the list of MongoDB filter conditions derived from the request properties.
    /// Subclasses can inject additional conditions via <see cref="AddExtraConditions"/>.
    /// Built once on first access; subsequent reads return the cached list.
    /// </summary>
    public List<FilterDefinition<Entry>> DatabaseConditions
    {
        get
        {
            if (field != null) return field;

            field = new List<FilterDefinition<Entry>>();

            if (Type != null)
                field.Add(Builders<Entry>.Filter.Eq(e => e.Type, Type));

            if (Accessible.HasValue)
                field.Add(Builders<Entry>.Filter.Eq(e => e.Accessible, Accessible.Value));

            if (Offers?.Count > 0)
                field.Add(Builders<Entry>.Filter.AnyIn(e => e.Offers, Offers));

            if (Attributes?.Count > 0)
                field.Add(Builders<Entry>.Filter.AnyIn(e => e.Attributes, Attributes));

            if (!string.IsNullOrWhiteSpace(Text))
                field.Add(Builders<Entry>.Filter.Text(Text));

            AddExtraConditions(field);

            return field;
        }
    }

    /// <summary>
    /// Template method for subclasses to append additional filter conditions
    /// without reimplementing the shared base logic.
    /// </summary>
    protected virtual void AddExtraConditions(List<FilterDefinition<Entry>> conditions) { }
}
