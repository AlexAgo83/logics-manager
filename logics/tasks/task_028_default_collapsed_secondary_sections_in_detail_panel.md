## task_028_default_collapsed_secondary_sections_in_detail_panel - Default secondary detail sections to collapsed in the plugin detail panel
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Low
> Theme: Detail panel scanability and progressive disclosure
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_033_default_collapsed_secondary_sections_in_detail_panel`.
- Source file: `logics/backlog/item_033_default_collapsed_secondary_sections_in_detail_panel.md`.
- Related request(s): `req_029_default_collapsed_secondary_sections_in_detail_panel`.

```mermaid
flowchart LR
    Backlog[Backlog source] --> State[Define default open/collapsed section state]
    State --> Renderer[Apply defaults in details renderer]
    Renderer --> Toggle[Preserve manual expand/collapse behavior]
    Toggle --> Selection[Validate behavior on selection changes]
    Selection --> Tests[Add regression coverage]
```

# Plan
- [ ] 1. Clarify where default collapsed-section state is initialized today.
- [ ] 2. Set `Indicators` open by default and `Companion docs`, `Specs`, `References`, `Used by` closed by default.
- [ ] 3. Preserve existing manual expand/collapse behavior and section actions.
- [ ] 4. Verify the intended defaults when switching selected items.
- [ ] 5. Add/adjust harness tests for the default section-open hierarchy.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Step 2.
- AC3/AC4/AC5/AC6 -> Step 2.
- AC7/AC8 -> Steps 3 and 4.
- AC9 -> Step 3.
- AC10 -> Step 5.

# Links
- Backlog item: `item_033_default_collapsed_secondary_sections_in_detail_panel`
- Request(s): `req_029_default_collapsed_secondary_sections_in_detail_panel`

# Validation
- `npm run compile`
- `npm test -- tests/webview.harness-a11y.test.ts`
- `npm test -- tests/webview.layout-collapse.test.ts`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
