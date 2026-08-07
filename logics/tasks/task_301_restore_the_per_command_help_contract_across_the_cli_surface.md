## task_301_restore_the_per_command_help_contract_across_the_cli_surface - Restore the per-command help contract across the CLI surface
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Register the help flag at the shared parser construction point and verify the eleven affected commands.
- [ ] 2. Add the enumerated regression test covering top-level commands and nested subcommands.
- [ ] 3. Confirm the generated instructions bridge's claim about per-command help now holds.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_596_register_the_help_flag_at_the_shared_parser_construction_point`
- `item_597_assert_help_behavior_across_an_enumerated_command_surface`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1, request-AC2, request-AC4, request-AC5 -> `item_596_register_the_help_flag_at_the_shared_parser_construction_point`. Proof deferred to slice closeout.
- request-AC1, request-AC3 -> `item_597_assert_help_behavior_across_an_enumerated_command_surface`. Proof deferred to slice closeout.
- request-AC1 -> This task. Evidence needed: Every command and subcommand of the CLI responds to its help flag by printing usage and exiting successfully.
- request-AC2 -> This task. Evidence needed: The fix is applied at the shared parser construction point, so a newly added command inherits working help without further action.
- request-AC3 -> This task. Evidence needed: A test enumerates the command surface and asserts help behavior for each entry, rather than checking a hand-maintained list.
- request-AC4 -> This task. Evidence needed: Help output names the command's own flags and remains consistent with the top-level help listing.
- request-AC5 -> This task. Evidence needed: Existing invocations and their exit codes are unchanged apart from the help flag.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Restore the per-command help contract across the CLI surface
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_304_make_the_documented_per_command_help_contract_work_across_the_whole_cli_surface`
- Product brief(s): `prod_052_reliable_cli_help_and_command_contract_discovery`
- Architecture decision(s): (none yet)
