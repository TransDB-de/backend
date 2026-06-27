using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

public interface IEntryService
{
    /// <summary>Creates a new entry and opens a CMS review ticket.</summary>
    Task<Result<Entry>> CreateEntryAsync(CreateEntryRequest request);

    /// <summary>
    /// Returns a paginated, publicly visible list of approved entries matching the given filters.
    /// Supports full-text search, type/offer/attribute filtering, and optional geospatial sorting.
    /// </summary>
    Task<PaginatedResponse<PublicEntryResponse>> FilterEntriesForPublicUsageAsync(EntriesFilterRequest filter);

    /// <summary>
    /// Returns a paginated list of entries for admin review.
    /// Supports optional filtering by approved/blocked/archived status and full-text search.
    /// </summary>
    Task<PaginatedResponse<Entry>> GetFullEntriesForElevatedUsageAsync(AdminEntriesFilterRequest filter);

    /// <summary>Returns a single entry by its ID. Returns a failed result if not found.</summary>
    Task<Result<Entry>> GetEntryByIdAsync(ObjectId id);

    /// <summary>Returns a publicly visible entry by its ID. Returns a failed result if not found or not visible.</summary>
    Task<Result<Entry>> GetPublicEntryByIdAsync(ObjectId id);

    /// <summary>
    /// Partially updates an entry's status flags (Approved, Blocked, Archived).
    /// On approval, triggers a fire-and-forget geo location update.
    /// Returns a failed result if the entry does not exist.
    /// </summary>
    Task<Result<Entry>> PatchEntryAsync(ObjectId id, PatchEntryStatusRequest request);

    /// <summary>
    /// Fully replaces an entry with the given data. Preserves timestamps and approval metadata.
    /// Triggers a fire-and-forget geo location update only if the address changed.
    /// Returns a failed result if the entry does not exist.
    /// </summary>
    Task<Result<Entry>> EditEntryAsync(ObjectId id, EditEntryRequest request);

    /// <summary>
    /// Fetches fresh coordinates for an entry from Nominatim and saves them.
    /// Returns a failed result if the entry does not exist or geocoding fails.
    /// </summary>
    Task<Result> UpdateGeoLocationAsync(ObjectId id);

    /// <summary>Permanently deletes an entry. Returns a failed result if the entry does not exist.</summary>
    Task<Result> DeleteEntryAsync(ObjectId id);

}

