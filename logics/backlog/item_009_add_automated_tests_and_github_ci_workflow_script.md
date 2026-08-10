## item_009_add_automated_tests_and_github_ci_workflow_script - Add automated tests and GitHub CI workflow script
> From version: 1.9.1
> Status: Done
> Schema version: 1.0
> Understanding: 97% (audit-aligned)
> Confidence: 93% (validated)
> Progress: 100% (audit-aligned)
> Complexity: Medium
> Theme: Quality and CI
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:06:10

# Problem
The repository has no automated test suite and no CI workflow. Core behaviors (indexing, references, promotion eligibility, command wiring) can regress without fast feedback on pull requests.

# Scope
- In:
  - Add a test framework and baseline tests for critical extension logic.
  - Add npm script(s) to run tests locally.
  - Add GitHub Actions workflow under `.github/workflows/` to run compile + tests on `push` and `pull_request`.
  - Document local/CI commands in README.
- Out:
  - Full E2E automation for VS Code webview runtime.
  - Advanced release automation beyond baseline CI gates.

# Acceptance criteria
- A local test command exists and runs successfully on the repository.
- Baseline tests cover indexer parsing and promotion guard logic.
- A CI workflow runs on `push` and `pull_request`.
- CI fails when compile/tests fail and passes on healthy branch state.
- README documents local validation and CI coverage.

# AC Traceability
- AC1 -> `package.json` test scripts + test config files added. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC2 -> Tests created for `src/logicsIndexer.ts` critical functions. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC3 -> `.github/workflows/*.yml` workflow added and validated. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC4 -> README updated with test/CI execution notes. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC5 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.

# Priority
- Impact:
  - High: directly improves change safety for core workflow features.
- Urgency:
  - High: should be in place before additional feature waves.

# Notes
- Derived from `logics/request/req_009_add_automated_tests_and_github_ci_workflow_script.md`.

# Tasks
- `logics/tasks/task_012_orchestration_delivery_for_req_009_tests_and_github_ci.md`
