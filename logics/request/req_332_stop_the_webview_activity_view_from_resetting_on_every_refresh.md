## req_332_stop_the_webview_activity_view_from_resetting_on_every_refresh - Stop the webview Activity view from resetting on every refresh
> From version: 2.21.4
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 95%
> Complexity: Low
> Theme: Webview state persistence
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Fix the webview flipping back to the Activity view instead of staying on Project every time a refresh arrives.
- Keywords: bugfix, webview, activity-panel, persisted-state, workspace-root
- Use when: You need context on the Activity-view reset regression and its fix.
- Skip when: The change is unrelated to shared-web webview persistence.

# Needs
- Opening the Project view in the shared webview (VS Code extension and standalone browser viewer) must stay open across ordinary refreshes (file watcher ticks, saves, git events), not flip back to Activity on its own.

# Context
- Bug report: the Activity view resets to default "from time to time" even though the user was on the Project view.
- Root cause: `handleHostMessage` in `clients/shared-web/media/mainCore.js` compares the live `payload.root` from every "data" message against `state.persistedWorkspaceRoot`, and calls `resetPersistedUiState()` (which forces Activity, per `webviewPersistence.js`/`mainApp.js`) whenever they differ. `persistedWorkspaceRoot` is set exactly once, at webview hydration, from the last `vscode.getState()` snapshot, and nothing ever updates it afterward. If that one persisted value doesn't match the live root string (stale snapshot, path-form difference, case difference beyond what `areSameWorkspacePath` normalizes), every subsequent refresh re-evaluates the same permanently-stale mismatch and resets again.
- Refreshes are frequent by design: `clients/vscode/src/extension.ts` debounces file watchers on `logics/**/*.{md,markdown,yaml,yml}`, `logics.yaml`, and `.git/HEAD` (300ms) into `provider.refresh()`, which posts a fresh "data" message on every save, commit, checkout, or branch switch.
- `clients/shared-web/media` is the single source shared by both the VS Code extension's Board webview and the standalone browser viewer (`clients/viewer/index.html`), so the bug and the fix apply to both.
- A prior fix (commit `b7467f3a`, "Preserve project view across activity updates") addressed only the *initial-load* default; it did not touch this separate, still-live reset path that fires on every refresh after hydration.

# Acceptance criteria
- AC1: A live refresh with the same workspace root as a previous refresh never resets the Activity/Project view, even if that root differed from the value persisted at webview hydration.
- AC2: A genuine workspace-root change (opening a different project) still resets to Activity exactly once for that change, not on every subsequent refresh of the new root.
- AC3: A regression test reproduces the bug (fails without the fix, passes with it) using the existing webview harness.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/mainCore.js`
- `clients/shared-web/media/mainApp.js`
- `clients/shared-web/media/webviewPersistence.js`
- `clients/vscode/src/extension.ts`
- `tests/webview.chrome.test.ts`

# Backlog
- none
- `item_693_stop_the_webview_activity_view_from_resetting_on_every_refresh`
