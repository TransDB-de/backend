using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Services;
using transdb_backend_net.Setup;
using transdb_backend_net.Utils;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options =>
{
    options.TimestampFormat = "[dd.MM HH:mm:ss] ";
    options.SingleLine = true;
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.AllowOutOfOrderMetadataProperties = true;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    options.JsonSerializerOptions.Converters.Add(new ObjectIdJsonConverter());
});
builder.Services.ConfigureOptions<ConfigureApiValidationMessages>();
builder.Services.ConfigureOptions<ConfigureApiValidationBehaviour>();

builder.Services.AddOpenApi();
builder.Services.AddMongoDb(builder.Configuration);
builder.Services.AddApplicationHttpClients(builder.Configuration);

// Services
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEntryService, EntryService>();

// Cookie authentication (session-only, no persistent cookie)
builder.Services.ConfigureOptions<ConfigureCookieOptions>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireClaim("isAdmin", "true");
    });
});

// Rate limiting
var rateLimiterConfig = builder.Configuration.GetSection(RateLimiterConfig.ConfigKey)
    .Get<RateLimiterConfig>() ?? new RateLimiterConfig();

builder.Services.AddRateLimiter(options =>
{
    options.AddSlidingWindowLimiter("newEntry", opt =>
    {
        opt.Window = rateLimiterConfig.NewEntry.Window;
        opt.PermitLimit = rateLimiterConfig.NewEntry.PermitLimit;
        opt.SegmentsPerWindow = 4;
        opt.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("report", opt =>
    {
        opt.Window = rateLimiterConfig.Report.Window;
        opt.PermitLimit = rateLimiterConfig.Report.PermitLimit;
        opt.QueueLimit = 0;
    });
    options.AddSlidingWindowLimiter("login", opt =>
    {
        opt.Window = rateLimiterConfig.Login.Window;
        opt.PermitLimit = rateLimiterConfig.Login.PermitLimit;
        opt.SegmentsPerWindow = 4;
        opt.QueueLimit = 0;
    });
    options.AddSlidingWindowLimiter("revoke", opt =>
    {
        opt.Window = rateLimiterConfig.Revoke.Window;
        opt.PermitLimit = rateLimiterConfig.Revoke.PermitLimit;
        opt.SegmentsPerWindow = 4;
        opt.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// CORS
var corsConfig = builder.Configuration.GetSection(CorsConfig.ConfigKey).Get<CorsConfig>() ?? new CorsConfig();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(corsConfig.DevOrigins);
        policy.AllowCredentials();
        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
    });
    options.AddPolicy("prod", policy =>
    {
        policy.WithOrigins(corsConfig.ProdOrigins);
        policy.AllowCredentials();
        policy.AllowAnyHeader();
        policy.AllowAnyMethod();
    });
});

// Reverse proxy headers
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.All;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseCors();
}
else
{
    app.UseForwardedHeaders();
    app.UseCors("prod");
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();

app.Run();
