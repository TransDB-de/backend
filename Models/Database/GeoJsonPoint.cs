using System.Text.Json.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace transdb_backend_net.Models.Database;

public class GeoJsonPoint
{
    public GeoJsonPoint() {}

    /// <summary>
    /// constructor so we don't have to deal with the reverse order of the GeoJson Format
    /// </summary>
    public GeoJsonPoint(decimal latitude, decimal longitude)
    {
        Coordinates = [longitude, latitude];
    }
    
    public string Type { get; set; } = "Point";

    // [longitude, latitude]
    public decimal[] Coordinates { get; set; } = [];
    
    [BsonIgnore]
    [JsonIgnore]
    public decimal Lat => Coordinates[1];
    
    [BsonIgnore]
    [JsonIgnore]
    public decimal Lng => Coordinates[0];
}
