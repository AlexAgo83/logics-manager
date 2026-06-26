## item_513_add_minimize_restore_screen_state_and_the_header_minimize_button - Add minimize/restore screen state and the header minimize button
> From version: 2.13.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Screens can only be opened or closed; there is no way to hide one while keeping it mounted, and no header control to trigger it.

# Scope
- In:
  - Add a per-screen 'minimized' state that hides the screen via CSS while keeping its DOM mounted (no teardown)
  - Add a minimize button in the screen header, left, immediately after close and before the other header buttons
  - Gate the button to desktop only (reuse the existing desktop vs LAN distinction)
  - Restore path that re-shows the screen unchanged
- Out:
  - The dock pill UI (sibling slice)
  - Terminal-specific state preservation (sibling slice)

# Acceptance criteria
- AC1: A desktop-only minimize button renders in the screen header left, right after close.
- AC2: Minimizing hides the screen while keeping it mounted; restoring shows it in the same state.
- AC6: Existing screen switching/close is unchanged and viewer smoke tests pass.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A desktop-only minimize button renders in the screen header left, right after close.
- request-AC2 -> This backlog slice. Proof: AC2: Minimizing hides the screen while keeping it mounted; restoring shows it in the same state.
- request-AC6 -> This backlog slice. Proof: AC6: Existing screen switching/close is unchanged and viewer smoke tests pass.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_minimizable_viewer_screens`
- Architecture decision(s): (none yet)
- Request: `req_283_minimize_desktop_viewer_screens_to_a_bottom_left_dock`
- Primary task(s): `task_280_orchestrate_minimize_screens_to_dock_for_the_desktop_viewer`

# AI Context
- Summary: Add minimize/restore screen state and the header minimize button
- Keywords: scaffolded-backlog, add minimize/restore screen state and the header minimize button, implementation-ready
- Use when: Implementing the scaffolded slice for Add minimize/restore screen state and the header minimize button.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
