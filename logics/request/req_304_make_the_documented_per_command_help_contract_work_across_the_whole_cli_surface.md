## req_304_make_the_documented_per_command_help_contract_work_across_the_whole_cli_surface - Make the documented per-command help contract work across the whole CLI surface
> From version: 2.19.7
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: CLI contract discoverability
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Make the help flag work on every command, since the generated instructions bridge tells operators and agents to use it as the authoritative source for the current command contract.
- Fix the defect at the shared parser construction point rather than one command at a time, so it cannot reappear on the next command added.
- Prove the whole surface stays covered with a test that enumerates commands rather than listing them by hand.

# Context
- Eleven top-level commands reject their own help flag with a usage error and a non-zero exit: status, health, lint, doctor, index, followups, search, bootstrap, update, self-update, and product-consistency.
- The cause is that hand-built argument parsers throughout the CLI entry point disable automatic help registration and never register the flag themselves.
- The generated instructions bridge that ships in every consuming repository directs readers to per-command help as the current command contract, so the documented discovery path fails on roughly a third of the surface.
- The same defect was already reported and fixed once for a single release subcommand in an earlier version, but the fix was applied to that one command instead of the shared construction point, leaving every other affected command broken.
- Nested subcommands and machine-readable output are unaffected and were verified to behave correctly.

# Acceptance criteria
- AC1: Every command and subcommand of the CLI responds to its help flag by printing usage and exiting successfully.
- AC2: The fix is applied at the shared parser construction point, so a newly added command inherits working help without further action.
- AC3: A test enumerates the command surface and asserts help behavior for each entry, rather than checking a hand-maintained list.
- AC4: Help output names the command's own flags and remains consistent with the top-level help listing.
- AC5: Existing invocations and their exit codes are unchanged apart from the help flag.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_052_reliable_cli_help_and_command_contract_discovery`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md
- logics/product/prod_013_cli_primary_usage_audit_and_hardening.md
- logics/backlog/item_559_harden_release_evidence_help_and_examples.md

# AI Context
- Summary: Make the documented per-command help contract work across the whole CLI surface
- Keywords: request-chain-scaffold, make the documented per-command help contract work across the whole cli surface, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make the documented per-command help contract work across the whole CLI surface.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_596_register_the_help_flag_at_the_shared_parser_construction_point`
- `item_597_assert_help_behavior_across_an_enumerated_command_surface`
