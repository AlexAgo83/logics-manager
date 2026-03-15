## task_058_strengthen_webview_regression_tests_for_list_filters_and_layout_css - Strengthen webview regression tests for list filters and layout CSS
> From version: 1.10.0
> Status: Proposed
> Understanding: 98%
> Confidence: 96%
> Progress: 0%
> Complexity: Medium
> Theme: UI regression coverage and test trustworthiness
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_053_strengthen_webview_regression_tests_for_list_filters_and_layout_css`.
- Source file: `logics/backlog/item_053_strengthen_webview_regression_tests_for_list_filters_and_layout_css.md`.
- Related request(s): `req_048_strengthen_webview_regression_tests_for_list_filters_and_layout_css`.

# Plan
- [ ] 1. Add regression coverage for `Hide empty columns` in list mode.
- [ ] 2. Strengthen layout/CSS assertions where current checks are too broad.
- [ ] 3. Prefer behavior- and DOM-level assertions first, with targeted CSS checks only where needed.
- [ ] 4. Keep the resulting suite maintainable and not overly brittle.
- [ ] FINAL: Update related Logics docs

# Links
- Backlog item: `item_053_strengthen_webview_regression_tests_for_list_filters_and_layout_css`
- Request(s): `req_048_strengthen_webview_regression_tests_for_list_filters_and_layout_css`

# Validation
- `npm test -- tests/webview.harness-a11y.test.ts`
- `npm test -- tests/webview.layout-collapse.test.ts`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status and progress updated.
