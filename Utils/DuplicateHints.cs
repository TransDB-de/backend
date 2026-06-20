using System.Text.RegularExpressions;
using F23.StringSimilarity;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Utils;

/// <summary>
/// Base class for a single scoring dimension in duplicate entry detection.
/// Each hint contributes a partial score and a maximum possible weight.
/// </summary>
/// <remarks>
/// <see cref="GetMaxWeight"/> takes the entry being checked rather than returning a constant
/// because optional fields (email, phone, etc.) must not inflate the denominator when they
/// are absent, otherwise the resulting probability would be artificially deflated.
/// </remarks>
public abstract class EntryDuplicateHint
{
    /// <summary>
    /// Returns the maximum score this hint can contribute for the given entry.
    /// Returns 0 if the required field is absent and the hint cannot apply.
    /// </summary>
    public abstract double GetMaxWeight(Entry entry);

    /// <summary>
    /// Returns the actual score contribution when comparing two entries.
    /// <paramref name="a"/> is the new entry being checked; <paramref name="b"/> is the candidate.
    /// </summary>
    public abstract double GetScore(Entry a, Entry b);
}

/// <summary>
/// Scores name similarity using Jaro-Winkler, scaled to a maximum weight of 2.0.
/// Uses a continuous similarity value instead of a binary threshold so that near-matches
/// like abbreviations or slight typos still contribute partial score.
/// </summary>
public partial class NameHint : EntryDuplicateHint
{
    public override double GetMaxWeight(Entry _) => 2.0;

    public override double GetScore(Entry a, Entry b) => new JaroWinkler().Similarity(Sanitize(a.Name), Sanitize(b.Name)) * 2.0;

    [GeneratedRegex(@"[^a-z0-9öäüß]+")]
    private static partial Regex SanitizeRegex();
    
    private string Sanitize(string s) => SanitizeRegex().Replace(s.ToLowerInvariant().Trim(), "");
}

/// <summary>Scores exact email match. Only contributes if the new entry has an email address.</summary>
public class EmailHint : EntryDuplicateHint
{
    public override double GetMaxWeight(Entry a) => a.Email != null ? 1.5 : 0;

    public override double GetScore(Entry a, Entry b) =>
        a.Email != null && a.Email == b.Email ? 1.5 : 0;
}

/// <summary>Scores exact telephone match. Only contributes if the new entry has a telephone number.</summary>
public class TelephoneHint : EntryDuplicateHint
{
    public override double GetMaxWeight(Entry a) => a.Telephone != null ? 1.5 : 0;

    public override double GetScore(Entry a, Entry b) =>
        a.Telephone != null && a.Telephone == b.Telephone ? 1.5 : 0;
}

/// <summary>
/// Scores website match by comparing origins (scheme + host) rather than full URLs,
/// so that paths and query strings do not cause false negatives.
/// Only contributes if the new entry has a website.
/// </summary>
public class WebsiteHint : EntryDuplicateHint
{
    public override double GetMaxWeight(Entry a) => a.Website != null ? 0.5 : 0;

    public override double GetScore(Entry a, Entry b) =>
        a.Website != null && b.Website != null && GetOrigin(a.Website) == GetOrigin(b.Website) ? 0.5 : 0;

    private static string? GetOrigin(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri) ? uri.GetLeftPart(UriPartial.Authority) : null;
}

/// <summary>
/// Scores address similarity across city, postal code, street, and house number.
/// City is always required; the other fields only contribute weight when present on the new entry.
/// </summary>
public class AddressHint : EntryDuplicateHint
{
    public override double GetMaxWeight(Entry a)
    {
        double max = 0.5; // city is always present
        if (a.Address.Plz != null) max += 0.5;
        if (a.Address.Street != null) max += 0.5;
        if (a.Address.House != null) max += 0.25;
        return max;
    }

    public override double GetScore(Entry a, Entry b)
    {
        double score = 0;
        if (a.Address.City == b.Address.City) score += 0.5;
        if (a.Address.Plz != null && a.Address.Plz == b.Address.Plz) score += 0.5;
        if (a.Address.Street != null && a.Address.Street == b.Address.Street) score += 0.5;
        if (a.Address.House != null && a.Address.House == b.Address.House) score += 0.25;
        return score;
    }
}

/// <summary>
/// Scores contact person similarity by last and first name.
/// Fields only contribute weight when present on the new entry.
/// </summary>
public class ContactHint : EntryDuplicateHint
{
    public override double GetMaxWeight(Entry a)
    {
        double max = 0;
        if (a.Contact?.LastName != null) max += 0.5;
        if (a.Contact?.FirstName != null) max += 0.25;
        return max;
    }

    public override double GetScore(Entry a, Entry b)
    {
        double score = 0;
        if (a.Contact?.LastName != null && a.Contact.LastName == b.Contact?.LastName) score += 0.5;
        if (a.Contact?.FirstName != null && a.Contact.FirstName == b.Contact?.FirstName) score += 0.25;
        return score;
    }
}
