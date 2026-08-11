using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;

namespace transdb_backend_net.Utils;

/// <summary>
/// Puts a change proposal on top of the entry's current state before applying it. Without this,
/// accepting a proposal would just overwrite the entry with the proposal's full snapshot, and
/// any changes made to the entry in the meantime would be lost.
/// </summary>
public static class EntryChangeProposalRebase
{
    /// <summary>
    /// Builds a new <see cref="EditEntryRequest"/> that only carries the fields the proposal
    /// actually wanted to change, put on top of the entry's current state.
    /// </summary>
    /// <param name="original">
    /// The entry as it was when the proposal was created (<see cref="EntryChangeProposal.OriginalEntryState"/>).
    /// Used to figure out which fields the proposal actually touched.
    /// </param>
    /// <param name="changeset">
    /// The proposal itself (<see cref="EntryChangeProposal.ChangeProposal"/>): a copy of
    /// <paramref name="original"/> with the wanted changes applied on top.
    /// </param>
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
    public static EditEntryRequest Rebase(Entry original, EditEntryRequest changeset, Entry current)
    {
        return new EditEntryRequest
        {
            // The comment is always the proposal's own, nothing to rebase here.
            Comment = changeset.Comment,

            Type = FieldWasChanged(original.Type, changeset.Type)
                ? changeset.Type
                : current.Type,

            Name = FieldWasChanged(original.Name, changeset.Name)
                ? changeset.Name
                : current.Name,

            Email = FieldWasChanged(original.Email, changeset.Email)
                ? changeset.Email
                : current.Email,

            Telephone = FieldWasChanged(original.Telephone, changeset.Telephone)
                ? changeset.Telephone
                : current.Telephone,

            Website = FieldWasChanged(original.Website, changeset.Website)
                ? changeset.Website
                : current.Website,

            Accessible = FieldWasChanged(original.Accessible, changeset.Accessible)
                ? changeset.Accessible
                : current.Accessible,

            Specials = FieldWasChanged(original.Specials, changeset.Specials)
                ? changeset.Specials
                : current.Specials,

            Subject = FieldWasChanged(original.Subject, changeset.Subject)
                ? changeset.Subject
                : current.Subject,

            Contact = RebaseContact(original.Contact, changeset.Contact, current.Contact),

            Address = RebaseAddress(original.Address, changeset.Address, current.Address),

            Offers = RebaseList(original.Offers, changeset.Offers, current.Offers),

            Attributes = RebaseList(original.Attributes, changeset.Attributes, current.Attributes),
        };
    }

    /// <summary>True if the proposal wants a different value than the entry originally had for this field.</summary>
    private static bool FieldWasChanged<T>(T originalValue, T changesetValue) =>
        !EqualityComparer<T>.Default.Equals(originalValue, changesetValue);

    /// <summary>
    /// Merges a list field item by item instead of treating the whole list as one value. If we
    /// just compared the whole list and swapped it on any change, we'd lose items that got added
    /// or removed elsewhere after the proposal was created. So instead we figure out what the
    /// proposal itself added or removed, and apply just that on top of <paramref name="current"/>.
    /// </summary>
    private static List<T> RebaseList<T>(List<T> original, List<T> changeset, List<T> current)
    {
        var addedByProposal = changeset.Except(original);
        var removedByProposal = original.Except(changeset);

        return current
            .Union(addedByProposal)
            .Except(removedByProposal)
            .ToList();
    }

    /// <summary>
    /// Merges the contact fields (title, first name, last name) one by one instead of swapping
    /// the whole contact object on any single change. If one side has no contact at all, there is
    /// nothing to merge field by field, so the proposal's add-or-remove wins there instead, same
    /// as any other simple field.
    /// </summary>
    private static ContactPersonRequest? RebaseContact(ContactPerson? original, ContactPersonRequest? changeset, ContactPerson? current)
    {
        if (original == null || changeset == null)
        {
            return ContactFieldWasChanged(original, changeset) ? changeset : ToContactRequest(current);
        }

        return new ContactPersonRequest
        {
            AcademicTitle = FieldWasChanged(original.AcademicTitle, changeset.AcademicTitle)
                ? changeset.AcademicTitle
                : current?.AcademicTitle,

            FirstName = FieldWasChanged(original.FirstName, changeset.FirstName)
                ? changeset.FirstName
                : current?.FirstName,

            LastName = FieldWasChanged(original.LastName, changeset.LastName)
                ? changeset.LastName
                : current?.LastName,
        };
    }

    /// <summary>Merges the address fields (city, plz, street, house) one by one instead of swapping the whole address on any single change.</summary>
    private static AddressRequest RebaseAddress(Address original, AddressRequest changeset, Address current) => new()
    {
        City = FieldWasChanged(original.City, changeset.City) ? changeset.City : current.City,
        Plz = FieldWasChanged(original.Plz, changeset.Plz) ? changeset.Plz : current.Plz,
        Street = FieldWasChanged(original.Street, changeset.Street) ? changeset.Street : current.Street,
        House = FieldWasChanged(original.House, changeset.House) ? changeset.House : current.House,
    };

    private static bool ContactFieldWasChanged(ContactPerson? original, ContactPersonRequest? changeset) =>
        original?.AcademicTitle != changeset?.AcademicTitle ||
        original?.FirstName != changeset?.FirstName ||
        original?.LastName != changeset?.LastName;

    private static ContactPersonRequest? ToContactRequest(ContactPerson? contact) =>
        contact == null ? null : new ContactPersonRequest
        {
            AcademicTitle = contact.AcademicTitle,
            FirstName = contact.FirstName,
            LastName = contact.LastName,
        };
}
