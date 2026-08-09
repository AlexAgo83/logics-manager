## item_676_run_the_full_logics_manager_doctor_in_ci - Run the full logics-manager doctor in CI
> From version: 2.21.2
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 40%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 01:00:22

# AI Context
- Summary: Run the full logics-manager doctor in CI
- Keywords: backlog-groom, request, run the full logics-manager doctor in ci, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Run the full logics-manager doctor in CI.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
CI runs `doctor packaging --metadata-only` and nothing else (`.github/workflows/ci.yml:45`, `scripts/ci-check.mjs:69`). The full `logics-manager doctor` has been exiting FAILED on this repository while `npm run ci:check` reports green. A diagnostic the project ships as a headline capability is the one check its own pipeline does not run, so its verdict drifted from the pipeline's without anyone being told.

# Scope
- In:
  - Add the full `logics-manager doctor` to the CI step list and to `scripts/ci-check.mjs`, keeping the two in sync as the file's own header comment requires.
  - Place it after the corpus lint steps so a failure reads in the right order.
- Out:
  - Making doctor pass — that is `item_675`. This slice must land after it, or CI goes red.
  - Any change to what doctor checks.

# Acceptance criteria
- AC4: `npm run ci:check` and the GitHub CI workflow both run the full `logics-manager doctor`, and a corpus that fails it fails the build.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: BLOCKED behind `item_675`. The step was added to `ci-check.mjs` and `.github/workflows/ci.yml`, and proven to bite -- with the backfill applied, `doctor` exits 0; removing one `> Schema version:` line makes it exit 1. It was then removed again, because with the backfill reverted the step would land CI permanently red. Re-add it in the same wave that resolves `item_675`.

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
- Request: `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose`
- Primary task(s): `task_322_orchestrate_the_diagnostics_and_release_surface_cleanup`

# Priority
- Priority: Medium
- Rationale: Set while scoping req_325's review findings.

# Notes
- Hybrid rationale: Derived from request `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose.md`.
- Generated locally by logics-manager.
