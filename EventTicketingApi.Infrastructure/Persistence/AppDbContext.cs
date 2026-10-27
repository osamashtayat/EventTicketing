using Microsoft.EntityFrameworkCore;
using EventTicketingApi.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
namespace EventTicketingApi.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
public DbSet<Booking> Bookings { get; set; }
public DbSet<BookingItem> BookingItems { get; set; }
public DbSet<Event> Events { get; set; }
public DbSet<TicketCategory> TicketCategories { get; set; }
public DbSet<Venue> Venues { get; set; }
public DbSet<Country> Countries { get; set; }
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    modelBuilder.ApplyConfiguration(new Configurations.BookingConfiguration());
    modelBuilder.ApplyConfiguration(new Configurations.BookingItemConfiguration());
    modelBuilder.Entity<TicketCategory>().ToTable(t => t.HasCheckConstraint(
        "CK_TicketCategories_BookedQuantity", "[BookedQuantity] >= 0 AND [BookedQuantity] <= [Capacity]"));
    modelBuilder.Entity<Event>()
        .HasOne<ApplicationUser>()
        .WithMany()
        .HasForeignKey(e => e.OrganizerId)
        .OnDelete(DeleteBehavior.NoAction);
    modelBuilder.Entity<Event>().Property(e => e.OrganizerId).HasMaxLength(450).IsRequired();

    modelBuilder.Entity<TicketCategory>()
        .Property(t => t.Price)
        .HasPrecision(18, 2);
        modelBuilder.Entity<Venue>()
    .HasOne(v => v.Country)
    .WithMany(c => c.Venues)
    .HasForeignKey(v => v.CountryId)
    .OnDelete(DeleteBehavior.NoAction);

modelBuilder.Entity<Event>()
    .HasOne(e => e.Venue)
    .WithMany()
    .HasForeignKey(e => e.VenueId)
    .OnDelete(DeleteBehavior.NoAction);
}
}
