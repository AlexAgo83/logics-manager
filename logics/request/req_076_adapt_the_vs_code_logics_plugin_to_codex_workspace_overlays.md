## req_076_adapt_the_vs_code_logics_plugin_to_codex_workspace_overlays - Adapt the VS Code Logics plugin to Codex workspace overlays
> From version: 1.10.8
> Status: Draft
> Understanding: 95%
> Confidence: 92%
> Complexity: Medium
> Theme: VS Code plugin integration and Codex overlay awareness
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Adapt the VS Code Logics plugin so it understands and supports the future Codex workspace-overlay model instead of assuming only the current global Codex behavior.
- Preserve the plugin's existing repo-local `logics/skills` workflow while adding visibility and operator support for overlay-backed Codex sessions.
- Prevent the plugin UX from drifting behind the new Codex runtime model once overlays become the supported path.

# Context
The current plugin already has a strong Logics workflow model, but it is still aligned to the pre-overlay world:
- it assumes the Logics kit lives under `logics/skills/` in the repository;
- it checks repository state, Python, Git, and flow-manager availability through repo-local paths;
- it can select agents from `logics/skills/*/agents/openai.yaml` and inject prompts into Codex chat;
- it can bootstrap the Logics kit and guide users through workflow creation and repair.

That means the plugin is already compatible with the repo-local source-of-truth side of the future design, but it is not yet aware of the new Codex runtime side:
- workspace-specific `CODEX_HOME` overlays;
- operator flows such as sync, run, status, or diagnostics for overlays;
- cross-project Codex isolation expectations;
- possible drift between repo-local Logics state and overlay runtime state.

Without an explicit plugin adaptation request, several gaps are likely:
- the plugin may continue to present Codex actions as if the global runtime model still applied;
- diagnostics may say the repository is healthy while the overlay-backed Codex runtime is broken;
- users may be forced to leave the plugin to discover overlay status or launch paths;
- the plugin may keep offering bootstrap-only recovery language where overlay-aware recovery is now more accurate.

The preferred direction is not to move overlay ownership into the plugin.
Instead:
- the plugin should remain grounded in repo-local Logics state;
- overlay management may still be implemented by scripts or a dedicated workspace manager;
- but the plugin should become aware enough to surface overlay state, recovery, and launch guidance coherently.

```mermaid
%% logics-kind: request
%% logics-signature: request|adapt-the-vs-code-logics-plugin-to-codex|adapt-the-vs-code-logics-plugin|ac1-the-request-defines-plugin-level-ada
flowchart LR
    Plugin[Plugin understands repo local Logics] --> Overlay[Codex runtime moves to workspace overlays]
    Overlay --> Awareness[Plugin becomes overlay aware]
    Awareness --> Diagnostics[Status recovery and launch stay coherent]
    Diagnostics --> Outcome[Plugin UX matches the new system]
```

# Acceptance criteria
- AC1: The request defines plugin-level adaptation for the Codex workspace-overlay model without redefining the underlying overlay architecture itself.
- AC2: The request explicitly preserves the current plugin responsibility for repo-local Logics workflow browsing and script-backed actions under `logics/skills/`.
- AC3: The request defines which overlay-aware plugin surfaces need to exist, covering at least:
  - environment or status visibility;
  - Codex launch or handoff guidance;
  - operator-facing recovery messaging when overlay state is missing or unhealthy.
- AC4: The request makes clear that the plugin should be able to distinguish between:
  - healthy repo-local Logics state;
  - and unhealthy overlay-backed Codex runtime state.
- AC5: The request is concrete enough that future implementation can decide whether overlay actions are invoked through a CLI or wrapper layer while still giving the plugin a coherent integration path.
- AC6: The request keeps bootstrap and repo-local kit checks compatible with existing repositories even before overlays are fully adopted everywhere.
- AC7: The request defines the plugin adaptation as additive and backward-aware rather than as a breaking replacement of current Logics browsing and workflow actions.
- AC8: The request is implementation-ready enough that a follow-up backlog item can choose whether the first plugin pass should include:
  - read-only overlay diagnostics first;
  - guided launch integration;
  - or fuller overlay action surfaces in the tools menu.

# Scope
- In:
  - Define how the plugin should become aware of Codex workspace overlays.
  - Define the user-facing plugin surfaces most affected by the new runtime model.
  - Keep the plugin aligned with the repo-local Logics contract and overlay-backed Codex contract together.
- Out:
  - Replacing the overlay manager or CLI with plugin-only ownership.
  - Reworking the core Logics indexing or workflow-doc model.
  - Removing the current repo-local kit workflow assumptions where they are still correct.

# Dependencies and risks
- Dependency: the workspace-overlay architecture remains defined by `req_067` and related overlay requests, not by the plugin adaptation request.
- Dependency: the plugin continues to use repo-local Logics docs and kit scripts as its primary repository-facing contract.
- Risk: if plugin messaging is not updated, users may receive correct repo-level diagnostics but incorrect Codex-runtime guidance.
- Risk: if the plugin tries to own too much overlay logic directly, it can duplicate the CLI or wrapper implementation and drift from the source of truth.
- Risk: if overlay awareness is added only partially, the tools menu and environment checks may become internally inconsistent.

# Clarifications
- This request is about making the plugin overlay-aware, not about moving overlay ownership into the plugin.
- The plugin can remain a consumer of overlay status and operator actions exposed by scripts or wrappers.
- The goal is coherent plugin UX and diagnostics once the Codex runtime model evolves, not a wholesale rewrite of the extension.

# References
- Related request(s): `logics/request/req_067_add_multi_project_codex_workspace_overlays_for_logics_skills.md`
- Related request(s): `logics/request/req_069_add_an_operator_facing_logics_codex_workspace_manager_cli.md`
- Related request(s): `logics/request/req_071_add_diagnostics_and_self_healing_for_codex_workspace_overlays.md`
- Reference: `src/logicsViewProvider.ts`
- Reference: `src/logicsViewDocumentController.ts`
- Reference: `src/logicsEnvironment.ts`
- Reference: `README.md`

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): `adr_008_keep_codex_workspace_overlays_repo_local_isolated_and_composable`
# Backlog
- `item_099_adapt_the_vs_code_logics_plugin_to_codex_workspace_overlays`
