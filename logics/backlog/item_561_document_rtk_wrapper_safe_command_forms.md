## item_561_document_rtk_wrapper_safe_command_forms - Document RTK wrapper-safe command forms
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Assistant instructions
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The wrapper is preferred for noisy commands, but some one-off command forms such as `npx` can change semantics when wrapped naively.

# Scope
- In:
  - Update `RTK.md` with a small wrapper-safe table: npm scripts, targeted Vitest, raw one-off commands, exact-output commands.
  - Update generated assistant instructions or bridge output so agents see the same caveat without opening RTK.md.
  - Add a test that asserts the generated instruction text includes the targeted Vitest safe form.
- Out:
  - Changing RTK itself.
  - Cataloging every possible shell command.

# Acceptance criteria
- AC1: `RTK.md` documents `rtk npm exec -- vitest ...` as the safe targeted Vitest form.
- AC2: Generated assistant instructions mention using raw commands when exact one-off semantics matter.
- AC3: A test asserts the wrapper caveat appears in generated instructions.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: `RTK.md` documents `rtk npm exec -- vitest ...` as the safe targeted Vitest form.
- request-AC2 -> This backlog slice. Evidence needed: Workflow status inputs accept common aliases such as `In Progress`, `in_progress`, and `in progress`, then persist the canonical status label.
- request-AC3 -> This backlog slice. Evidence needed: `release evidence add --help` shows help successfully, and evidence-add argument errors include a complete example command for the target gate.
- request-AC4 -> This backlog slice. Evidence needed: `ci:check` runs a cheap metadata-vs-subpackages packaging check, and `doctor packaging` / release validation can run a clean-wheel install check for critical CLI commands.
- request-AC6 -> This backlog slice. Evidence needed: An assistant-facing command can read `cdx memory` current/global scopes as JSON, clean ANSI/TUI noise, summarize quality signals, and emit a bounded context payload without directly depending on raw `.cdx/contexts` paths.
- request-AC7 -> This backlog slice. Evidence needed: The viewer exposes a CDX Memory sub-screen that reuses the cleaned memory payload, highlights quality warnings, and gives read-only access to current/global scopes.
- request-AC8 -> This backlog slice. Evidence needed: Top-level roadmap commands expose practical status and placement flows, with `flow roadmap` aliases kept when cheap.
- request-AC9 -> This backlog slice. Evidence needed: Task closeout or flow validation surfaces stale/missing roadmap placement as a non-blocking recommendation when roadmap docs exist, without making roadmap mandatory for repos that do not use it.
- request-AC10 -> This backlog slice. Evidence needed: Focused Python and TypeScript tests cover the changed CLI behavior, memory cleaning, viewer memory screen, packaging verification, and roadmap status/place behavior.
- request-AC2 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC3 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
- request-AC4 -> This backlog slice. Proof: Implemented status alias normalization, copy-paste-safe remediation/help, release evidence help examples, packaging doctor metadata checks, RTK documentation, shared CDX memory payload, and roadmap status/place CLI. Validation: npm run ci:check passed. Source: `task_294_orchestrate_logics_operator_ergonomics_improvements`
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
- Summary: Document RTK wrapper-safe command forms
- Keywords: scaffolded-backlog, document rtk wrapper-safe command forms, implementation-ready
- Use when: Implementing the scaffolded slice for Document RTK wrapper-safe command forms.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_294_orchestrate_logics_operator_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-07-28.
