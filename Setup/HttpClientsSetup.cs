using System.Net.Http.Headers;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Services;

namespace transdb_backend_net.Setup;

public static class HttpClientsSetup
{
    public static IServiceCollection AddApplicationHttpClients(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<CmsConfig>(configuration.GetSection(CmsConfig.ConfigKey));
        var cmsConfig = configuration.GetSection(CmsConfig.ConfigKey).Get<CmsConfig>()!;
        services.AddHttpClient<ICmsService, CmsService>(client =>
        {
            client.BaseAddress = new Uri(cmsConfig.Url);
        });

        services.Configure<GeocodingConfig>(configuration.GetSection(GeocodingConfig.ConfigKey));
        var geocodingConfig = configuration.GetSection(GeocodingConfig.ConfigKey).Get<GeocodingConfig>()!;
        services.AddHttpClient<IGeocodingService, GeocodingService>(client =>
        {
            client.BaseAddress = new Uri(geocodingConfig.Url);
            client.DefaultRequestHeaders.Add("X-API-Key", geocodingConfig.ApiKey);
        });

        services.Configure<NominatimConfig>(configuration.GetSection(NominatimConfig.ConfigKey));
        var nominatimConfig = configuration.GetSection(NominatimConfig.ConfigKey).Get<NominatimConfig>()!;
        services.AddHttpClient<INominatimService, NominatimService>(client =>
        {
            client.BaseAddress = new Uri(nominatimConfig.Url);
            client.DefaultRequestHeaders.Add("User-Agent", nominatimConfig.UserAgent);
        });

        services.Configure<CaptchaConfig>(configuration.GetSection(CaptchaConfig.ConfigKey));
        var captchaConfig = configuration.GetSection(CaptchaConfig.ConfigKey).Get<CaptchaConfig>()!;
        services.AddHttpClient<ICaptchaService, CaptchaService>(client =>
        {
            client.BaseAddress = new Uri(captchaConfig.InstanceUrl);
        });

        return services;
    }
}
