## item_489_add_the_activity_filter_button_menu_and_persisted_toggles - Add the activity filter button, menu, and persisted toggles
> From version: 2.12.8
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100
> Complexity: Medium
> Theme: Viewer activity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The Recent activity view has no way to toggle event categories, and there is no persisted state for git/ci visibility.

# Scope
- In:
  - Add a filter button to the activity panel header reusing the toolbar__filter design, opening a compact popover with two checkboxes (Git events, CI events), both on by default
  - Add activityShowGit and activityShowCi booleans (default true) to the persisted webview state alongside activityPanelOpen
  - Filter eventEntries in getActivityEntries by activityKind against the two flags, leaving documentEntries untouched, and show the non-default 'active' indicator when a toggle is off
- Out:
  - The git event data mapping (sibling slice)
  - Filtering logics-doc activity entries

# Acceptance criteria
- AC1: The filter button and popover render with the project filter design and both toggles default on.
- AC2: Toggling hides/shows only git/ci entries and persists across reloads; doc activity is unaffected.
- AC3: A vitest check covers the filter logic, the active-indicator, and the persistence round-trip.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The filter button and popover render with the project filter design and both toggles default on.
- request-AC3 -> This backlog slice. Proof: AC2: Toggling hides/shows only git/ci entries and persists across reloads; doc activity is unaffected.
- request-AC4 -> This backlog slice. Proof: AC3: A vitest check covers the filter logic, the active-indicator, and the persistence round-trip.
- request-AC5 -> This backlog slice. Proof: AC3: A vitest check covers the filter logic, the active-indicator, and the persistence round-trip.
- request-AC7 -> This backlog slice. Proof: AC3: A vitest check covers the filter logic, the active-indicator, and the persistence round-trip.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_028_recent_activity_event_filter`
- Architecture decision(s): (none yet)
- Request: `req_275_add_a_git_ci_event_filter_to_the_recent_activity_view`
- Primary task(s): `task_272_orchestrate_the_recent_activity_event_filter`

# AI Context
- Summary: Add the activity filter button, menu, and persisted toggles
- Keywords: scaffolded-backlog, add the activity filter button, menu, and persisted toggles, implementation-ready
- Use when: Implementing the scaffolded slice for Add the activity filter button, menu, and persisted toggles.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done (browser viewer surface): activity filter button + popover (Git events/CI events, default on) placed in clients/viewer/index.html toolbar next to +New, shown only in activity view (body.viewer-screen-activity). Menu hidden by default (CSS [hidden] fix). Wired in shared webviewChrome.js (toolbar button, not panel header); activityShowGit/activityShowCi persisted; filter governs only git/ci event entries. Note: the recent-activity render stack is shared by the browser viewer AND the VS Code webview; the button HTML currently lives in the browser viewer (what the operator uses). 682 vitest.
