using System.ComponentModel.DataAnnotations;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

/// <summary>Carries the result of applying an edit request, indicating whether downstream side-effects are needed.</summary>
public record EditEntryRequestApplyResult(bool IsAddressChanged);

/// <summary>
/// Extends <see cref="CreateEntryRequest"/> with status flags and a mandatory comment for auditing.
/// Used by admins to fully replace an entry's content while preserving its identity.
/// </summary>
public class EditEntryRequest : CreateEntryRequest
{
    [Required(ErrorMessage = "required"), StringLength(2000, MinimumLength = 1, ErrorMessage = "length")]
    public string Comment { get; set; } = string.Empty;

    /// <summary>Applies all request fields onto an existing entry, preserving identity and audit metadata.</summary>
    public EditEntryRequestApplyResult ApplyTo(Entry entry)
    {
        entry.Type = Type;
        entry.Name = Name;
        entry.Contact = this.Contact;
        entry.Email = Email;
        entry.Telephone = Telephone;
        entry.Website = Website;
        entry.Accessible = Accessible;
        entry.Telephone = Telephone;
        
        entry.Address =  this.Address;
        
        entry.Attributes = Attributes;
        entry.Offers = Offers;
        entry.Specials = Specials;
        entry.Subject = Subject;

        var addressChanged = this.Address.DiffersFrom(entry.Address);
        
        return new EditEntryRequestApplyResult(addressChanged);
    }

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
