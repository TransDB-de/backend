using MongoDB.Bson;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Response;

public class EntryPatchResponse(EntryPatch patch, string token)
{
    public string RevocationToken { get; } = token;
    public ObjectId PatchId { get; } = patch.Id;
}

public class EntryPatchDetailResponse(EntryPatch patch, Entry currentEntry)
{
    public EntryPatch Patch { get; } = patch;

    public PublicEntryResponse CurrentEntry { get; } = new(currentEntry);
}