## item_881_restore_fleet_discovery_roots_and_existing_favorites_on_reopen - Restore Fleet discovery roots and existing favorites on reopen
> From version: 2.23.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 80%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:05:22

# AI Context
- Summary: Projects and favorites disappear on reopen, but resetting the discovery root to Documents restores both; F5 narrows the issue to restoration/discovery rather than proven favorite deletion.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
Projects and favorites disappear on reopen, but resetting the discovery root to Documents restores both; F5 narrows the issue to restoration/discovery rather than proven favorite deletion.

# Scope
- In: Reproduce under an isolated LOGICS_VIEWER_PREFERENCES_HOME. Trace fleetRoots persistence, startup fleet capability/landing mode, discovery and project identity. Preserve the existing operator-scoped preferences store.
- Out: Do not recreate favorites, scan the entire filesystem or migrate storage without a demonstrated cause.

# Acceptance criteria
- AC6: After selecting a Fleet project-discovery root, discovering existing projects and marking favorites, reopening the viewer with `logics-manager view` restores that root, those projects and their favorite markers without manually resetting the root or re-entering favorites. Verify browser reopening and viewer-process restart separately under the same operator profile, with a focused persistence check and browser evidence.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: After selecting a Fleet project-discovery root, discovering existing projects and marking favorites, reopening the viewer with `logics-manager view` restores that root, those projects and their favorite markers without manually resetting the root or re-entering favorites. Verify browser reopening and viewer-process restart separately under the same operator profile, with a focused persistence check and browser evidence.

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
- Request: `logics/request/req_387_review_findings_literal_git_paths_repair_input_validation_and_update_cache_resilience.md`
- Primary task(s): `task_399_deliver_the_repository_review_fixes_and_viewer_followups`

# Priority
- Priority: Medium
- Rationale: Restore daily viewer reliability after the confirmed mutation defects.

# Notes
- Entry point: `logics_manager/viewer_preferences.py`. Read its callers before choosing the smallest fix.
- Validation: Extend tests/python/test_viewer_preferences.py and tests/python/test_fleet_cli.py as needed. Verify root and favorites after browser reopen and server restart under the same profile, including a changed port and launch directory; record browser proof. Confirm missing directories are handled without erasing valid saved roots.
- Dependencies and order: After High items. Complete the restoration contract before final root-picker UX validation; initial reproduction can precede item_880.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
