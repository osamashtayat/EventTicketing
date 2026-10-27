using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EventTicketingApi.Application.Serialization;

// Scoped to event write DTO properties; other API dates keep their existing contract.
public class EventDateJsonConverter : JsonConverter<DateTime>
{
    protected virtual bool InclusiveEndDate => false;

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            if (DateTime.TryParseExact(reader.GetString(), ["MM/dd/yyyy", "yyyy-MM-dd"], CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var date))
            {
                if (InclusiveEndDate && date.Date == DateTime.MaxValue.Date)
                    throw new JsonException("End date is outside the supported range.");
                return InclusiveEndDate ? date.AddDays(1) : date;
            }
            if (reader.TryGetDateTime(out var timestamp))
            {
                return timestamp.Kind == DateTimeKind.Local
                    ? timestamp.ToUniversalTime()
                    : DateTime.SpecifyKind(timestamp, DateTimeKind.Utc);
            }
        }
        throw new JsonException("Use MM/dd/yyyy or an ISO 8601 date/time.");
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value);
}
