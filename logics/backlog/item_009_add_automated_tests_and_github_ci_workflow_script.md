## item_009_add_automated_tests_and_github_ci_workflow_script - Add automated tests and GitHub CI workflow script
> From version: 1.9.1
> Status: Done
> Understanding: 97% (audit-aligned)
> Confidence: 93% (validated)
> Progress: 100% (audit-aligned)
> Complexity: Medium
> Theme: Quality and CI
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

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
- AC1 -> `package.json` test scripts + test config files added. Proof: TODO.
- AC2 -> Tests created for `src/logicsIndexer.ts` critical functions. Proof: TODO.
- AC3 -> `.github/workflows/*.yml` workflow added and validated. Proof: TODO.
- AC4 -> README updated with test/CI execution notes. Proof: TODO.
- AC5 -> TODO: map this acceptance criterion to scope. Proof: TODO.

# Priority
- Impact:
  - High: directly improves change safety for core workflow features.
- Urgency:
  - High: should be in place before additional feature waves.

# Notes
- Derived from `logics/request/req_009_add_automated_tests_and_github_ci_workflow_script.md`.

# Tasks
- `logics/tasks/task_012_orchestration_delivery_for_req_009_tests_and_github_ci.md`
