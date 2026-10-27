using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventTicketingApi.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BookedQuantity",
                table: "TicketCategories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Bookings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CustomerId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    EventId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CancelledAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    Currency = table.Column<string>(type: "varchar(3)", unicode: false, maxLength: 3, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(20,2)", precision: 20, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bookings", x => x.Id);
                    table.CheckConstraint("CK_Bookings_Amount", "[TotalAmount] >= 0");
                    table.CheckConstraint("CK_Bookings_Currency", "[Currency] = 'USD'");
                    table.CheckConstraint("CK_Bookings_Status", "[Status] IN (0, 1, 2)");
                    table.ForeignKey(
                        name: "FK_Bookings_AspNetUsers_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Bookings_Events_EventId",
                        column: x => x.EventId,
                        principalTable: "Events",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "BookingItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookingId = table.Column<int>(type: "int", nullable: false),
                    TicketCategoryId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CancelledQuantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CategoryName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingItems", x => x.Id);
                    table.CheckConstraint("CK_BookingItems_CancelledQuantity", "[CancelledQuantity] >= 0 AND [CancelledQuantity] <= [Quantity]");
                    table.CheckConstraint("CK_BookingItems_Price", "[UnitPrice] >= 0");
                    table.CheckConstraint("CK_BookingItems_Quantity", "[Quantity] BETWEEN 1 AND 20");
                    table.ForeignKey(
                        name: "FK_BookingItems_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BookingItems_TicketCategories_TicketCategoryId",
                        column: x => x.TicketCategoryId,
                        principalTable: "TicketCategories",
                        principalColumn: "Id");
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_TicketCategories_BookedQuantity",
                table: "TicketCategories",
                sql: "[BookedQuantity] >= 0 AND [BookedQuantity] <= [Capacity]");

            migrationBuilder.CreateIndex(
                name: "IX_BookingItems_BookingId_TicketCategoryId",
                table: "BookingItems",
                columns: new[] { "BookingId", "TicketCategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BookingItems_TicketCategoryId",
                table: "BookingItems",
                column: "TicketCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_CustomerId_CreatedAtUtc_Id",
                table: "Bookings",
                columns: new[] { "CustomerId", "CreatedAtUtc", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_EventId",
                table: "Bookings",
                column: "EventId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingItems");

            migrationBuilder.DropTable(
                name: "Bookings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_TicketCategories_BookedQuantity",
                table: "TicketCategories");

            migrationBuilder.DropColumn(
                name: "BookedQuantity",
                table: "TicketCategories");
        }
    }
}
