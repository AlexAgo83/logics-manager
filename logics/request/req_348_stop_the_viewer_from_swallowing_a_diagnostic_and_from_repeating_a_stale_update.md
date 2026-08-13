## req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update - Stop the viewer from swallowing a diagnostic and from repeating a stale update
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 16:41:40

# AI Context
- Summary: The MCP connector fails for a stated reason that three layers destroy -- a regex-only capture, a fallback guarded on an unawaited returncode, and an unchecked fetch -- while the cdx banner serves a day-old answer that surviving the update it recommended.
- Keywords: mcp connector, subprocess capture, returncode, unchecked fetch, cdx update banner, cache invalidation, silent failure
- Use when: Changing how the viewer supervises a child process, reports an action's outcome, or caches an answer about an external tool.
- Skip when: The connector's behaviour once running, its port selection, or the four screen redesigns.

# Needs
- Reported by the operator, 2026-08-13: turning the per-project MCP connector ON never changes its status, even after Refresh.
- Reported the same day: the viewer offers `cdx 0.19.0 is available. Current version: 0.18.7` while 0.19.1 is installed.
- Both were reproduced. Neither is what it looks like: the connector does report a precise, actionable reason for failing, and the update banner is not reading a wrong version -- it is reading a day-old answer.
- Both belong to the same family as the fleet root click that appeared to do nothing: the viewer knows why something failed and does not say.

# Context
- **The MCP connector fails for a stated reason, and three layers destroy it.** Running the tunnel command by hand shows the reason: the process exits immediately with `Port 8766 on 127.0.0.1 is already in use -- another logics-manager MCP server (or the viewer, on its own default port) is likely already running. Pass --port <n> for a different one.` The viewer reports a stopped connector with an empty error instead. Running the same command by hand shows why -- the tunnel exits immediately with `Port 8766 on 127.0.0.1 is already in use -- another logics-manager MCP server (or the viewer, on its own default port) is likely already running. Pass --port <n> for a different one.`
- **Layer one: the capture thread discards it.** `start_mcp_connector` reads the child's merged stdout line by line and tests each line against two regular expressions, for the URL and the bearer token. Every line matching neither is dropped, and the port message is one of them.
- **Layer two: the fallback error can never fire.** After the stdout loop the code reads `if not self.mcp_connector_url and process.returncode:`. Nothing has called `wait()` or `poll()` on the child at that point, so `returncode` is still `None`, which is falsy. The generic `MCP connector stopped before publishing an HTTPS URL.` is therefore never set either, which is why `status` returns an empty error rather than any error at all.
- **A fourth layer, found while fixing the first three.** `_handle_mcp_connector_post` reads `start_mcp_connector() if action == "start" else stop_mcp_connector() or mcp_connector_payload()`, so *every* request whose action is not exactly `start` stops the connector -- including a body with no action at all. Stopping clears the recorded error, so a status probe wipes the very thing it is probing for. This also contaminated the original reproduction: the first report of this defect polled with `{"action": "status"}`, which was itself stopping the connector, so part of the observed "silent death" was the probe. The three layers below are real and were confirmed by reading the code; the timeline in that first report was not.
- **Layer three: the client never looks at the response.** The click handler runs `fetch("/api/mcp-connector", ...).then(() => showChatgptMcp())`, checking neither the HTTP status nor the `ok` field of the body. Only a network-level failure reaches the `catch`.
- **The update banner is a 24-hour cache with no notion of the installed version.** `cdx_update_info_payload` caches its result under `CDX_UPDATE_CHECK_INTERVAL_SECONDS = 24 * 60 * 60`, keyed on the repository root alone. Measured: `cdx update --check --json` now reports `0.19.1` and `update_available: false`; a viewer started earlier still served `0.18.7` to `0.19.0`; restarting the viewer cleared it. So the banner asks the operator to run `cdx update`, they do, and it keeps asking for up to a day -- and Refresh cannot help, because it re-reads the same cached payload. The cache expires on time and nothing else, so the one event that should invalidate it, the tool changing version, does not.
- Also observed, not a cause of either defect but a hazard: three `cdx` executables are on this operator's PATH, and one of them raises a traceback on `--version`. Which one the viewer resolves depends on the environment it was launched from.
- Also observed on the connector screen: the heading reads `Connector ON` while the button beneath reads `OFF -- stop connector`. The button names the action and the heading names the state; both are defensible and together they are confusing.
- Out of scope: what the MCP connector does once it is running, the tunnel's own port selection, and the four screen redesigns tracked separately.
- Known risk: `logics/request/req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing.md` already covers making a failed viewer action visible in general. This request must fix the causes beneath that symptom rather than restate it: the discarded child output, the unreachable fallback, the unchecked response, and the cache that outlives its own subject.

# Acceptance criteria
- AC1: When the MCP connector fails to start, the reason the child process gave is what the operator is shown.
- AC2: A child process the viewer supervises has its exit status established before its outcome is judged, so a failure is never reported as an absence of error.
- AC3: Output the viewer reads from a child process is not discarded merely because it did not match an expected pattern; enough is retained to explain a failure.
- AC4: A viewer action that posts to an endpoint checks the outcome of that post before rendering the result as if it succeeded.
- AC5: The update banner reflects the version currently installed: after the update it asks for, it stops asking, without waiting for a cache to expire and without restarting the viewer.
- AC6: A cached answer about an external tool is invalidated when that tool changes, not only when time passes.
- AC7: The connector screen states its current state and its available action without the two contradicting each other.
- AC8: Tests cover a connector that exits before publishing a URL, a post whose response reports failure, and an update banner surviving the update it recommended.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)

# References
- logics_manager/viewer.py
- logics_manager/viewer_cdx.py
- clients/viewer/src/browser-host/index.js
- scripts/build/build-viewer-browser-host.mjs
- tests/python/test_viewer_cli.py

# Backlog
- `item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator`
- `item_742_check_the_outcome_of_a_viewer_action_before_rendering_it_as_done`
- `item_743_end_the_update_banner_when_the_update_happens`
- `item_744_make_the_connector_screen_state_and_action_agree`
- `item_745_cover_a_silent_failure_and_a_stale_banner`
