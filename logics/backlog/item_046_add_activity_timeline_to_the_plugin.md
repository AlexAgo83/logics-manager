## item_046_add_activity_timeline_to_the_plugin - Add an activity timeline to the plugin
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 97%
> Progress: 100%
> Complexity: Medium
> Theme: Change visibility and workflow awareness
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin is good at showing the current state of items, but it is weaker at showing recent movement in the workspace. Users cannot quickly answer “what changed recently?” without re-scanning many parts of the UI.

An activity timeline would improve situational awareness by surfacing meaningful recent events and helping users regain context faster.

# Scope
- In:
  - Define a first useful set of recent activity event types.
  - Add a timeline or recent-activity UI surface.
  - Let users navigate from an activity entry to the relevant item.
  - Add regression coverage for the core activity behavior.
- Out:
  - Full git history UI.
  - Exhaustive audit logging.
  - Replacing the main board/list workflows with a timeline-first model.

# Acceptance criteria
- AC1: The plugin exposes a visible activity timeline or recent-changes surface.
- AC2: The timeline highlights a meaningful set of recent events relevant to Logics workflow.
- AC3: Timeline entries are understandable enough to tell users what changed and on which item.
- AC4: Users can navigate from a timeline entry to the relevant item or document.
- AC5: The activity surface does not regress current board/list/details workflows.
- AC6: Tests cover at least the basic event rendering or recent-activity logic where practical.

# AC Traceability
- AC1/AC2 -> the plugin now exposes a compact recent-activity panel backed by an initial derived event model for updates, promotions, lifecycle changes, and companion-link activity. Proof: `src/extension.ts`, `media/main.js`.
- AC3 -> each activity entry displays readable item and event copy tied to the underlying workflow item. Proof: `media/main.js`.
- AC4 -> clicking an activity entry navigates back to the relevant item by selecting it in the current surface. Proof: `media/main.js`, `tests/webview.harness-a11y.test.ts`.
- AC5 -> the activity panel is additive and does not replace current board/list/details workflows. Proof: `media/css/toolbar.css`, `media/main.js`.
- AC6 -> harness tests validate recent-activity ordering and selection behavior. Proof: `tests/webview.harness-a11y.test.ts`.

# Priority
- Impact:
  - Medium: useful context recovery feature, especially in active workspaces.
- Urgency:
  - Medium-Low: valuable but less foundational than search or navigation improvements.

# Notes
- Derived from `logics/request/req_041_add_activity_timeline_to_the_plugin.md`.
- The preferred initial timeline is a recent derived event window, roughly ten to twenty entries ordered by recency, not a full persistent event journal.

# Tasks
- `logics/tasks/task_040_add_activity_timeline_to_the_plugin.md`
