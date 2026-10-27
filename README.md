# Encore

A full-stack event discovery and ticket-booking application built with **ASP.NET Core 10**, **SQL Server**, and **React with TypeScript**.

Encore combines a public event catalogue, customer booking flows, and role-based administration. Its backend handles concurrent inventory updates, overlapping venue schedules, event ownership, and partial cancellations; the frontend provides a responsive interface with typed API boundaries and session-aware caching.

[API reference](docs/FRONTEND_API.md) · [Architecture](docs/ARCHITECTURE.md) · [Business rules](docs/BUSINESS_RULES.md) · [Roadmap](docs/ROADMAP.md) · [Frontend setup](EventTicketingFrontend/README.md)

![Encore event discovery interface](EventTicketingFrontend/artifacts/discovery-desktop.png)

*Desktop interface captured with mocked event fixtures. [Mobile preview](EventTicketingFrontend/artifacts/discovery-mobile.png).*

## Features

| Area | Implemented capabilities |
| --- | --- |
| Discovery | Search, location/date/price filters, stable pagination, event details, and ticket availability |
| Accounts | Identity registration, opaque bearer login/refresh, current-user profile, and admin-created organizer/admin accounts |
| Authorization | Admin controls, organizer-owned event management, an owned-event listing, and protected event booking history |
| Bookings | Immediate confirmation, USD price snapshots, personal history, full/partial cancellation, and released-ticket rebooking |
| Venue scheduling | Peak simultaneous event-capacity checks on create/update and venue-capacity reduction |
| Frontend | Responsive discovery, authentication, customer bookings/cancellations, and administration workspaces |
| Diagnostics | Structured service-result logs, centralized exception handling, safe ProblemDetails responses, and trace IDs |

The API now returns venue capacity and event owner IDs. Frontend venue editing and the owned-event dashboard still need to adopt those additions; their exact scope is recorded in the [frontend handoff](docs/FRONTEND_HANDOFF.md).

## Engineering highlights

- **Atomic inventory:** booking items and inventory claims commit together. Conditional SQL updates and database constraints prevent claims above category capacity.
- **Concurrency across instances:** transaction-scoped SQL Server locks coordinate booking/cancellation and schedule edits. Venue moves acquire locks in a consistent order.
- **Time-aware scheduling:** simultaneous event allocations must fit a venue. The validator measures peak overlap rather than adding unrelated events across the entire calendar.
- **Cancellation without double release:** partial requests specify cumulative cancelled quantities. Retries release only the additional quantity, and customers can cancel only their own tickets.
- **Historical pricing:** booking items retain their original price and category name. Later category edits do not rewrite previous booking totals.
- **Separation of concerns:** controllers handle HTTP, services enforce use cases, Domain owns entities and scheduling rules, and Infrastructure owns EF/Identity and transactions.
- **Typed frontend integration:** strict TypeScript, runtime response decoding, exact monetary JSON handling, and private query-cache isolation between sessions.

## Stack and repository layout

| Component | Technologies / location |
| --- | --- |
| API | .NET 10, ASP.NET Core, OpenAPI, Scalar — `EventTicketingApi/` |
| Application | DTOs, contracts, validation, AutoMapper profiles — `EventTicketingApi.Application/` |
| Domain | Entities and scheduling calculation — `EventTicketingApi.Domain/` |
| Infrastructure | EF Core, SQL Server, Identity, service implementations — `EventTicketingApi.Infrastructure/` |
| Common | Framework-independent Result and error types — `EventTicketingApi.Common/` |
| Backend tests | xUnit, real HTTP/Identity/SQL Server — `EventTicketingApi.IntegrationTests/` |
| Frontend | React, TypeScript, Vite, TanStack Query, React Router, Zustand, Tailwind CSS — `EventTicketingFrontend/` |

## Run locally

Requirements: .NET 10 SDK, Node.js 22.12+, npm, Docker with Compose, and the EF Core CLI matching .NET 10. SQL Server runs in Docker; the API and frontend run locally.

### 1. Configure SQL Server

Create an ignored `.env` in the repository root. Choose a strong local password and replace the placeholder:

```dotenv
SQL_PASSWORD=<your-local-sql-password>
```

```sh
docker compose up -d sqlserver
docker compose logs --tail=50 sqlserver
```

Wait for SQL Server to report it is ready for connections. Compose binds SQL Server to `localhost,1434`, persists data in a named volume, and requests the amd64 image for its current container configuration.

### 2. Configure and start the API

Keep the connection string in User Secrets; use the same SQL password as `.env`:

```sh
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1434;Database=EventTicketingDb;User Id=sa;Password=<same-password-as-env>;Encrypt=True;TrustServerCertificate=True;" --project EventTicketingApi
dotnet restore EventTicketingApi.slnx
dotnet ef database update --project EventTicketingApi.Infrastructure --startup-project EventTicketingApi -- --environment Development
dotnet dev-certs https --trust
dotnet run --project EventTicketingApi --launch-profile https
```

Apply migrations only to the intended database. The API does not apply migrations automatically at startup. For an existing database that predates event ownership, the ownership migration requires an Admin account when events already exist; see [setup and administration](docs/SETUP.md).

- API: **https://localhost:7209**
- Scalar: **https://localhost:7209/scalar**
- OpenAPI: **https://localhost:7209/openapi/v1.json**

### 3. Start the frontend

In another terminal:

```sh
cd EventTicketingFrontend
npm ci
cp .env.example .env.local
npm run dev
```

Open **http://localhost:5173/events**. The example frontend configuration targets the local HTTPS API. Development CORS permits localhost ports 5173 and 3000; deployment origins must be configured explicitly.

## Verification

The latest backend run passed **48 xUnit tests**, including real Identity tokens and isolated SQL Server databases. Coverage includes ownership, inventory races, rollback, cancellation deadlines/retries, schedule overlaps, response contracts, filters, and CORS.

```sh
dotnet test EventTicketingApi.slnx
```

Backend tests create and remove uniquely named databases on local SQL Server at port 1434. They use API User Secrets or `EVENT_TICKETING_TEST_CONNECTION`; the SQL login must be able to create/drop test databases. Test setup and cleanup do not write to the application's database.

Frontend verification commands:

```sh
cd EventTicketingFrontend
npm run check
npm run format:check
npm run test:e2e
```

The recorded frontend verification includes 35 unit/integration tests and 15 mocked Chrome journeys. Mocked browser results and the live read-only smoke check are distinguished in the [frontend verification record](EventTicketingFrontend/VERIFICATION.md); they do not establish a complete live customer checkout journey.

## Scope and next steps

Bookings confirm immediately; payment processing, assigned seating, QR tickets, temporary holds, and booking-create idempotency are not implemented. CI/deployment and the remaining frontend contract adoption are tracked in the [roadmap](docs/ROADMAP.md). The API is the authority for prices, stock, deadlines, and access control.

## Documentation

- [Architecture](docs/ARCHITECTURE.md): project dependencies, transactions, and frontend integration.
- [Business rules](docs/BUSINESS_RULES.md): current booking, scheduling, and authorization behavior.
- [Setup and administration](docs/SETUP.md): configuration, first admin, and database upgrades.
- [API reference](docs/FRONTEND_API.md) and [TypeScript contracts](docs/frontend-api.ts): requests, responses, permissions, and errors.
- [Booking design](docs/BOOKING_DESIGN.md): inventory accounting and cancellation semantics.
- [Frontend documentation](EventTicketingFrontend/README.md): client setup and implementation boundaries.
