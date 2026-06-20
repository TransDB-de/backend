using MongoDB.Bson;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Response;

/// <summary>
/// Projection of an <see cref="Entry"/> that is safe to expose to unauthenticated users.
/// Strips internal status flags and the duplicate match, keeping only publicly relevant fields.
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

/// <summary>Response returned after a successful entry submission, including the revocation token and any detected duplicate.</summary>
public class CreateEntryResponse
{
    public PublicEntryResponse Entry { get; set; }
    public string RevocationToken { get; set; }
    public DuplicateMatch? PossibleDuplicate { get; set; }

    public CreateEntryResponse(Entry entry, string revocationToken, DuplicateMatch? possibleDuplicate)
    {
        Entry = new PublicEntryResponse(entry);
        RevocationToken = revocationToken;
        PossibleDuplicate = possibleDuplicate;
    }
}

/// <summary>
/// Generic paginated response wrapper for entry list endpoints.
/// <see cref="More"/> is <c>true</c> when the returned page is full, signalling that another page likely exists.
/// </summary>
public class PaginatedEntryResponse<T>
{
    public List<T> Entries { get; set; } = [];
    /// <summary>Indicates that at least one more page of results may be available.</summary>
    public bool More { get; set; }
    public string? LocationName { get; set; }

    public PaginatedEntryResponse(List<T> entries, string? locationName, int itemsPerPage)
    {
        this.Entries = entries;
        // If the page is exactly full there may be more results, if its short, this was the last page.
        this.More = entries.Count >= itemsPerPage;
        this.LocationName = locationName;
    }
}
