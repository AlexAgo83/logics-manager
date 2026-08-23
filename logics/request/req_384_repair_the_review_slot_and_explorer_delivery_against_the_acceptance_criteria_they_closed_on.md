## req_384_repair_the_review_slot_and_explorer_delivery_against_the_acceptance_criteria_they_closed_on - Repair the Review slot and Explorer delivery against the acceptance criteria they closed on
> From version: 2.22.4
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Viewer review
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: Repairs thirteen defects the post-closeout review found in the delivered Review slot and Explorer rework, four of which contradict criteria recorded as proven.
- Keywords: repair, review, slot, explorer, delivery, against, acceptance, criteria, they, closed
- Use when: fixing the viewer's competing surface states, the Review payload cost and refresh, or the Explorer markdown switch.
- Skip when: adding Review or Explorer capability, or chasing the seven visual campaign failures that predate this work.

# Needs
- The viewer must have one surface state. Today the tri-state added for Review sits beside the original boolean, and the boolean wins on the next render.
- Opening Review must not cost a hundred Git subprocesses, and Review must refresh with the rest of the viewer as its request already required.
- A Git failure inside the Review payload must reach the operator as a message, not as a traceback from an unhandled exception.
- Review's keyboard navigation must keep working past the first keypress.
- The Explorer markdown switch must cover the file types, states, and persistence its request specified.
- The layout criteria both requests closed on must actually be exercised by the visual campaign.

# Context
- `req_381` and `req_383` were delivered and closed. A post-closeout review found thirteen defects, four of which contradict acceptance criteria recorded as proven. This request repairs them; it adds no new capability.
- Surface state: `item_865` was written to remove the second source of truth, but its scope named only the browser-host modules. The authoritative boolean lives one layer down in `clients/shared-web/media/mainApp.js`, so `setViewerSurface()` never writes it. `webviewChrome.js` re-asserts `activityPanel.hidden` from that boolean on every chrome render, and `git.js` dispatches an activity update on any Git action, so the Activity panel returns over Review on its own. The scope error is the request's, not the implementation's.
- Surface control: `#activity-toggle` now carries two click handlers, the original toggle in `mainInteractions.js` and the new surface selector. The button behaves as a radio in the markup and as a toggle in the state.
- Review payload cost, measured on this repository: `review_bursts_payload` spawns two `git show` processes per commit for up to fifty commits, about a hundred subprocesses and 1.6 seconds per request, and computes the file list of every burst although only the selected burst is displayed. That cost is why `req_381` AC8 was left unimplemented: wiring Review into the viewer refresh path would have repeated it on every cycle. The two defects are one design decision.
- Payload contract: bursts should carry file counts and change totals, and a burst's file list should load when that burst is selected. The endpoint that already returns a file-scoped commit diff is the model to follow.
- Error handling: `_commit_review_files` calls `_run_read_only_git` without the try/except every other payload in that module uses, so a timeout or OS error escapes the route instead of returning a structured state.
- Keyboard: `moveReviewButton` calls `next.click()`, which re-renders the timeline and discards the focused element, so burst navigation works once per render. Its `findIndex` also matches the focused node, the active class, and `aria-pressed` in one OR and returns the first hit, so it moves relative to the selected burst rather than the focused one.
- Explorer: the markdown extension test is a regular expression matching `md` or `mdown` at the end of the path, which excludes `.markdown`, and the `contentType` fallback beside it is dead because `mimetypes.guess_type` returns nothing for markdown suffixes on this platform. Preview mode drops the truncation notice that raw mode shows. The missing-renderer fallback is a bare `<pre>` rather than the code viewer. The chosen mode is written straight to `localStorage` instead of `updateViewerPreferences`, so it does not reach the server or the embedded viewer. `loadWorkshopExplorer` re-renders the Explorer without clearing the host's cached payloads, so a mode switch after returning to the tab can repaint a different file than the selected one.
- Explorer sizing: `.viewer-workspace` was given `height: min(72vh, 760px)`, a viewport-derived height with a hard ceiling, where the backlog slice asked for a height derived from the Workshop panel. On a tall window the Explorer stops at 760px with dead space below it.
- Visual campaign: neither request's layout criteria were exercised. `run_local_viewer_visual_smoke.mjs` was not touched and `npm run test:viewer-smoke` was not part of the recorded validation. The campaign currently fails seven checks in workshop commands, cdx missions, cdx status, and the new request modal; those failures are identical before and after the delivery and are not in scope here.
- Out of scope: the seven pre-existing campaign failures, any new Review or Explorer capability, and the rename of the surface concept in the shared web client beyond what one state requires.

