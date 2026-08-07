## item_596_register_the_help_flag_at_the_shared_parser_construction_point - Register the help flag at the shared parser construction point
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: CLI contract discoverability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Hand-built argument parsers across the CLI entry point disable automatic help registration, so eleven top-level commands answer their own help flag with a usage error and a non-zero exit.
- An earlier fix addressed a single release subcommand rather than the shared construction, so the defect persisted everywhere else and can reappear on the next command added.

# Scope
- In:
  - Enable help registration on the parsers that currently disable it, or route them through one shared constructor that registers it.
  - Confirm the change does not conflict with any command that intercepts the help flag for its own rendering.
  - Verify the resulting help output names each command's own flags.
  - Check the auxiliary command modules that build their own parsers for the same pattern.
- Out:
  - Rewriting help text content or examples.
  - Changing the top-level help layout.
  - Altering flags, behavior, or exit codes other than the help flag.
  - Adopting a different argument-parsing framework.

# Acceptance criteria
- AC1: Each of the eleven affected commands prints usage and exits successfully on its help flag.
- AC2: Help registration is handled once, at the shared construction point, not per command.
- AC3: Commands that already handled help correctly are unchanged.
- AC4: Help output for an affected command names that command's own flags.
- AC5: Non-help invocations keep their current output and exit codes.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each of the eleven affected commands prints usage and exits successfully on its help flag.
- request-AC2 -> This backlog slice. Proof: AC2: Help registration is handled once, at the shared construction point, not per command.
- request-AC4 -> This backlog slice. Proof: AC3: Commands that already handled help correctly are unchanged.
- request-AC5 -> This backlog slice. Proof: AC4: Help output for an affected command names that command's own flags.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_052_reliable_cli_help_and_command_contract_discovery`
- Architecture decision(s): (none yet)
- Request: `req_304_make_the_documented_per_command_help_contract_work_across_the_whole_cli_surface`
- Primary task(s): `task_301_restore_the_per_command_help_contract_across_the_cli_surface`

# AI Context
- Summary: Register the help flag at the shared parser construction point
- Keywords: scaffolded-backlog, register the help flag at the shared parser construction point, implementation-ready
- Use when: Implementing the scaffolded slice for Register the help flag at the shared parser construction point.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the documented discovery path currently fails
- Rationale: Set by scaffold input or defaulted for grooming.
