## item_533_restore_valid_vs_code_recovery_guidance_for_environment_checks - Restore valid VS Code recovery guidance for environment checks
> From version: 2.15.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: VS Code command compatibility
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The Logics: Check Environment command was removed from the contributed and registered command surface, but multiple VS Code user-facing messages still tell users to run it.
- Following that guidance currently leads users to a missing command instead of a recovery path.

# Scope
- In:
  - Audit all VS Code extension messages that mention Logics: Check Environment.
  - Either restore a contributed and registered command with the expected behavior or update the messages to point at an existing command/workflow.
  - Update or add focused tests that lock the chosen recovery guidance.
- Out:
  - Changing unrelated VS Code commands.
  - Rewriting the full bootstrap or workflow recovery flow.

# Acceptance criteria
- No user-facing message references an unavailable VS Code command.
- The chosen command guidance is covered by focused tests or an equivalent command-surface assertion.
- Manual command discovery in VS Code matches the documented recovery text.

# AC Traceability
- request-Stale user-facing references to Logics: Check Environment are either backed by a registered command again or replaced with valid recovery guidance. -> This backlog slice. Proof: No user-facing message references an unavailable VS Code command.
- request-Focused viewer, VS Code extension, lint, and Logics validation commands pass after the fixes are implemented. -> This backlog slice. Proof: The chosen command guidance is covered by focused tests or an equivalent command-surface assertion.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_038_post_release_viewer_hardening`
- Architecture decision(s): (none yet)
- Request: `req_290_post_release_viewer_and_vs_code_hardening`
- Primary task(s): `task_287_orchestrate_post_release_viewer_hardening`

# AI Context
- Summary: Restore valid VS Code recovery guidance for environment checks
- Keywords: scaffolded-backlog, restore valid vs code recovery guidance for environment checks, implementation-ready
- Use when: Implementing the scaffolded slice for Restore valid VS Code recovery guidance for environment checks.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
