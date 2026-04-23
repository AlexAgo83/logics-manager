## item_347_remove_legacy_runtime_compatibility_surfaces_from_plugin_diagnostics_and_gating - Remove legacy runtime compatibility surfaces from plugin diagnostics and gating
> From version: 1.28.0
> Schema version: 1.0
> Status: Ready
> Understanding: 96%
> Confidence: 88%
> Progress: 0%
> Complexity: Medium
> Theme: Runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The extension still exposes residual diagnostics, gating logic, and migration messages that model `logics/skills` or `cdx-logics-kit` as a normal runtime shape instead of a historical migration concern.

# Scope
- In:
  - remove or narrow legacy compatibility branches from runtime checks, environment diagnostics, and repair/gating messages;
  - preserve only clearly justified migration or troubleshooting handling where it is still needed;
  - update tests so the supported steady-state model is the integrated `logics-manager` runtime.
- Out:
  - workflow-action routing work that belongs to the canonical CLI entrypoint slice;
  - general documentation and packaging updates that do not affect diagnostics or gating behavior.

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|remove-legacy-runtime-compatibility-surf|req-189-finish-plugin-migration-to-canon|the-extension-still-exposes-residual-dia|ac1-normal-plugin-diagnostics-and-gating
flowchart TD
    Request[Finish plugin migration to canonical CLI] --> Problem[Diagnostics still model legacy runtime compatibility]
    Problem --> Scope[Clean diagnostics and gating to match integrated runtime]
    Scope --> Acceptance[AC1: Supported runtime checks no longer depend on legacy paths]
    Acceptance --> Task[Execution through orchestration task]
```

# Acceptance criteria
- AC1: Normal plugin diagnostics and gating no longer describe legacy kit compatibility as a supported steady-state runtime requirement.
- AC2: Any retained legacy messaging is explicitly framed as migration/troubleshooting support rather than the normal product path.
- AC3: Automated tests validate the supported integrated-runtime diagnostics contract.

# AC Traceability
- Request AC2 -> This backlog slice. Proof: legacy runtime compatibility stops being treated as a normal operational contract.
- Request AC3 -> This backlog slice. Proof: any residual exceptions are explicit and justified.
- Request AC4 -> This backlog slice. Proof: user-facing copy reflects the thin-client model.

# Decision framing
- Product framing: Required
- Product signals: operator contract
- Product follow-up: Reuse `prod_009`; do not expand this slice into unrelated runtime packaging work.
- Architecture framing: Not needed

# Links
- Product brief(s): `logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md`
- Architecture decision(s): (none yet)
- Request: `logics/request/req_189_finish_plugin_migration_to_canonical_logics_manager_cli_surface.md`
- Primary task(s): `logics/tasks/task_151_orchestrate_plugin_migration_to_the_canonical_logics_manager_cli_surface.md`

# AI Context
- Summary: Remove the remaining legacy runtime compatibility behavior from plugin diagnostics and gating.
- Keywords: diagnostics, gating, legacy, plugin, runtime migration
- Use when: Use when cleaning up supported-state checks, repair flows, and operator messaging after the integrated runtime migration.
- Skip when: Skip when the work only changes canonical CLI routing or documentation.

# Priority
- Impact: High
- Urgency: High

# Notes
- This slice is the main cleanup lane for the residual `item_343` style gaps that still leak into plugin behavior.
