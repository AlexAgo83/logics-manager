## task_245_orchestrate_viewer_ux_improvements_refresh_bootstrap_terminal_typing - Orchestrate viewer UX improvements (refresh, bootstrap, terminal typing)
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Coordinate the AC-aware split backlog items without implementing them directly.

# Plan
- [ ] 1. Review the generated backlog slices and request AC mapping.
- [ ] 2. Promote or implement the next highest-priority slice.
- [ ] 3. Keep validation and request traceability updated as slices close.

# Backlog
- `item_455_stateful_viewer_refresh_without_scroll_focus_jump`
- `item_456_in_viewer_bootstrap_for_non_bootstrapped_repos`
- `item_457_server_sourced_cdx_terminal_typing`

# Definition of Done (DoD)
- [x] Generated backlog slices are linked and ready for implementation.
- [x] Slice ownership and next action are clear.
- [x] Validation passes.

# AC Traceability
- request-AC2 -> This task. Proof: orchestration task coordinates the AC-aware split.
- request-AC6 -> This task. Proof: generated task keeps split work explicit and bounded.
- request-AC7 -> This task. Proof: generated task is covered by split request tests.
- request-AC1 -> This task. Evidence needed: Refreshing/auto-polling the viewer no longer resets scroll, focus, selection, or open sections on the active screen when content changes; the "jump" is gone across the main screens (Logics, CDX, CI), matching the state preservation Git already has.
- request-AC3 -> This task. Evidence needed: A CDX terminal keeps its CDX typing and usage gauge across refresh and close/reopen, with no transient loss; the association is sourced from the server terminal payload rather than re-derived from a possibly-null client status payload.
- request-AC4 -> This task. Evidence needed: No regression — existing viewer/python tests pass, and the dual-copy `viewer_assets/` stays in sync with `clients/viewer/`.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_455_stateful_viewer_refresh_without_scroll_focus_jump`, `item_456_in_viewer_bootstrap_for_non_bootstrapped_repos`, `item_457_server_sourced_cdx_terminal_typing`
- Related request(s): `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing`

# AI Context
- Summary: Orchestrate viewer UX improvements (refresh, bootstrap, terminal typing)
- Keywords: ac-aware-split, orchestration-task, generated-task
- Use when: Coordinating the generated backlog slices from an AC-aware request split.
- Skip when: Implementing one individual backlog slice.

# Links
- Request: `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
