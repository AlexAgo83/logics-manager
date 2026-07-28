## item_560_add_package_truth_checks_for_shipped_cli_behavior - Add package truth checks for shipped CLI behavior
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 92
> Confidence: 88
> Progress: 100%
> Complexity: Medium
> Theme: Packaging
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Source-tree behavior can look correct while a built wheel omits a Python subpackage because package metadata is explicit.

# Scope
- In:
  - Add or strengthen a Python test that compares discovered `logics_manager.*` subpackages with package metadata.
  - Wire the cheap metadata-vs-subpackages check into `ci:check`.
  - Add `logics-manager doctor packaging` for the heavier clean-wheel path: build a wheel, install it into a clean venv, and check `logics-manager --version` plus critical commands such as `flow finish --help` and `release status --help`.
  - Make release validation or release guidance call out `doctor packaging` as the release-time artifact-truth gate.
  - Document the command in release guidance.
- Out:
  - Changing package managers or publishing workflows.
  - Adding a new dependency for packaging inspection.

# Acceptance criteria
- AC1: `ci:check` fails if a `logics_manager.*` subpackage is importable in the checkout but absent from explicit packaging metadata.
- AC2: `logics-manager doctor packaging` builds and installs a wheel in a clean venv and validates critical CLI commands.
- AC3: Release validation or release documentation proves the clean-wheel doctor is part of the release path.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: CI fails if a `logics_manager.*` subpackage is importable in the checkout but absent from explicit packaging metadata.
- request-AC2 -> This backlog slice. Evidence needed: Workflow status inputs accept common aliases such as `In Progress`, `in_progress`, and `in progress`, then persist the canonical status label.
- request-AC3 -> This backlog slice. Evidence needed: `release evidence add --help` shows help successfully, and evidence-add argument errors include a complete example command for the target gate.
- request-AC5 -> This backlog slice. Evidence needed: RTK wrapper documentation and generated assistant instructions name safe forms for targeted npm commands, including `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.
- request-AC6 -> This backlog slice. Evidence needed: An assistant-facing command can read `cdx memory` current/global scopes as JSON, clean ANSI/TUI noise, summarize quality signals, and emit a bounded context payload without directly depending on raw `.cdx/contexts` paths.
- request-AC7 -> This backlog slice. Evidence needed: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- request-AC8 -> This backlog slice. Evidence needed: Top-level roadmap commands expose practical status and placement flows, with `flow roadmap` aliases kept when cheap.
- request-AC9 -> This backlog slice. Evidence needed: Task closeout or flow validation surfaces stale/missing roadmap placement as a non-blocking recommendation when roadmap docs exist, without making roadmap mandatory for repos that do not use it.
- request-AC10 -> This backlog slice. Evidence needed: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.
- request-AC2 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC3 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC5 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC6 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC7 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC8 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC9 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC10 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_045_logics_operator_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow`
- Primary task(s): `task_294_orchestrate_logics_operator_ergonomics_improvements`

# AI Context
- Summary: Add package truth checks for shipped CLI behavior
- Keywords: scaffolded-backlog, add package truth checks for shipped cli behavior, implementation-ready
- Use when: Implementing the scaffolded slice for Add package truth checks for shipped CLI behavior.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_294_orchestrate_logics_operator_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-07-28.
