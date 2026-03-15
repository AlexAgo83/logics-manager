## item_057_split_monolithic_webview_harness_tests_by_behavior_domain - Split monolithic webview harness tests by behavior domain
> From version: 1.10.0
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Test modularity and suite maintainability
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
[webview.harness-a11y.test.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/tests/webview.harness-a11y.test.ts) has become a single large aggregation point for many unrelated webview behaviors.

That makes the suite harder to navigate and weakens the feedback loop when trying to understand whether a regression belongs to filtering, layout, details, persistence, accessibility, or other concerns.

# Scope
- In:
  - Split the current monolithic harness suite into smaller files organized by behavior domains.
  - Preserve shared harness setup where it improves consistency without re-centralizing all assertions.
  - Keep test names and coverage understandable from the file layout.
  - Avoid snapshot sprawl and keep the suites behavior-oriented.
- Out:
  - Rewriting the test harness from scratch.
  - Converting the suite to a different test framework.
  - Reducing coverage as a side effect of reorganization.

# Acceptance criteria
- AC1: The current monolithic webview harness suite is reorganized into smaller files with coherent behavior scopes.
- AC2: Shared setup stays discoverable without forcing all assertions back into one giant file.
- AC3: Test coverage remains at least equivalent after the split.
- AC4: The resulting suite is easier to extend by behavior area without recreating a new monolith.

# Priority
- Impact:
  - Medium: mainly a maintainability and review-speed improvement.
- Urgency:
  - Medium: useful before more webview regression cases are added.

# Notes
- Derived from `logics/request/req_050_split_oversized_source_files_into_coherent_modules.md`.
- A reasonable split would follow areas such as layout/view modes, filters/search/grouping, details/actions, and persistence/accessibility.
- The goal is not just smaller test files; it is clearer ownership of regression domains.

# Tasks
- `logics/tasks/task_062_split_monolithic_webview_harness_tests_by_behavior_domain.md`
