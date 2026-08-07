## item_591_make_self_update_manager_accurate_shadow_safe_and_machine_readable - Make self-update manager-accurate, shadow-safe, and machine-readable
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Runtime maintenance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-07

# Problem
- Automatic manager resolution infers the installation source from packaging heuristics rather than from the executable actually running, and has twice resolved a package-manager-installed copy to a different manager.
- Each incident installed a second executable earlier on PATH than the original, silently shadowing it, and required manual removal.
- The command produces no machine-readable output, so an automated updater matches on the phrase 'already at latest version' to detect that nothing changed.
- The command's argument parser rejects its own help flag.

# Scope
- In:
  - Resolve the owning package manager from the path of the running executable before falling back to any heuristic.
  - Detect other executables of the same name on PATH and refuse to install where the result would be shadowed, explaining the conflict.
  - Add machine-readable output and a check-only mode reporting current version, latest version, whether an update was applied, the resolved manager, and the executable path.
  - Register the help flag on the subcommand parser.
  - Report any PATH duplication from the environment diagnostic command.
  - Document both distribution package names and their relationship.
- Out:
  - Downgrading or pinning to a specific version.
  - Installing a manager that is not already present.
  - Managing tools other than this package.

# Acceptance criteria
- AC1: Automatic resolution selects the manager that owns the running executable, verified for each supported manager.
- AC2: An update that would produce a shadowing duplicate is refused with a message naming both paths.
- AC3: Machine-readable output reports current version, latest version, applied state, manager, and path, and a check-only mode performs no installation.
- AC4: The help flag prints usage instead of erroring.
- AC5: The environment diagnostic reports duplicate executables of the same name on PATH.
- AC6: Tests cover per-manager resolution, shadow refusal, check-only mode, and duplicate detection with the installer invocation faked.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Automatic resolution selects the manager that owns the running executable, verified for each supported manager.
- request-AC2 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`
- request-AC3 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`
- request-AC5 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`
- request-AC6 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`
- request-AC7 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`
- request-AC8 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`
- request-AC9 -> This backlog slice. Proof: Delivered across commits 9dfb6c40 (--repo-root), 8929fcaa (MCP tool profiles), d763cf5a (uniform dry_run), 43c247c7 (self-update resolution), 7bd3ff60 (doc age and stale signal), 66f44f76 (quoting-free arguments and JSON envelope), a2697d2d (fleet reporting), fb5ae780 (bundled delegation skills). Validated with python -m pytest tests/python (888 passed), lint, and audit. Source: `fb5ae780`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Make self-update manager-accurate, shadow-safe, and machine-readable
- Keywords: scaffolded-backlog, make self-update manager-accurate, shadow-safe, and machine-readable, implementation-ready
- Use when: Implementing the scaffolded slice for Make self-update manager-accurate, shadow-safe, and machine-readable.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - has already caused repeated real breakage
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# Notes
- Task `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery` was finished via `logics-manager flow finish task` on 2026-08-07.
