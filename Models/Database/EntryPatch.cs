using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using transdb_backend_net.Utils;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Schema;

namespace transdb_backend_net.Models.Database;

public enum EEntryPatchStatus
{
    Open = 0,
    Accepted = 1,
    Rejected = 2,
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

    public EntryPatch(string comment, Entry original, EditEntryRequest? request, string? userId = null)
    {
        this.EntryId = original.Id;

        this.Comment = comment;
        
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
    
    [BsonIgnore]
    public EEntryPatchType Type => this switch {
        { UserId: not null } => EEntryPatchType.DirectEdit,
        { Patch: null } => EEntryPatchType.ProposedRemoval,
        _ => EEntryPatchType.ProposedPatch
    };
    
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
        this.City = FieldPatchHelper.CompareAndCreate(original.City, request.City);
        this.Plz = FieldPatchHelper.CompareAndCreate(original.Plz, request.Plz);
        this.Street = FieldPatchHelper.CompareAndCreate(original.Street, request.Street);
        this.House = FieldPatchHelper.CompareAndCreate(original.House, request.House);
    }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? City { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? Plz { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? Street { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? House { get; set; }

    public void ApplyTo(Address target)
    {
        target.City = FieldPatchHelper.GetDesiredValue(target.City, this.City)!;
        target.Plz = FieldPatchHelper.GetDesiredValue(target.Plz, this.Plz);
        target.Street = FieldPatchHelper.GetDesiredValue(target.Street, this.Street);
        target.House = FieldPatchHelper.GetDesiredValue(target.House, this.House);
    }

    /// <summary>Copies per-field decisions — flags only, never values. Absent field = rejected.</summary>
    public void ApplyDecisions(EntryPatchDataAddress? decisions)
    {
        this.City?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.City);
        this.Plz?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Plz);
        this.Street?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Street);
        this.House?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.House);
    }

    /// <summary>True if any accepted address field changed — geo location needs updating.</summary>
    public bool AnyAcceptedField =>
        City?.PatchAccepted == true || Plz?.PatchAccepted == true ||
        Street?.PatchAccepted == true || House?.PatchAccepted == true;
}

/// <summary>
/// Contains the specific entry fields that should be changed
/// </summary>
public class EntryPatchData
{
    public EntryPatchData() { }
    
    /// <summary>
    /// Creates an EntryPatchData object automatically containing only the changes wanted by the diff between the original and the request
    /// </summary>
    /// <param name="original">The original full dataset</param>
    /// <param name="request">the put request with the new values</param>
    public EntryPatchData(Entry original, EditEntryRequest request)
    {
        this.Type = FieldPatchHelper.CompareAndCreate(original.Type, request.Type);
            
        this.Name = FieldPatchHelper.CompareAndCreate(original.Name, request.Name);

        if (original.Address.DiffersFrom(request.Address))
        {
            this.Address = new EntryPatchDataAddress(original.Address, request.Address);
        }

        // whole-object, not field-wise: keeps add/remove expressible
        this.Contact = FieldPatchHelper.CompareAndCreate(original.Contact, request.Contact);

        this.Website = FieldPatchHelper.CompareAndCreate(original.Website, request.Website);
        this.Email = FieldPatchHelper.CompareAndCreate(original.Email, request.Email);
        this.Telephone = FieldPatchHelper.CompareAndCreate(original.Telephone, request.Telephone);
        
        this.Accessible = FieldPatchHelper.CompareAndCreate(original.Accessible, request.Accessible);
        
        this.Offers = ListPatch<EEntryOffer>.CompareAndCreate(original.Offers, request.Offers);
        this.Attributes = ListPatch<EEntryAttribute>.CompareAndCreate(original.Attributes, request.Attributes);
        
        this.Subject = FieldPatchHelper.CompareAndCreate(original.Subject, request.Subject);
        
        this.Specials = FieldPatchHelper.CompareAndCreate(original.Specials, request.Specials);
    }
    
    [BsonIgnoreIfNull]
    public FieldPatch<EEntryType>? Type { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? Name { get; set; }
    
    [BsonIgnoreIfNull]
    public EntryPatchDataAddress? Address { get; set; }

    /// <summary>
    /// whole object patch, there is no reason any of the fields would change independently
    /// </summary>
    [BsonIgnoreIfNull]
    public FieldPatch<ContactPerson?>? Contact { get; set; }

    [BsonIgnoreIfNull]
    public FieldPatch<string>? Website { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? Email { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? Telephone { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<bool?>? Accessible { get; set; }
    
    [BsonIgnoreIfNull]
    public ListPatch<EEntryOffer>? Offers { get; set; }
    
    [BsonIgnoreIfNull]
    public ListPatch<EEntryAttribute>? Attributes { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<TherapistSubject?>? Subject { get; set; }
    
    [BsonIgnoreIfNull]
    public FieldPatch<string>? Specials { get; set; }
    
    public void ApplyTo(Entry target)
    {
        target.Name = FieldPatchHelper.GetDesiredValue(target.Name, this.Name)!;
        target.Type = FieldPatchHelper.GetDesiredValue(target.Type, this.Type);
        
        // whole-object apply, no per-field decisions for contacts
        target.Contact = FieldPatchHelper.GetDesiredValue(target.Contact, this.Contact);

        this.Address?.ApplyTo(target.Address);
        
        target.Website = FieldPatchHelper.GetDesiredValue(target.Website, this.Website);
        target.Email = FieldPatchHelper.GetDesiredValue(target.Email, this.Email);
        target.Telephone = FieldPatchHelper.GetDesiredValue(target.Telephone, this.Telephone);
        
        target.Accessible = FieldPatchHelper.GetDesiredValue(target.Accessible, this.Accessible);
        
        target.Offers = FieldPatchHelper.ApplyToList(target.Offers, this.Offers);
        target.Attributes = FieldPatchHelper.ApplyToList(target.Attributes, this.Attributes);
        
        target.Subject = FieldPatchHelper.GetDesiredValue(target.Subject, this.Subject);
        target.Specials = FieldPatchHelper.GetDesiredValue(target.Specials, this.Specials);
    }

    /// <summary>
    /// Copies per-field accept/reject decisions from the client onto this patch.
    /// Flags only, values are never taken from the client. Absent field = rejected.
    /// No value matching needed: patch values are immutable while Status == Open.
    /// </summary>
    public void ApplyDecisions(EntryPatchData? decisions)
    {
        this.Type?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Type);
        this.Name?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Name);
        this.Address?.ApplyDecisions(decisions?.Address);
        this.Contact?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Contact);
        this.Website?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Website);
        this.Email?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Email);
        this.Telephone?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Telephone);
        this.Accessible?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Accessible);
        this.Offers?.ApplyDecisions(decisions?.Offers);
        this.Attributes?.ApplyDecisions(decisions?.Attributes);
        this.Subject?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Subject);
        this.Specials?.PatchAccepted = FieldPatchHelper.IsAccepted(decisions?.Specials);
    }
}