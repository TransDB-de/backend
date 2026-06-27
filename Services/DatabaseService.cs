using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Response;
using transdb_backend_net.Utils;

namespace transdb_backend_net.Services;

public interface IDatabaseService
{
    /// <summary>Pings the database and returns true if it is reachable.</summary>
    Task<bool> Healthcheck();

    /// <summary>Inserts a new entry document and returns it with its generated ID.</summary>
    Task<Entry> InsertEntryAsync(Entry entry);

    /// <summary>Finds an entry by its ID. Returns null if no document is found.</summary>
    Task<Entry?> GetEntryByIdAsync(ObjectId id);

    /// <summary>Finds a publicly visible entry by its ID. Returns null if not found or not visible.</summary>
    Task<Entry?> GetPublicEntryByIdAsync(ObjectId id);

    /// <summary>Replaces an existing entry document fully. Returns true if a document was modified.</summary>
    Task<bool> ReplaceEntryAsync(ObjectId id, Entry entry);

    /// <summary>Applies a partial update to an entry. Returns true if a document was modified.</summary>
    Task<bool> UpdateEntryFieldsAsync(ObjectId id, UpdateDefinition<Entry> update);

    /// <summary>Permanently deletes an entry. Returns true if a document was deleted.</summary>
    Task<bool> DeleteEntryAsync(ObjectId id);

    /// <summary>Returns a paginated list of entries matching the given filter.</summary>
    Task<List<Entry>> FindEntriesAsync(FilterDefinition<Entry> filter, int skip, int limit);

    /// <summary>
    /// Returns a paginated list of entries sorted by distance from <paramref name="location"/>
    /// using a $geoNear aggregation pipeline. Distance is stored in kilometres.
    /// </summary>
    Task<List<EntryWithDistance>> FindEntriesWithGeoAsync(FilterDefinition<Entry> filter, GeoJsonPoint location, int skip, int limit);

    /// <summary>Inserts a new activity document.</summary>
    Task InsertActivityAsync(EntryActivity activity);

    /// <summary>Returns a paginated list of all activity documents as enriched responses, sorted by descending timestamp.</summary>
    Task<List<EntryActivityResponse>> FindActivitiesAsync(int skip, int limit);

    /// <summary>Returns a name lookup for the given entry IDs, keyed by ID. Entries not found are omitted.</summary>
    Task<Dictionary<ObjectId, string>> FindEntryNamesByIdsAsync(IEnumerable<ObjectId> ids);

    /// <summary>Returns a paginated list of activity documents for a specific entry, sorted by ascending timestamp.</summary>
    Task<List<EntryActivity>> FindActivitiesByEntryAsync(ObjectId entryId, int skip, int limit);

    /// <summary>Finds a single activity document by its ID. Returns null if not found.</summary>
    Task<EntryActivity?> GetActivityByIdAsync(ObjectId id);

    /// <summary>
    /// Returns entries of the same type that share at least one of: city, PLZ, email, or telephone.
    /// Used as a pre-filter before C# duplicate scoring.
    /// </summary>
    Task<List<Entry>> GetDuplicateCandidatesAsync(Entry entry);

    /// <summary>Inserts a revocation token document.</summary>
    Task InsertRevocationTokenAsync(EntryRevocationToken token);

    /// <summary>Finds a revocation token by its token string. Returns null if not found.</summary>
    Task<EntryRevocationToken?> FindRevocationTokenAsync(string token);

    /// <summary>Deletes a revocation token by its token string.</summary>
    Task DeleteRevocationTokenAsync(string token);
}

public class DatabaseService : IDatabaseService
{
    private readonly IMongoDatabase _db;
    private readonly IMongoCollection<Entry> _entries;
    private readonly IMongoCollection<EntryActivity> _activities;
    private readonly IMongoCollection<EntryRevocationToken> _revocationTokens;

