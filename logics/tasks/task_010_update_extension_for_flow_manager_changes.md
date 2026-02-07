## task_010_update_extension_for_flow_manager_changes - Update extension for flow manager changes
> From version: 1.0.5
> Understanding: 85%
> Confidence: 80%
> Progress: 40%
> Complexity: Medium
> Theme: Workflow
> Reminder: Update Understanding/Confidence/Progress and dependencies/references when you edit this doc.

# Context
Derived from `logics/backlog/item_006_update_extension_for_flow_manager_changes.md`.
Align extension flow-manager invocations and UX with the latest Logics skills kit.

# Plan
- [x] 1. Inspect flow manager changes (scripts, CLI usage, templates, placeholders) and note required updates.
- [x] 2. Review extension invocations for New Request and Promote flows; update commands/args to match.
- [x] 3. Update script-path checks and error messaging if names/locations changed.
- [x] 4. Confirm placeholders/indicators handling is intentional (prefill vs leave templates).
- [ ] 5. Run manual smoke test: new request, promote to backlog, promote to task, refresh board/details.
- [ ] 6. Update README with minimum supported Logics kit version and smoke-test checklist if needed.
- [ ] FINAL: Update backlog/request indicators and report outcome.

# Validation
- Automated: `npm run compile`
- Manual: New Request creates a valid request doc.
- Manual: Promote Request -> Backlog links both docs correctly.
- Manual: Promote Backlog -> Task (if used) creates a valid task doc.
- Manual: Error messaging is clear when scripts are missing or fail.
- Manual: Refresh preserves correct board/details data.

# Report
Updated the extension to use the flow manager script for all create actions (request/backlog/task), added consistent script-path checks and clearer error messaging, and kept indicator parsing compatible with new templates (Complexity/Theme/Reminder). Build passes via `npm run compile`.
