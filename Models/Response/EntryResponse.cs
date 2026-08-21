using MongoDB.Bson;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Response;

/// <summary>
/// Projection of an <see cref="Entry"/> that is safe to expose to unauthenticated users.
/// Strips internal administrative fields, keeping only publicly relevant fields.
/// </summary>
public class PublicEntryResponse
{
    public ObjectId Id { get; set; }
    public EEntryType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public ContactPerson? Contact { get; set; }
    public string? Email { get; set; }
    public string? Telephone { get; set; }
    public string? Website { get; set; }
    public bool? Accessible { get; set; }
    public Address? Address { get; set; }
    public List<EEntryAttribute> Attributes { get; set; } = [];
    public List<EEntryOffer> Offers { get; set; } = [];
    public string? Specials { get; set; }
    public TherapistSubject? Subject { get; set; }
    public double? Distance { get; set; }

    public PublicEntryResponse() { }

    public PublicEntryResponse(Entry entry)
    {
        Id = entry.Id;
        Type = entry.Type;
        Name = entry.Name;
        Contact = entry.Contact;
        Email = entry.Email;
        Telephone = entry.Telephone;
        Website = entry.Website;
        Accessible = entry.Accessible;
        Address = entry.Address;
        Attributes = entry.Attributes;
        Offers = entry.Offers;
        Specials = entry.Specials;
        Subject = entry.Subject;
        Distance = (entry as EntryWithDistance)?.Distance;
    }
}

public class EntryCreatedResponse(Entry entry, string revocationToken, DuplicateMatch? possibleDuplicate)
{
    public PublicEntryResponse Entry { get; set; } = new(entry);
    public string RevocationToken { get; set; } = revocationToken;
    public DuplicateMatch? PossibleDuplicate { get; set; } = possibleDuplicate;
}

/// <summary>
/// Generic paginated response wrapper.
/// <see cref="More"/> is <c>true</c> when the returned page is full, signaling that another page likely exists.
/// </summary>
public class PaginatedResponse<T>
{
    public List<T> Items { get; set; } = [];
    /// <summary>Indicates that at least one more page of results may be available.</summary>
    public bool More { get; set; }
    public string? LocationName { get; set; }

    public PaginatedResponse(List<T> items, bool hasMore, string? locationName = null)
    {
        Items = items;
        // If the page is exactly full there may be more results, if its short, this was the last page.
        More = hasMore;
        LocationName = locationName;
    }
}

