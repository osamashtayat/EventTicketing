---
name: api-verification
description: Plan or perform focused verification of EventTicketingApi endpoint, domain, or persistence changes, including booking concurrency and failure cases when relevant.
---

# API verification

Read root `AGENTS.md` and relevant accepted business rules. Inspect actual test
projects, including the existing xUnit integration suite. Respect a request for explanation/review
instead of automatically creating a test suite.

1. Identify changed observable behavior and the smallest useful verification: unit
   tests for invariants, HTTP integration tests for contracts/auth, and SQL Server
   integration tests for relational constraints, transactions, or concurrency.
2. Extend the existing xUnit testing stack. Isolate test databases from
   developer/shared data. EF InMemory or SQLite cannot prove SQL Server concurrency
   behavior. Use a controllable clock rather than sleeps for expiration tests.
3. Cover relevant success, invalid input, missing resource, unauthorized/forbidden,
   and ownership paths without mirroring implementation details. Booking work also
   needs insufficient stock, competing last-ticket claims, rollback, and repeated
   cancellation/expiry as applicable.
4. Build and run affected tests with `dotnet test EventTicketingApi.slnx`. Confirm discovery. Report environmental failures separately
   from failed assertions and state blocked verification.
5. Summarize observed results and limitations. Do not mark roadmap criteria complete
   based on a build, zero discovered tests, or unexecuted test code.
