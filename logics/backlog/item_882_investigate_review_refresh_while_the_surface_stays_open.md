## item_882_investigate_review_refresh_while_the_surface_stays_open - Investigate Review refresh while the surface stays open
> From version: 2.23.0
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 65%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:05:23

# AI Context
- Summary: Review may refresh only when left and reopened; F6 is explicitly uncertain and requires investigation first.
- Keywords: req_387, viewer, review, validation
- Use when: Implementing or investigating this bounded slice.
- Skip when: Working on unrelated review findings.

# Problem
Review may refresh only when left and reopened; F6 is explicitly uncertain and requires investigation first.

# Scope
- In: Record refresh settings, active project and a relevant repository change with Review left open. Trace showReviewTimeline, refreshGitBadgeCounters, polling/invalidation and surface activation. If a defect is confirmed, repair the existing refresh path.
- Out: No speculative polling loop, refresh scheduler or automatic claim that the bug exists. A documented refutation is a valid outcome.

# Acceptance criteria
- AC7: Confirm or refute F6 with a browser reproduction that records a relevant repository change, the configured refresh interval and Review content before and after reopening. If confirmed, demonstrate that the content refreshes while Review stays open; otherwise document the observed behavior and why no fix is needed.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: Confirm or refute F6 with a browser reproduction that records a relevant repository change, the configured refresh interval and Review content before and after reopening. If confirmed, demonstrate that the content refreshes while Review stays open; otherwise document the observed behavior and why no fix is needed.

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
- Entry point: `clients/viewer/src/browser-host/git.js`. Read its callers before choosing the smallest fix.
- Validation: Use browser evidence before/after a new commit and a worktree change, identifying which data Review is meant to display. Wait the configured interval, compare before/after reopening and inspect requests. If fixed, add a focused regression proving an open Review updates without redundant polling or project mixing.
- Dependencies and order: After High items and coordinate with item_880 on shared surface state. Decide confirmed defect versus expected behavior before implementation.
- Evidence state: see the corresponding F finding in req_387; prior suite passes are baseline evidence, not proof of this future fix.
- Documentation: update the affected product/CLI documentation if its user-visible contract changes, and record evidence in task_399.

# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
