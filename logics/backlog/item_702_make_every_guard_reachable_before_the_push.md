## item_702_make_every_guard_reachable_before_the_push - Make every guard reachable before the push
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Developer loop
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `check_function_length.py` runs only in CI, and `core.hooksPath` points at a directory deleted in 0038628b, so no hook has run since June.
- Keywords: git-hooks, local-guards, function-length, developer-loop
- Use when: Changing where a repository guard runs, or the hooks configuration npm install applies.
- Skip when: The work concerns what a guard checks, rather than where it is reachable from.

# Problem
- `check_function_length.py` runs only in CI, and `core.hooksPath` points at `.githooks/`, deleted in 0038628b, so no hook has run since.

# Scope
- In:
  - Give the function-length guard a local npm entry point beside the other checks.
  - Resolve the dangling hooks configuration, either by restoring the directory or removing the config.
- Out:
  - Reinstating the retired mirror sync/check tooling.

# Acceptance criteria
- AC3: The guard runs from a local npm script and is documented.
- AC4: `core.hooksPath` no longer points at a non-existent directory.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: The guard runs from a local npm script and is documented.
- request-AC4 -> This backlog slice. Proof: AC4: `core.hooksPath` no longer points at a non-existent directory.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_076_tooling_that_tells_the_truth_about_itself`
- Architecture decision(s): (none yet)
- Request: `req_340_close_the_three_trust_gaps_the_2_21_7_cycle_exposed`
- Primary task(s): `task_337_deliver_the_three_trust_gaps_from_the_2_21_7_cycle`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_337_deliver_the_three_trust_gaps_from_the_2_21_7_cycle` was finished via `logics-manager flow finish task` on 2026-08-11.
