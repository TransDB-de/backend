using MongoDB.Bson;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Response;

public class EntryPatchResponse(EntryPatch patch, string token)
{
    public string RevocationToken { get; } = token;
    public ObjectId PatchId { get; } = patch.Id;
}