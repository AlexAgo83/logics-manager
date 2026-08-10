## item_690_resolve_and_enforce_one_compatible_installed_logics_manager_runtime - Resolve and enforce one compatible installed Logics Manager runtime
> From version: 2.21.4
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Runtime resolution
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-11 01:46:59

# AI Context
- Summary: Resolve and enforce one compatible installed Logics Manager runtime
- Keywords: scaffolded-backlog, resolve and enforce one compatible installed logics manager runtime, implementation-ready
- Use when: Implementing the scaffolded slice for Resolve and enforce one compatible installed Logics Manager runtime.
- Skip when: The change belongs to another backlog slice.

# Problem
- VS Code calls its bundled Python entrypoint directly while users may already have a separately installed canonical CLI. The resulting mixed-version behavior is ambiguous and difficult to support.

# Scope
- In:
  - Add a small runtime resolver that locates `logics-manager` on PATH, probes its identity/version using a machine-readable command contract, and accepts only an exact match with the extension version.
  - Cache the resolved runtime per selected project root and route normal VS Code CLI operations through it.
  - Expose a concise unavailable/incompatible state to Check Environment and disable write operations that require the CLI.
  - Keep unavailable or mismatched runtime states read-only with one Check Environment install/update action; do not retain a bundled-runtime fallback.
- Out:
  - Automatic package installation or self-update.
  - Changing unrelated viewer server lifecycle behavior.
  - Global Codex or Claude skill publication.

# Acceptance criteria
- AC1: An exact-version installed CLI is selected once per project and every covered command uses its resolved executable path.
- AC2: Missing and mismatched CLI states are deterministic, actionable, read-only, and do not trigger a hidden bundled-runtime fallback.
- AC3: Resolver tests cover npm/Python launch forms, Windows-safe command execution, version compatibility, cache invalidation, and command routing.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A compatible installed CLI is selected once per project and every covered command uses its resolved executable path.
- request-AC2 -> This backlog slice. Proof: AC2: Missing and incompatible CLI states are deterministic, actionable, and do not trigger a hidden bundled-runtime fallback.
- request-AC3 -> This backlog slice. Proof: AC3: Resolver tests cover npm/Python launch forms, Windows-safe command execution, version compatibility, cache invalidation, and command routing.
- request-AC9 -> This backlog slice. Proof: AC3: Resolver tests cover npm/Python launch forms, Windows-safe command execution, version compatibility, cache invalidation, and command routing.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_075_one_logics_runtime_no_setup_noise`
- Architecture decision(s): (none yet)
- Request: `req_331_use_one_resolved_logics_manager_runtime_and_silently_refresh_existing_project_bootstrap`
- Primary task(s): `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification`

# Notes
- Task `task_328_deliver_the_single_runtime_and_silent_bootstrap_simplification` was finished via `logics-manager flow finish task` on 2026-08-11.
