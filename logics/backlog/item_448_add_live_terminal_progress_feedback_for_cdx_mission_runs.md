## item_448_add_live_terminal_progress_feedback_for_cdx_mission_runs - Add live terminal progress feedback for CDX mission runs
> From version: 2.11.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
When an operator launches a CDX mission from the terminal, provide live progress feedback so they can tell whether the mission is advancing, waiting, blocked, or silent.
Show useful observable signals during the run without inventing a fake percentage: elapsed time, last activity, current step, current command, recent significant events, and completion/failure state.
Keep the default terminal output compact and readable, with an explicit verbose/watch path for operators who want richer live detail.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: Launching a CDX mission prints a start summary with mission identifier, run id when available, and where the report or transcript can be inspected.
- AC2: While a mission is running, the terminal prints periodic compact status updates with elapsed time and time since last activity.
- AC3: Status updates include the current phase when the phase can be inferred from structured mission events.
- AC4: When a command is running, the terminal shows a short current-command label and how long that command has been active when available.
- AC5: Significant mission events are printed once as readable event lines without duplicating noisy raw output in default mode.
- AC6: Waiting states are explicit: approval required, input required, waiting on command output, blocked, or no recent activity beyond a configured threshold.
- AC7: The default mode remains compact enough for normal terminal use and does not interleave large raw stdout/stderr dumps unless an error or final summary requires it.
- AC8: A verbose mode or equivalent option exposes richer raw mission detail for debugging.
- AC9: A watch-style mode or equivalent option presents the same live signals in a refreshable compact terminal view when supported.
- AC10: Mission completion prints a final summary with status, elapsed time, changed-file/test/command counters when available, and report/transcript path.
- AC11: Mission failure prints the failure state, the most relevant last event or error, and a next action or report path for investigation.
- AC12: Tests cover heartbeat rendering, event rendering, waiting/stale activity messaging, compact-vs-verbose behavior, and final success/failure summaries.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Launching a CDX mission prints a start summary with mission identifier, run id when available, and where the report or transcript can be inspected.
- request-AC2 -> This backlog slice. Proof: AC2: While a mission is running, the terminal prints periodic compact status updates with elapsed time and time since last activity.
- request-AC3 -> This backlog slice. Proof: AC3: Status updates include the current phase when the phase can be inferred from structured mission events.
- request-AC4 -> This backlog slice. Proof: AC4: When a command is running, the terminal shows a short current-command label and how long that command has been active when available.
- request-AC5 -> This backlog slice. Proof: AC5: Significant mission events are printed once as readable event lines without duplicating noisy raw output in default mode.
- request-AC6 -> This backlog slice. Proof: AC6: Waiting states are explicit: approval required, input required, waiting on command output, blocked, or no recent activity beyond a configured threshold.
- request-AC7 -> This backlog slice. Proof: AC7: The default mode remains compact enough for normal terminal use and does not interleave large raw stdout/stderr dumps unless an error or final summary requires it.
- request-AC8 -> This backlog slice. Proof: AC8: A verbose mode or equivalent option exposes richer raw mission detail for debugging.
- request-AC9 -> This backlog slice. Proof: AC9: A watch-style mode or equivalent option presents the same live signals in a refreshable compact terminal view when supported.
- request-AC10 -> This backlog slice. Proof: AC10: Mission completion prints a final summary with status, elapsed time, changed-file/test/command counters when available, and report/transcript path.
- request-AC11 -> This backlog slice. Proof: AC11: Mission failure prints the failure state, the most relevant last event or error, and a next action or report path for investigation.
- request-AC12 -> This backlog slice. Proof: AC12: Tests cover heartbeat rendering, event rendering, waiting/stale activity messaging, compact-vs-verbose behavior, and final success/failure summaries.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_253_add_live_terminal_progress_feedback_for_cdx_mission_runs.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add live terminal progress feedback for CDX mission runs
- Keywords: backlog-groom, request, add live terminal progress feedback for cdx mission runs, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add live terminal progress feedback for CDX mission runs.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_253_add_live_terminal_progress_feedback_for_cdx_mission_runs` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_253_add_live_terminal_progress_feedback_for_cdx_mission_runs.md`.
- Generated locally by logics-manager.
- Task `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs` was finished via `logics-manager flow finish task` on 2026-06-20.

# Tasks
- `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
