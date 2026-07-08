using System.Text.Json;
using System.Text.Json.Serialization;
using MongoDB.Bson;

namespace transdb_backend_net.Utils;

public class ObjectIdJsonConverter : JsonConverter<ObjectId>
{
    public override ObjectId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) =>
        ObjectId.TryParse(reader.GetString(), out var id) ? id : throw new JsonException("Invalid ObjectId");

    public override void Write(Utf8JsonWriter writer, ObjectId value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString());
}
