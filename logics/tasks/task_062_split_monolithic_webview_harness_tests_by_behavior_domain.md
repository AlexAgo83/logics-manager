## task_062_split_monolithic_webview_harness_tests_by_behavior_domain - Split monolithic webview harness tests by behavior domain
> From version: 1.10.0
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Test modularity and suite maintainability
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_057_split_monolithic_webview_harness_tests_by_behavior_domain`.
- Source file: `logics/backlog/item_057_split_monolithic_webview_harness_tests_by_behavior_domain.md`.
- Related request(s): `req_050_split_oversized_source_files_into_coherent_modules`.

# Plan
- [x] 1. Split the monolithic harness suite into smaller files by behavior domain.
- [x] 2. Preserve shared setup without recreating a new single-file bottleneck.
- [x] 3. Keep coverage equivalent while improving discoverability.
- [x] 4. Leave the suite behavior-oriented rather than snapshot-heavy.
- [x] FINAL: Update related Logics docs

# Links
- Backlog item: `item_057_split_monolithic_webview_harness_tests_by_behavior_domain`
- Request(s): `req_050_split_oversized_source_files_into_coherent_modules`

# Validation
- `npm test`

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status and progress updated.
