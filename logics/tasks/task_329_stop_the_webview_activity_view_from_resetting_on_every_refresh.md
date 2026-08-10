## task_329_stop_the_webview_activity_view_from_resetting_on_every_refresh - Stop the webview Activity view from resetting on every refresh
> From version: 2.21.4
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude

# AI Context
- Summary: Implement stop the webview activity view from resetting on every refresh.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_693_stop_the_webview_activity_view_from_resetting_on_every_refresh`

# Acceptance criteria
- AC1: A live refresh with the same workspace root as a previous refresh never resets the Activity/Project view, even if that root differed from the value persisted at webview hydration.
- AC2: A genuine workspace-root change (opening a different project) still resets to Activity exactly once for that change, not on every subsequent refresh of the new root.
- AC3: A regression test reproduces the bug (fails without the fix, passes with it) using the existing webview harness.

# Plan
- [x] Update `persistedWorkspaceRoot` after each comparison in `mainCore.js`'s `handleHostMessage` so the mismatch guard is a true one-shot per real root change.
- [x] Add a regression test to `tests/webview.chrome.test.ts` and confirm it fails without the fix, passes with it.
- [x] Run `python3 -m logics_manager flow finish task task_329_stop_the_webview_activity_view_from_resetting_on_every_refresh.md` after implementation.

# Validation
- `npx vitest run` (845 passed), including the new regression test.
- Confirmed the new test fails on the pre-fix code (reverted via `git stash`) and passes on the fix.
- `npm run lint` (tsc/eslint/line-budget/status-constants) clean.

# Report
- Fixed: `handleHostMessage` in `clients/shared-web/media/mainCore.js` now sets `state.persistedWorkspaceRoot = payload.root` after each comparison, so a genuine workspace-root change resets Activity exactly once instead of on every subsequent "data" message (every debounced file-watcher/git-event refresh) that carries the same, already-observed root. Fixes both the VS Code extension's Board webview and the standalone browser viewer, since both load the same `clients/shared-web/media` source.

# Links
- Request: `req_332_stop_the_webview_activity_view_from_resetting_on_every_refresh`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
