---
name: frontend-quality-review
description: Review ENCORE frontend changes for API correctness, unsafe typing, duplicated responsibilities, state leaks, accessibility and maintainability with actionable evidence.
---

# Review the user journey and its boundaries

Read [AGENTS.md](../../../AGENTS.md) and the affected milestone. Review the diff and its real callers; avoid broad stylistic rewrites. Use [ARCHITECTURE.md](../../../ARCHITECTURE.md), [API_CONTRACT.md](../../../API_CONTRACT.md) and [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md) as the baseline.

Trace a representative journey from route/input through hook and HTTP payload back to rendered state. Prioritize:

- Wrong methods/fields or assumed capabilities; wrong empty/paged response handling; unsafe monetary parse or UTC interpretation.
- Booking auto-retries, misleading unknown-outcome recovery, partial cancellation increments instead of cumulative targets, or manager cancellation of another customer's booking.
- Server state copied to Zustand/local state; private cache or late mutation results crossing sessions; credentials retained in storage/query/devtools; uncontrolled refresh loops.
- API calls in shared UI, page-specific navigation in API modules, sibling runtime imports, cache invalidation duplicated across pages, and abstractions whose callers need unrelated exceptions.
- `any`, unchecked payload assertions, lost nullability, read DTOs reused as write bodies, blank-number coercion and query normalization inconsistencies.
- Missing section errors, input loss, fake price/image/ownership data, keyboard/focus failures, unlabeled times and controls, overflow on small screens and inaccurate confirmation wording.

For each actionable finding, state file/line, concrete trigger, user-visible consequence and smallest useful correction. Prioritize correctness over cosmetic uniformity. Distinguish confirmed defects from questions. When authorized to fix, make targeted changes and rerun affected checks; a review-only request remains a review.

Conclude with actual type/lint/build/test/browser results and remaining risks, distinguishing mock from live verification. A clean static review does not establish backend transaction correctness or production readiness.
