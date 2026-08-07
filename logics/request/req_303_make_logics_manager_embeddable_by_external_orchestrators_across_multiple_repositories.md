## req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories - Make logics-manager embeddable by external orchestrators across multiple repositories
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: CLI and MCP contract for external orchestrators
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Let an external orchestrator target any repository explicitly instead of forcing a working-directory change before every invocation.
- Let an MCP client expose a safe subset of the Logics tool surface instead of choosing between all tools, including destructive ones, or none.
- Give automation a uniform mutation contract, a reliable self-update path, and the workflow-age signals it currently has to reconstruct with ad hoc shell commands.

# Context
- An external fleet orchestrator embedded logics-manager to watch and drive Logics work across several cloned repositories, and had to rebuild a large amount of glue to do it.
- That glue includes duplicated project discovery, per-invocation working-directory juggling, a hand-written wrapper server that re-exports a curated twelve-tool subset of the native MCP surface, per-document git timestamp lookups to find stale drafts, and text matching on self-update output.
- Every one of those workarounds exists because of a missing option or an inconsistency in this CLI, not because of a genuine external concern.
- Two independent incidents were caused by the self-update command resolving the wrong package manager and installing a second executable that shadowed the original on PATH.
- Transport, scheduling, state diffing between polling ticks, and notification delivery remain the orchestrator's responsibility and stay out of scope here.

# Acceptance criteria
- AC1: Every command accepts an explicit repository root, so an embedder never has to change the working directory to target a repository.
- AC2: The MCP server can be started with a bounded tool surface selected by capability profile or by explicit allow and deny lists.
- AC3: Every mutating MCP tool and its CLI equivalent accept a dry-run preview using one consistent contract.
- AC4: Self-update resolves the package manager that owns the running executable, refuses to create a shadowing duplicate, and reports its outcome as machine-readable output.
- AC5: Document listings and health output expose last-change timestamps and a stale-document signal, so callers no longer need per-document version-control lookups.
- AC6: Tool arguments can be supplied through a path that does not require shell quoting, and machine-readable output uses one envelope whose exit code matches its success flag.
- AC7: A fleet command reports status and health across every repository under a root directory, isolating per-repository failures.
- AC8: The delegation skills an orchestrator needs are distributed and updated through the existing bundled-skills mechanism instead of being copied by hand.
- AC9: Existing invocations that rely on working-directory discovery and on the current full tool surface keep working unchanged.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md
- logics/product/prod_014_cli_mutation_safety_and_automation_contract.md
- logics/product/prod_011_expanded_logics_mcp_action_surface_for_local_chatgpt_workflows.md

# AI Context
- Summary: Make logics-manager embeddable by external orchestrators across multiple repositories
- Keywords: request-chain-scaffold, make logics-manager embeddable by external orchestrators across multiple repositories, development-ready
- Use when: You need to implement or review the scaffolded workflow for Make logics-manager embeddable by external orchestrators across multiple repositories.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_588_accept_an_explicit_repository_root_on_every_command`
- `item_589_bound_the_served_mcp_tool_surface_by_profile_and_by_allow_and_deny_lists`
- `item_590_give_every_mutating_operation_a_uniform_dry_run_preview`
- `item_591_make_self_update_manager_accurate_shadow_safe_and_machine_readable`
- `item_592_expose_document_age_and_a_stale_document_health_signal`
- `item_593_provide_quoting_free_tool_arguments_and_a_consistent_output_envelope`
- `item_594_report_status_and_health_across_every_repository_under_a_root`
- `item_595_bundle_the_agent_delegation_skills_for_distribution`
