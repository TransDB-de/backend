using System.ComponentModel.DataAnnotations;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

public class PatchEntryStatusRequest : IValidatableObject
{
    public bool? Approved { get; set; }
    public bool? Blocked { get; set; }
    public bool? Archived { get; set; }
    
    [StringLength(2000, ErrorMessage = "length")]
    public string? Comment { get; set; } = string.Empty;
    
    public bool? RemoveDuplication { get; set; }

    public void ApplyTo(Entry entry)
    {
        if (Approved.HasValue)
        {
            entry.Status.Approved = Approved.Value;

            // remove only on approval if not specifically requested not to
            if (RemoveDuplication != false)
            {
                entry.PossibleDuplicate = null;
            }
        }

        if (Blocked.HasValue)
        {
            entry.Status.Blocked = Blocked.Value;
        }

        if (Archived.HasValue)
        {
            entry.Status.Archived = Archived.Value;
        }

        if (RemoveDuplication.HasValue && RemoveDuplication == true)
        {
            entry.PossibleDuplicate = null;
        }
    }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if ((Blocked == true || Archived == true) && string.IsNullOrWhiteSpace(Comment))
            yield return new ValidationResult("required", [nameof(Comment)]);
    }
}
