using static transdb_backend_net.Schema.EEntryAttribute;
using static transdb_backend_net.Schema.EEntryOffer;
using static transdb_backend_net.Schema.EEntryType;

namespace transdb_backend_net.Schema;

/// <summary>
/// Defines which attributes and offers are valid for each entry type.
/// Acts as an allowlist: anything not listed here is rejected on submission and edit.
/// Keeping the schema centralised here avoids scattering type-specific rules across validators.
/// </summary>
public static class EntrySchema
{
    public static readonly IReadOnlyDictionary<EEntryType, EEntryOffer[]> OffersByType =
        new Dictionary<EEntryType, EEntryOffer[]>
        {
            [Surgeon]         = [Mastectomy, VaginPI, VaginCombined, VaginColon, PPVagin, Ffs, Penoid, Breast, 
                                    Hyst, Orch, ClitPI, Bodyfem, Glottoplasty, Fms],
            [Hairremoval]     = [Laser, Ipl, Electro, ElectroAE],
            [Therapist]       = [Indication, Therapy],
            [Urologist]       = [Hrt, Medication],
            [Gynecologist]    = [Hrt, Medication],
            [Endocrinologist] = [Progesterone, HormoneGel, HormoneInjections, HormonePatches, HormonePills, EDPills],
            [GP]              = [Hrt, Medication],
            [Pharmacy]        = [EInjection, Cpa],
            [Cryo]            = [FreezesSperm, FreezesEggs],
        };
    
    public static readonly IReadOnlyDictionary<EEntryType, EEntryAttribute[]> AttributesByType =
        new Dictionary<EEntryType, EEntryAttribute[]>
        {
            [Group]           = [Trans, RegularMeetings, Consulting, Activities, Remote],
            [Surgeon]         = [SelfPayedOnly, Remote],
            [Endocrinologist] = [TreatsEnby, TransFem, TransMasc, Remote],
            [Hairremoval]     = [InsurancePay, Transfriendly, HasDoctor],
            [Therapist]       = [SelfPayedOnly, YouthOnly, TreatsEnby, Remote],
            [Urologist]       = [TreatsEnby, TransFem, TransMasc, Remote],
            [Gynecologist]    = [TreatsEnby, TransFem, TransMasc, Remote],
            [GP]              = [TreatsEnby, Remote],
            [Logopedics]      = [Remote],
            [Pharmacy]        = [Shipping, SingleUseVials, ReuseVial, Prefilled],
            [Cryo]            = [InsurancePay],
        };

    /// <summary>Returns the allowed attributes for a given type, or an empty array if the type has no restrictions defined.</summary>
    public static EEntryAttribute[] GetAllowedAttributes(EEntryType type) =>
        AttributesByType.TryGetValue(type, out var attrs) ? attrs : [];

    /// <summary>Returns the allowed offers for a given type, or an empty array if the type has no restrictions defined.</summary>
    public static EEntryOffer[] GetAllowedOffers(EEntryType type) =>
        OffersByType.TryGetValue(type, out var offers) ? offers : [];
}
