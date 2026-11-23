namespace transdb_backend_net.Utils;

public class FieldPatch<T>(T? original, T? newValue)
{
    public T? OriginalValue { get; set; } = original;
    public T? NewValue { get; set; } = newValue;

    public bool PatchAccepted { get; set; } = true;
}

public class ListPatchItem<T>(T value)
{
    public T Value { get; set; } = value;

    public bool PatchAccepted { get; set; } = true;
}

public static class FieldPatchHelper
{
    public static FieldPatch<T>? CompareAndCreate<T>(T? original, T? patch)
    {
        if (EqualityComparer<T>.Default.Equals(original, patch))
        {
            return null;
        }

        return new FieldPatch<T>(original, patch);
    }

    public static T? GetDesiredValue<T>(T? referenceValue, FieldPatch<T>? patch)
    {
        if (patch == null) return referenceValue;

        if (!patch.PatchAccepted) return referenceValue;

        return patch.NewValue;
    }

    public static List<T> ApplyToList<T>(List<T> referenceList, ListPatch<T>? patch, bool noDuplicates = true)
    {
        if (patch == null) return referenceList;

        var removed = patch.Removed.Where(i => i.PatchAccepted).Select(i => i.Value).ToList();
        if (removed.Count > 0) referenceList.RemoveAll(item => removed.Contains(item));

        var added = patch.Added.Where(i => i.PatchAccepted).Select(i => i.Value);
        if (noDuplicates) referenceList.AddRange(added.Where(v => !referenceList.Contains(v)));
        else referenceList.AddRange(added);

        return referenceList;
    }

    // decision check: absent/null decision = rejected
    public static bool IsAccepted<T>(FieldPatch<T>? decision) => decision is { PatchAccepted: true };
}

public class ListPatch<T>
{
    public List<ListPatchItem<T>> Added { get; set; } = [];
    public List<ListPatchItem<T>> Removed { get; set; } = [];

    public void ApplyDecisions(ListPatch<T>? decisions)
    {
        if (decisions == null)
        {
            foreach (var item in Added)
            {
                item.PatchAccepted = false;
            }

            foreach (var item in Removed)
            {
                item.PatchAccepted = false;
            }
            return;
        }

        // match by value, unmatched decision items are ignored
        foreach (var item in Added)
        {
            item.PatchAccepted = decisions.Added.FirstOrDefault(d => EqualityComparer<T>.Default.Equals(d.Value, item.Value))?.PatchAccepted ?? false;
        }

        foreach (var item in Removed)
        {
            item.PatchAccepted = decisions.Removed.FirstOrDefault(d => EqualityComparer<T>.Default.Equals(d.Value, item.Value))?.PatchAccepted ?? false;
        }
    }

    public static ListPatch<T>? CompareAndCreate(IEnumerable<T>? original, IEnumerable<T>? changed)
    {
        var o = original?.ToList() ?? [];
        var n = changed?.ToList() ?? [];

        var patch = new ListPatch<T>
        {
            Added = n.Except(o).Select(v => new ListPatchItem<T>(v)).ToList(),
            Removed = o.Except(n).Select(v => new ListPatchItem<T>(v)).ToList()
        };

        return patch.Added.Count == 0 && patch.Removed.Count == 0 ? null : patch;
    }
}
