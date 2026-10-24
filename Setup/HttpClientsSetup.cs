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
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", cmsConfig.AccessToken);
        });

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

        services.Configure<CaptchaConfig>(configuration.GetSection(CaptchaConfig.ConfigKey));
        var captchaConfig = configuration.GetSection(CaptchaConfig.ConfigKey).Get<CaptchaConfig>()!;
        services.AddHttpClient<ICaptchaService, CaptchaService>(client =>
        {
            client.BaseAddress = new Uri(captchaConfig.InstanceUrl);
        });

        return services;
    }
}
