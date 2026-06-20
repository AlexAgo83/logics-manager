## req_260_viewer_ux_stateful_refresh_in_viewer_bootstrap_and_robust_cdx_terminal_typing - Viewer UX: stateful refresh, in-viewer bootstrap, and robust CDX terminal typing
> From version: 2.11.6
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Complexity: High
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The browser viewer has three distinct UX pain points that hurt day-to-day operation; this request bounds all three so they can be sliced and shipped independently.
- (1) Stateful refresh: every poll that detects a change wipes the active screen, losing scroll position, focus, selection, and open sections — a visible "jump" — and there is no real-time push for changes.
- (2) In-viewer bootstrap: the viewer cannot start in a repo that is not already bootstrapped, even though the in-app bootstrap UI exists.
- (3) Robust CDX terminal typing: a terminal sometimes loses its CDX session typing and usage gauge after a refresh/reopen, until a later poll restores it.

# Context
- (1) Refresh — root cause: `setDocument()` does `content.innerHTML = html` (`clients/viewer/browser-host.js:2155`), replacing the whole active screen on every changed poll (default 15s, `:381`). Signature-skip already avoids re-render when nothing changed; only the Git screen preserves selection/scroll (`showGitStatus`, ~`:7359`). SSE (`EventSource`) infra exists but only for Workshop terminals/sessions (`logics_manager/viewer.py:4053-4126`). Two sub-efforts: (A) preserve scroll/focus/selection/open-sections across re-render for all screens; (B) optional real-time push via an `/api/events` SSE channel driven by a server-side watcher so only changed sections refetch.
- (2) Bootstrap — root cause: `find_repo_root()` (`logics_manager/config.py:211`) raises `ConfigError` when no `logics/` dir exists, before the server starts (`viewer.py:5072`), so the existing bootstrap UI (`POST /api/bootstrap-logics` `viewer.py:4619`, `canBootstrapLogics` `:515`, `bootstrap_payload()` in `bootstrap.py`) is unreachable. Fix: permissive startup with a fallback root (git toplevel, else cwd), a "needs bootstrap" onboarding screen, then re-derive the root after bootstrap.
- (3) Terminal typing — root cause: the CDX association is re-derived client-side by parsing the terminal label and validating against `latestCdxStatusPayload` (`cdxSessionForTerminal`, `browser-host.js:3802/3817`), which is `null` right after refresh/reopen; if `renderWorkshopTerminalList()` (`:4516`) runs before the status poll populates it, the terminal renders untyped. `WorkshopTerminalSession.status_payload()` (`viewer.py:3368`) returns only the label, no CDX metadata. Fix: carry the `cdxSession` (and usage) on the server-side terminal payload so typing no longer depends on a race; keep the client fallback.
- Out of scope: redesign of the viewer layout/visual theme; non-viewer surfaces.

# Acceptance criteria
- AC1: Refreshing/auto-polling the viewer no longer resets scroll, focus, selection, or open sections on the active screen when content changes; the "jump" is gone across the main screens (Logics, CDX, CI), matching the state preservation Git already has.
- AC2: The viewer starts in a repo with no `logics/` corpus and presents an onboarding/bootstrap flow; triggering it scaffolds the corpus and the viewer transitions to the normal experience without a restart.
- AC3: A CDX terminal keeps its CDX typing and usage gauge across refresh and close/reopen, with no transient loss; the association is sourced from the server terminal payload rather than re-derived from a possibly-null client status payload.
- AC4: No regression — existing viewer/python tests pass, and the dual-copy `viewer_assets/` stays in sync with `clients/viewer/`.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/viewer/browser-host.js` (refresh/render `:2155`, terminal typing `:3802`, polling `:381`)
- `logics_manager/viewer.py` (SSE `:4053`, bootstrap endpoint `:4619`, terminal payload `:3368`, startup `:5072`)
- `logics_manager/config.py` (`find_repo_root` `:211`), `logics_manager/bootstrap.py`
- `tests/viewer.browser-host.test.ts`, `tests/python/test_logics_manager_cli.py`

# AI Context
- Summary: Bound three viewer UX needs — stateful refresh (no scroll/focus jump + optional SSE), in-viewer bootstrap for non-bootstrapped repos, and server-sourced CDX terminal typing — to be sliced and shipped independently.
- Keywords: viewer, refresh, SSE, scroll preservation, bootstrap, onboarding, cdx terminal, usage gauge
- Use when: Improving the browser viewer's refresh UX, onboarding, or terminal robustness.
- Skip when: A broader viewer rewrite is already in progress or would conflict.

# Backlog
- `item_455_stateful_viewer_refresh_without_scroll_focus_jump`
- `item_456_in_viewer_bootstrap_for_non_bootstrapped_repos`
- `item_457_server_sourced_cdx_terminal_typing`
