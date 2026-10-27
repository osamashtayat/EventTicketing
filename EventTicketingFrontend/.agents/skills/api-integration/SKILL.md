---
name: api-integration
description: Verify ENCORE API operations and implement typed HTTP boundaries, query behavior and contract-focused tests against the existing Event Ticketing backend.
---

# Verify before integrating

1. Read the operation in [API_CONTRACT.md](../../../API_CONTRACT.md), then locate current backend controller/DTO/service evidence. Record method, path, query/body, success status/body, access, validation and uncertainty. Use the working tree, not an old roadmap checkbox or generated schema alone.
2. Check whether the response can support the proposed UI. Stop only the dependent behavior if a field is missing; record the gap and continue independent work. Do not invent venue capacity, event ownership, payment state or an endpoint to satisfy the screen.
3. Add feature-owned types and explicit decoder/request builder using the shared transport in [ARCHITECTURE.md](../../../ARCHITECTURE.md). Distinguish wire numeric money from decoded exact decimal strings; category writes emit numeric tokens. Required/optional/null fields and empty responses must match the actual operation.
4. Use canonical query parameters for both URL and key, propagate AbortSignal for reads, and assign the correct public or session-scoped key. Protected auth uses the existing credential coordinator; never decode opaque tokens or create an independent refresh loop.
5. Define successful cache effects and failed/unknown outcomes before wiring the form. Booking POST is never automatically replayed; cumulative cancellation uses bookingItemId. A 201 followed by failed invalidation remains success.
6. Verify representative success, validation, bodyless auth failure, conflict and network cases with source-based fixtures. For money/date operations, include maximum decimal and suffixless UTC cases. Inspect actual serialized request payloads, not just TypeScript types.
7. When a real local backend is available, perform the authorized smoke check and compare it with fixtures. Do not mutate an unknown database or install/migrate the backend to hide a setup blocker. State separately what source inspection, mocks and live requests established.

If OpenAPI disagrees with controller behavior, preserve the discrepancy in the contract and resolve it against the running instance before generating a client. Custom registration's empty response and four required fields take precedence over an assumed default framework registration schema.
