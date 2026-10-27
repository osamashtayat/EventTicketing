namespace EventTicketingApi.Application.Serialization;

public sealed class EventEndDateJsonConverter : EventDateJsonConverter
{
    protected override bool InclusiveEndDate => true;
}
