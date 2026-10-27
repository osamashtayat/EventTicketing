using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Identity;

public class EventAccess(AppDbContext dbContext, ICurrentUser currentUser)
{
    public bool CanManage => !string.IsNullOrEmpty(currentUser.Id) &&
        (currentUser.IsInRole(RoleNames.Admin) || currentUser.IsInRole(RoleNames.EventOrganizer));

    public Result CheckOwner(string ownerId) => CanManage &&
        (currentUser.IsInRole(RoleNames.Admin) || currentUser.Id == ownerId)
        ? Result.Success() : Result.Forbidden(Denied());

    public async Task<Result> CheckEventAsync(int eventId, CancellationToken cancellationToken)
    {
        if (!CanManage)
        {
            return Result.Forbidden(Denied());
        }
        var ownerId = await dbContext.Events.AsNoTracking().Where(e => e.Id == eventId)
            .Select(e => e.OrganizerId).FirstOrDefaultAsync(cancellationToken);
        return ownerId is null
            ? Result.NotFound(new Error("Event.NotFound", "Event not found."))
            : CheckOwner(ownerId);
    }

    public static Error Denied() => new("Event.Forbidden", "You cannot manage this event.");
}
