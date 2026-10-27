using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventTicketingApi.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventOrganizer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OrganizerId",
                table: "Events",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.Sql("""
                IF EXISTS (SELECT 1 FROM [Events])
                BEGIN
                    DECLARE @owner nvarchar(450) = (
                        SELECT TOP (1) ur.[UserId]
                        FROM [AspNetUserRoles] ur
                        INNER JOIN [AspNetRoles] r ON r.[Id] = ur.[RoleId]
                        WHERE r.[NormalizedName] = N'ADMIN'
                        ORDER BY ur.[UserId]);
                    IF @owner IS NULL
                        THROW 51000, 'Create an Admin before migrating existing event ownership.', 1;
                    UPDATE [Events] SET [OrganizerId] = @owner WHERE [OrganizerId] IS NULL;
                END
                """);

            migrationBuilder.AlterColumn<string>(
                name: "OrganizerId", table: "Events", type: "nvarchar(450)",
                maxLength: 450, nullable: false,
                oldClrType: typeof(string), oldType: "nvarchar(450)",
                oldMaxLength: 450, oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Events_OrganizerId",
                table: "Events",
                column: "OrganizerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Events_AspNetUsers_OrganizerId",
                table: "Events",
                column: "OrganizerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Events_AspNetUsers_OrganizerId",
                table: "Events");

            migrationBuilder.DropIndex(
                name: "IX_Events_OrganizerId",
                table: "Events");

            migrationBuilder.DropColumn(
                name: "OrganizerId",
                table: "Events");
        }
    }
}
