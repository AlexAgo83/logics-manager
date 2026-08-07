## task_301_restore_the_per_command_help_contract_across_the_cli_surface - Restore the per-command help contract across the CLI surface
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Register the help flag at the shared parser construction point and verify the eleven affected commands.
- [x] 2. Add the enumerated regression test covering top-level commands and nested subcommands.
- [x] 3. Confirm the generated instructions bridge's claim about per-command help now holds.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_596_register_the_help_flag_at_the_shared_parser_construction_point`
- `item_597_assert_help_behavior_across_an_enumerated_command_surface`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC2, request-AC4, request-AC5 -> `item_596_register_the_help_flag_at_the_shared_parser_construction_point`. Proof deferred to slice closeout.
- request-AC1, request-AC3 -> `item_597_assert_help_behavior_across_an_enumerated_command_surface`. Proof deferred to slice closeout.
- request-AC1 -> This task. Evidence needed: Every command and subcommand of the CLI responds to its help flag by printing usage and exiting successfully.
- request-AC2 -> This task. Evidence needed: The fix is applied at the shared parser construction point, so a newly added command inherits working help without further action.
- request-AC3 -> This task. Evidence needed: A test enumerates the command surface and asserts help behavior for each entry, rather than checking a hand-maintained list.
- request-AC4 -> This task. Evidence needed: Help output names the command's own flags and remains consistent with the top-level help listing.
- request-AC5 -> This task. Evidence needed: Existing invocations and their exit codes are unchanged apart from the help flag.
- request-AC1 -> This task. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`
- request-AC2 -> This task. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`
- request-AC3 -> This task. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`
- request-AC4 -> This task. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`
- request-AC5 -> This task. Proof: Implemented in commit 0086e92a; every command and subcommand answers --help with usage and exit 0, enforced by tests/python/test_cli_help_contract.py (124 passed, 25 failures against the previous implementation). Validated with python -m pytest tests/python (737 passed), lint, and audit. Source: `0086e92a`

# Validation
- (no validation recorded yet)
- command: `python -m pytest tests/python` | result: passed | date: 2026-08-07
- Finish workflow executed on 2026-08-07.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-07.
- Linked backlog item(s): `item_596_register_the_help_flag_at_the_shared_parser_construction_point`, `item_597_assert_help_behavior_across_an_enumerated_command_surface`
- Related request(s): `req_304_make_the_documented_per_command_help_contract_work_across_the_whole_cli_surface`

# AI Context
- Summary: Restore the per-command help contract across the CLI surface
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_304_make_the_documented_per_command_help_contract_work_across_the_whole_cli_surface`
- Product brief(s): `prod_052_reliable_cli_help_and_command_contract_discovery`
- Architecture decision(s): (none yet)
