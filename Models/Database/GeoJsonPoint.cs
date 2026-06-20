using System.Text.Json.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace transdb_backend_net.Models.Database;

public class GeoJsonPoint
{
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
