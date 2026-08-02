namespace transdb_backend_net.Schema;

/// <summary>Category of a trans-relevant resource. Determines which offers and attributes are valid.</summary>
public enum EEntryType
{
    Group,
    Therapist,
    Endocrinologist,
    Surgeon,
    Logopedics,
    Hairremoval,
    Urologist,
    Gynecologist,
    GP,
    Pharmacy,
    Cryo,
}

/// <summary>Specific service or procedure an entry offers. Valid values per type are defined in <see cref="EntrySchema"/>.</summary>
public enum EEntryOffer
{
    // Surgeon
    Mastectomy,
    VaginPI,
    VaginCombined,
    VaginColon,
    PPVagin,
    Ffs,
    Penoid,
    Breast,
    Hyst,
    Orch,
    ClitPI,
    Bodyfem,
    Glottoplasty,
    Fms,

    // Hairremoval
    Laser,
    Ipl,
    Electro,
    ElectroAE,

    // Therapist
    Indication,
    Therapy,

    // Urologist, Gynecologist, GP
    Hrt,
    Medication,

    // Pharmacy
    EInjection,
    Cpa,

    // Cryo
    FreezesSperm,
    FreezesEggs,
    
    // endo
    HormoneGel,
    HormoneInjections,
    HormonePills,
    HormonePatches,
    Progesterone,
    EDPills
}

/// <summary>Descriptive flag for an entry (accessibility, target group, operating mode, etc.). Valid values per type are defined in <see cref="EntrySchema"/>.</summary>
public enum EEntryAttribute
{
    // Group
    Trans,
    RegularMeetings,
    Consulting,
    Activities,

    // Shared
    Remote,
    TreatsEnby,
    SelfPayedOnly,
    InsurancePay,

    // Hairremoval
    Transfriendly,
    HasDoctor,

    // Therapist
    YouthOnly,

    // Urologist, Gynecologist
    TransFem,
    TransMasc,

    // Pharmacy
    Shipping,
    SingleUseVials,
    ReuseVial,
    Prefilled,
    
    TreatsInter
}

public enum AcademicTitle
{
    Dr,
    Prof,
    ProfDr,
}

public enum TherapistSubject
{
    Therapist,
    Psychologist,
    Naturopath,
    Other,
}
