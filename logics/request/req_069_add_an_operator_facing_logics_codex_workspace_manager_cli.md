## req_069_add_an_operator_facing_logics_codex_workspace_manager_cli - Add an operator-facing Logics Codex workspace manager CLI
> From version: 1.10.8
> Status: Draft
> Understanding: 95%
> Confidence: 93%
> Complexity: Medium
> Theme: Codex operator workflow and workspace tooling
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Provide a small operator-facing command surface for managing Codex workspace overlays for Logics-enabled repositories.
- Make the overlay architecture from `req_067` usable in day-to-day workflows without requiring manual directory surgery or environment-variable bookkeeping.
- Standardize how operators create, synchronize, inspect, and launch workspace-specific Codex homes.

# Context
`req_067` defines the architectural direction: each repository should be able to project its own Logics skills into a per-workspace `CODEX_HOME` overlay instead of publishing everything into the shared global `~/.codex/skills` pool.

That architecture is not sufficient on its own for real usage. Operators still need a reliable way to:
- register or discover a repository as a managed workspace;
- build or refresh its overlay from `logics/skills/`;
- inspect the current state of that overlay;
- launch Codex against the correct workspace home;
- and clean up overlay state when it is no longer needed.

If those actions remain manual, several problems follow:
- users will launch Codex against the wrong home;
- overlays will drift from repo state because sync is not standardized;
- support guidance will become a collection of ad hoc shell snippets instead of a stable operator contract;
- later diagnostics and validation work will have no single command surface to build on.

The preferred direction is a thin workspace manager CLI dedicated to the overlay lifecycle, with a narrow command surface such as:
- `register`
- `sync`
- `run`
- `status`
- `clean`

The exact verbs can still change, but the request requires an explicit operator interface rather than an architecture that exists only on paper.

```mermaid
%% logics-kind: request
%% logics-signature: request|add-an-operator-facing-logics-codex-work|provide-a-small-operator-facing-command-|ac1-the-request-defines-a-minimal
flowchart LR
    Overlay[Workspace overlay architecture exists] --> CLI[Operator facing workspace CLI]
    CLI --> Sync[Register sync run and status are explicit]
    Sync --> Usage[Codex launches against the right workspace]
    Usage --> Outcome[Operational use becomes repeatable]
```

# Acceptance criteria
- AC1: The request defines a minimal operator-facing command surface for workspace overlays, covering creation or registration, synchronization, execution against the workspace overlay, and state inspection.
- AC2: The request explicitly ties that command surface to the architecture in `req_067` rather than redefining overlay ownership or source-of-truth rules.
- AC3: The request allows the final command names to vary, but requires the implementation to cover the operator intents of:
  - register or discover workspace state;
  - sync overlay content from repo-local Logics skills;
  - run Codex against the correct workspace `CODEX_HOME`;
  - inspect status;
  - clean or remove managed overlay state.
- AC4: The request defines that the operator workflow should avoid requiring users to handcraft overlay directories or manually export environment variables for the normal happy path.
- AC5: The request is concrete enough that diagnostics, validation, and lifecycle work can build on the same command surface later instead of inventing parallel entrypoints.
- AC6: The request keeps the command surface intentionally small and scriptable so it can be used from both terminals and higher-level integrations.

# Scope
- In:
  - Define the operator-facing workspace manager contract.
  - Cover the minimum command intents needed to use workspace overlays in practice.
  - Keep the interface scriptable and automation-friendly.
- Out:
  - Solving precedence policy in full.
  - Deep diagnostics semantics beyond the basic status surface.
  - Reworking Codex itself.

# Dependencies and risks
- Dependency: `req_067` remains the architecture source for per-workspace overlays.
- Dependency: Codex launch isolation continues to rely on workspace-specific `CODEX_HOME` or equivalent wrapper behavior.
- Risk: if the CLI surface grows too broad too early, the operator path will become harder to learn and maintain.
- Risk: if the CLI is under-scoped, users will still fall back to manual overlay manipulation and lose the benefit of a supported workflow.

# Clarifications
- This request is about the operator command surface, not the underlying precedence model.
- It is acceptable for the first implementation to be a thin script wrapper as long as the supported workflow is explicit and durable.
- The CLI should orchestrate overlay state; it should not become a second source of truth for Logics skills.

# References
- Related request(s): `logics/request/req_067_add_multi_project_codex_workspace_overlays_for_logics_skills.md`
- Reference: `logics/skills/logics-flow-manager/SKILL.md`
- Reference: `logics/instructions.md`

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): `adr_008_keep_codex_workspace_overlays_repo_local_isolated_and_composable`



# Backlog
- `item_092_add_an_operator_facing_logics_codex_workspace_manager_cli`
