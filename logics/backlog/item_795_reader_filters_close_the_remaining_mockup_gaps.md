## item_795_reader_filters_close_the_remaining_mockup_gaps - Reader/filters: close the remaining mockup gaps
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:56

# AI Context
- Summary: The new-request modal and the filter panel's core bugs are already fixed; this slice closes the reader's breadcrumb wording and the filter panel's remaining control-shape gaps.
- Keywords: reader breadcrumb, linked workflow layout, group sort segmented control, clear filters dimming
- Use when: Implementing this backlog item.
- Skip when: Any other screen family.

# Problem
The mockup review found the new-request modal and the filter panel's "four identical readings" bug already fixed, with these gaps remaining:
- Reader: the full slug is still shown as a breadcrumb instead of the short ref (e.g. R357) the mockup proposes.
- Reader: "Linked workflow" renders as a full-width diagram block above the content instead of integrated into the left column beside the table of contents — flagged as a design call, not an automatic fix.
- Filters: `Group`/`Sort` are still `<select>` dropdowns, not the segmented control (Type | Status | Theme | None) the mockup proposes.
- Filters: `Clear filters` always renders solid blue instead of dimming when nothing is active to clear.

# Scope
- In: the breadcrumb shortening, the Group/Sort segmented control, and the Clear filters dimming.
- Out: the "Linked workflow" placement — needs a design decision on whether the diagram-block treatment is an acceptable, intentionally richer alternative to the mockup's stacked-list layout before any code changes; do not change it as part of this slice without that decision.

# Acceptance criteria
- AC1: The reader shows a short ref (e.g. R357) instead of the full document slug as its breadcrumb.
- AC2: Filters' `Group`/`Sort` render as a segmented control (Type | Status | Theme | None), not `<select>` dropdowns.
- AC3: `Clear filters` dims to roughly 50% opacity when no filter is currently active.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: Each of the per-screen findings listed under Workshop/CDX, Reader/modal/filters, Remote/Settings, and Insights/Health/Onboarding above is either resolved to match its mockup's "Proposed" design, or explicitly deferred with a stated reason (e.g. a state genuinely unreachable in this corpus, or a deliberate design deviation from the mockup).

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: Low
- Rationale: Small, contained fixes on a screen whose major bugs are already resolved.

# Tasks
- `task_366_reader_filters_close_the_remaining_mockup_gaps`

# Notes
- Task `task_366_reader_filters_close_the_remaining_mockup_gaps` was finished via `logics-manager flow finish task` on 2026-08-15.
