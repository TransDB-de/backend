namespace transdb_backend_net.Models.Request;

/// <summary>Options for accepting a change proposal.</summary>
public class AcceptProposalRequest
{
    /// <summary>
    /// If true (default), only the fields the proposal actually changed are applied on top of
    /// the entry's current state (see <see cref="Utils.EntryChangeProposalRebase"/>), avoiding
    /// lost updates. If false, the proposals full snapshot overwrites the entry as-is.
    /// This is only for theoretical edge cases.
    /// </summary>
    public bool UseRebase { get; set; } = true;
}
