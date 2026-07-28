## item_559_harden_release_evidence_help_and_examples - Harden release evidence help and examples
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Release workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `release evidence add --help` currently behaves like an invalid invocation, and missing required fields at publication time cost attention when the operator needs exact evidence.

# Scope
- In:
  - Make `logics-manager release evidence add --help` show the command help and exit successfully.
  - On missing required arguments, append a complete example using a placeholder gate id plus `--kind`, `--status`, `--summary`, `--target-version`, and optional `--commit`.
  - Optionally add `logics-manager release evidence example <gate_id>` if it reuses the same renderer and stays small.
  - Add CLI tests for help exit code and missing-field error text.
- Out:
  - Interactive evidence collection.
  - Changing the release evidence schema.
  - Recording evidence automatically from GitHub without explicit operator action.

# Acceptance criteria
- AC1: `release evidence add --help` exits 0 and displays the required flags.
- AC2: Missing-field errors include one complete example command.
- AC3: Tests cover help and missing-field paths.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: `release evidence add --help` exits 0 and displays the required flags.
- request-AC2 -> This backlog slice. Evidence needed: Workflow status inputs accept common aliases such as `In Progress`, `in_progress`, and `in progress`, then persist the canonical status label.
- request-AC4 -> This backlog slice. Evidence needed: `ci:check` runs a cheap metadata-vs-subpackages packaging check, and `doctor packaging` / release validation can run a clean-wheel install check for critical CLI commands.
- request-AC5 -> This backlog slice. Evidence needed: RTK wrapper documentation and generated assistant instructions name safe forms for targeted npm commands, including `rtk npm exec -- vitest ...` instead of `rtk npx vitest ...`.
- request-AC6 -> This backlog slice. Evidence needed: An assistant-facing command can read `cdx memory` current/global scopes as JSON, clean ANSI/TUI noise, summarize quality signals, and emit a bounded context payload without directly depending on raw `.cdx/contexts` paths.
- request-AC7 -> This backlog slice. Evidence needed: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- request-AC8 -> This backlog slice. Evidence needed: Top-level roadmap commands expose practical status and placement flows, with `flow roadmap` aliases kept when cheap.
- request-AC9 -> This backlog slice. Evidence needed: Task closeout or flow validation surfaces stale/missing roadmap placement as a non-blocking recommendation when roadmap docs exist, without making roadmap mandatory for repos that do not use it.
- request-AC10 -> This backlog slice. Evidence needed: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.
- request-AC2 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
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
- Summary: Harden release evidence help and examples
- Keywords: scaffolded-backlog, harden release evidence help and examples, implementation-ready
- Use when: Implementing the scaffolded slice for Harden release evidence help and examples.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_294_orchestrate_logics_operator_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-07-28.
