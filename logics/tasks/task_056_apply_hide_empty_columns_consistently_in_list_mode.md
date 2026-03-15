## task_056_apply_hide_empty_columns_consistently_in_list_mode - Apply hide empty columns consistently in list mode
> From version: 1.10.0
> Status: Proposed
> Understanding: 98%
> Confidence: 98%
> Progress: 0%
> Complexity: Low
> Theme: Filter consistency across board and list views
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_051_apply_hide_empty_columns_consistently_in_list_mode`.
- Source file: `logics/backlog/item_051_apply_hide_empty_columns_consistently_in_list_mode.md`.
- Related request(s): `req_046_apply_hide_empty_columns_consistently_in_list_mode`.

# Plan
- [ ] 1. Apply `Hide empty columns` to stage-grouped list mode.
- [ ] 2. Keep empty stage groups fully removed when the filter is enabled.
- [ ] 3. Preserve current behavior when the filter is disabled and leave status grouping unchanged.
- [ ] 4. Add regression coverage for the list-mode behavior.
- [ ] FINAL: Update related Logics docs

# Links
- Backlog item: `item_051_apply_hide_empty_columns_consistently_in_list_mode`
- Request(s): `req_046_apply_hide_empty_columns_consistently_in_list_mode`

# Validation
- `npm run compile`
- `npm test -- tests/webview.harness-a11y.test.ts`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status and progress updated.
