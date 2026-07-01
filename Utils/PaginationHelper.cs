namespace transdb_backend_net.Utils;

public class PaginationOptions(int skip, int limitWithOverhead)
{
    public int Skip { get;  } = skip;
    public int LimitWithOverhead { get; } = limitWithOverhead;
}

/// <summary>
/// A helper class to implement pagination by always fetching one more and removing it afterwards to check if there are more items
/// </summary>
/// <param name="limit"></param>
/// <param name="page"></param>
/// <typeparam name="T"></typeparam>
public class PaginationHelper<T>(int limit, int page, int? maxPage = null)
{
    private PaginationOptions GetOptions()
    {
        var skip = Math.Max(0, page) * limit;

        // Fetch one more entry to see if there are actually more
        var limitWithOverhead = limit + 1;

        return new PaginationOptions(skip, limitWithOverhead);
    }

    public async Task<(List<T>, bool)> Paginate(Func<PaginationOptions, Task<List<T>>> execute)
    {
        if (page > maxPage)
        {
            return ([], false);
        }
        
        var options = this.GetOptions();

        var items = await execute(options);
        
        var more = false;
        
        if (items.Count() > limit)
        {
            more = true;
            items = items.SkipLast(1).ToList();
        }
        
        if (page >= maxPage)
        {
            more = false;
        }

        return (items, more);
    }
}