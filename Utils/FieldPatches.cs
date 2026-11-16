namespace transdb_backend_net.Utils;

public class FieldPatch<T>(T? original, T? newValue)
{
    public T? OriginalValue { get; set; } = original;
    public T? NewValue { get; set; } = newValue;

    public bool PatchAccepted { get; set; } = true;
    
    public static FieldPatch<T>? CompareAndCreate(T? original, T? patch)
    {
        if (EqualityComparer<T>.Default.Equals(original, patch))
        {
            return null;
        }
        
        return new FieldPatch<T>(original, patch);
    }
}

public class ListPatch<T>
{
    public List<T> Added { get; set; } = new();
    public List<T> Removed { get; set; } = new();
    
    public bool PatchAccepted { get; set; } = true;
    
    public static ListPatch<T>? CompareAndCreate(IEnumerable<T>? original, IEnumerable<T>? changed)
    {
        var o = original?.ToList() ?? [];
        var n = changed?.ToList() ?? [];

        var patch = new ListPatch<T>
        {
            Added = n.Except(o).ToList(),
            Removed = o.Except(n).ToList()
        };

        return patch.Added.Count == 0 && patch.Removed.Count == 0 ? null : patch;
    }
}