    public DatabaseService(IOptions<MongoDbConfig> config, ILogger<DatabaseService> logger)
    {
        var client = new MongoClient(config.Value.ConnectionUri);
        _db = client.GetDatabase(GetDatabaseName(config.Value.ConnectionUri));
        _entries = _db.GetCollection<Entry>("entries");
        _activities = _db.GetCollection<EntryActivity>("activities");
        _revocationTokens = _db.GetCollection<EntryRevocationToken>("revocation_tokens");

        CreateIndexes();
        logger.LogInformation("MongoDB successfully initialized");
    }

    private void CreateIndexes()
    {
        var textIndex = Builders<Entry>.IndexKeys
            .Text(e => e.Name)
            .Text("contact.firstName")
            .Text("contact.lastName")
            .Text(e => e.Telephone)
            .Text(e => e.Website)
            .Text(e => e.Email)
            .Text("address.city")
            .Text("address.street");
        _entries.Indexes.CreateOne(new CreateIndexModel<Entry>(textIndex));
        //_entries.Indexes.CreateOne(new CreateIndexModel<Entry>(Builders<Entry>.IndexKeys.Text(e => e.Type)));

        var geoIndex = Builders<Entry>.IndexKeys.Geo2DSphere("location");
        _entries.Indexes.CreateOne(new CreateIndexModel<Entry>(geoIndex));

        _activities.Indexes.CreateOne(new CreateIndexModel<EntryActivity>(
            Builders<EntryActivity>.IndexKeys.Ascending(a => a.EntryId)));
        _activities.Indexes.CreateOne(new CreateIndexModel<EntryActivity>(
            Builders<EntryActivity>.IndexKeys.Descending(a => a.Timestamp)));

        _revocationTokens.Indexes.CreateOne(new CreateIndexModel<EntryRevocationToken>(
            Builders<EntryRevocationToken>.IndexKeys.Ascending(t => t.Token),
            new CreateIndexOptions { Unique = true }));

        _revocationTokens.Indexes.CreateOne(new CreateIndexModel<EntryRevocationToken>(
            Builders<EntryRevocationToken>.IndexKeys.Ascending(t => t.ExpiresAt),
            new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }));
    }

    /// <inheritdoc/>
    public async Task<bool> Healthcheck()
    {
        var result = await _db.RunCommandAsync((Command<BsonDocument>)"{ping:1}");
        return result["ok"].AsDouble == 1;
    }

    /// <inheritdoc/>
    public async Task<Entry> InsertEntryAsync(Entry entry)
    {
        await _entries.InsertOneAsync(entry);
        return entry;
    }

    /// <inheritdoc/>
    public async Task<Entry?> GetEntryByIdAsync(ObjectId id) =>
        await _entries.Find(e => e.Id == id).FirstOrDefaultAsync();

    public async Task<Entry?> GetPublicEntryByIdAsync(ObjectId id) =>
        await _entries
            .Find(e => e.Id == id && e.Status.Approved && !e.Status.Blocked && !e.Status.Archived)
            .FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task<bool> ReplaceEntryAsync(ObjectId id, Entry entry)
    {
        var result = await _entries.ReplaceOneAsync(e => e.Id == id, entry);
        return result.ModifiedCount > 0;
    }

    /// <inheritdoc/>
    public async Task<bool> UpdateEntryFieldsAsync(ObjectId id, UpdateDefinition<Entry> update)
    {
        var result = await _entries.UpdateOneAsync(e => e.Id == id, update);
        return result.ModifiedCount > 0;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteEntryAsync(ObjectId id)
    {
        var result = await _entries.DeleteOneAsync(e => e.Id == id);
        return result.DeletedCount > 0;
    }

    /// <inheritdoc/>
    public async Task<List<Entry>> FindEntriesAsync(FilterDefinition<Entry> filter, int skip, int limit)
    {
        return await _entries.Find(filter).Skip(skip).Limit(limit).ToListAsync();
    }

    /// <inheritdoc/>
    public async Task<List<EntryWithDistance>> FindEntriesWithGeoAsync(FilterDefinition<Entry> filter, GeoJsonPoint location, int skip, int limit)
    {
        var serializer = MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry.GetSerializer<Entry>();
        var registry = MongoDB.Bson.Serialization.BsonSerializer.SerializerRegistry;
        var matchDoc = filter.Render(new RenderArgs<Entry>(serializer, registry));

        var pipeline = new[]
        {
            new BsonDocument("$geoNear", new BsonDocument
            {
                { "near", new BsonDocument
                    {
                        { "type", "Point" },
                        { "coordinates", new BsonArray { location.Coordinates[0], location.Coordinates[1] } }
                    }
                },
                { "distanceField", "distance" },
                { "distanceMultiplier", 0.001 },
                { "spherical", true },
                { "query", matchDoc }
            }),
            new BsonDocument("$skip", skip),
            new BsonDocument("$limit", limit)
        };

        return await _entries.Aggregate<EntryWithDistance>(pipeline).ToListAsync();
    }

    /// <inheritdoc/>
    public async Task InsertActivityAsync(EntryActivity activity) =>
        await _activities.InsertOneAsync(activity);

    /// <inheritdoc/>
    public async Task<List<EntryActivityResponse>> FindActivitiesAsync(int skip, int limit) =>
        await _activities.Find(FilterDefinition<EntryActivity>.Empty)
            .SortByDescending(a => a.Timestamp)
            .Skip(skip)
            .Limit(limit)
            .As<EntryActivityResponse>()
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<Dictionary<ObjectId, string>> FindEntryNamesByIdsAsync(IEnumerable<ObjectId> ids)
    {
        var filter = Builders<Entry>.Filter.In(e => e.Id, ids);
        var projection = Builders<Entry>.Projection.Include(e => e.Id).Include(e => e.Name);
        return await _entries.Find(filter)
            .Project(projection)
            .ToListAsync()
            .ContinueWith(t => t.Result.ToDictionary(
                d => d["_id"].AsObjectId,
                d => d["name"].AsString));
    }

    /// <inheritdoc/>
    public async Task<List<EntryActivity>> FindActivitiesByEntryAsync(ObjectId entryId, int skip, int limit) =>
        await _activities.Find(a => a.EntryId == entryId)
            .SortByDescending(a => a.Timestamp)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();

    /// <inheritdoc/>
    public async Task<EntryActivity?> GetActivityByIdAsync(ObjectId id) =>
        await _activities.Find(a => a.Id == id).FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task<List<Entry>> GetDuplicateCandidatesAsync(Entry entry) =>
        await _entries.Find(BuildCandidateFilter(entry)).ToListAsync();

    private static FilterDefinition<Entry> BuildCandidateFilter(Entry entry)
    {
        var orConditions = new List<FilterDefinition<Entry>>
        {
            Builders<Entry>.Filter.Eq(e => e.Address.City, entry.Address.City)
        };

        if (entry.Address.Plz != null)
            orConditions.Add(Builders<Entry>.Filter.Eq(e => e.Address.Plz, entry.Address.Plz));

        if (entry.Email != null)
            orConditions.Add(Builders<Entry>.Filter.Eq(e => e.Email, entry.Email));

        if (entry.Telephone != null)
            orConditions.Add(Builders<Entry>.Filter.Eq(e => e.Telephone, entry.Telephone));

        return Builders<Entry>.Filter.And(
            Builders<Entry>.Filter.Eq(e => e.Type, entry.Type),
            Builders<Entry>.Filter.Or(orConditions)
        );
    }

    /// <inheritdoc/>
    public async Task InsertRevocationTokenAsync(EntryRevocationToken token) =>
        await _revocationTokens.InsertOneAsync(token);

    /// <inheritdoc/>
    public async Task<EntryRevocationToken?> FindRevocationTokenAsync(string token) =>
        await _revocationTokens.Find(t => t.Token == token).FirstOrDefaultAsync();

    /// <inheritdoc/>
    public async Task DeleteRevocationTokenAsync(string token) =>
        await _revocationTokens.DeleteOneAsync(t => t.Token == token);

    /// <summary>Extracts the database name from a MongoDB connection URI.</summary>
    private static string GetDatabaseName(string uri)
    {
        var path = new UriBuilder(uri).Path.TrimStart('/');
        return path.Length > 0 ? path : "transdb";
    }
}
