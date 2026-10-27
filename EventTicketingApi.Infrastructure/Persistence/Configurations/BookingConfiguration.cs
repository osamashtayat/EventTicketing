using EventTicketingApi.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace EventTicketingApi.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.Property(b => b.CustomerId).HasMaxLength(450);
        builder.Property(b => b.Currency).HasMaxLength(3).IsUnicode(false);
        builder.Property(b => b.TotalAmount).HasPrecision(20, 2);
        builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(b => b.CustomerId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne(b => b.Event).WithMany().HasForeignKey(b => b.EventId).OnDelete(DeleteBehavior.NoAction);
        builder.HasIndex(b => new { b.CustomerId, b.CreatedAtUtc, b.Id });
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Bookings_Amount", "[TotalAmount] >= 0");
            t.HasCheckConstraint("CK_Bookings_Currency", "[Currency] = 'USD'");
            t.HasCheckConstraint("CK_Bookings_Status", "[Status] IN (0, 1, 2)");
        });
    }
}

public class BookingItemConfiguration : IEntityTypeConfiguration<BookingItem>
{
    public void Configure(EntityTypeBuilder<BookingItem> builder)
    {
        builder.Property(i => i.UnitPrice).HasPrecision(18, 2);
        builder.HasOne(i => i.Booking).WithMany(b => b.Items).HasForeignKey(i => i.BookingId).OnDelete(DeleteBehavior.NoAction);
        builder.HasOne(i => i.TicketCategory).WithMany().HasForeignKey(i => i.TicketCategoryId).OnDelete(DeleteBehavior.NoAction);
        builder.HasIndex(i => new { i.BookingId, i.TicketCategoryId }).IsUnique();
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("CK_BookingItems_Quantity", "[Quantity] BETWEEN 1 AND 20");
            t.HasCheckConstraint("CK_BookingItems_CancelledQuantity", "[CancelledQuantity] >= 0 AND [CancelledQuantity] <= [Quantity]");
            t.HasCheckConstraint("CK_BookingItems_Price", "[UnitPrice] >= 0");
        });
    }
}
