## item_879_recover_safely_from_invalid_update_caches - Recover safely from invalid update caches
> From version: 2.23.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:39:27

# AI Context
- Summary: A cache array or nonnumeric checked_at causes an uncaught exception; F3 is reproduced.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
A cache array or nonnumeric checked_at causes an uncaught exception; F3 is reproduced.

# Scope
- In: Validate optional update-cache shape and timestamp before using them; reuse the cache-miss fallback. Trace CLI interactive notice and viewer payload callers.
- Out: No replacement cache framework, new storage layer or unrelated version-comparison changes.

# Acceptance criteria
- AC3: Invalid cache shapes and timestamps do not crash update checks, interactive command dispatch or viewer update payloads; valid cache hits retain their existing behavior.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC3: Invalid cache shapes and timestamps do not crash update checks, interactive command dispatch or viewer update payloads; valid cache hits retain their existing behavior.

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
- Entry point: `logics_manager/update_check.py`. Read its callers before choosing the smallest fix.
- Validation: Extend tests/python/test_cli_main.py with array/null caches, invalid timestamps and a valid cache hit. Assert fallback fetch behavior and that interactive dispatch/viewer update payload remain usable without real network access.
- Dependencies and order: Independent of the navigation slices; execute after the High items.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.
- Task `task_399_deliver_the_repository_review_fixes_and_viewer_followups` was finished via `logics-manager flow finish task` on 2026-09-09.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
