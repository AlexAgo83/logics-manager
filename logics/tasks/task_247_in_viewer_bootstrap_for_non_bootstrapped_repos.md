## task_247_in_viewer_bootstrap_for_non_bootstrapped_repos - In-viewer bootstrap for non-bootstrapped repos
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_456_in_viewer_bootstrap_for_non_bootstrapped_repos`

# Acceptance criteria
- AC2: The viewer starts in a repo with no `logics/` corpus and presents an onboarding/bootstrap flow; triggering it scaffolds the corpus and the viewer transitions to the normal experience without a restart.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_247_in_viewer_bootstrap_for_non_bootstrapped_repos.md` after implementation.
- command: `python3 -m pytest tests/python/test_viewer_cli.py -q` | result: passed | date: 2026-06-20 | note: 86 pass; fallback root covered
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_456_in_viewer_bootstrap_for_non_bootstrapped_repos`
- Related request(s): `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing`

# AI Context
- Summary: Implement in-viewer bootstrap for non-bootstrapped repos.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Evidence needed: Refreshing/auto-polling the viewer no longer resets scroll, focus, selection, or open sections on the active screen when content changes; the "jump" is gone across the main screens (Logics, CDX, CI), matching the state preservation Git already has.
- request-AC2 -> This task. Evidence needed: The viewer starts in a repo with no `logics/` corpus and presents an onboarding/bootstrap flow; triggering it scaffolds the corpus and the viewer transitions to the normal experience without a restart.
- request-AC3 -> This task. Evidence needed: A CDX terminal keeps its CDX typing and usage gauge across refresh and close/reopen, with no transient loss; the association is sourced from the server terminal payload rather than re-derived from a possibly-null client status payload.
- request-AC4 -> This task. Evidence needed: No regression — existing viewer/python tests pass, and the dual-copy `viewer_assets/` stays in sync with `clients/viewer/`.
- request-AC1 -> This task. Proof: Implemented req_260: refresh preservation 839fa03, bootstrap fallback 1d29961, server cdx typing 7d933d8; 356 python + 109 vitest pass
- request-AC2 -> This task. Proof: Implemented req_260: refresh preservation 839fa03, bootstrap fallback 1d29961, server cdx typing 7d933d8; 356 python + 109 vitest pass
- request-AC3 -> This task. Proof: Implemented req_260: refresh preservation 839fa03, bootstrap fallback 1d29961, server cdx typing 7d933d8; 356 python + 109 vitest pass
- request-AC4 -> This task. Proof: Implemented req_260: refresh preservation 839fa03, bootstrap fallback 1d29961, server cdx typing 7d933d8; 356 python + 109 vitest pass
