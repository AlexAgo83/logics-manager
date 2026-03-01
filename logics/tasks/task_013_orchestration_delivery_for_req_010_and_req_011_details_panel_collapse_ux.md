## task_013_orchestration_delivery_for_req_010_and_req_011_details_panel_collapse_ux - Orchestration delivery for req_010 and req_011 details panel collapse UX
> From version: 1.1.0
> Status: Ready
> Understanding: 97%
> Confidence: 94%
> Progress: 0%
> Complexity: Medium-High
> Theme: Split Layout Interaction Orchestration
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from:
- `logics/backlog/item_010_stacked_layout_disable_splitter_and_compact_details_when_collapsed.md`
- `logics/backlog/item_011_horizontal_layout_keep_details_action_buttons_pinned_to_bottom_when_collapsed.md`

This orchestration task coordinates details-panel collapse behavior across both layout modes:
- stacked layout: disable splitter when collapsed + compact bottom panel;
- horizontal layout: keep actions pinned at panel bottom when collapsed.

# Plan
- [ ] 1. Implement stacked-mode guards: ignore splitter interactions when `detailsCollapsed` is true.
- [ ] 2. Implement compact collapsed details layout for stacked mode and preserve re-expand behavior.
- [ ] 3. Implement horizontal collapsed layout anchoring so actions remain pinned at bottom.
- [ ] 4. Add/adjust tests for collapse + layout interactions where feasible.
- [ ] 5. Run harness + VS Code runtime smoke validation for both modes.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1 (stacked splitter disabled on collapse) -> interaction guards in `media/main.js`.
- AC2 (stacked compact bottom details) -> collapsed/staked CSS + render logic in `media/main.css` and `media/main.js`.
- AC3 (horizontal actions pinned bottom) -> horizontal collapsed CSS behavior in `media/main.css`.
- AC4 (no regression across modes) -> harness scenarios + manual VS Code validation evidence.

# Validation
- `npm run compile`
- `npm run test`
- Manual (harness): verify stacked/horizontal collapse interactions.
- Manual (VS Code): verify splitter disabled in stacked collapsed mode and actions pinned in horizontal collapsed mode.
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.

# Report
- Risks:
  - layout regressions between stacked and horizontal modes.
  - collapse state persistence edge cases (`detailsCollapsed`, `splitRatio`).
- Mitigation:
  - validate transitions (collapse/expand + resize + viewport changes) in both harness and VS Code runtime.
