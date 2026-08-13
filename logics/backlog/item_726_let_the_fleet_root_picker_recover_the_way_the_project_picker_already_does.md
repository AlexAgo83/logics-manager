## item_726_let_the_fleet_root_picker_recover_the_way_the_project_picker_already_does - Let the fleet root picker recover the way the project picker already does
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: `pickViewerProjectRoot` already falls back to the in-browser folder browser when the native dialog is missing; `pickFleetRoot` throws instead, so adding a fleet root is unreachable without tkinter.
- Keywords: pickFleetRoot, pickViewerProjectRoot, openProjectPickerModal, native dialog, tkinter, shared recovery
- Use when: Changing how either folder picker behaves when the native dialog is unavailable.
- Skip when: Building a new folder browser, or removing the native dialog where it works.

# Problem
- `pickViewerProjectRoot` catches the missing native dialog and opens the in-browser folder browser; `pickFleetRoot`, ten lines below, throws instead -- so on an interpreter without tkinter the only route to add a fleet root is unreachable.

# Scope
- In:
  - Route the fleet root picker through the same recovery the project picker uses.
  - Have both callers share that recovery rather than each carrying its own copy.
  - Confirm the fallback can add a fleet root end to end, not only select a folder.
- Out:
  - Building a new folder browser; the existing one is the target.
  - Removing the native dialog for environments where it works.

# Acceptance criteria
- AC1: Adding a fleet root succeeds with no native dialog available.
- AC2: Both pickers recover through one shared path.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Adding a fleet root succeeds with no native dialog available.
- request-AC2 -> This backlog slice. Proof: AC2: Both pickers recover through one shared path.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)
- Request: `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`
- Primary task(s): `task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
