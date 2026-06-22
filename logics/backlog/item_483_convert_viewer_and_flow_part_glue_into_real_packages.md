## item_483_convert_viewer_and_flow_part_glue_into_real_packages - Convert viewer and flow part-glue into real packages
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Python decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- viewer.py exec-glues 16 themed viewer_parts files and flow/__init__.py exec-glues its parts; both are already cohesive by theme but still non-importable.

# Scope
- In:
  - Turn viewer_parts and the flow parts into importable submodules of a viewer/ and flow/ package with a thin re-export facade
  - Replace each exec(compile) loader with explicit imports
  - Preserve payload shapes and CLI behavior byte-for-byte
- Out:
  - The numbered-part modules (handled by the sibling slice)
  - Changing viewer payload schemas or flow command behavior

# Acceptance criteria
- AC1: viewer and flow are imported normally with no exec(compile).
- AC2: logics_manager.viewer and logics_manager.flow resolve unchanged.
- AC3: viewer and flow pytest suites pass unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: viewer and flow are imported normally with no exec(compile).
- request-AC2 -> This backlog slice. Proof: AC2: logics_manager.viewer and logics_manager.flow resolve unchanged.
- request-AC6 -> This backlog slice. Proof: AC3: viewer and flow pytest suites pass unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)
- Request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Primary task(s): `task_270_orchestrate_the_exec_part_glue_remediation`

# AI Context
- Summary: Convert viewer and flow part-glue into real packages
- Keywords: scaffolded-backlog, convert viewer and flow part-glue into real packages, implementation-ready
- Use when: Implementing the scaffolded slice for Convert viewer and flow part-glue into real packages.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
