## task_248_server_sourced_cdx_terminal_typing - Server-sourced CDX terminal typing
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_457_server_sourced_cdx_terminal_typing`

# Acceptance criteria
- AC3: A CDX terminal keeps its CDX typing and usage gauge across refresh and close/reopen, with no transient loss; the association is sourced from the server terminal payload rather than re-derived from a possibly-null client status payload.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_248_server_sourced_cdx_terminal_typing.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement server-sourced cdx terminal typing.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
