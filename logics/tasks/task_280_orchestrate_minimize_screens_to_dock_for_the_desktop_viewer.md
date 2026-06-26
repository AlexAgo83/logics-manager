## task_280_orchestrate_minimize_screens_to_dock_for_the_desktop_viewer - Orchestrate minimize-screens-to-dock for the desktop viewer
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Add the minimized screen state and the desktop-only header minimize button first.
- [ ] 2. Build the bottom-left dock of stacked pills with restore and kill.
- [ ] 3. Preserve live state across minimize and re-fit the terminal on restore.
- [ ] 4. Run viewer smoke/render tests and confirm no regression in screen switching or close.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_513_add_minimize_restore_screen_state_and_the_header_minimize_button`
- `item_514_build_the_bottom_left_minimized_dock_of_stacked_pills`
- `item_515_preserve_live_screen_state_across_minimize_and_re_fit_terminal_on_restore`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Implemented desktop minimize/restore dock in the viewer, kept Workshop terminal state hidden instead of closed for direct restores, regenerated viewer assets, and passed npm test -- --run tests/viewer.browser-host.test.ts plus asset checks.
- request-AC3 -> This task. Proof: Implemented desktop minimize/restore dock in the viewer, kept Workshop terminal state hidden instead of closed for direct restores, regenerated viewer assets, and passed npm test -- --run tests/viewer.browser-host.test.ts plus asset checks.
- request-AC5 -> This task. Proof: Implemented desktop minimize/restore dock in the viewer, kept Workshop terminal state hidden instead of closed for direct restores, regenerated viewer assets, and passed npm test -- --run tests/viewer.browser-host.test.ts plus asset checks.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Finish workflow executed on 2026-06-26.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-26.
- Linked backlog item(s): `item_513_add_minimize_restore_screen_state_and_the_header_minimize_button`, `item_514_build_the_bottom_left_minimized_dock_of_stacked_pills`, `item_515_preserve_live_screen_state_across_minimize_and_re_fit_terminal_on_restore`
- Related request(s): `req_283_minimize_desktop_viewer_screens_to_a_bottom_left_dock`

# AI Context
- Summary: Orchestrate minimize-screens-to-dock for the desktop viewer
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_283_minimize_desktop_viewer_screens_to_a_bottom_left_dock`
- Product brief(s): `prod_032_minimizable_viewer_screens`
- Architecture decision(s): (none yet)
