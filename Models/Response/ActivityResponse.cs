using transdb_backend_net.Models.Database;

namespace transdb_backend_net.Models.Response;

/// <summary>
/// Extends <see cref="EntryActivity"/> with the name of the referenced entry.
/// Used in the global activity list where callers cannot derive the entry name from context.
/// </summary>
public class EntryActivityResponse : EntryActivity
{
    public string? EntryName { get; set; }
}
