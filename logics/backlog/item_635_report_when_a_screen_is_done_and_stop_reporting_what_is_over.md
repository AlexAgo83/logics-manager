## item_635_report_when_a_screen_is_done_and_stop_reporting_what_is_over - Report when a screen is done, and stop reporting what is over
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: A status line that keeps up
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:54:26

# Problem
- Terminals and Commands leave the status bar reading Workshop / terminals, with no completion word, while the other twelve screens end on loaded. An operator cannot tell a finished screen from one still working.
- The status bar also outlives what it describes: it was still reading Closing preview after the preview had closed.
- The document panel does not close on Escape. It covers the board, and the only way out is its close button -- measured by dispatching the key on both the document and the window, with the panel still open afterwards.
- The PATH warning is the same silence from the other side: it says something true and then never stops saying it, taking two lines on every screen and a third of a phone display.

# Scope
- In:
  - Have every screen report completion, so the status bar reaches a terminal state after a navigation.
  - Clear a transient status once the action it describes has finished.
  - Make the PATH warning dismissible for the session, returning on the next session or sooner if the condition changes.
  - Close the document panel on Escape, alongside its close button.
  - Have the campaign assert that the status bar reaches a terminal state after navigating, reading the screens from the interface rather than from a list.
- Out:
  - Redesigning the status bar.
  - Removing the PATH warning or weakening what it says.
  - Changing what any screen loads.

# Acceptance criteria
- AC1: Every navigation target ends with the status bar in a terminal state, Terminals and Commands included.
- AC2: A transient status does not outlive the action it describes.
- AC3: The PATH warning can be dismissed, stays dismissed for the session, and returns on the next one or when the condition changes.
- AC4: The campaign asserts the terminal status state per screen, walking the navigation targets from the interface.
- AC5: Escape closes the document panel, and the close button keeps working.
- AC6: Tests cover the completion signal, the transient status, the dismissal, and Escape, and fail against the current implementation.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Every navigation target ends with the status bar in a terminal state, Terminals and Commands included.
- request-AC5 -> This backlog slice. Proof: AC2: A transient status does not outlive the action it describes.
- request-AC6 -> This backlog slice. Proof: AC3: The PATH warning can be dismissed, stays dismissed for the session, and returns on the next one or when the condition changes.
- request-AC7 -> This backlog slice. Proof: AC4: The campaign asserts the terminal status state per screen, walking the navigation targets from the interface.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)
- Request: `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`
- Primary task(s): `task_311_orchestrate_the_attended_tour_findings`

# AI Context
- Summary: Report when a screen is done, and stop reporting what is over
- Keywords: scaffolded-backlog, report when a screen is done, and stop reporting what is over, implementation-ready
- Use when: Implementing the scaffolded slice for Report when a screen is done, and stop reporting what is over.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - nothing distinguishes finished from still working
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_311_orchestrate_the_attended_tour_findings`
