## req_275_add_a_git_ci_event_filter_to_the_recent_activity_view - Add a git/CI event filter to the Recent activity view
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The Recent activity view has a filter button, reusing the project view's filter button design, that opens a compact menu to toggle Git events and CI events independently, both enabled by default.
- Toggling a category shows or hides only the matching event entries (git commits, CI runs) in the feed; logics-doc activity entries are always shown and unaffected by the filter.
- Recent git commits, already parsed in the git payload, are surfaced in the activity feed as git events so the Git toggle has data to govern.
- The two toggle choices persist across reloads using the same webview state mechanism as the existing activity panel state.

# Context
- getActivityEntries already merges documentEntries (logics doc activity) with eventEntries built from a generic getActivityEvents() channel keyed by activityKind and rendered with per-kind CSS and time bucketing.
- The client event channel (activityEvents / getActivityEvents / eventEntries) is already wired, but payload.activityEvents has no server producer yet, so git events must be mapped into it from the existing recentCommits data.
- _git_status.py already parses recentCommits (capped by GIT_HISTORY_DISPLAY_LIMIT) into the git payload, so no new git fetch is needed.
- CI events (activityKind:'ci') are delivered by req_274; this request depends on that for the CI toggle's data but does not reimplement it.
- The project view filter button (toolbar__filter, #filter-toggle/#filter-panel) already implements open/active states, aria wiring, and a non-default 'active' indicator, all reusable for the activity filter.
- Persisted webview state already carries activityPanelOpen (default true) via vscode.getState/setState and persistenceFactory, so two more booleans follow the same pattern.
- Decision: the toggles govern only git and ci event entries; a compact popover (not the full secondary toolbar row) is used because there are only two toggles.

# Acceptance criteria
- AC1: Recent git commits from the existing recentCommits payload appear in Recent activity as activityKind:'git' events, time-bucketed and newest first, with no new git fetch.
- AC2: A filter button reusing the project view's toolbar__filter design sits in the activity panel header and opens a compact popover with two checkboxes, Git events and CI events, both checked by default.
- AC3: Toggling a checkbox shows or hides only the matching git/ci event entries; logics-doc activity entries remain visible regardless of the toggles.
- AC4: The two choices persist across reloads via the same webview state as activityPanelOpen, with defaults applied on first load.
- AC5: The filter button shows the non-default 'active' indicator when either toggle is off, matching the project filter button behavior.
- AC6: When git or CI events are absent (e.g. no commits, or req_274 not yet merged), the feed and button render gracefully with the empty category and no errors.
- AC7: vitest covers the git-commit-to-event mapping, the toggle filter logic, and the persistence round-trip.
- AC8: logics-manager lint and audit pass on the resulting workflow corpus and code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_028_recent_activity_event_filter`
- Architecture decision(s): (none yet)

# References
- `clients/vscode/src/logicsWebviewHtml.ts` (toolbar__filter button design to reuse, activity panel markup)
- `clients/shared-web/media/webviewChrome.js` (filterToggle/filterPanel behavior, activity panel rendering)
- `clients/shared-web/media/webviewSelectors.js` (getActivityEntries: documentEntries + eventEntries by activityKind)
- `clients/shared-web/src/main-app/parts/_01.js` (persisted webview state: activityPanelOpen, persistenceFactory)
- `logics_manager/viewer_parts/_git_status.py` (recentCommits already parsed and in the git payload)
- `req_274_surface_ci_events_in_the_recent_activity_feed` (delivers the CI events this filter toggles)

# AI Context
- Summary: Add a git/CI event filter to the Recent activity view
- Keywords: request-chain-scaffold, add a git/ci event filter to the recent activity view, development-ready
- Use when: You need to implement or review the scaffolded workflow for Add a git/CI event filter to the Recent activity view.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_488_surface_recent_git_commits_as_activity_events`
- `item_489_add_the_activity_filter_button_menu_and_persisted_toggles`
