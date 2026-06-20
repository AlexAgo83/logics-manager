## task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs - Add live terminal progress feedback for CDX mission runs
> From version: 2.11.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_448_add_live_terminal_progress_feedback_for_cdx_mission_runs`

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

# Validation
- Passed: `rtk npm exec -- vitest run tests/viewer.browser-host.test.ts` (107 tests).
- Passed: `rtk python -m pytest tests/python/test_logics_manager_cli.py -k cdx_mission` (19 selected tests).
- Passed: `logics-manager lint --require-status`.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implemented a terminal progress wrapper for CDX mission runs launched through the viewer.
- The wrapper prints a start summary, report/transcript hint, process-start event, periodic heartbeat with elapsed/idle/current-command state, compact default waiting/no-activity messages, verbose tail mode, watch refresh mode, and final success/failure summary.
- Preserved the generated `cdx run ... --json` argv exactly after wrapper metadata arguments.
- Updated source and packaged viewer assets and added browser-host coverage for heartbeat, waiting state, verbose/watch mode signals, final summaries, and argv preservation.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_448_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- Related request(s): `req_253_add_live_terminal_progress_feedback_for_cdx_mission_runs`

# AI Context
- Summary: Implement add live terminal progress feedback for cdx mission runs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_253_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC2 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC3 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC4 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC5 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC6 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC7 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC8 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC9 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC10 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC11 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
- request-AC12 -> This task. Proof: Dev-ready chain created: task_238 carries the request acceptance criteria for implementation; implementation proof must be captured during task closeout. Source: `task_238_add_live_terminal_progress_feedback_for_cdx_mission_runs`