# Acceptance criteria
- AC1: The viewer has exactly one surface state. Selecting Project or Review clears the shared-web activity flag, and no later chrome or board render re-opens the Activity panel or leaves the project board hidden.
- AC2: `#activity-toggle` carries one behavior. Clicking the active surface button is idempotent, and no path leaves a surface marked active with nothing rendered.
- AC3: The Review bursts payload returns bursts with file counts and change totals without reading any commit's file list, and a burst's files are fetched when that burst is selected.
- AC4: Opening Review issues a bounded number of Git subprocesses that does not grow with the number of commits in the timeline.
- AC5: Review refreshes through the existing viewer refresh path when Git status updates, without adding a second polling loop.
- AC6: A Git timeout, OS error, or non-zero exit inside the Review payload returns a structured state and message; no request handler raises.
- AC7: Renamed files in a commit burst show their real addition and deletion counts.
- AC8: Arrow-key navigation across bursts and files keeps working for repeated keypresses, and moves relative to the focused element rather than the selected one.
- AC9: The markdown switch is present for `.md` and `.markdown`, absent for every other file and state, and any content-type test kept beside the extension test is one that actually matches.
- AC10: Preview mode keeps the truncation notice and the load-anyway control that raw mode shows, and with no markdown renderer present the pane falls back to the code viewer rather than to unstyled text.
- AC11: The chosen markdown mode is persisted through `updateViewerPreferences`, so it reaches the server and the embedded viewer like every other viewer preference.
- AC12: Re-entering the Explorer tab cannot repaint a file other than the selected one: the host's cached tree and preview payloads are cleared or refreshed wherever the Explorer is re-rendered.
- AC13: The Explorer panes derive their height from the Workshop panel rather than from the viewport, with no fixed pixel ceiling that leaves dead space on a tall window.
- AC14: The visual campaign exercises Review and the reworked Explorer at 1440x900, 820x1180, and 390x844, covering blank surfaces, sibling-control overlap, viewport clipping, horizontal page scroll, heading structure, and colour-only state; the run's only failures are the seven that predate this work.
- AC15: Validation runs and records `npm run test:viewer-smoke` alongside the targeted vitest and pytest checks, `npm run bundle:viewer-host`, `npm run check:viewer-host`, `npm run lint`, and `logics-manager lint --require-status`; each acceptance criterion above is closed with a proof naming what exercised it, not a shared paragraph.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_113_one_viewer_surface_state_and_a_review_timeline_that_can_refresh`
- Architecture decision(s): (none yet)

# References
- `clients/shared-web/media/mainApp.js` owns `activityPanelOpen`, the boolean the viewer surface actually runs on; `clients/shared-web/media/mainCore.js` derives `board.hidden`, `details--hidden`, and `layout__main--activity` from it.
- `clients/shared-web/media/webviewChrome.js` re-asserts `activityPanel.hidden` from `getActivityPanelOpen()` on every chrome render, and separately syncs the new surface buttons from `document.body.dataset.viewerSurface`.
- `clients/shared-web/media/mainInteractions.js` binds the original `#activity-toggle` handler that flips `activityPanelOpen`; `clients/viewer/src/browser-host/index.js` adds a second click handler on the same element through `[data-viewer-surface]`.
- `clients/viewer/src/browser-host/index.js` holds `setViewerSurface()`, `openWorkspacePreview()`, `updateWorkspacePreviewPane()`, `latestWorkspacePreviewPayload`, and the delegated Explorer and Review click handling.
- `clients/viewer/src/browser-host/git.js` holds `showReviewTimeline()`, `selectReviewBurst()`, `loadReviewFile()`, `bindReviewKeyboard()`, and `moveReviewButton()`.
- `logics_manager/viewer_git.py` holds `review_bursts_payload()`, `_commit_review_files()`, and `_parse_git_numstat()`; `logics_manager/viewer.py` registers the review-bursts route beside the other Git routes.
- `clients/viewer/src/browser-host/render.js` holds `renderWorkspacePreview()` with the new markdown mode buttons, and `returnToProjectSurface()`.
- `clients/viewer/src/browser-host/workshop.js` re-renders the Explorer through `loadWorkshopExplorer()` without touching the host's cached tree and preview payloads.
- `tests/run_local_viewer_visual_smoke.mjs` is the viewer visual campaign; it currently has a `workshop explorer` case and no Review case, and it fails seven pre-existing checks unrelated to this work.
- `tests/viewer.browser-host.test.ts` and `tests/python/test_viewer_cli.py` hold the browser-host and viewer payload tests added by the delivery being repaired.

# Backlog
- `item_866_unify_the_viewer_surface_state_across_the_shared_web_client`
- `item_867_make_the_review_bursts_payload_lazy_refreshable_and_failure_safe`
- `item_868_fix_review_timeline_keyboard_navigation`
- `item_869_finish_the_explorer_markdown_switch_and_pane_sizing`
- `item_870_cover_review_and_the_reworked_explorer_in_the_visual_campaign`
