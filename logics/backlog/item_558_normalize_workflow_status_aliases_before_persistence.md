## item_558_normalize_workflow_status_aliases_before_persistence - Normalize workflow status aliases before persistence
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: CLI ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A user or assistant can type `In Progress` and get rejected even though the intended canonical value is obvious: `In progress`.

# Scope
- In:
  - Add one shared status normalization helper for CLI inputs that maps common variants to canonical status labels.
  - Use it in `sync update-indicators`, `flow start`, `flow progress` or other status-writing paths that accept user-provided status text.
  - Keep file output canonical and keep truly unknown statuses rejected with a did-you-mean hint.
  - Add focused tests for `In Progress`, `in_progress`, `in progress`, and an unknown status.
- Out:
  - Changing the canonical status vocabulary.
  - Accepting arbitrary statuses.

# Acceptance criteria
- AC1: `In Progress`, `in_progress`, and `in progress` are accepted and persisted as `In progress`.
- AC2: Unknown statuses still fail, but the error lists the allowed canonical labels.
- AC3: Tests cover request, backlog, and task status normalization where those kinds allow status updates.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: `In Progress`, `in_progress`, and `in progress` are accepted and persisted as `In progress`.
- request-AC3 -> This backlog slice. Evidence needed: `release evidence add --help` shows help successfully, and evidence-add argument errors include a complete example command for the target gate.
- request-AC4 -> This backlog slice. Evidence needed: `ci:check` runs a cheap metadata-vs-subpackages packaging check, and `doctor packaging` / release validation can run a clean-wheel install check for critical CLI commands.
- request-AC5 -> This backlog slice. Evidence needed: RTK wrapper documentation and generated assistant instructions name safe forms for targeted npm commands, including `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.
- request-AC6 -> This backlog slice. Evidence needed: An assistant-facing command can read `cdx memory` current/global scopes as JSON, clean ANSI/TUI noise, summarize quality signals, and emit a bounded context payload without directly depending on raw `.cdx/contexts` paths.
- request-AC7 -> This backlog slice. Evidence needed: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- request-AC8 -> This backlog slice. Evidence needed: Top-level roadmap commands expose practical status and placement flows, with `flow roadmap` aliases kept when cheap.
- request-AC9 -> This backlog slice. Evidence needed: Task closeout or flow validation surfaces stale/missing roadmap placement as a non-blocking recommendation when roadmap docs exist, without making roadmap mandatory for repos that do not use it.
- request-AC10 -> This backlog slice. Evidence needed: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.
- request-AC3 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC4 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
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
- Summary: Normalize workflow status aliases before persistence
- Keywords: scaffolded-backlog, normalize workflow status aliases before persistence, implementation-ready
- Use when: Implementing the scaffolded slice for Normalize workflow status aliases before persistence.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_294_orchestrate_logics_operator_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-07-28.
