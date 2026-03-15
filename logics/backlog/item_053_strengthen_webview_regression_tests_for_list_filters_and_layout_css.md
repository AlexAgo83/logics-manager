## item_053_strengthen_webview_regression_tests_for_list_filters_and_layout_css - Strengthen webview regression tests for list filters and layout CSS
> From version: 1.10.0
> Status: Proposed
> Understanding: 98%
> Confidence: 96%
> Progress: 0%
> Complexity: Medium
> Theme: UI regression coverage and test trustworthiness
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
Recent visible regressions reached the plugin even though the test suite still passed.
Two weak points stand out:
- list-mode filtering is not covered strongly enough for `Hide empty columns`,
- some layout/CSS assertions are broad string checks that do not prove the intended selector actually owns the intended rule.

That leaves the suite less trustworthy than it should be for recent UI work.

# Scope
- In:
  - Add regression coverage for list-mode empty-group filtering.
  - Strengthen layout/CSS assertions where the current checks are too broad.
  - Favor behavior- and DOM-level checks first, with targeted CSS verification only when layout guarantees require it.
- Out:
  - Full visual regression tooling.
  - Snapshot-heavy locking of the whole webview.
  - Exhaustively freezing every CSS detail.

# Acceptance criteria
- AC1: Tests cover `Hide empty columns` behavior in list mode.
- AC2: Layout/CSS assertions are more targeted than generic string-presence checks where critical layout rules are involved.
- AC3: The updated coverage still focuses on behavioral trust and does not become brittle for harmless refactors.
- AC4: Recent stacked-layout and splitter regressions remain covered.

# Priority
- Impact:
  - Medium: higher confidence on UI work that has already regressed multiple times.
- Urgency:
  - Medium: worthwhile before the current UI/layout backlog grows further.

# Notes
- Derived from `logics/request/req_048_strengthen_webview_regression_tests_for_list_filters_and_layout_css.md`.
- The first pass should target regressions already seen plus a small number of nearby high-risk cases.
- Behavior- and DOM-level assertions should take priority over CSS-string locking unless a layout contract is otherwise hard to verify.

# Tasks
- `logics/tasks/task_058_strengthen_webview_regression_tests_for_list_filters_and_layout_css.md`
