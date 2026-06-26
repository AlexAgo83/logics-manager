## item_515_preserve_live_screen_state_across_minimize_and_re_fit_terminal_on_restore - Preserve live screen state across minimize and re-fit terminal on restore
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
- Hiding the Workshop screen must not dispose its terminal/PTY, and a hidden terminal measured at zero size renders broken when shown again.

# Scope
- In:
  - Ensure the screen-hide path does not dispose Workshop terminals or release the PTY
  - On restore, re-run terminal fit()/refresh() so the first visible frame is measured correctly (reuse the req_281 re-measure approach)
  - Verify other screens' live state survives a minimize/restore round-trip
- Out:
  - Changes to terminal transport or xterm versioning beyond the re-fit hook
  - Dock UI and header button (sibling slices)

# Acceptance criteria
- AC5: Minimizing the Workshop keeps the PTY alive; restoring re-fits the terminal and renders cleanly with no artifacts.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: Minimizing the Workshop keeps the PTY alive; restoring re-fits the terminal and renders cleanly with no artifacts.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_032_minimizable_viewer_screens`
- Architecture decision(s): (none yet)
- Request: `req_283_minimize_desktop_viewer_screens_to_a_bottom_left_dock`
- Primary task(s): `task_280_orchestrate_minimize_screens_to_dock_for_the_desktop_viewer`

# AI Context
- Summary: Preserve live screen state across minimize and re-fit terminal on restore
- Keywords: scaffolded-backlog, preserve live screen state across minimize and re-fit terminal on restore, implementation-ready
- Use when: Implementing the scaffolded slice for Preserve live screen state across minimize and re-fit terminal on restore.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
