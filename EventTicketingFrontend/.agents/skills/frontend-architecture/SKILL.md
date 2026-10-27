---
name: frontend-architecture
description: Implement or extend ENCORE frontend features using the documented module boundaries, state ownership and acceptance criteria.
---

# Implement a bounded ENCORE feature

1. Read [AGENTS.md](../../../AGENTS.md) and the current frontend [README.md](../../../README.md) and applicable backend roadmap/handoff. Identify the authorized user outcome and its existing API operations. For analysis-only requests, produce design evidence without application edits or installs.
2. Locate the feature's existing public exports, API, queries, mutation hooks and components. Use the folder and dependency decisions in [ARCHITECTURE.md](../../../ARCHITECTURE.md). Create only files the slice consumes; small features stay flat.
3. Write a short responsibility map: URL inputs, local form state, Query resources, shared UI and composition page. Multi-resource composition belongs in app/pages. Do not introduce sibling runtime imports to shorten a page.
4. Reuse established date/money/error/key infrastructure. Extract only duplicated responsibilities; a venue create form and country editor do not need a generic CRUD engine merely because both contain a name.
5. Implement the smallest vertical slice: verified API operation, Query behavior, feature UI and route wiring. Keep invalidation in the mutation hook; page owns navigation. Preserve the UI states and capability fallbacks in [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md).
6. Verify the change's acceptance criteria, especially URL/back behavior, section errors, session scope and mobile/keyboard use. Report what was checked and any contract gate that blocks part of the screen. Update the architecture documentation only for actual approved changes.

Before completing an event-details change, trace event → venue and availability → local quantities → one booking POST → returned booking ID. A component that independently refetches or mirrors any of these in Zustand is a boundary problem to fix.
