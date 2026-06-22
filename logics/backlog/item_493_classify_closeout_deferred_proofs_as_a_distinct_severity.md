## item_493_classify_closeout_deferred_proofs_as_a_distinct_severity - Classify closeout-deferred proofs as a distinct severity
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Diagnostics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Task-closeout-deferred proofs are reported as 'fixable', so a freshly scaffolded request looks like it has actionable problems.

# Scope
- In:
  - Introduce a deferred/info severity for closeout-deferred traceability proofs, separate from fixable
  - Exclude deferred items from --fixable and from the blocking/actionable count
  - Render a fresh scaffold as clean while still listing deferred items as informational
- Out:
  - Removing the closeout traceability requirement
  - Changing closeout-time validation

# Acceptance criteria
- AC1: A freshly scaffolded request validates with zero actionable findings.
- AC2: Deferred proofs appear under the new severity and not under --fixable.
- AC3: A test covers the reclassification.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A freshly scaffolded request validates with zero actionable findings.
- request-AC9 -> This backlog slice. Proof: AC2: Deferred proofs appear under the new severity and not under --fixable.
- request-AC3 -> This backlog slice. Proof: Malformed scaffold input produces a precise validation error naming the offending key/type and is covered by a test.
- request-AC4 -> This backlog slice. Proof: Blocking lint/validate messages that have a deterministic remedy name the remedy command (e.g. sync update-indicators) in their text.
- request-AC6 -> This backlog slice. Proof: flow scaffold request-chain --validate runs validation inline and prints a ready-to-dev summary, reusing the existing validate path.
- request-AC7 -> This backlog slice. Proof: No new runtime dependency is added; new behavior reuses existing scaffold/validate/lint code paths.
- request-AC8 -> This backlog slice. Proof: The full pytest and vitest suites pass, with coverage for the MCP scaffold tool, schema/example output, input validation, and the severity reclassification.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_029_assistant_authoring_ergonomics`
- Architecture decision(s): (none yet)
- Request: `req_276_improve_logics_manager_authoring_ergonomics_for_ai_assistants`
- Primary task(s): `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`

# AI Context
- Summary: Classify closeout-deferred proofs as a distinct severity
- Keywords: scaffolded-backlog, classify closeout-deferred proofs as a distinct severity, implementation-ready
- Use when: Implementing the scaffolded slice for Classify closeout-deferred proofs as a distinct severity.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done: deferred AC-traceability proofs reclassified to category 'deferred' (fixable=False) in _validate_finding; added deferred_count. Fresh scaffolds validate clean.
- Task `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_273_orchestrate_the_assistant_authoring_ergonomics_improvements`
