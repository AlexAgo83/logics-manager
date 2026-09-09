## item_880_synchronize_the_surface_selector_after_adding_a_project - Synchronize the surface selector after adding a project
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
- Summary: After adding a project from Project, Activity content appears but the surface selector looks stale; F4 is operator-reported.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
After adding a project from Project, Activity content appears but the surface selector looks stale; F4 is operator-reported.

# Scope
- In: Reproduce project addition and trace setViewerSurface, returnToProjectSurface, payload application and tab state. Synchronize displayed surface, CSS active state and aria-selected through the existing state path.
- Out: Do not change the accepted return to Activity or redesign navigation.

# Acceptance criteria
- AC5: Starting from Project and adding a project may return the viewer to Activity, but the Activity / Project / Review selector immediately highlights Activity. Subsequent selections display and highlight the same surface. Verify this scenario in the browser; code-only checks are insufficient visual proof.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: Starting from Project and adding a project may return the viewer to Activity, but the Activity / Project / Review selector immediately highlights Activity. Subsequent selections display and highlight the same surface. Verify this scenario in the browser; code-only checks are insufficient visual proof.

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
- Validation: Add a focused browser-host regression and capture browser evidence for Project -> add project -> Activity. Verify exactly one active/aria-selected tab and subsequent Activity/Project/Review transitions, including keyboard operation.
- Dependencies and order: Independent. Inspect shared index.js interactions before the Review and root-picker slices.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.
- Task `task_399_deliver_the_repository_review_fixes_and_viewer_followups` was finished via `logics-manager flow finish task` on 2026-09-09.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
