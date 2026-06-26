## item_514_build_the_bottom_left_minimized_dock_of_stacked_pills - Build the bottom-left minimized dock of stacked pills
> From version: 2.13.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A minimized screen needs a visible, clickable handle to restore or kill it, and several minimized screens need to coexist.

# Scope
- In:
  - Render a bottom-left dock where each minimized screen gets a pill with its title and a close button
  - Click a pill to restore its screen; click the pill close button to kill the screen and remove the pill
  - Stack pills upward and define a simple overflow behavior (cap or wrap, no internal scroll to start)
  - Keep screens unique — restoring focuses the existing screen, never a new instance
- Out:
  - Drag/reorder of pills or free repositioning
  - Persisting the dock across reloads

# Acceptance criteria
- AC3: A pill restores on click and kills its screen via its close button.
- AC4: Multiple pills stack upward from bottom-left with a documented overflow behavior; no multi-instance.
- AC2: Each pill shows the correct screen title.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC3: A pill restores on click and kills its screen via its close button.
- request-AC3 -> This backlog slice. Proof: AC4: Multiple pills stack upward from bottom-left with a documented overflow behavior; no multi-instance.
- request-AC4 -> This backlog slice. Proof: AC2: Each pill shows the correct screen title.
- request-AC1 -> This backlog slice. Proof: Implemented desktop minimize/restore dock in the viewer, kept Workshop terminal state hidden instead of closed for direct restores, regenerated viewer assets, and passed npm test -- --run tests/viewer.browser-host.test.ts plus asset checks.
- request-AC5 -> This backlog slice. Proof: Implemented desktop minimize/restore dock in the viewer, kept Workshop terminal state hidden instead of closed for direct restores, regenerated viewer assets, and passed npm test -- --run tests/viewer.browser-host.test.ts plus asset checks.
- request-AC6 -> This backlog slice. Proof: Implemented desktop minimize/restore dock in the viewer, kept Workshop terminal state hidden instead of closed for direct restores, regenerated viewer assets, and passed npm test -- --run tests/viewer.browser-host.test.ts plus asset checks.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_minimizable_viewer_screens`
- Architecture decision(s): (none yet)
- Request: `req_283_minimize_desktop_viewer_screens_to_a_bottom_left_dock`
- Primary task(s): `task_280_orchestrate_minimize_screens_to_dock_for_the_desktop_viewer`

# AI Context
- Summary: Build the bottom-left minimized dock of stacked pills
- Keywords: scaffolded-backlog, build the bottom-left minimized dock of stacked pills, implementation-ready
- Use when: Implementing the scaffolded slice for Build the bottom-left minimized dock of stacked pills.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Task `task_280_orchestrate_minimize_screens_to_dock_for_the_desktop_viewer` was finished via `logics-manager flow finish task` on 2026-06-26.
