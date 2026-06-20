using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MongoDB.Bson;

namespace transdb_backend_net.Models.Request;

[JsonConverter(typeof(JsonStringEnumConverter<ReportType>))]
public enum ReportType
{
    [JsonStringEnumMemberName("report")]
    Report,
    [JsonStringEnumMemberName("edit")]
    Edit,
    [JsonStringEnumMemberName("other")]
    Other,
}

public class ReportRequest
{
    [Required(ErrorMessage = "required")]
    public ObjectId Id { get; set; }

    [Required(ErrorMessage = "required")]
    [EnumDataType(typeof(ReportType), ErrorMessage = "invalid_value")]
    public ReportType Type { get; set; }

    [StringLength(2000, ErrorMessage = "length")]
    public string? Message { get; set; }
}
