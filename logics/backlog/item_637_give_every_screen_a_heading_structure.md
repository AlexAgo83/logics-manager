## item_637_give_every_screen_a_heading_structure - Give every screen a heading structure
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90
> Confidence: 75
> Progress: 100
> Complexity: Medium
> Theme: Structure a screen reader can follow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The interface uses no heading element anywhere: an audit of the running viewer found zero `h1` through `h6` across every screen.
- ARIA landmarks are present and well used -- main, header, aside, region, menu, status -- so navigating by region works. What is missing is the structure inside a region: a screen reader user has no headings to move between, and no sense of what is a section and what is a detail.
- This is not the gap `req_013` closed. That request gave every icon control an accessible name, and the audit confirms it holds: no unnamed button, no unlabelled input, no image without alt text. The heading structure was never part of it.

# Scope
- In:
  - Give each screen a heading for its own title, and headings for the sections it renders.
  - Keep the existing visual design: a heading element where a styled div carries the same meaning today.
  - Derive the check from the interface, so a screen added later is covered without editing it.
  - Cover the board, the document panel, and the sub-screens the navigation targets open.
- Out:
  - Redesigning any screen's visual hierarchy.
  - Changing the ARIA landmarks, which are already right.
  - A full accessibility audit beyond heading structure.
  - Changing the icon-control naming `req_013` delivered.

# Acceptance criteria
- AC1: Every screen exposes a heading for its own title.
- AC2: A screen's sections carry headings, in a hierarchy that does not skip a level.
- AC3: The visual result is unchanged, shown by the existing tests passing unedited.
- AC4: The campaign fails when an opened screen exposes no heading, walking the navigation targets from the interface.
- AC5: A test covers the hierarchy and fails against the current implementation.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: `the screen exposes a heading structure` in `tests/helpers/viewer-layout-checks.mjs`, which reports `8 heading(s), levels h1, h2` where the audit previously found none.
- request-AC6 -> This backlog slice. Proof: the three tests in `tests/viewer.layout-checks.test.ts` covering no heading, a skipped level, and a sound structure.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_062_say_what_just_happened`
- Architecture decision(s): (none yet)
- Request: `req_314_close_what_the_attended_tour_found_say_what_is_unavailable_count_what_is_shown_report_when_a_screen_is_done`
- Primary task(s): `task_311_orchestrate_the_attended_tour_findings`

# AI Context
- Summary: Give every screen a heading structure
- Keywords: backlog, promote, slice, give every screen a heading structure
- Use when: You need a bounded backlog item for Give every screen a heading structure.
- Skip when: The change should go straight to implementation detail.

# Priority
- Priority: Medium - landmarks carry the navigation today, but nothing carries the structure
- Rationale: Found by the attended tour; `req_013` is Done and covered control naming, not document structure.

# Notes
- Generated locally by logics-manager.

# Tasks
- `task_311_orchestrate_the_attended_tour_findings`
