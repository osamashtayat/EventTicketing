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

## Technology direction

Current: C#, .NET 10, ASP.NET Core, built-in DI, LINQ, and OpenAPI document generation.
Planned foundation: EF Core, SQL Server, RESTful endpoints, DTOs, and validation.
Later: Identity and JWT, xUnit, structured error handling and logging, background
processing, Docker, email, payments, and optionally React. Git/GitHub are the
intended version-control workflow; remote and CI setup are not configured here.
Packages and infrastructure will be introduced only when a milestone needs them.


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

