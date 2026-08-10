## req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap - Use one resolved Logics Manager runtime and silently refresh existing project bootstrap
> From version: 2.21.4
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: High
> Theme: Single runtime and quiet bootstrap
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-11 00:53:18

# AI Context
- Summary: Use one resolved Logics Manager runtime and silently refresh existing project bootstrap
- Keywords: request-chain-scaffold, use one resolved logics manager runtime and silently refresh existing project bootstrap, development-ready
- Use when: You need to implement or review the scaffolded workflow for Use one resolved Logics Manager runtime and silently refresh existing project bootstrap.
- Skip when: The change is unrelated to this scaffolded request chain.

# Needs
- The VS Code extension must resolve one installed `logics-manager` CLI per project and use it for all normal Logics operations only when its version exactly matches the extension version.
- A project that already has a Logics corpus must silently refresh only managed bootstrap artifacts after its resolved CLI changes, without interrupting the user.
- First-time project initialization and other material side effects must remain explicit user actions.
- Global Codex/Claude skill publication must leave the VS Code plugin and remain the explicit CLI `skills install` integration, not a prerequisite for normal Logics workflow use.

# Context
- The extension currently contains an independent bundled Python runtime and invokes it directly, even when an npm or Python installation of `logics-manager` already exists.
- This can mix CLI/package versions with extension behavior and creates startup notifications that combine package updates, repository bootstrap repair, and global assistant publication.
- The product already presents `logics-manager` as its canonical CLI. Bootstrap should provision or refresh repository-local workflow artifacts, not masquerade as a package update.
- A silent refresh is safe only for idempotent, managed content. It must preserve user-owned content and must never silently initialize Git, create commits, publish global assistant files, or bootstrap an entirely new project.

# Acceptance criteria
- AC1: The VS Code extension resolves one `logics-manager` executable from PATH per selected project root, records its path and version, and reuses it for normal CLI-backed operations.
- AC2: The extension invokes normal workflow operations only when the installed CLI version exactly matches the extension version; it never invokes bundled `scripts/logics-manager.py` as a hidden fallback.
- AC3: When the CLI is missing or mismatched, the extension clearly reports one install/update action and remains read-only.
- AC4: After the resolved CLI changes, opening an already initialized project silently runs an idempotent `bootstrap --refresh-managed` apply path limited to generated files and marked managed regions, reporting only a non-blocking status when files changed.
- AC5: Silent refresh never initializes Git, creates commits, publishes global Codex/Claude skills or bridges, overwrites user-owned text outside managed regions, or creates a new `logics/` corpus.
- AC6: Initializing Logics in a project without a corpus remains an explicit user action with a clear description of files that will be created.
- AC7: Plugin-owned global Codex/Claude publication, launch handoff, command-copy, and commit prompts are removed; global skills are installed only through the explicit CLI `skills install` flow.
- AC8: Startup no longer chains runtime-version, bootstrap, publication, launch, copy-command, or commit prompts. Diagnostics and explicit repair actions remain available through Check Environment and Tools.
- AC9: Focused tests cover compatible installed runtime selection, missing/incompatible runtime behavior, one-runtime-per-project reuse, silent managed refresh, preservation of user content, and absence of forbidden silent side effects.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)

# References
- `pyproject.toml` and `package.json` distribute the canonical `logics-manager` CLI through Python and npm.
- `clients/vscode/src/logicsProviderUtils.ts` currently resolves the extension-bundled `scripts/logics-manager.py` directly.
- `clients/vscode/src/logicsCodexWorkflowKitSupport.ts` implements Update Logics Runtime by running bundled `bootstrap`, rather than updating the installed CLI package.
- `clients/vscode/src/logicsCodexWorkflowBootstrapSupport.ts`, `logicsCodexWorkflowOperations.ts`, and `logicsViewProviderSupport.ts` contain overlapping startup prompts for bootstrap, runtime update, and global assistant publication.
- `clients/vscode/src/logicsCodexWorkspace.ts` and `logicsClaudeGlobalKit.ts` publish skills/bridges into global assistant homes; this is separate from using the local Logics CLI.
- `logics/architecture/adr_027_use_the_installed_cli_as_the_only_vs_code_logics_runtime.md` records the resolved runtime, silent refresh, and global integration decisions.

# Backlog
- `item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime`
- `item_691_make_existing_project_bootstrap_refresh_silent_and_managed_only`
- `item_692_remove_global_assistant_publication_and_prompt_cascades_from_normal_vs_code_startup`
