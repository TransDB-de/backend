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
    public EntryStatus Status { get; set; } = new();
    
    public bool? RemoveDuplication { get; set; }

    [Required(ErrorMessage = "required"), StringLength(2000, MinimumLength = 1, ErrorMessage = "length")]
    public string Comment { get; set; } = string.Empty;

    /// <summary>Applies all request fields onto an existing entry, preserving identity and audit metadata.</summary>
    public EditEntryRequestApplyResult ApplyTo(Entry entry)
    {
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
        entry.Status.Approved = Status.Approved;
        entry.Status.Blocked = Status.Blocked;
        entry.Status.Archived = Status.Archived;

        if (RemoveDuplication == true)
        {
            entry.PossibleDuplicate = null;
        }

        return new EditEntryRequestApplyResult(AddressChanged(entry.Address));
    }
    
    /// <summary>
    /// Checks if this request intent to update the address compared to an existing address
    /// </summary>
    /// <param name="existing">Address object from database entry</param>
    /// <returns>if address has been updated</returns>
    private bool AddressChanged(Address existing) =>
        existing.City != this.Address.City ||
        existing.Plz != this.Address.Plz ||
        existing.Street != this.Address.Street ||
        existing.House != this.Address.House;
}