public class EntryService(
    IDatabaseService db,
    ICmsService cms,
    IGeocodingService geocoding,
    INominatimService nominatim,
    IEntryActivityService activityService,
    ILogger<EntryService> logger,
    IOptions<MongoDbConfig> config) : IEntryService
{
    private readonly int _itemsPerPage = config.Value.ItemsPerPage;
    private readonly int _adminItemsPerPage = config.Value.AdminItemsPerPage;
    private readonly double _duplicateThreshold = config.Value.DuplicateProbabilityThreshold;

    private static readonly IReadOnlyList<EntryDuplicateHint> DuplicateHints =
    [
        new NameHint(), new EmailHint(), new TelephoneHint(),
        new WebsiteHint(), new AddressHint(), new ContactHint(),
    ];

    private static double CalculateScore(Entry a, Entry b) =>
        DuplicateHints.Sum(h => h.GetScore(a, b));

    private static double CalculateMaxScore(Entry entry) =>
        DuplicateHints.Sum(h => h.GetMaxWeight(entry));

    private async Task<DuplicateMatch?> FindPossibleDuplicateAsync(Entry entry)
    {
        var candidates = await db.GetDuplicateCandidatesAsync(entry);
        var maxScore = CalculateMaxScore(entry);

        DuplicateMatch? best = null;
        var bestProbability = _duplicateThreshold;

        foreach (var candidate in candidates)
        {
            var score = CalculateScore(entry, candidate);
            var probability = maxScore > 0 ? score / maxScore : 0;
            if (!(probability > bestProbability)) continue;
            bestProbability = probability;
            best = new DuplicateMatch
            {
                EntryId = candidate.Id,
                Probability = Math.Round(probability, 2)
            };
        }

        return best;
    }

    /// <inheritdoc/>
    public async Task<Result<Entry>> CreateEntryAsync(CreateEntryRequest request)
    {
        try
        {
            var entry = new Entry(request);
            
            var duplicate = await FindPossibleDuplicateAsync(entry);
            if (duplicate != null)
                entry.PossibleDuplicate = duplicate;
            
            var created = await db.InsertEntryAsync(entry);

            //_ = CreateCmsTicketAsync(entry.Name, created.Id.ToString());

            return Result<Entry>.Success(created);
        }
        catch (Exception e)
        {
            return Result<Entry>.Failure(e);
        }
    }

    /// <inheritdoc/>
    public async Task<PaginatedResponse<PublicEntryResponse>> FilterEntriesForPublicUsageAsync(EntriesFilterRequest filter)
    {
        filter.DatabaseConditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Approved, true));
        filter.DatabaseConditions.Add(Builders<Entry>.Filter.Ne(e => e.Status.Blocked, true));
        filter.DatabaseConditions.Add(Builders<Entry>.Filter.Eq(e => e.Status.Archived, false));

        var (entries, locationName) = await FetchFilteredEntriesAsync(filter, _itemsPerPage);
        return new PaginatedResponse<PublicEntryResponse>(
            entries.Select(e => new PublicEntryResponse(e)).ToList(),
            _itemsPerPage,
            locationName);
    }

    /// <inheritdoc/>
    public async Task<PaginatedResponse<Entry>> GetFullEntriesForElevatedUsageAsync(AdminEntriesFilterRequest filter)
    {
        var (entries, locationName) = await FetchFilteredEntriesAsync(filter, _adminItemsPerPage);
        return new PaginatedResponse<Entry>(entries.ToList(), _adminItemsPerPage, locationName);
    }

    private async Task<(IEnumerable<Entry> Entries, string? LocationName)> FetchFilteredEntriesAsync(EntriesFilterRequest query, int limit)
    {
        var skip = Math.Max(0, query.Page) * limit;
        string? locationName = null;
        GeoJsonPoint? geoLocation = null;

        if (query.GeoLocation != null)
        {
            var nameResult = await geocoding.GetLocationNameAsync(query.GeoLocation);
            if (nameResult.IsOk)
            {
                locationName = nameResult.Value;
            }

            geoLocation = query.GeoLocation;
        }
        else if (!string.IsNullOrWhiteSpace(query.Location))
        {
            var geoResult = await geocoding.SearchByNameAsync(query.Location);
            if (geoResult.IsOk && geoResult.Value != null)
            {
                geoLocation = geoResult.Value.Location;
                locationName = geoResult.Value.Name;
            }
        }

        var combinedFilters = query.DatabaseConditions.Count > 0
            ? Builders<Entry>.Filter.And(query.DatabaseConditions)
            : Builders<Entry>.Filter.Empty;

        IEnumerable<Entry> entries;
        if (geoLocation != null)
        {
            entries = await db.FindEntriesWithGeoAsync(combinedFilters, geoLocation, skip, limit);
        }
        else
        {
            entries = await db.FindEntriesAsync(combinedFilters, skip, limit);
        }

        return (entries, locationName);
    }

    /// <inheritdoc/>
    public async Task<Result<Entry>> GetEntryByIdAsync(ObjectId id)
    {
        var entry = await db.GetEntryByIdAsync(id);
        return entry != null
            ? Result<Entry>.Success(entry)
            : Result<Entry>.Failure("entry not found");
    }

    /// <inheritdoc/>
    public async Task<Result<Entry>> GetPublicEntryByIdAsync(ObjectId id)
    {
        var entry = await db.GetPublicEntryByIdAsync(id);
        return entry != null
            ? Result<Entry>.Success(entry)
            : Result<Entry>.Failure("entry not found");
    }

    /// <inheritdoc/>
    public async Task<Result<Entry>> PatchEntryAsync(ObjectId id, PatchEntryStatusRequest request)
    {
        var existing = await db.GetEntryByIdAsync(id);
        if (existing == null) return Result<Entry>.Failure("entry not found");

        // do this to copy by value
        var wasApproved = (existing.Status is { Approved: true });
        request.ApplyTo(existing);

        var replaced = await db.ReplaceEntryAsync(id, existing);
        if (!replaced) return Result<Entry>.Failure("entry not found");

        if (!wasApproved && existing is { Status: { Approved: true }, Location: null })
        {
            _ = UpdateGeoLocationAndLogAsync(id);
        }

        return Result<Entry>.Success(existing);
    }

    /// <inheritdoc/>
    public async Task<Result<Entry>> EditEntryAsync(ObjectId id, EditEntryRequest request)
    {
        var existing = await db.GetEntryByIdAsync(id);
        if (existing == null) return Result<Entry>.Failure("entry not found");

        var applyResult = request.ApplyTo(existing);
        var replaced = await db.ReplaceEntryAsync(id, existing);
        if (!replaced) return Result<Entry>.Failure("entry not found");

        if (applyResult.IsAddressChanged) _ = UpdateGeoLocationAndLogAsync(id);

        return Result<Entry>.Success(existing);
    }

    /// <inheritdoc/>
    public async Task<Result> UpdateGeoLocationAsync(ObjectId id)
    {
        var entry = await db.GetEntryByIdAsync(id);
        if (entry == null) return Result.Failure("entry not found");

        var locationResult = await nominatim.GetCoordinatesAsync(entry.Address);
        if (locationResult.IsFailed) return Result.Failure(locationResult);

        var updated = await db.UpdateEntryFieldsAsync(id, Builders<Entry>.Update.Set(e => e.Location, locationResult.Value));
        return updated ? Result.Ok() : Result.Failure("entry update failed");
    }

    /// <inheritdoc/>
    public async Task<Result> DeleteEntryAsync(ObjectId id)
    {
        var deleted = await db.DeleteEntryAsync(id);
        return deleted ? Result.Ok() : Result.Failure("entry not found");
    }

    private async Task UpdateGeoLocationAndLogAsync(ObjectId id)
    {
        try
        {
            var result = await UpdateGeoLocationAsync(id);
            if (result.IsFailed && result.FailureType == EFailureType.Unexpected)
            {
                logger.LogWarning("Geocoding failed for entry {Id}: {Details}", id, result.FailureDetails);
                await activityService.LogAsync(EntryActivity.GeoLocationFailed(id));
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during geocoding for entry {Id}", id);
            await activityService.LogAsync(EntryActivity.GeoLocationFailed(id));
        }
    }
}
