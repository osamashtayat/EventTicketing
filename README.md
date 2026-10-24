# Event Ticketing API

## Country HTTP slice

The API now has a `CountriesController` backed by `ICountriesService`. After a
fresh build and restart, inspect the routes in Scalar at
`https://localhost:7209/scalar` using the HTTPS launch profile. Request examples
are in `EventTicketingApi/EventTicketingApi.http`.

| Method | Route | Success |
| --- | --- | --- |
| GET | `/api/countries` | 200 with summaries (including an empty list) |
| GET | `/api/countries/{id}` | 200 with country details and venues |
| GET | `/api/countries/by-name?name=Jordan` | 200 with country details and venues |
| POST | `/api/countries` | 201 with details and a Location header |
| PUT | `/api/countries/{id}` | 204; route and body IDs must match |
| DELETE | `/api/countries/{id}` | 204 |

Request DTO annotations are validated by `[ApiController]`. Service failures map
to 400 (validation), 404 (missing), 409 (conflict), or 500 (unexpected failure).
These learning endpoints currently have no authentication. Requests that access
the database require the local SQL Server container, connection configuration,
and applied migrations described during setup. The original scaffold overview
below records the starting point rather than this slice's implementation status.

A learning and portfolio backend inspired by event ticketing platforms. The goal
is to practice realistic REST API design, relational modeling, service design,
authentication, transactions, concurrency, and testing through small steps that
the developer implements and understands.

## Current status

The repository contains an ASP.NET Core starter app and three class libraries,
all targeting `net10.0`. The only HTTP feature is the generated `/weatherforecast`
sample; it is not a ticketing feature. The libraries still contain generated
`Class1.cs` placeholders. No ticketing entities, database, migrations,
authentication, bookings, or automated tests exist yet.

The API references Application and Common; Application references Domain and
Common. Domain and Common have no project references. OpenAPI
(`Microsoft.AspNetCore.OpenApi` 10.0.11) is the only explicit package dependency.

## Technology direction

Current: C#, .NET 10, ASP.NET Core, built-in DI, LINQ, and OpenAPI document generation.
Planned foundation: EF Core, SQL Server, RESTful endpoints, DTOs, and validation.
Later: Identity and JWT, xUnit, structured error handling and logging, background
processing, Docker, email, payments, and optionally React. Git/GitHub are the
intended version-control workflow; remote and CI setup are not configured here.
Packages and infrastructure will be introduced only when a milestone needs them.

## Local setup today

Install a .NET 10 SDK. From the repository root:

```sh
dotnet restore EventTicketingApi.slnx
dotnet build EventTicketingApi.slnx --no-restore
dotnet run --project EventTicketingApi/EventTicketingApi.csproj --launch-profile http
```

The HTTP profile uses `http://localhost:5066`. In Development, the OpenAPI JSON
document is at `/openapi/v1.json`; no Swagger UI is installed. Inspect the starter
endpoint at `/weatherforecast`. The app includes HTTPS redirection; the HTTPS
profile uses `https://localhost:7209` and requires a trusted local development
certificate (`dotnet dev-certs https --trust` where supported).

No database or secrets are required for the current starter. EF tools, connection
configuration, SQL Server provisioning, migration commands, and authentication
settings will be documented when those components exist. Use local secret storage
or environment variables for credentials; do not commit them.

There are no tests to run yet. Once test projects are added to the solution, use
`dotnet test EventTicketingApi.slnx`; see the roadmap for when tests are introduced.

## Planned capabilities

- Event and venue management, event search, filtering, and pagination.
- Ticket categories with prices, capacity, and sales availability.
- Registration, sign-in, and Administrator, Event Organizer, and Customer roles.
- Booking creation, history, cancellation, and availability tracking.
- Transactional inventory updates, concurrency protection, temporary holds,
  expiration, and appropriate idempotency.
- Optional QR tickets, email, payments, reporting, administration UI, and frontend.

These are plans, not implemented or tested capabilities.

## Development guide

- [Agent instructions](AGENTS.md): how Codex should assist without taking over learning.
- [Architecture](docs/ARCHITECTURE.md): current structure, proposed boundaries, and open decisions.
- [Roadmap](docs/ROADMAP.md): incremental tasks and completion criteria.
- [Business rules](docs/BUSINESS_RULES.md): proposed invariants and questions to resolve.

Start with a paper design of `Venue` and its capacity rules, then implement that
small domain model yourself after agreeing its invariants. No database or endpoint
is necessary for that first exercise.
