using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;

namespace transdb_backend_net.Utils;

/// <summary>
/// Puts a change proposal on top of the entry's current state before applying it. Without this,
/// accepting a proposal would just overwrite the entry with the proposal's full snapshot, and
/// any changes made to the entry in the meantime would be lost.
/// </summary>
public class EntryChangeProposalRebase(EntryChangeProposal proposal)
{
    /// <summary>
    /// Builds a new <see cref="EditEntryRequest"/> that only carries the fields the proposal
    /// actually wanted to change, put on top of the entry's current state.
    /// </summary>
    /// <param name="current">The entry's live state, right before applying the proposal.</param>
    /// <returns>
    /// A new changeset, same shape as <paramref name="changeset"/>. For simple fields: if the
    /// proposal changed a field, we keep the proposal's value, otherwise we take it from
    /// <paramref name="current"/>. Offers and Attributes are merged item by item instead of as a
    /// whole list (see <see cref="RebaseList{T}"/>), and Contact/Address are merged field by field
    /// too (see <see cref="RebaseContact"/>/<see cref="RebaseAddress"/>) - so an unrelated change
    /// to e.g. just the street doesn't get lost just because the proposal only touched the house
    /// number. If the same field was changed both by the proposal and somewhere else, the
    /// proposal wins. That's on purpose, not a bug.
    /// </returns>
    public EditEntryRequest Rebase(Entry current)
    {
        var original = proposal.OriginalEntryState;
        var changeset = proposal.ChangeProposal;
        
        return new EditEntryRequest
        {
            // The comment is always the proposal's own, nothing to rebase here.
            Comment = changeset.Comment,

            Type = RebaseSimpleField(original.Type, changeset.Type, current.Type),

            Name = RebaseSimpleField(original.Name, changeset.Name, current.Name),

            Email = RebaseSimpleField(original.Email, changeset.Email, current.Email),

            Telephone = RebaseSimpleField(original.Telephone, changeset.Telephone, current.Telephone),

            Website = RebaseSimpleField(original.Website, changeset.Website, current.Website),

            Accessible = RebaseSimpleField(original.Accessible, changeset.Accessible, current.Accessible),

            Specials = RebaseSimpleField(original.Specials, changeset.Specials, current.Specials),

            Subject = RebaseSimpleField(original.Subject, changeset.Subject, current.Subject),

            Contact = RebaseContact(original.Contact, changeset.Contact, current.Contact),

            Address = RebaseAddress(original.Address, changeset.Address, current.Address),

            Offers = RebaseList(original.Offers, changeset.Offers, current.Offers),

            Attributes = RebaseList(original.Attributes, changeset.Attributes, current.Attributes),
        };
    }
    
    /// <summary>Merges the address fields (city, plz, street, house) one by one instead of swapping the whole address on any single change.</summary>
    private AddressRequest RebaseAddress(AddressRequest original, AddressRequest changeset, Address current) => new()
    {
        City = RebaseSimpleField(original.City, changeset.City, current.City),
        Plz = RebaseSimpleField(original.Plz, changeset.Plz, current.Plz),
        Street = RebaseSimpleField(original.Street, changeset.Street, current.Street),
        House = RebaseSimpleField(original.House, changeset.House, current.House),
    };

    /// <summary>
    /// Merges the contact fields (title, first name, last name) one by one.
    /// If one side has no contact at all, there is nothing to merge field by field, so the proposal's add-or-remove wins there instead, same
    /// as any other simple field.
    /// </summary>
    private ContactPersonRequest? RebaseContact(ContactPersonRequest? original, ContactPersonRequest? changeset, ContactPerson? current)
    {
        if (original == null || changeset == null)
        {
            if (ContactFieldWasChanged(original, changeset))
            {
                return changeset;
            }

            return current == null ? null : ContactPersonRequest.From(current);
        }

        return new ContactPersonRequest
        {
            AcademicTitle = RebaseSimpleField(original.AcademicTitle, changeset.AcademicTitle, current?.AcademicTitle),
            FirstName = RebaseSimpleField(original.FirstName, changeset.FirstName, current?.FirstName),
            LastName = RebaseSimpleField(original.LastName, changeset.LastName, current?.LastName),
        };
    }

    /// <summary>
    /// No contact person means all its fields are null, so we can just compare against empty
    /// stand-ins instead of null-checking every field by hand.
    /// </summary>
    private bool ContactFieldWasChanged(ContactPersonRequest? original, ContactPersonRequest? changeset)
    {
        var originalOrEmpty = original ?? new ContactPersonRequest();
        var changesetOrEmpty = changeset ?? new ContactPersonRequest();

        return originalOrEmpty.CompareTo(changesetOrEmpty);
    }
    
    /// <summary>True if the proposal wants a different value than the entry originally had for this field.</summary>
    private bool FieldWasChanged<T>(T originalValue, T changesetValue) =>
        !EqualityComparer<T>.Default.Equals(originalValue, changesetValue);

    /// <summary>Keeps the proposal's value for a field if it changed it, otherwise takes the current live value.</summary>
    private T RebaseSimpleField<T>(T originalValue, T changesetValue, T currentValue) =>
        FieldWasChanged(originalValue, changesetValue) ? changesetValue : currentValue;

    /// <summary>
    /// Merges a list field item by item instead of treating the whole list as one value. If we
    /// just compared the whole list and swapped it on any change, we'd lose items that got added
    /// or removed elsewhere after the proposal was created. So instead we figure out what the
    /// proposal itself added or removed, and apply just that on top of <paramref name="current"/>.
    /// </summary>
    private List<T> RebaseList<T>(List<T> original, List<T> changeset, List<T> current)
    {
        var addedByProposal = changeset.Except(original);
        var removedByProposal = original.Except(changeset);

        return current
            .Union(addedByProposal)
            .Except(removedByProposal)
            .ToList();
    }
}
