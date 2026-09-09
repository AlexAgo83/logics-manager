## item_883_clarify_the_fleet_root_selection_experience - Clarify Fleet root and project folder selection
> From version: 2.23.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 80%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:39:27

# AI Context
- Summary: The supplied Choose fleet root and Choose project folder screenshots show technical fallback copy, hidden-folder clutter and unclear Select/Cancel/Close roles; F7 is a usability request.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
The supplied Choose fleet root and Choose project folder screenshots show technical fallback copy, hidden-folder clutter and unclear Select/Cancel/Close roles; F7 is a usability request.

# Scope
- In: Improve purpose copy, current-folder location, browse-versus-select affordances and dismissal actions in both Fleet root and individual project selection using their existing shared fallback picker. Explain that a Fleet root supplies project subfolders while project selection opens one project. Decide hidden-folder presentation while retaining access.
- Out: No new picker dependency, full viewer redesign or forced removal of the native picker. Both pickers are explicitly in scope; preserve their distinct selection effects.

# Acceptance criteria
- AC8: In both the Fleet root picker and the project-folder picker, the operator can understand the purpose of the selected folder, browse, confirm or cancel without unintended changes. Distinguish a discovery root from an individual project, with consistent navigation and purpose-specific confirmation copy. Validate both fallback flows visually, including keyboard navigation, focus and constrained viewports; cancellation leaves the active project and Fleet roots unchanged.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC8: In both the Fleet root picker and the project-folder picker, the operator can understand the purpose of the selected folder, browse, confirm or cancel without unintended changes. Distinguish a discovery root from an individual project, with consistent navigation and purpose-specific confirmation copy. Validate both fallback flows visually, including keyboard navigation, focus and constrained viewports; cancellation leaves the active project and Fleet roots unchanged.

# Decision framing
- Product framing: Covered by the linked shared product brief
- Product signals: Operator-visible behavior and review acceptance criteria.
- Product follow-up: Keep the shared brief aligned with delivered behavior.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): `prod_116_trustworthy_viewer_actions_and_persistent_project_navigation`
- Architecture decision(s): (none yet)
- Request: `req_387_review_findings_literal_git_paths_repair_input_validation_and_update_cache_resilience`
- Primary task(s): `task_399_deliver_the_repository_review_fixes_and_viewer_followups`

# Priority
- Priority: Medium
- Rationale: Restore daily viewer reliability after the confirmed mutation defects.

# Notes
- Entry point: `clients/viewer/src/browser-host/index.js`. Read its callers before choosing the smallest fix.
- Validation: Check the existing i18n contract before copy changes. Verify both fallback flows: selection, parent navigation, cancellation without mutation, keyboard/focus behavior and a constrained viewport in the browser; include focused existing browser-host checks and visual evidence.
- Dependencies and order: Finalize after item_881 so UX reflects the restored root contract. Coordinate with item_880 where shared index.js code is touched.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.
- Task `task_399_deliver_the_repository_review_fixes_and_viewer_followups` was finished via `logics-manager flow finish task` on 2026-09-09.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`

# Preparation note
- i18n status during corpus preparation: absent. Decide and record source-locale adoption through the existing i18n workflow before changing user-facing copy; do not introduce a separate translation mechanism.
