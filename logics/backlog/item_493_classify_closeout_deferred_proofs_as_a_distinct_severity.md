## item_493_classify_closeout_deferred_proofs_as_a_distinct_severity - Classify closeout-deferred proofs as a distinct severity
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
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
