## item_670_turn_the_python_coverage_floor_into_a_ratchet_like_the_line_budget_guard - Turn the Python coverage floor into a ratchet like the line-budget guard
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 18:45:49

# AI Context
- Summary: Turn the Python coverage floor into a ratchet like the line-budget guard
- Keywords: backlog-groom, request, turn the python coverage floor into a ratchet like the line-budget guard, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Turn the Python coverage floor into a ratchet like the line-budget guard.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`scripts/ci-check.mjs:99-107` enforces the Python coverage floor with `coverage report --fail-under=75`, and the comment directly above it states outright: "the floor sits below the measured value so the build does not start red." That is a self-documented rubber stamp - it will not catch a coverage regression until the real number drops below whatever the actual (unstated) current percentage already is. The line-budget guard next to it (`scripts/check-source-line-budget.mjs`) already solves the equivalent problem for file size: item_626 turned it into a ratchet that reports (and can lower) an entry that has room to spare, rather than leaving a stale, permissive ceiling in place.

# Scope
- In:
  - Measure the actual current Python coverage percentage (`coverage report` locally).
  - Replace the hardcoded `--fail-under=75` with either the real measured percentage as the floor, or a small ratchet mechanism modeled on the line-budget guard's own pattern (a recorded floor that can be raised when coverage improves, refused if lowered without a stated reason).
  - Cover the new behavior with a test: a coverage run below the recorded floor fails the check; a run at or above it passes.
- Out:
  - Raising the floor to some new aspirational target beyond what's measured now - this fixes the check's honesty, it does not mandate new test-writing elsewhere in the codebase.
  - Any change to the TypeScript coverage thresholds in `vitest.config.mts`, which are already real (not backdated) targets.
  - The path-guard consolidation, the mcp.py/flow module extractions, the lockfile regeneration, and the `assist_workflow.py` test gap - each is its own sibling backlog item.

# Acceptance criteria
- AC4: The Python coverage floor in `scripts/ci-check.mjs` either states the real current measured percentage as its floor, or is replaced with a ratchet mechanism consistent with the line-budget ledger's own pattern (item_626).

# AC Traceability
- request-AC4 -> This backlog slice. Proof: `scripts/coverage-floor.mjs`'s `evaluateCoverageFloor()` (pure comparison, unit-tested in `tests/coverageFloor.test.ts` - fails below the floor, reports "raisable" rather than silently passing above it, matching item_626's own fail-below/report-above pattern) is now called from `ci-check.mjs`'s `checkPythonCoverageFloor()`, replacing the hardcoded `--fail-under=75`. `PYTHON_COVERAGE_FLOOR` set to 77 (the real measured value via `coverage report --format=total`, confirmed locally), with `--update` support to write a future raise back. 3 new vitest tests passed.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_323_review_findings_security_tests_structure_dependencies`
- Primary task(s): `task_320_orchestrate_the_review_findings_cleanup`

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_323_review_findings_security_tests_structure_dependencies` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_323_review_findings_security_tests_structure_dependencies.md`.
- Generated locally by logics-manager.
- Task `task_320_orchestrate_the_review_findings_cleanup` was finished via `logics-manager flow finish task` on 2026-08-09.

# Tasks
- `task_320_orchestrate_the_review_findings_cleanup`
