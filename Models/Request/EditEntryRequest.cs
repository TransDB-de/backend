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
        var addressChanged = AddressChanged(entry.Address);

        entry.Type = Type;
        entry.Name = Name;
        entry.Contact = Contact != null ? new ContactPerson(Contact) : null;
        entry.Email = Email;
        entry.Telephone = Telephone;
        entry.Website = Website;
        entry.Accessible = Accessible;
        entry.Telephone = Telephone;

        entry.Address.City = Address.City;
        entry.Address.Plz  = Address.Plz;
        entry.Address.Street = Address.Street;
        entry.Address.House = Address.House;

        entry.Attributes = Attributes;
        entry.Offers = Offers;
        entry.Specials = Specials;
        entry.Subject = Subject;

        return new EditEntryRequestApplyResult(addressChanged);
    }

    public bool HasChanged(Entry entry)
    {
        if (this.Type != entry.Type) return true;
        
        if (this.Name != entry.Name) return true;
        if (this.Email != entry.Email) return true;
        if (this.Telephone != entry.Telephone) return true;
        if (this.Website != entry.Website) return true;
        if (this.Accessible != entry.Accessible) return true;
        
        if (ContactChanged(entry.Contact)) return true;
        
        if (!this.Offers.SequenceEqual(entry.Offers)) return true;
        if (!this.Attributes.SequenceEqual(entry.Attributes)) return true;
        
        if (this.Specials != entry.Specials) return true;
        if (this.Subject != entry.Subject) return true;
        
        if (this.Type != entry.Type) return true;

        if (AddressChanged(entry.Address)) return true;
        
        return false;
    }
    
    private bool ContactChanged(ContactPerson? existing) => 
        existing?.AcademicTitle != this.Contact?.AcademicTitle || 
        existing?.FirstName != this.Contact?.FirstName || 
        existing?.LastName != this.Contact?.LastName;
    
    /// <summary>
    /// Checks if this request intent to update the address compared to an existing address
    /// </summary>
    /// <param name="existing">Address object from database entry</param>
    /// <returns>if address has been updated</returns>
    private bool AddressChanged(Address existing) => existing.CompareTo(this.Address);
}
