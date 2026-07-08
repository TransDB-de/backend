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

public record FetchFilteredEntriesResponse(IEnumerable<Entry> Entries, string LocationName, bool HasMore);

public class EntryService(
    IDatabaseService db,
    IGeocodingService geocoding,
    INominatimService nominatim,
    IEntryActivityService activityService,
    ILogger<EntryService> logger,
    IOptions<EntryConfig> config) : IEntryService
{
    private readonly int _itemsPerPage = config.Value.ItemsPerPage;
    private readonly int _maxPageNumber = config.Value.MaxPageNumber;
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

        var res = await FetchFilteredEntriesAsync(filter, _itemsPerPage, _maxPageNumber);
        
        return new PaginatedResponse<PublicEntryResponse>(
            res.Entries.Select(e => new PublicEntryResponse(e)).ToList(),
            res.HasMore,
            res.LocationName);
    }

    /// <inheritdoc/>
    public async Task<PaginatedResponse<Entry>> GetFullEntriesForElevatedUsageAsync(AdminEntriesFilterRequest filter)
    {
        var res = await FetchFilteredEntriesAsync(filter, _adminItemsPerPage);
        return new PaginatedResponse<Entry>(res.Entries.ToList(), res.HasMore, res.LocationName);
    }

    private async Task<FetchFilteredEntriesResponse> FetchFilteredEntriesAsync(EntriesFilterRequest query, int limit, int? maxPage = null)
    {
        string? locationName = null;
        GeoJsonPoint? geoLocation = null;
        
        if (query.IsGeolocatedQuery)
        {
            var geoResult = await geocoding.ResolveLocationAsync(query.Location, query.GeoLocation);

            if (geoResult.IsOk && geoResult.Value != null)
            {
                locationName = geoResult.Value.Name;
                geoLocation = geoResult.Value.Location;
            }
        }

        var actualFilters = query.DatabaseConditions.Count > 0
            ? Builders<Entry>.Filter.And(query.DatabaseConditions)
            : Builders<Entry>.Filter.Empty;

        if (geoLocation != null)
        {
            // mongodb doesn't allow fulltext search and geospartial in one query
            // we resolve the text search to id's beforehand
            if (query.HasText)
            {
                var ids = await db.FindEntryIdsAsync(actualFilters);
                actualFilters = Builders<Entry>.Filter.In(e => e.Id, ids);
            }
            
            var paginationHelper = new PaginationHelper<EntryWithDistance>(limit, query.Page, maxPage);
            var (entries, more) = await paginationHelper.Paginate(options =>
                db.FindEntriesWithGeoAsync(actualFilters, geoLocation, options));
            return new FetchFilteredEntriesResponse(entries, locationName, more);
        }
        else
        {
            var paginationHelper = new PaginationHelper<Entry>(limit, query.Page, maxPage);
            var (entries, more) = await paginationHelper.Paginate(options => db.FindEntriesAsync(actualFilters, options));
            return new FetchFilteredEntriesResponse(entries, locationName, more);
        }
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
            }
            await activityService.LogAsync(EntryActivity.GeoLocationFailed(id, result.FailureDetails));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during geocoding for entry {Id}", id);
            await activityService.LogAsync(EntryActivity.GeoLocationFailed(id));
        }
    }
}
