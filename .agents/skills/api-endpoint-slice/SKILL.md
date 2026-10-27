---
name: api-endpoint-slice
description: Guide, implement, or review a small ASP.NET Core endpoint slice in EventTicketingApi when an HTTP operation is requested, preserving the requested scope.
---

# API endpoint slice

Read root `AGENTS.md`, the current roadmap milestone, architecture boundaries, and
relevant business rules. Implement requested changes by default; honor explicit
explanation-only or review-only requests.

1. Inspect current controllers, DTOs, service contracts, dependencies, and tests.
   Extend the existing controller/service pattern and verify the current contract.
2. State method/route, request/response, validation, expected HTTP outcomes, and
   role/ownership checks. Distinguish missing resources from forbidden operations
   according to the project's agreed security policy.
3. Implement only the requested operation when authorized. Keep HTTP translation in
   API, orchestration/DTOs in Application, and invariants in Domain. Use explicit
   mapping; avoid exposing tracked entities or adding a framework for one route.
4. Consider validation and failure paths alongside success. For inventory changes,
   require the atomicity/concurrency design from the business rules; an availability
   query is not a reservation guarantee.
5. Verify success and meaningful failures with existing tests or explicit manual
   requests. Update request samples and documentation where behavior changes.
   Do not claim authorization or persistence is verified by a build.
