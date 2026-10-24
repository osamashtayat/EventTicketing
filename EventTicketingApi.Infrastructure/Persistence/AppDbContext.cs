using Microsoft.EntityFrameworkCore;
using EventTicketingApi.Domain;
namespace EventTicketingApi.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
public DbSet<Event> Events { get; set; }
public DbSet<TicketCategory> TicketCategories { get; set; }
public DbSet<Venue> Venues { get; set; }
public DbSet<Country> Countries { get; set; }
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);

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
