using System.ComponentModel.DataAnnotations;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

/// <summary>
/// Extends <see cref="CreateEntryRequest"/> with a mandatory comment for auditing.
/// Used for proposing entry patches (public) and direct edits by admins.
/// </summary>
public class EditEntryRequest : CreateEntryRequest
{
    [Required(ErrorMessage = "required"), StringLength(2000, MinimumLength = 1, ErrorMessage = "length")]
    public string Comment { get; set; } = string.Empty;

    /// <summary>
    /// Checks if the data fields (user generated content, not moderation/status fields) changed
    /// </summary>
    /// <param name="original">original entry to compare to</param>
    /// <returns>true if things changed</returns>
    public bool DiffersFromDataField(Entry original)
    {
        if (this.Type != original.Type) return true;
        if (this.Name != original.Name) return true;

        // add/remove is a change too
        if ((this.Contact == null) != (original.Contact == null)) return true;
        if (this.Contact != null && this.Contact.DiffersFrom(original.Contact)) return true;
        
        if (this.Website != original.Website) return true;
        if (this.Email != original.Email) return true;
        if (this.Telephone != original.Telephone) return true;
        if (this.Accessible != original.Accessible) return true;
        
        if (!this.Offers.All(original.Offers.Contains) || this.Offers.Count != original.Offers.Count) return true;
        if (!this.Attributes.All(original.Attributes.Contains) || this.Attributes.Count != original.Attributes.Count) return true;
        
        if (this.Specials != original.Specials) return true;
        if (this.Subject != original.Subject) return true;
        
        return false;
    }
}
