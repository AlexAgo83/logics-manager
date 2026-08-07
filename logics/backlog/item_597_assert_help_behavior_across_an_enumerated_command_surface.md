## item_597_assert_help_behavior_across_an_enumerated_command_surface - Assert help behavior across an enumerated command surface
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: Regression coverage
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Nothing checks that a command answers its help flag, which is how eleven commands drifted and how a targeted earlier fix left the rest broken.
- A hand-maintained list of commands in a test would drift the same way the surface did.

# Scope
- In:
  - Enumerate the command surface from the CLI's own registration rather than from a literal list in the test.
  - Assert that every enumerated command and nested subcommand exits successfully on its help flag and prints usage.
  - Make the failure message name the offending command so a regression is immediately actionable.
- Out:
  - Asserting the wording or formatting of help text.
  - Snapshot testing the full help output.
  - Covering behavior beyond the help flag.

# Acceptance criteria
- AC1: The test derives the command list from the CLI's own registration, with no hand-maintained literal list.
- AC2: The test fails, naming the command, if any command regresses on its help flag.
- AC3: The test covers nested subcommands as well as top-level commands.
- AC4: The test passes against the corrected implementation and fails against the current one.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The test derives the command list from the CLI's own registration, with no hand-maintained literal list.
- request-AC3 -> This backlog slice. Proof: AC2: The test fails, naming the command, if any command regresses on its help flag.
- request-AC4 -> This backlog slice. Evidence needed: Help output names the command's own flags and remains consistent with the top-level help listing.
- request-AC5 -> This backlog slice. Evidence needed: Existing invocations and their exit codes are unchanged apart from the help flag.
- request-AC4 -> This backlog slice. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`
- request-AC5 -> This backlog slice. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_052_reliable_cli_help_and_command_contract_discovery`
- Architecture decision(s): (none yet)
- Request: `req_304_make_the_documented_per_command_help_contract_work_across_the_whole_cli_surface`
- Primary task(s): `task_301_restore_the_per_command_help_contract_across_the_cli_surface`

# AI Context
- Summary: Assert help behavior across an enumerated command surface
- Keywords: scaffolded-backlog, assert help behavior across an enumerated command surface, implementation-ready
- Use when: Implementing the scaffolded slice for Assert help behavior across an enumerated command surface.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - prevents the fix from decaying command by command
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_301_restore_the_per_command_help_contract_across_the_cli_surface`

# Notes
- Task `task_301_restore_the_per_command_help_contract_across_the_cli_surface` was finished via `logics-manager flow finish task` on 2026-08-07.
