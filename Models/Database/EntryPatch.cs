using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Utils;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Database;

public enum EEntryPatchStatus
{
    Open = 0,
    AcceptedFull = 1,
    AcceptedPartial = 2,
    Rejected = 3,
}

public enum EEntryPatchType
{
    DirectEdit = 0,
    ProposedPatch = 1,
    ProposedRemoval = 2
}

public class EntryPatch
{
    public EntryPatch() {}

    public EntryPatch(EEntryPatchType type, string comment, Entry original, EditEntryRequest? request, string? userId = null)
    {
        this.EntryId = original.Id;

        this.Comment = comment;

        this.Type = type;
        
        this.UserId = userId;

        if (request != null)
        {
            this.Patch = new EntryPatchData(original, request);
        }
    }
    
    [BsonId]
    public ObjectId Id { get; set; }
    
    public ObjectId EntryId { get; set; }
    
    public EEntryPatchStatus Status { get; set; } =  EEntryPatchStatus.Open;
    
    public EEntryPatchType Type  { get; set; } = EEntryPatchType.ProposedPatch;
    
    public string Comment { get; set; } = string.Empty;
    
    public string? UserId { get; set; } = null;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public EntryPatchData? Patch { get; set; } = null;
}

public class EntryPatchDataAddress
{
    public EntryPatchDataAddress() {}
    
    public EntryPatchDataAddress(Address original, AddressRequest request)
    {
        this.City = FieldPatch<string>.CompareAndCreate(original.City, request.City);
        this.Plz = FieldPatch<string>.CompareAndCreate(original.Plz, request.Plz);
        this.Street = FieldPatch<string>.CompareAndCreate(original.Street, request.Street);
        this.House = FieldPatch<string>.CompareAndCreate(original.House, request.House);
    }
    
    public FieldPatch<string>? City { get; set; }
    public FieldPatch<string>? Plz { get; set; }
    public FieldPatch<string>? Street { get; set; }
    public FieldPatch<string>? House { get; set; }
}

public class EntryPatchDataContactPerson
{
    public EntryPatchDataContactPerson() {}
    
    public EntryPatchDataContactPerson(ContactPerson original, ContactPerson request)
    {
        this.AcademicTitle = FieldPatch<AcademicTitle?>.CompareAndCreate(original.AcademicTitle, request.AcademicTitle);
        this.FirstName = FieldPatch<string>.CompareAndCreate(original.FirstName, request.FirstName);
        this.LastName = FieldPatch<string>.CompareAndCreate(original.LastName, request.LastName);
    }
    
    public FieldPatch<AcademicTitle?>? AcademicTitle { get; set; }
    public FieldPatch<string>? FirstName { get; set; }
    public FieldPatch<string>? LastName { get; set; }
}

/// <summary>
/// Contains the specific entry fields that should be changed
/// </summary>
public class EntryPatchData
{
    public EntryPatchData() { }
    
    public EntryPatchData(Entry original, EditEntryRequest request)
    {
        this.Type = FieldPatch<EEntryType>.CompareAndCreate(original.Type, request.Type);
            
        this.Name = FieldPatch<string>.CompareAndCreate(original.Name, request.Name);

        if (original.Address.DiffersFrom(request.Address))
        {
            this.Address = new EntryPatchDataAddress(original.Address, request.Address);
        }

        if (original.Contact != null && request.Contact != null && original.Contact.DiffersFrom(request.Contact))
        {
            this.Contact = new EntryPatchDataContactPerson(original.Contact, request.Contact);
        }
        
        this.Website = FieldPatch<string>.CompareAndCreate(original.Website, request.Website);
        this.Email = FieldPatch<string>.CompareAndCreate(original.Email, request.Email);
        this.Telephone = FieldPatch<string>.CompareAndCreate(original.Telephone, request.Telephone);
        
        this.Accessible = FieldPatch<bool?>.CompareAndCreate(original.Accessible, request.Accessible);
        
        this.Offers = ListPatch<EEntryOffer>.CompareAndCreate(original.Offers, request.Offers);
        this.Attributes = ListPatch<EEntryAttribute>.CompareAndCreate(original.Attributes, request.Attributes);
        
        this.Subject = FieldPatch<TherapistSubject?>.CompareAndCreate(original.Subject, request.Subject);
        
        this.Specials = FieldPatch<string>.CompareAndCreate(original.Specials, request.Specials);
    }
    
    public FieldPatch<EEntryType>? Type { get; set; }
    
    public FieldPatch<string>? Name { get; set; }
    
    public EntryPatchDataAddress? Address { get; set; }
    
    public EntryPatchDataContactPerson? Contact { get; set; }
    
    public FieldPatch<string>? Website { get; set; }
    public FieldPatch<string>? Email { get; set; }
    public FieldPatch<string>? Telephone { get; set; }
    
    public FieldPatch<bool?>? Accessible { get; set; }
    
    public ListPatch<EEntryOffer>? Offers { get; set; }
    public ListPatch<EEntryAttribute>? Attributes { get; set; }
    
    public FieldPatch<TherapistSubject?>? Subject { get; set; }
    
    public FieldPatch<string>? Specials { get; set; }
}