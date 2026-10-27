# Setup and administration

Follow the [root setup guide](../README.md#run-locally) for first-time installation.
This document records configuration and upgrade behavior. It contains no account credentials.

## Configuration

| Setting | Purpose |
| --- | --- |
| `.env` → `SQL_PASSWORD` | Password supplied to the Compose SQL Server container |
| User Secrets → `ConnectionStrings:DefaultConnection` | API database connection string |
| `Cors:AllowedOrigins` | Exact frontend origins permitted by the API |
| Frontend `VITE_API_BASE_URL` | Public API origin at frontend build/start time |
| `BootstrapAdmin:Enabled` | Opt-in first-admin creation; off by default |
| `BootstrapAdmin:Email` / `BootstrapAdmin:Password` | New first-admin credentials, provided privately |
| `BootstrapAdmin:FirstName` / `BootstrapAdmin:LastName` | Optional initial profile names |

Use API User Secrets locally and private environment configuration when deployed.
Environment keys use double underscores, for example `ConnectionStrings__DefaultConnection`
and `Cors__AllowedOrigins__0`. Never put credentials into tracked appsettings, frontend
variables, HTTP samples, screenshots, or logs.

Docker Compose does not configure the locally running API's connection string. Both
settings must point to the same intended SQL Server instance. Changing SQL_PASSWORD
does not reset an existing database volume's account password.

## First admin

Apply migrations to a new database first. Configure BootstrapAdmin through User Secrets
or private environment settings, then start the API once. The seeder creates a new
Admin only if no Admin exists. It never promotes an existing account or resets a
password, and duplicate-account/validation failures stop startup with error codes.

After confirming successful setup, disable BootstrapAdmin and remove its password
from configuration after storing it in a password manager. Use the admin's login token
with POST `/api/accounts` to create organizer/admin accounts. Normal public registration
always assigns User. There is no public first-admin endpoint.

The bootstrap password setting is an input to account creation, not a record of the
account's current password. Changing that setting does not change an existing account.
Use Identity's password-reset mechanisms or a controlled administrator procedure for
account recovery; Identity stores password hashes, not recoverable plaintext passwords.

## Database upgrades

```sh
dotnet ef database update --project EventTicketingApi.Infrastructure --startup-project EventTicketingApi -- --environment Development
```

Review the target and migration impact before applying. Do not delete migration history
or volumes to repair an authentication/configuration issue.

The event-ownership migration assigns existing events to the Admin with the lowest
user ID, sorted by SQL Server. It stops if events exist without an Admin. An older
populated database therefore needs an Identity-backed Admin prepared before that
ownership migration. An empty database does not need an ownership backfill.

Booking migrations add Bookings/BookingItems, BookedQuantity, indexes, foreign keys,
and constraints. They preserve existing event/category data. Runtime rules for overlapping
events do not retroactively rewrite schedules; correct existing conflicting capacities
or dates before expecting those events to pass new schedule validation.

## Browser access

Development API URL: https://localhost:7209. Trust the local .NET certificate in the
browser profile used by the frontend. Use the final HTTPS URL directly so preflights
do not encounter redirects. Configure exact CORS origins without paths/trailing slashes.

The SPA uses opaque bearer tokens (`useCookies=false`). Cross-origin credentialed
cookies are not enabled. For another device, localhost refers to that device; configure
network listening, certificate trust, and CORS for the intended access path.

## Verification and diagnostics

Backend integration tests require local SQL Server on port 1434 and create/drop only
uniquely named test databases. The frontend browser suite uses mocked API responses;
see its verification record for the distinction from live checks.

Service outcomes and unhandled request exceptions are written through ILogger to console.
ProblemDetails includes a trace ID when available; correlate it with the API terminal
or container logs. Unexpected responses never include raw exception details. Console
logs are not a durable log store. Do not enable EF sensitive-data logging with credentials.
