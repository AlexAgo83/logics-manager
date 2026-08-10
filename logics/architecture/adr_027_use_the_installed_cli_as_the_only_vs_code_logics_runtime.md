## adr_027_use_the_installed_cli_as_the_only_vs_code_logics_runtime - Use the installed CLI as the only VS Code Logics runtime
> Date: 2026-08-11
> Status: Settled
> Related request: req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap
> Related backlog: item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime, item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only, item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup
> Related task: task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification
> Drivers: One version per VS Code session, no hidden fallback, and no startup setup noise.
> Reminder: Update status, linked refs, decision rationale, consequences, and follow-up work when you edit this doc.
> Indicators reviewed: 2026-08-11 00:52:34

# Overview
- VS Code invokes one installed `logics-manager` CLI with the exact extension version; bootstrap refresh is silent only for managed artifacts in an existing corpus.

# Context
- The extension currently invokes its bundled `scripts/logics-manager.py` directly even when the canonical CLI is installed through npm or Python.
- This mixes package/runtime ownership and lets startup prompt for bootstrap repair, runtime update, global assistant publication, command copying, launches, and commits.
- The canonical CLI already owns normal workflow behavior and its explicit `skills install` flow. Plugin-owned publication into global Codex/Claude homes is a separate integration and is not required to view or operate a Logics corpus.
- Existing bootstrap output contains managed regions that can be refreshed deterministically, but creating a new corpus or changing Git/global assistant state is a material user action.

# Decision
- Resolve `logics-manager` from PATH once per selected project root and use that executable for every normal VS Code CLI-backed operation.
- Accept only an installed CLI whose version exactly matches the extension version. A missing or mismatched CLI leaves the extension read-only and exposes one install/update action in Check Environment; there is no silent bundled-runtime fallback.
- Add a CLI-managed `bootstrap --refresh-managed` check/apply contract. VS Code runs its apply mode silently only when an existing valid corpus needs managed-artifact refresh after the resolved CLI changes. It may update only generated files or marked managed regions.
- A project without `logics/` is never bootstrapped automatically. Initialization remains a deliberate user action that states what will be created.
- Remove plugin-owned global Codex/Claude publication, launch handoff, command-copy, and commit prompts from normal startup. Global skills remain an explicit CLI concern through `logics-manager skills install`.

# Consequences
- Package and extension releases must share a version, and an upgrade requires updating the installed CLI before VS Code write actions resume.
- Runtime resolution, version mismatch, managed refresh, and preservation behavior need focused cross-platform tests.
- The extension becomes a thinner host over the CLI and no longer owns a second hidden runtime or global assistant installation lifecycle.
- Users who want global assistant skills run the explicit CLI command; normal Logics browser, VS Code, MCP, and workflow operations do not depend on it.

# References
- Related request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Related backlog: `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`, `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`, `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`
- Related task: `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification`
