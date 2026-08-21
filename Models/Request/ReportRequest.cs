using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MongoDB.Bson;

namespace transdb_backend_net.Models.Request;

public enum ReportType
{
    Report,
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
    [Required(ErrorMessage = "required")]
    public string Message { get; set; }
}
