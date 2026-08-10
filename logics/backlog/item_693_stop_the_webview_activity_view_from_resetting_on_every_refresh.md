## item_693_stop_the_webview_activity_view_from_resetting_on_every_refresh - Stop the webview Activity view from resetting on every refresh
> From version: 2.21.4
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 95%
> Progress: 10%
> Complexity: Low
> Theme: Webview state persistence
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Stop the webview Activity view from resetting on every refresh
- Keywords: backlog-groom, request, stop the webview activity view from resetting on every refresh, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Stop the webview Activity view from resetting on every refresh.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Opening the Project view in the shared webview (VS Code extension and standalone browser viewer) must stay open across ordinary refreshes (file watcher ticks, saves, git events), not flip back to Activity on its own.

# Scope
- In:
  - Update `state.persistedWorkspaceRoot` in `clients/shared-web/media/mainCore.js`'s `handleHostMessage` after each root comparison, so a real workspace-root change resets Activity exactly once instead of on every subsequent refresh of the same (already-observed) root.
  - A regression test in `tests/webview.chrome.test.ts` using the existing webview harness (`bootstrapWebview`/`pushData`).
- Out:
  - Reworking the persisted-state/reset architecture more broadly, or the unrelated dead-code duplicate of `applyPersistedState`/`applyResetState` noted in `mainCore.js` during investigation.

# Acceptance criteria
- AC1: A live refresh with the same workspace root as a previous refresh never resets the Activity/Project view, even if that root differed from the value persisted at webview hydration.
- AC2: A genuine workspace-root change (opening a different project) still resets to Activity exactly once for that change, not on every subsequent refresh of the new root.
- AC3: A regression test reproduces the bug (fails without the fix, passes with it) using the existing webview harness.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A live refresh with the same workspace root as a previous refresh never resets the Activity/Project view, even if that root differed from the value persisted at webview hydration.
- request-AC2 -> This backlog slice. Proof: AC2: A genuine workspace-root change (opening a different project) still resets to Activity exactly once for that change, not on every subsequent refresh of the new root.
- request-AC3 -> This backlog slice. Proof: AC3: A regression test reproduces the bug (fails without the fix, passes with it) using the existing webview harness.

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
- Request: `logics/request/req_332_stop_the_webview_activity_view_from_resetting_on_every_refresh.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_332_stop_the_webview_activity_view_from_resetting_on_every_refresh` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_332_stop_the_webview_activity_view_from_resetting_on_every_refresh.md`.
- Generated locally by logics-manager.

# Tasks
- `task_329_stop_the_webview_activity_view_from_resetting_on_every_refresh`
