## item_006_update_extension_for_flow_manager_changes - Update extension for flow manager changes
> From version: 1.0.5
> Understanding: 85%
> Confidence: 80%
> Progress: 0%
> Complexity: Medium
> Theme: Workflow
> Reminder: Update Understanding/Confidence/Progress and dependencies/references when you edit this doc. When you update backlog indicators, review and update any linked tasks as well.

# Problem
The extension can break or mis-handle Logics request creation and promotion if the updated flow manager scripts, CLI flags, or templates changed their behavior or required inputs.

# Scope
- In:
- Diff and verify flow manager scripts/templates and CLI usage (`new`, `promote request-to-backlog`, `promote backlog-to-task`).
- Update extension invocations/arguments to match the latest flow manager behavior.
- Validate placeholder/indicator outputs and decide if the extension should prefill metadata.
- Ensure New Request and Promote flows still create/update Logics docs correctly.
- Add a compatibility check for required scripts and clear error messaging when missing.
- Define a minimal smoke-test checklist and update README if needed.
- Out:
- Changing the Logics workflow itself or the skills kit implementation.
- Refactoring unrelated UI or data rendering.

# Acceptance criteria
- New Request uses the updated flow manager scripts and creates a valid request doc.
- Promote Request -> Backlog works and links request/backlog correctly.
- Promote Backlog -> Task (if used by the extension) still works.
- Extension CLI invocations match the updated flow manager usage/flags.
- Placeholders/indicators in generated docs are handled (left as templates or prefilled intentionally).
- Missing/invalid scripts surface clear, actionable errors.
- No regressions in existing Logics doc parsing or view rendering.
- README notes the minimum supported Logics kit version and smoke-test steps (if needed).

# Priority
- Impact:
- Prevents broken core workflows (request creation/promote) after submodule updates.
- Urgency:
- High if teams are already pulling the updated skills kit.

# Notes
- Derived from `logics/request/req_006_update_extension_for_flow_manager_changes.md`.
- Suggested validations: create request, promote to backlog, promote to task, refresh board/details.

# Tasks
- `logics/tasks/task_010_update_extension_for_flow_manager_changes.md`
