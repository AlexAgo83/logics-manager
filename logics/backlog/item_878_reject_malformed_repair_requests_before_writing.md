## item_878_reject_malformed_repair_requests_before_writing - Reject malformed repair requests before writing
> From version: 2.23.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 80%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:16:14

# AI Context
- Summary: Malformed JSON in a preview request invokes real document repair; F2 is reproduced with a temporary corpus.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
Malformed JSON in a preview request invokes real document repair; F2 is reproduced with a temporary corpus.

# Scope
- In: Trace the repair POST route and shared JSON readers. Reject invalid lengths, encoding, JSON, object shape and preview types before audit mutation. Preserve valid preview and apply behavior.
- Out: No broad HTTP server rewrite or changes to the audit repair rules.

# Acceptance criteria
- AC2: Malformed repair JSON, invalid Content-Length and non-object bodies return a client error without changing any document; valid preview remains read-only and valid apply still repairs.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: Malformed repair JSON, invalid Content-Length and non-object bodies return a client error without changing any document; valid preview remains read-only and valid apply still repairs.

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
- Priority: High
- Rationale: Prevent writes beyond the operator intent; reproduced before implementation.

# Notes
- Entry point: `logics_manager/viewer.py`. Read its callers before choosing the smallest fix.
- Validation: Exercise the HTTP route with malformed JSON, invalid Content-Length, non-object bodies and invalid preview types; assert a client error and byte-identical corpus. Also assert valid preview is read-only and valid apply changes the intended document. Use tests/python/test_viewer_cli.py.
- Dependencies and order: Independent. Deliver alongside item_877 before the Medium items.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
