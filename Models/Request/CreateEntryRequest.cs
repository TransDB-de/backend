using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using PhoneNumbers;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Request;

public class AddressRequest
{
    [Required(ErrorMessage = "required"), StringLength(50, MinimumLength = 2, ErrorMessage = "length")]
    public string City { get; set; } = string.Empty;

    [StringLength(10, ErrorMessage = "length")]
    public string? Plz { get; set; }

    [StringLength(80, ErrorMessage = "length")]
    public string? Street { get; set; }

    [StringLength(10, ErrorMessage = "length")]
    public string? House { get; set; }
}


/// <summary>Optional contact person fields submitted alongside an entry.</summary>
public class ContactPersonRequest
{
    [EnumDataType(typeof(AcademicTitle), ErrorMessage = "invalid_value")]
    public AcademicTitle? AcademicTitle { get; set; }

    [StringLength(50, MinimumLength = 2, ErrorMessage = "length")]
    public string? FirstName { get; set; }

    [StringLength(50, MinimumLength = 2, ErrorMessage = "length")]
    public string? LastName { get; set; }

    public static ContactPersonRequest From(ContactPerson contact)
    {
        return new ContactPersonRequest()
        {
            AcademicTitle = contact.AcademicTitle,
            FirstName = contact.FirstName,
            LastName = contact.LastName
        };
    }
    
    public bool CompareTo(ContactPersonRequest request)
    {
        return 
            this.AcademicTitle != request.AcademicTitle ||
            this.FirstName != request.FirstName ||
            this.LastName != request.LastName;
    }
}

/// <summary>
/// Payload for submitting a new entry. Implements <see cref="IValidatableObject"/> to enforce
/// that the supplied offers and attributes are valid for the chosen <see cref="EEntryType"/>.
/// </summary>
public class CreateEntryRequest : IValidatableObject
{
    public CreateEntryRequest() { }
    
    public CreateEntryRequest(Entry entry)
    {
        Type = entry.Type;
        Name = entry.Name;
        Contact = entry.Contact == null ? null : new ContactPersonRequest
        {
            AcademicTitle = entry.Contact.AcademicTitle,
            FirstName = entry.Contact.FirstName,
            LastName = entry.Contact.LastName,
        };
        Email = entry.Email;
        Telephone = entry.Telephone;
        Website = entry.Website;
        Accessible = entry.Accessible;
        Address = new AddressRequest
        {
            City = entry.Address.City,
            Plz = entry.Address.Plz,
            Street = entry.Address.Street,
            House = entry.Address.House,
        };
        Offers = entry.Offers;
        Attributes = entry.Attributes;
        Specials = entry.Specials;
        Subject = entry.Subject;
    }

    [Required(ErrorMessage = "required"), StringLength(260, MinimumLength = 1, ErrorMessage = "length")]
    public string Name { get; set; } = string.Empty;

    public ContactPersonRequest? Contact { get; set; }

    [EmailAddress(ErrorMessage = "malformed_email"), StringLength(320, MinimumLength = 5, ErrorMessage = "length")]
    public string? Email { get; set; }

    [Url(ErrorMessage = "malformed_url"), StringLength(500, MinimumLength = 5, ErrorMessage = "length")]
    public string? Website { get; set; }
    
    [StringLength(30, MinimumLength = 5, ErrorMessage = "length")]
    public string? Telephone { get; set; }

    [Required(ErrorMessage = "required")]
    [EnumDataType(typeof(EEntryType), ErrorMessage = "invalid_value")]
    public EEntryType Type { get; set; }

    public bool? Accessible { get; set; }

    [Required(ErrorMessage = "required")]
    public AddressRequest Address { get; set; } = new();

    public List<EEntryOffer> Offers { get; set; } = [];
    public List<EEntryAttribute> Attributes { get; set; } = [];

    [StringLength(280, ErrorMessage = "length")]
    public string? Specials { get; set; }
    
    [EnumDataType(typeof(TherapistSubject), ErrorMessage = "invalid_value")]
    public TherapistSubject? Subject { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var validationResults = new List<ValidationResult>();
        
        if (Telephone != null)
        {
            try
            {
                var util = PhoneNumberUtil.GetInstance();
                var parsedPhoneNumber = util.Parse(Telephone, "DE");
                if (util.IsValidNumber(parsedPhoneNumber))
                {
                    this.Telephone = util.Format(parsedPhoneNumber, PhoneNumberFormat.INTERNATIONAL);
                }
                else
                {
                    validationResults.Add(new ValidationResult("invalid_telephone_number", ["telephone"]));
                }
            }
            catch (Exception e)
            {
                validationResults.Add(new ValidationResult("invalid_format", ["telephone"]));
            }
        }
        
        
        var allowedOffers = EntrySchema.GetAllowedOffers(Type);
        if (Offers.Any(o => !allowedOffers.Contains(o)))
        {
            validationResults.Add(new ValidationResult("value_not_allowed", ["offers"]));
        }
        
        var allowedAttributes = EntrySchema.GetAllowedAttributes(Type);
        if (Attributes.Any(o => !allowedAttributes.Contains(o)))
        {
            validationResults.Add(new ValidationResult("value_not_allowed", ["attributes"]));
        }
        
        if (Subject != null && Type != EEntryType.Therapist)
        {
            validationResults.Add(new ValidationResult("value_not_allowed", ["subject"]));
        }

        return validationResults;
    }
}
