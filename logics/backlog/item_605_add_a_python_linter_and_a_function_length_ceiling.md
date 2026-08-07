## item_605_add_a_python_linter_and_a_function_length_ceiling - Add a Python linter and a function-length ceiling
> From version: 2.19.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Static guardrails
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Roughly twenty-seven thousand lines of Python have no linter, while the JavaScript linter covers only the editor extension sources.
- A minimal static pass found no bare exception handlers but seventeen functions longer than a hundred and twenty lines, the largest a request handler at nearly five hundred. Nothing prevents the next one.

# Scope
- In:
  - Add a Python linter as a development dependency, with a rule set the current codebase passes: unused names, undefined names, and import ordering.
  - Add a function-length ceiling that fails on a new violation while grandfathering the existing ones explicitly rather than silently.
  - Run the linter in continuous integration alongside the existing checks.
  - Record the grandfathered functions so the debt is visible rather than invisible.
- Out:
  - Static type checking.
  - Rewriting the existing long functions.
  - Reformatting the codebase.
  - Rule sets that would require touching unrelated files to pass.

# Acceptance criteria
- AC1: The linter runs in continuous integration and passes on the current codebase without code changes beyond configuration.
- AC2: A new function above the ceiling fails the build.
- AC3: The grandfathered functions are listed explicitly, not suppressed silently.
- AC4: A deliberately introduced violation is demonstrated to fail, then removed.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: The linter runs in continuous integration and passes on the current codebase without code changes beyond configuration.
- request-AC5 -> This backlog slice. Proof: AC2: A new function above the ceiling fails the build.
- request-AC8 -> This backlog slice. Proof: AC3: The grandfathered functions are listed explicitly, not suppressed silently.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Primary task(s): `task_303_orchestrate_the_repository_review_remediation`

# AI Context
- Summary: Add a Python linter and a function-length ceiling
- Keywords: scaffolded-backlog, add a python linter and a function-length ceiling, implementation-ready
- Use when: Implementing the scaffolded slice for Add a Python linter and a function-length ceiling.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the missing guardrail behind the other findings
- Rationale: Set by scaffold input or defaulted for grooming.
