# Event Ticketing API — agent guidance

## Purpose and working style

This is an educational C# backend and portfolio project for discovering events,
managing venues and ticket categories, and booking tickets. Help the developer
learn by explaining the relevant concept, a small next step, and its trade-offs.
Implement requested changes by default, including users and authentication, unless
explicitly asked for guidance, explanation, or review only. Complete the requested
slice, briefly explain what changed and its verification, then suggest the next step.
Give detailed explanations when requested. Ask before significant architectural
changes or work outside the requested phase.

## Current stack and boundaries

- Five production projects and one xUnit integration-test project target .NET 10.
- ASP.NET Core controllers/OpenAPI/Scalar, EF Core SQL Server, AutoMapper, Identity's
  built-in opaque bearer tokens, and DataAnnotations are installed. No custom JWT.
- Inspect actual project files before adding dependencies.
- `EventTicketingApi`: HTTP endpoints, request/response handling, DI composition.
- `EventTicketingApi.Application`: use cases, DTOs, service contracts and orchestration.
- `EventTicketingApi.Domain`: entities, value objects, business rules; no project references.
- `EventTicketingApi.Common`: small framework-independent shared utilities; no project references.
- Infrastructure owns EF, Identity, and concrete services; it references Application/Domain.
- API references Application/Infrastructure/Common; Application references Domain/Common.
  Never reverse these references or use Common as a catch-all.

## Change conventions

- Prefer readable C#, PascalCase types/members, camelCase locals/parameters, and
  namespaces matching project/folder names. Use async I/O with cancellation tokens
  and an `Async` suffix where appropriate.
- Keep controllers or handlers thin; separate business logic from HTTP concerns.
  Use DTOs at API boundaries and straightforward explicit mapping initially.
- Avoid CQRS, MediatR, generic repositories, microservices, and speculative abstractions.
  Add packages only for a demonstrated need; retain the existing .NET target.
- Never commit secrets or put credentials into documentation or request samples.
- Update relevant documentation when an approved decision or behavior changes.
  Distinguish implemented behavior, proposed rules, and unresolved decisions.
- Do not apply database changes to an unknown/shared database. Review migration
  impact and confirm the target before applying; do not erase migration history.

## Build and verification (repository root)

```sh
dotnet restore EventTicketingApi.slnx
dotnet build EventTicketingApi.slnx --no-restore
dotnet run --project EventTicketingApi/EventTicketingApi.csproj --launch-profile http
```

Run `dotnet test EventTicketingApi.slnx` (or the affected test project).
Integration tests require local SQL Server at localhost,1434 via API User Secrets
or EVENT_TICKETING_TEST_CONNECTION. Each test migrates/deletes its own uniquely
named database; never target the application database for test setup or cleanup.
A successful
build or test command with no discovered tests is not evidence of tested features.
Run meaningful checks for each change and report what ran, what passed, and what
could not be verified. Documentation-only changes need link/content checks, not new tests.

## Context and reusable workflows

Read [README.md](README.md) for setup and actual status, [docs/ROADMAP.md](docs/ROADMAP.md)
before selecting work, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before structural
or persistence work, and [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) before
changing capacities, lifecycle, authorization, bookings, or cancellation.

Use relevant skills in `.agents/skills/` for EF changes, endpoint work, and test
verification. They guide future authorized work; their presence does not authorize
feature implementation, dependency installation, or database mutations by itself.
