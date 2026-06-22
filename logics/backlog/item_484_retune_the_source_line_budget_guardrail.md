## item_484_retune_the_source_line_budget_guardrail - Retune the source line-budget guardrail
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Build tooling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The 1000-line budget in check-source-line-budget.mjs pushed contributors toward exec text-glue instead of importable decomposition, and nothing verifies tracebacks resolve to real files.

# Scope
- In:
  - Adjust the budget (raise the limit and/or grant per-package allowances) so importable decomposition does not require text-glue
  - Add a small test asserting a traceback from a remediated module points at the real source file and line
  - Keep CI failing on genuinely new monoliths
- Out:
  - The actual module decomposition (handled by sibling slices)
  - Adopting any new tooling or dependency

# Acceptance criteria
- AC1: The line-budget check passes on the remediated tree and still fails on a new oversized file.
- AC2: A test asserts tracebacks from the remediated modules reference real source files.
- AC3: logics-manager lint and audit pass on the resulting corpus and code.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The line-budget check passes on the remediated tree and still fails on a new oversized file.
- request-AC5 -> This backlog slice. Proof: AC2: A test asserts tracebacks from the remediated modules reference real source files.
- request-AC7 -> This backlog slice. Proof: AC3: logics-manager lint and audit pass on the resulting corpus and code.
- request-AC8 -> This backlog slice. Proof: AC3: logics-manager lint and audit pass on the resulting corpus and code.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)
- Request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Primary task(s): `task_270_orchestrate_the_exec_part_glue_remediation`

# AI Context
- Summary: Retune the source line-budget guardrail
- Keywords: scaffolded-backlog, retune the source line-budget guardrail, implementation-ready
- Use when: Implementing the scaffolded slice for Retune the source line-budget guardrail.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
