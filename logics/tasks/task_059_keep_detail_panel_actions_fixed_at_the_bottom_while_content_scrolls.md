## task_059_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls - Keep detail panel actions fixed at the bottom while content scrolls
> From version: 1.10.0
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Medium
> Theme: Detail panel scrolling and action anchoring
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_054_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls`.
- Source file: `logics/backlog/item_054_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls.md`.
- Related request(s): `req_049_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls`.

# Plan
- [ ] 1. Separate the scrollable detail body from a fixed bottom action footer.
- [ ] 2. Keep the detail footer reachable in stacked and horizontal layouts.
- [ ] 3. Bound the `Activity` panel and upper region so they do not starve `Details` of usable height.
- [ ] 4. Add regression coverage for vertical budget and scroll-ownership behavior.
- [ ] FINAL: Update related Logics docs

# Links
- Backlog item: `item_054_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls`
- Request(s): `req_049_keep_detail_panel_actions_fixed_at_the_bottom_while_content_scrolls`

# Validation
- `npm run compile`
- `npm test -- tests/webview.layout-collapse.test.ts`
- `npm test -- tests/webview.harness-a11y.test.ts`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status and progress updated.
