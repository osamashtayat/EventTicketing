using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;
using EventTicketingApi.Common.Constant;
namespace EventTicketingApi.Infrastructure;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; }=string.Empty;
    public string LastName { get; set; } = string.Empty;
    [NotMapped]
    public string  FullName=>$"{LastName},{FirstName}";

}
