namespace transdb_backend_net.Models.Config;

public class GeocodingConfig
{
    public const string ConfigKey = "Geocoding";

    public string Url { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
}

public class CaptchaConfig
{
    public const string ConfigKey = "Captcha";

    public string InstanceUrl { get; set; } = string.Empty;
    public string SiteKey { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
}

public class CmsConfig
{
    public const string ConfigKey = "Cms";

    public string Url { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string TicketCollection { get; set; } = "transdb_tickets";
}

public class MongoDbConfig
{
    public const string ConfigKey = "MongoDB";

    public string ConnectionUri { get; set; } = string.Empty;
}

public class EntryConfig
{
    public const string ConfigKey = "Entry";
    
    public int ItemsPerPage { get; set; } = 10;
    public int MaxPageNumber { get; set; } = 7;
    public int AdminItemsPerPage { get; set; } = 20;
    public int ActivityItemsPerPage { get; set; } = 35;
    public double DuplicateProbabilityThreshold { get; set; } = 0.55;
    public TimeSpan RevocationTokenLifetime { get; set; } = TimeSpan.FromHours(24);
}

public class NominatimConfig
{
    public const string ConfigKey = "Nominatim";

    public string Url { get; set; } = "https://nominatim.openstreetmap.org";
    public string UserAgent { get; set; } = string.Empty;
}

public class RateLimiterPolicyConfig
{
    public TimeSpan Window { get; set; } = TimeSpan.FromMinutes(5);
    public int PermitLimit { get; set; } = 3;
}

public class CorsConfig
{
    public const string ConfigKey = "Cors";

    /// <summary>Allowed origins for the development CORS policy (used when <c>ASPNETCORE_ENVIRONMENT=Development</c>).</summary>
    public string[] DevOrigins { get; set; } = ["http://localhost:5173"];
    public string[] ProdOrigins { get; set; } = ["https://transdb.de"];
}

public class RateLimiterConfig
{
    public const string ConfigKey = "RateLimiter";
    public RateLimiterPolicyConfig NewEntry { get; set; } = new();
    public RateLimiterPolicyConfig Report { get; set; } = new();
    public RateLimiterPolicyConfig Login { get; set; } = new() { PermitLimit = 5 };
    public RateLimiterPolicyConfig Revoke { get; set; } = new() { PermitLimit = 5 };
}
