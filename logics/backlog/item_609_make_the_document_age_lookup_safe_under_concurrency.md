## item_609_make_the_document_age_lookup_safe_under_concurrency - Make the document-age lookup safe under concurrency
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Shared cache correctness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Problem
- The shared lookup caches in a plain module dictionary with no lock, while the viewer that now calls it serves requests on threads. Six concurrent calls were measured performing six full history walks of about a third of a second each.
- There is no corruption, only duplicated work, but a cached component in the same server already guards its own state with a lock, so the protection exists and was simply not reused.

# Scope
- In:
  - Guard the cache so callers arriving together share one history walk instead of each performing their own.
  - Keep the existing invalidation on the repository's current commit.
  - Keep the filesystem fallback for a document with no commit.
  - Cover the concurrent case in a test that counts the walks.
- Out:
  - Changing the cache's invalidation policy.
  - Introducing a background refresh.
  - Locking anything other than this cache.

# Acceptance criteria
- AC1: Several concurrent callers produce one history walk, not one each.
- AC2: A commit still invalidates the cache as it does today.
- AC3: A repository with no history still returns the filesystem fallback.
- AC4: A test counts the walks under concurrency and fails against the current implementation.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Several concurrent callers produce one history walk, not one each.
- request-AC5 -> This backlog slice. Proof: AC2: A commit still invalidates the cache as it does today.
- request-AC4 -> This backlog slice. Proof: Delivered in commit 6d6f004d. Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (990 passed) at 76% coverage against a raised 75% floor, and npx vitest run (760 passed). Source: `6d6f004d`
- request-AC6 -> This backlog slice. Proof: Delivered in commit 6d6f004d. Validated with ruff, scripts/check_function_length.py, python -m pytest tests/python (990 passed) at 76% coverage against a raised 75% floor, and npx vitest run (760 passed). Source: `6d6f004d`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_055_say_what_it_does_and_test_what_was_moved`
- Architecture decision(s): (none yet)
- Request: `req_307_close_the_gaps_the_second_review_found_stated_risk_cache_concurrency_and_untested_route_branches`
- Primary task(s): `task_304_orchestrate_the_second_review_remediation`

# AI Context
- Summary: Make the document-age lookup safe under concurrency
- Keywords: scaffolded-backlog, make the document-age lookup safe under concurrency, implementation-ready
- Use when: Implementing the scaffolded slice for Make the document-age lookup safe under concurrency.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a regression introduced by wiring it into a threading server
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_304_orchestrate_the_second_review_remediation`

# Notes
- Task `task_304_orchestrate_the_second_review_remediation` was finished via `logics-manager flow finish task` on 2026-08-07.
