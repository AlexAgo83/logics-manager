## task_032_allow_collapsing_and_expanding_groups_in_list_mode - Allow collapsing and expanding groups in list mode
> From version: 1.9.3
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Medium
> Theme: List-mode navigation and density control
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_038_allow_collapsing_and_expanding_groups_in_list_mode`.
- Source file: `logics/backlog/item_038_allow_collapsing_and_expanding_groups_in_list_mode.md`.
- Related request(s): `req_033_allow_collapsing_and_expanding_groups_in_list_mode`.

```mermaid
flowchart LR
    Backlog[Backlog source] --> Groups[Inspect current list-group rendering]
    Groups --> Controls[Add collapse/expand controls to headers]
    Controls --> State[Manage collapsed state safely]
    State --> Interactions[Preserve item interactions and list behavior]
    Interactions --> Tests[Add regression coverage]
```

# Plan
- [ ] 1. Identify how list groups are currently rendered and where header controls should live.
- [ ] 2. Add collapse/expand controls to list-mode group headers while keeping groups expanded by default.
- [ ] 3. Hide/show group body content while keeping headers visible.
- [ ] 4. Ensure item selection and navigation still work after toggle cycles.
- [ ] 5. Decide and implement safe persistence behavior for list-group collapse state.
- [ ] 6. Add/adjust tests for list-group collapse/expand behavior.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2/AC3 -> Steps 2 and 3.
- AC4 -> Step 6 scenarios across visible optional groups.
- AC5 -> Step 2 and step 3 layout behavior.
- AC6 -> Step 4.
- AC7 -> Step 5.
- AC8 -> Step 6.

# Links
- Backlog item: `item_038_allow_collapsing_and_expanding_groups_in_list_mode`
- Request(s): `req_033_allow_collapsing_and_expanding_groups_in_list_mode`

# Validation
- `npm run compile`
- `npm test -- tests/webview.harness-a11y.test.ts`
- `npm test -- tests/webview.layout-collapse.test.ts`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.
