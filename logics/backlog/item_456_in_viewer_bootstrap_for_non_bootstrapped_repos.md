## item_456_in_viewer_bootstrap_for_non_bootstrapped_repos - In-viewer bootstrap for non-bootstrapped repos
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
The browser viewer has three distinct UX pain points that hurt day-to-day operation; this request bounds all three so they can be sliced and shipped independently.
(1) Stateful refresh: every poll that detects a change wipes the active screen, losing scroll position, focus, selection, and open sections — a visible "jump" — and there is no real-time push for changes.
(2) In-viewer bootstrap: the viewer cannot start in a repo that is not already bootstrapped, even though the in-app bootstrap UI exists.
(3) Robust CDX terminal typing: a terminal sometimes loses its CDX session typing and usage gauge after a refresh/reopen, until a later poll restores it.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC2: The viewer starts in a repo with no `logics/` corpus and presents an onboarding/bootstrap flow; triggering it scaffolds the corpus and the viewer transitions to the normal experience without a restart.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: The viewer starts in a repo with no `logics/` corpus and presents an onboarding/bootstrap flow; triggering it scaffolds the corpus and the viewer transitions to the normal experience without a restart.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing.md`
- Primary task(s): (none yet)

# AI Context
- Summary: In-viewer bootstrap for non-bootstrapped repos
- Keywords: backlog-groom, request, in-viewer bootstrap for non-bootstrapped repos, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for In-viewer bootstrap for non-bootstrapped repos.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing.md`.
- Generated locally by logics-manager.

# Tasks
- `task_245_orchestrate_viewer_ux_improvements_refresh_bootstrap_terminal_typing`
- `task_247_in_viewer_bootstrap_for_non_bootstrapped_repos`
