---
name: ef-core-changes
description: Plan, implement, or review EF Core mappings and migrations in EventTicketingApi when persistence work is requested. Not for unrelated domain-only edits.
---

# EF Core changes

Read root `AGENTS.md`, `docs/ARCHITECTURE.md`, and relevant business rules from the
repository root. Explain/review by default; write implementation only when requested.

1. Inspect actual packages, DbContext, configuration, migrations, and startup project.
   EF Core is absent from the initial scaffold. If persistence placement remains
   undecided, explain options and obtain agreement before adding it.
2. Review relationships, required fields, lengths, decimal precision, deletion,
   capacity constraints, and indexes for the actual use case. Keep EF mapping out
   of Domain and preserve booking history.
3. Make only the requested change. Use packages compatible with the existing .NET
   target and provider; do not silently install tools or upgrade packages.
4. Once tooling exists, generate a narrowly named migration with explicit paths:
   `dotnet ef migrations add <Name> --project <Persistence.csproj> --startup-project EventTicketingApi/EventTicketingApi.csproj`.
   Replace placeholders with discovered paths; no persistence project exists yet.
5. Review operations, snapshot, and SQL for data loss and constraints. Do not rewrite
   migrations already applied to shared databases. Confirm the target database
   before applying; generating a migration does not authorize applying it.
6. Build and verify against an isolated SQL Server database when provider behavior
   matters. Report checks actually performed, risks, and unverified paths.
