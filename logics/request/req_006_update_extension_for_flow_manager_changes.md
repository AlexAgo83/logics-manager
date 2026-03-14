## req_006_update_extension_for_flow_manager_changes - Update extension for flow manager changes
> From version: 1.9.1
> Status: Done
> Understanding: 99% (audit-aligned)
> Confidence: 96% (governed)
> Complexity: Medium
> Theme: Workflow
> Reminder: Update Understanding/Confidence and dependencies/references when you edit this doc.

# Needs
- Align the VS Code extension with the updated Logics skills kit (especially the flow manager).
- Keep New Request and Promote flows working with the latest scripts/templates.
- Confirm error handling still points to the correct scripts/paths.
- Verify the extension invokes valid flow manager commands/flags and matches the latest CLI behavior.
- Validate template placeholders and decide whether the extension should prefill any metadata.
- Add a compatibility check for required scripts and a clear user-facing error when missing.
- Define a minimal smoke-test checklist for request creation and promotion flows.
- Decide and document the minimum supported Logics kit version for this update.
- Bump the extension version once compatibility is confirmed.

# Context
- The `logics/skills` submodule was updated with significant flow manager changes.
- The extension shells out to the flow manager scripts for request creation and promotion.
- We need to ensure the updated kit is compatible without breaking existing Logics docs.
- The highest risk areas are CLI changes (flags/commands), template output format, and required indicators.
- We should explicitly validate `new`, `promote request-to-backlog`, and `promote backlog-to-task` flows.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries are explicit enough for delivery.
- [x] Acceptance direction is clear enough to start delivery.
- [x] Dependencies and known constraints are captured where relevant.

# Backlog
- `logics/backlog/item_006_update_extension_for_flow_manager_changes.md`
