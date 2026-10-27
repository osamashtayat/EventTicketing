namespace EventTicketingApi.Configuration;

public static class FrontendCors
{
    public const string PolicyName = "Frontend";

    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        foreach (var origin in origins)
        {
            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri) ||
                uri.Scheme is not ("http" or "https") || uri.AbsolutePath != "/" ||
                uri.Query.Length > 0 || uri.Fragment.Length > 0 || uri.UserInfo.Length > 0 ||
                origin.EndsWith('/') || uri.Host.Contains('*'))
            {
                throw new InvalidOperationException("Cors:AllowedOrigins must contain exact HTTP/HTTPS origins without paths or trailing slashes.");
            }
        }
        services.AddCors(options => options.AddPolicy(PolicyName, policy => policy
            .WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Location")));
        return services;
    }
}
