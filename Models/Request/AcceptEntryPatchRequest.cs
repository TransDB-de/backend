using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Request;

/// <summary>
/// Decides an open entry patch. The client send back the EntryPatchData it received, but with the per-field decisions set via PatchAccepted flags.
/// Only the flags are used, values sent by the client are ignored so a client cannot inject values this way.
/// A field omitted from the request counts as rejected.
/// </summary>
public class AcceptEntryPatchRequest
{
    [Required(ErrorMessage = "required"), StringLength(2000, MinimumLength = 1, ErrorMessage = "length")]
    public string Comment { get; set; } = string.Empty;
    
    public EntryPatchData? Decisions { get; set; }
}
