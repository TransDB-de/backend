using System.Text.Json.Serialization;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Database;

/// <summary>Optional contact person associated with an entry (e.g. a therapist's name).</summary>
public class ContactPerson
{
    public AcademicTitle? AcademicTitle { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }

    public ContactPerson() { }

    public ContactPerson(ContactPersonRequest request)
    {
        AcademicTitle = request.AcademicTitle;
        FirstName = request.FirstName;
        LastName = request.LastName;
    }
}

/// <summary>Physical address of an entry. Only <see cref="City"/> is required.</summary>
public class Address
{
    public string City { get; set; } = string.Empty;
    public string? Plz { get; set; }
    public string? Street { get; set; }
    public string? House { get; set; }

    public Address() { }

    public Address(AddressRequest request)
    {
        City = request.City;
        Plz = request.Plz;
        Street = request.Street;
        House = request.House;
    }
}

/// <summary>Moderation flags controlling whether an entry is visible and editable.</summary>
public class EntryStatus
{
    public bool Approved { get; set; }
    public bool Blocked { get; set; }
    public bool Archived { get; set; }
    
    /// <summary>
    /// Whether this entry should be shown to unauthenticated users.
    /// Not persisted — evaluated at runtime from the status flags.
    /// </summary>
    [BsonIgnore]
    [JsonIgnore]
    public bool ShouldBePubliclyVisible => this.Approved && !this.Blocked && !this.Archived;
}

/// <summary>
/// Result of the duplicate detection check, stored on the entry and returned in the API response.
/// <see cref="Probability"/> is the ratio of the achieved score to the maximum possible score
/// for this entry's field set (0–1), so entries with fewer optional fields are not penalised.
/// </summary>
public class DuplicateMatch
{
    public ObjectId EntryId { get; set; }
    public double Probability { get; set; }
}

/// <summary>Core domain entity representing a trans-relevant healthcare or community resource.</summary>
public class Entry
{
    [BsonId]
    public ObjectId Id { get; set; }

    public EntryStatus Status { get; set; } = new();

    public EEntryType Type { get; set; }
    public string Name { get; set; } = string.Empty;

    [BsonIgnoreIfNull]
    public ContactPerson? Contact { get; set; }

    public string? Email { get; set; }
    public string? Telephone { get; set; }
    public string? Website { get; set; }
    public bool? Accessible { get; set; }

    public Address Address { get; set; } = new();
    public GeoJsonPoint? Location { get; set; }

    public List<EEntryAttribute> Attributes { get; set; } = [];
    public List<EEntryOffer> Offers { get; set; } = [];
    public string? Specials { get; set; }
    public TherapistSubject? Subject { get; set; }

    /// <summary>Set when a likely duplicate is detected on submission. Cleared manually by an admin.</summary>
    [BsonIgnoreIfNull]
    public DuplicateMatch? PossibleDuplicate { get; set; }

    public Entry() { }

    public Entry(CreateEntryRequest request)
    {
        Type = request.Type;
        Name = request.Name;
        Contact = request.Contact != null ? new ContactPerson(request.Contact) : null;
        Email = request.Email;
        Telephone = request.Telephone;
        Website = request.Website;
        Accessible = request.Accessible;
        Address = new Address(request.Address);
        Attributes = request.Attributes;
        Offers = request.Offers;
        Specials = request.Specials;
        Subject = request.Subject;
    }
}

/// <summary>Entry projected from a geo-aggregation pipeline, carrying the distance in kilometres.</summary>
public class EntryWithDistance : Entry
{
    public double? Distance { get; set; }
}
