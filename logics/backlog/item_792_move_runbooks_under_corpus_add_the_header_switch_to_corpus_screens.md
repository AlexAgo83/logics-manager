## item_792_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens - Move Runbooks under Corpus, add the header switch to Corpus screens
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 60%
> Complexity: Medium
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 01:48:38

# AI Context
- Summary: Runbooks is currently under Workshop; it belongs under Corpus. Corpus screens are also missing the header selection switch every other top-level screen already carries.
- Keywords: navigation restructure, runbooks placement, corpus header switch, viewer toolbar
- Use when: Implementing this backlog item.
- Skip when: Any specific screen's internal content — this is navigation placement only.

# Problem
Reported directly by the operator, not found by the mockup review: Runbooks should be a Corpus section, not a Workshop one, and every Corpus screen should carry the same header selection switch other top-level screens (e.g. the Activity/Project toggle on the board) already have.

# Scope
- In:
  - Relocate the Runbooks tab/route from the Workshop nav group to the Corpus nav group.
  - Add the existing header selection switch pattern to Corpus screens that currently lack it.
- Out:
  - Any change to Runbooks' own internal content or the Workshop screens' remaining tabs (Commands, Explorer).
  - Redesigning the switch component itself — reuse the existing one.

# Acceptance criteria
- AC1: Runbooks is reachable from the Corpus navigation group, not the Workshop one.
- AC2: Every Corpus screen carries the same header selection switch present on other top-level screens (e.g. Activity/Project).

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Runbooks appear under the Corpus section of the viewer's navigation, not under Workshop, and every Corpus screen carries the same header selection switch present on other top-level screens.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_359_viewer_redesign_mockups_gap_review_across_all_screens`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Reported directly by the operator; structural navigation fix with no dependency on the other screen-specific slices.

# Notes
- Runbooks also has two independent, unrelated fixes tracked in req_362 (item_801: persist "Show hidden"; item_802: remove the "View graph" button), currently cited against `clients/viewer/src/browser-host/workshop.js`. If this slice relocates Runbooks' rendering code out of `workshop.js` (rather than only its nav placement), whichever of these three slices lands second should update the other two's file citations rather than assume they're stale.

# Tasks
- `task_363_move_runbooks_under_corpus_add_the_header_switch_to_corpus_screens`
