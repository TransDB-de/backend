using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Bson.Serialization.Serializers;
using transdb_backend_net.Models.Config;
using transdb_backend_net.Models.Database;
using transdb_backend_net.Models.Request;
using transdb_backend_net.Schema;
using transdb_backend_net.Services;

namespace transdb_backend_net.Setup;

public static class MongoDbSetup
{
    public static IServiceCollection AddMongoDb(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MongoDbConfig>(configuration.GetSection(MongoDbConfig.ConfigKey));

        // camelCase field names, enums as strings (C# member name)
        var conventionPack = new ConventionPack
        {
            new CamelCaseElementNameConvention(),
            new EnumRepresentationConvention(BsonType.String)
        };
        ConventionRegistry.Register("Conventions", conventionPack, _ => true);

        // EnumRepresentationConvention does not apply to enum elements inside lists
        // explicit serialiser registration is required so List<EntryOffer> etc. store as strings
        BsonSerializer.RegisterSerializer(new EnumSerializer<EEntryOffer>(BsonType.String));
        BsonSerializer.RegisterSerializer(new EnumSerializer<EEntryAttribute>(BsonType.String));

        // ObjectSerializer only allows primitives by default, open it up for our own types
        // so Dictionary<..., object> attachments in EntryActivity can be round-tripped
        BsonSerializer.RegisterSerializer(new ObjectSerializer(type =>
            ObjectSerializer.DefaultAllowedTypes(type) ||
            type.FullName!.StartsWith("transdb_backend_net.")));

        // Explicitly register types that are stored as object values in EntryActivity.Attachments
        // so their _t discriminator can be resolved on deserialization even before any write in the process
        BsonClassMap.RegisterClassMap<CreateEntryRequest>(cm => cm.AutoMap());
        BsonClassMap.RegisterClassMap<EditEntryRequest>(cm => cm.AutoMap());
        BsonClassMap.RegisterClassMap<Entry>(cm => cm.AutoMap());
        BsonClassMap.RegisterClassMap<DuplicateMatch>(cm => cm.AutoMap());

        services.AddSingleton<IDatabaseService, DatabaseService>();
        services.AddSingleton<IEntryRevocationService, EntryRevocationService>();
        services.AddSingleton<IEntryActivityService, EntryActivityService>();

        return services;
    }
}
