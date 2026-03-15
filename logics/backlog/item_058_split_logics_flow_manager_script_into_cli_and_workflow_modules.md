## item_058_split_logics_flow_manager_script_into_cli_and_workflow_modules - Split logics flow manager script into CLI and workflow modules
> From version: 1.10.0
> Status: Proposed
> Understanding: 97%
> Confidence: 95%
> Progress: 0%
> Complexity: Medium
> Theme: Skill script modularity and workflow orchestration clarity
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
[logics_flow.py](/Users/alexandreagostini/Documents/cdx-logics-vscode/logics/skills/logics-flow-manager/scripts/logics_flow.py) is large enough that CLI parsing, workflow orchestration, filesystem operations, and reporting/output concerns are at risk of blending together.

That makes the skill harder to evolve safely and increases the chance that one workflow change affects unrelated execution or reporting logic.

# Scope
- In:
  - Keep a clear CLI entrypoint for the skill.
  - Extract coherent modules for CLI parsing/config, workflow orchestration, file operations/helpers, and reporting/output as appropriate.
  - Make implicit global coupling more explicit where needed before splitting.
  - Preserve current command-line behavior and outputs.
- Out:
  - Changing the user-facing skill workflow.
  - Rewriting the skill around a different execution model.
  - Splitting into many tiny Python files with unclear boundaries.

# Acceptance criteria
- AC1: The main `logics_flow.py` entry becomes materially smaller and more CLI-entry focused.
- AC2: Workflow orchestration, file operations, and reporting concerns are easier to locate and reason about.
- AC3: The split does not change current behavior or expected outputs.
- AC4: The resulting Python module layout remains discoverable for future maintenance.

# Priority
- Impact:
  - Medium: valuable for maintainability of a substantial skill script.
- Urgency:
  - Medium-Low: important, but less immediately blocking than the plugin host/webview splits.

# Notes
- Derived from `logics/request/req_050_split_oversized_source_files_into_coherent_modules.md`.
- Prefer a small number of purposeful modules over a highly granular package layout.
- Hidden coupling through globals or implicit context should be made explicit if it blocks a clean split.

# Tasks
- `logics/tasks/task_063_split_logics_flow_manager_script_into_cli_and_workflow_modules.md`
