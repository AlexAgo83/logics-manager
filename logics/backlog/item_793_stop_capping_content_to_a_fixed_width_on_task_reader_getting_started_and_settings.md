## item_793_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings - Stop capping content to a fixed width on task/reader, Getting Started, and Settings
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:40:22

# AI Context
- Summary: Several screens cap content to a fixed width instead of using available space — on a task/reader screen this pushes the side menu to the right instead of the left; on Getting Started it leaves a dead column on the right of every stage card.
- Keywords: fixed width layout, fluid layout, reader side panel, getting started dead column, settings width
- Use when: Implementing this backlog item.
- Skip when: Any content/copy change on these screens — this is layout width only.

# Problem
Reported directly by the operator and independently corroborated by the mockup review: a task/reader screen, Getting Started, and Settings all cap their content to a fixed width instead of letting it use the available viewport. On a task/reader screen this pushes the side menu/TOC to the right instead of the left, with content that should fill the remaining width. On Getting Started, the review independently found a wide column (roughly x≈980–1420 at 1440px) staying empty behind every stage card — the same defect from a different angle.

# Scope
- In:
  - Remove the fixed-width cap on the task/reader screen's layout so the side menu/TOC renders on the left and content fills the remaining width.
  - Remove or widen the fixed-width cap on Getting Started's stage cards so they use the full available width instead of leaving a dead right-hand column.
  - Remove the fixed-width cap on Settings' layout.
- Out:
  - Any change to the reading-measure cap already correctly applied to prose text within the reader (that's a deliberate, approved constraint, not this bug).
  - Any content or copy change on these screens.

# Acceptance criteria
- AC1: On a task/reader screen, the side menu/TOC renders on the left, and content expands to use the available width to its right, at common desktop viewport widths.
- AC2: Getting Started's stage cards use the full available width with no persistent dead column on the right.
- AC3: Settings' layout uses the available width rather than capping to a fixed value.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: Three independent fixes in `clients/viewer/viewer.css`: (1) the reader's two grid tracks were swapped (nav now track 1/fixed/left, prose now track 2/flexible/right, with the 72ch reading measure moved onto the prose element itself); (2) `.viewer-onboarding`'s whole-screen 920px cap removed, and `.viewer-onboarding__layout`'s second grid track changed from `minmax(0, 68ch)` to `minmax(0, 1fr)` (the actual bug -- the *track*, not just its paragraphs, was capped to the prose measure, squeezing the whole stage-card box); (3) `.viewer-settings-screen`'s 980px cap removed. Verified by headless-Chrome screenshots of all three screens at 1440px and a DOM measurement confirming the reader's contents nav sits at `x=43` (left) with prose starting after it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: High
- Rationale: Reported directly by the operator as the most visible issue; affects three screens at once and likely shares one root cause (a shared layout container's max-width).

# Tasks
- `task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings`

# Notes
- Task `task_364_stop_capping_content_to_a_fixed_width_on_task_reader_getting_started_and_settings` was finished via `logics-manager flow finish task` on 2026-08-15.
