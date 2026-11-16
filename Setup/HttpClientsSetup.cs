using System.Net.Http.Headers;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Services;

namespace transdb_backend_net.Setup;

public static class HttpClientsSetup
{
    public static IServiceCollection AddApplicationHttpClients(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<CmsConfig>()
            .Bind(configuration.GetSection(CmsConfig.ConfigKey))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        
        services.AddHttpClient<ICmsService, CmsApiService>();

        services.AddOptions<GeocodingConfig>()
            .Bind(configuration.GetSection(GeocodingConfig.ConfigKey))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        
        services.AddHttpClient<IGeocodingService, GeocodingApiService>();


        services.AddOptions<NominatimConfig>()
            .Bind(configuration.GetSection(NominatimConfig.ConfigKey))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        
        services.AddHttpClient<INominatimService, NominatimService>();
        services.AddOptions<CaptchaConfig>()
            .Bind(configuration.GetSection(CaptchaConfig.ConfigKey))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        
        services.AddHttpClient<ICaptchaService, CaptchaApiService>();

        return services;
    }
}
