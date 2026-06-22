## item_482_reunite_numbered_part_python_modules_into_importable_code - Reunite numbered-part Python modules into importable code
> From version: 2.12.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Python decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- mcp, sync, audit, release, and assist_support are assembled from _01.._04 fragments by exec(compile), so the parts are not importable and tooling is blind to them.

# Scope
- In:
  - For each module, replace the exec loader with either a single importable module or a package whose submodules are split by responsibility, not by line count
  - Keep a thin facade re-exporting the existing public API so import paths stay stable
  - Delete the *_parts/_01.._04.py fragments and the exec loader once content is migrated
- Out:
  - viewer and flow (handled by sibling slices)
  - Behavior or public API changes

# Acceptance criteria
- AC1: None of these five modules uses exec(compile); each is imported normally.
- AC2: logics_manager.mcp/.sync/.audit/.release/.assist_support resolve unchanged.
- AC3: The _01.._04 fragments are removed; their pytest suites pass unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: None of these five modules uses exec(compile); each is imported normally.
- request-AC2 -> This backlog slice. Proof: AC2: logics_manager.mcp/.sync/.audit/.release/.assist_support resolve unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: The _01.._04 fragments are removed; their pytest suites pass unchanged.
- request-AC6 -> This backlog slice. Proof: AC3: The _01.._04 fragments are removed; their pytest suites pass unchanged.
- request-AC4 -> This backlog slice. Proof: Tracebacks raised from these modules reference the real source file and line, verified by a test.
- request-AC5 -> This backlog slice. Proof: scripts/check-source-line-budget.mjs is retuned (raised limit or per-package allowance) so importable decomposition no longer requires text-glue, and CI still fails on genuine new monoliths.
- request-AC7 -> This backlog slice. Proof: The full pytest and vitest suites pass unchanged with no behavior regressions.
- request-AC8 -> This backlog slice. Proof: logics-manager lint and audit pass on the resulting workflow corpus and code.
- request-AC9 -> This backlog slice. Proof: The frontend mirror of the part-glue (browser-host, render-board-app, main-app) is replaced by real ES modules imported directly by index.js; the regex string-manifests and readFileSync(...).join("") concatenation are removed, modules split by responsibility, and bundled artifacts stay byte-stable.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)
- Request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Primary task(s): `task_270_orchestrate_the_exec_part_glue_remediation`

# AI Context
- Summary: Reunite numbered-part Python modules into importable code
- Keywords: scaffolded-backlog, reunite numbered-part python modules into importable code, implementation-ready
- Use when: Implementing the scaffolded slice for Reunite numbered-part Python modules into importable code.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium

# Notes
- Done: mcp/sync/audit/release/assist_support merged from _01.._0N parts into single importable modules; *_parts dirs removed; exec loaders gone. 395 pytest pass.
- Task `task_270_orchestrate_the_exec_part_glue_remediation` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_270_orchestrate_the_exec_part_glue_remediation`
