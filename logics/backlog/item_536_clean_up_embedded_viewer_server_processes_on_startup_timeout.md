## item_536_clean_up_embedded_viewer_server_processes_on_startup_timeout - Clean up embedded viewer server processes on startup timeout
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Process lifecycle
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- ViewerServerManager rejects startup after a timeout but does not kill the child process created for that startup attempt.
- A server that becomes ready after the timeout can continue running without being tracked by the manager.

# Scope
- In:
  - Ensure startup-timeout handling terminates the spawned viewer server process and clears listeners/timers.
  - Handle races between timeout, process exit, and late readiness deterministically.
  - Add or extend tests for timeout cleanup.
- Out:
  - Changing normal successful startup behavior.
  - Changing unrelated restart or shutdown semantics unless required to avoid the timeout race.

# Acceptance criteria
- A startup timeout leaves no live untracked child process.
- Late readiness after timeout is ignored safely.
- Tests cover timeout cleanup and still pass for successful startup.

# AC Traceability
- request-ViewerServerManager startup timeouts terminate or clean up the spawned server process so late readiness cannot leave an unmanaged process behind. -> This backlog slice. Proof: A startup timeout leaves no live untracked child process.
- request-Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented. -> This backlog slice. Proof: Late readiness after timeout is ignored safely.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)
- Request: `req_290_post_release_viewer_and_vs_code_hardening`
- Primary task(s): `task_287_orchestrate_post_release_viewer_hardening`

# AI Context
- Summary: Clean up embedded viewer server processes on startup timeout
- Keywords: scaffolded-backlog, clean up embedded viewer server processes on startup timeout, implementation-ready
- Use when: Implementing the scaffolded slice for Clean up embedded viewer server processes on startup timeout.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_287_orchestrate_post_release_viewer_hardening` was finished via `logics-manager flow finish task` on 2026-07-05.
