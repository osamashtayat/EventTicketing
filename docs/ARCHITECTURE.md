# Architecture

## Implemented structure

`EventTicketingApi.slnx` contains four .NET 10 projects:

| Project | Current contents | Direct project references |
| --- | --- | --- |
| EventTicketingApi | Minimal API weather sample, configuration, OpenAPI | Application, Common |
| EventTicketingApi.Application | Generated class placeholder | Domain, Common |
| EventTicketingApi.Domain | Generated class placeholder | None |
| EventTicketingApi.Common | Generated class placeholder | None |

Nullable reference types and implicit usings are enabled. No EF Core, DbContext,
SQL Server configuration, Identity, validation library, or tests exist. The API
currently uses minimal APIs; controllers have not been configured.

## Proposed responsibility boundaries

- **API:** route definitions or controllers, HTTP status codes, authentication
  middleware, request handling, and the dependency-injection composition root.
- **Application:** use-case services, DTOs, explicit mapping, validation of use-case
  inputs, and orchestration. Business rules must not depend on an HTTP context.
- **Domain:** entities and business invariants using plain C#. Avoid ASP.NET Core
  and EF-specific dependencies. Keep persistence mapping outside these entities.
- **Common:** only small types with a demonstrated need across projects, such as
  a shared result type. Domain concepts belong in Domain, not Common. Do not add
  utilities in anticipation of future use.

Dependency direction remains API → Application → Domain, with the existing optional
Common references. API code should normally access domain behavior through use
cases rather than acquiring another reference for convenience.

Use simple use-case services, constructor injection, DTOs, and manual mapping to
start. Do not introduce CQRS, MediatR, a generic repository, or an interface per
class without a concrete reason. Decide controllers versus minimal APIs when
implementing the first endpoint; either can keep HTTP concerns thin.

## Persistence decision gate — not implemented

EF Core and SQL Server are the intended persistence technologies. No project has
yet been assigned ownership of DbContext, mappings, migrations, or implementation
of data-access contracts. Before adding EF packages, discuss and agree placement:

1. A small Infrastructure project can own EF Core and migrations, reference
   Application/Domain as needed, and be registered by API. This preserves the
   current inner-layer boundaries but adds a project and contracts where needed.
2. Keeping persistence in an existing project reduces project count but couples
   that project to EF Core; document the concrete trade-off and reference changes.

Neither option is selected here. Obtain agreement before changing architecture.
Avoid creating a generic repository as a prerequisite. If an abstraction is needed
to cross a boundary, make it specific to an actual use case.

## Proposed relational model — not a final schema

| Concept | Intended relationships and considerations |
| --- | --- |
| Venue | One venue hosts many events; positive attendance capacity and address/location |
| Event | Belongs to a venue and, after auth, an organizer; title, description, start/end, capacity |
| TicketCategory | Belongs to one event; name, price/currency, allocation, optional sale window |
| User | Future Identity-backed account; role and ownership checks remain separate |
| Booking | Belongs to a customer; proposed to cover one event and contain multiple items |
| BookingItem | Category, positive quantity, and immutable price/currency snapshot |

An event classification for search (for example, Music) is distinct from a ticket
category (for example, VIP). Decide whether event classification is a lookup,
enum, or text before implementing filters. Assigned seating is deferred; start
with general admission unless the developer chooses otherwise.

Proposed conventions to agree during modeling:

- Use consistent primary keys; choose integer versus GUID keys before the first migration.
- Represent money with `decimal`, explicit database precision and currency; do not
  derive historical booking totals from today's ticket price.
- Represent instants consistently in UTC, preferably with `DateTimeOffset`; retain
  venue time-zone information if local-time display/scheduling requires it.
- Map required fields, lengths, foreign keys, and database constraints explicitly.
  Index actual lookup paths (event dates, category/event keys, customer bookings)
  based on the queries being built.
- Preserve booking history; prefer restricting deletion or explicit archival over
  cascading deletion of booked events/categories. Confirm lifecycle policy first.
- Do not store an independently editable availability count without a clear
  transactional inventory design. See the business rules for capacity invariants.

## Verification and evolution

Introduce focused domain/service tests as rules arrive and HTTP integration tests
as endpoints arrive. Use SQL Server integration coverage for provider-specific
constraints, transactions, and concurrency; an in-memory provider cannot establish
those guarantees. Add basic input errors and useful logging with the first slice;
broaden diagnostics in later milestones. Document approved decisions here and
update the roadmap instead of treating proposals as implemented facts.
