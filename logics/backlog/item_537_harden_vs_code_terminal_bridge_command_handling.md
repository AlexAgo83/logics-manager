## item_537_harden_vs_code_terminal_bridge_command_handling - Harden VS Code terminal bridge command handling
> From version: 2.15.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Terminal integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The terminal bridge converts command arrays with POSIX single-quote escaping before sending text to a VS Code terminal.
- That behavior can fail for Windows shells or shell configurations that do not interpret POSIX quoting.

# Scope
- In:
  - Define the supported command surface for VS Code terminal launches.
  - Prefer a shell-aware command construction path when command arrays contain spaces, quotes, or shell-sensitive characters.
  - Add tests for commands with quoted arguments and paths containing spaces, or tests that enforce a deliberately constrained command shape.
- Out:
  - Replacing VS Code terminal APIs.
  - Implementing a full cross-shell parser beyond the command shapes the viewer needs.

# Acceptance criteria
- Supported terminal-launch commands are sent in a form the configured shell can run.
- Unsupported command shapes fail early or are never emitted by the viewer protocol.
- Focused tests cover the selected portability boundary.

# AC Traceability
- request-The VS Code terminal bridge handles commands with spaces and quotes correctly for supported shells, or explicitly constrains the command surface and tests that boundary. -> This backlog slice. Proof: Supported terminal-launch commands are sent in a form the configured shell can run.
- request-Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented. -> This backlog slice. Proof: Unsupported command shapes fail early or are never emitted by the viewer protocol.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)
- Request: `req_290_post_release_viewer_and_vs_code_hardening`
- Primary task(s): `task_287_orchestrate_post_release_viewer_hardening`

# AI Context
- Summary: Harden VS Code terminal bridge command handling
- Keywords: scaffolded-backlog, harden vs code terminal bridge command handling, implementation-ready
- Use when: Implementing the scaffolded slice for Harden VS Code terminal bridge command handling.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_287_orchestrate_post_release_viewer_hardening` was finished via `logics-manager flow finish task` on 2026-07-05.
