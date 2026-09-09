## item_884_contain_grouped_recent_activity_within_the_viewport - Contain grouped Recent Activity within the viewport
> From version: 2.23.0
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 80%
> Progress: 80%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 12:16:14

# AI Context
- Summary: Grouped Recent Activity appears to overflow the viewport; trace the row and its ancestors before fixing the width constraint.
- Keywords: activity, chain, overflow, layout, viewport
- Use when: Reproducing and fixing F8.
- Skip when: Changing grouping semantics or unrelated screens.

# Problem
The operator reports horizontal overflow when an X documents in one chain group appears. The screenshot shows the row reaching beyond the available right edge; root cause is not yet established.

# Scope
- In: collapsed/expanded chain rows, long titles, child entries and the ancestor width constraints responsible for overflow.
- Out: changing grouping semantics, global overflow clipping, new layout dependencies or unrelated activity redesign.

# Acceptance criteria
- AC9: With grouped Recent Activity entries and long chain titles, collapsed and expanded content stays within the available view width at desktop and constrained viewports, without page-level horizontal overflow or clipped controls. Verify DOM width measurements, keyboard expansion and browser screenshots; establish whether the group or an ancestor causes the defect.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC9: With grouped Recent Activity entries and long chain titles, collapsed and expanded content stays within the available view width at desktop and constrained viewports, without page-level horizontal overflow or clipped controls. Verify DOM width measurements, keyboard expansion and browser screenshots; establish whether the group or an ancestor causes the defect.

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
- Rationale: Visible daily navigation defect; schedule after the High mutation-safety fixes.

# Notes
- Entry points: `clients/shared-web/media/webviewChrome.js` and `clients/shared-web/media/css/toolbar.css`; inspect computed widths through the flex/grid ancestors.
- Validation: reproduce using a long chain title and expanded children at desktop and narrow viewports. Compare scrollWidth/clientWidth for the document and activity container, capture browser screenshots and verify keyboard expansion. Preserve access to the full title if truncating.
- Add a focused regression using the existing webview layout/browser harness; no code-only assertion substitutes for visual proof.
- Dependencies: coordinate with item_880 on the containing Activity surface; no dependency on the root picker. Reuse the smallest existing CSS constraint that fixes the measured cause.


# Tasks
- `task_399_deliver_the_repository_review_fixes_and_viewer_followups`
