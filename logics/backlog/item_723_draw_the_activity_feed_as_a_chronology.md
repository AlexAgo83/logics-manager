## item_723_draw_the_activity_feed_as_a_chronology - Draw the activity feed as a chronology
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 21:54:37

# AI Context
- Summary: Replace the stack of full-width boxes with a continuous spine, a marker per day, a named kind per row, a per-row time, and a visible marker for periods with no activity.
- Keywords: activity spine, day markers, event kind chip, per-row time, quiet period, slug repetition
- Use when: Changing how activity events are laid out, ordered, or labelled.
- Skip when: Which events are recorded, and the activity filters.

# Problem
- Events are a stack of full-width boxes carrying two short lines each, with the kind encoded in an undecoded letter badge and one group header timing the batch rather than the work, so order has to be reconstructed card by card.

# Scope
- In:
  - A continuous spine with a marker per day and a per-event marker whose colour agrees with a named kind on the row.
  - A per-row time, using the width the rows already occupy.
  - Render a period without activity as such.
  - Stop repeating the document's title as a slug on the same row.
- Out:
  - Which events are recorded, and the activity filters.

# Delivery notes
- **The feed grouped by floored minute, not by day.** One scaffold writing eleven documents produced a single header reading `21m ago - 07:38 PM` above all eleven, which timed the batch rather than the work, and nothing on the screen said which day anything happened on. Grouping is by day now, and the minute moved onto the row, in width the row already had.
- **The kind was carried by an undecoded letter in the marker.** Telling a promotion from a status change from a commit meant learning the alphabet. The row names the kind, and the marker's colour agrees with the name rather than replacing it.
- **The row repeated the document's own title back as a slug.** The meta line was `label - stage - id`, and the id is the title again in another spelling. The id stays reachable from the marker's tooltip and accessible label.
- A quiet stretch is drawn and counted rather than left to be inferred: two dated headers otherwise leave the operator subtracting them to find out whether anything happened in between.
- The boxes lost their borders and gained a spine. Eleven bordered boxes drew eleven separate things where there is one sequence; the border returns on hover, where it marks the row under the pointer.
- Two smaller things fixed on the way: `roadmap` and `runbook` had no marker tint, so they fell back to the grey that means "unrecognised" while every other stage was tinted; and `formatActivityDayBucket` builds its `Intl` options rather than spelling an `undefined` year, because passing the key is not the same as omitting it.
- Worth recording for whoever writes the next test here: asserting on jsdom nodes makes vitest's diff printer throw while formatting the failure, which replaces the real assertion message with `Cannot read properties of undefined (reading 'name')`. Read `textContent` first.

# Acceptance criteria
- AC11: The feed reads as a chronology, with kind legible from the row itself.
- AC13: A quiet period is visible rather than inferred.

# AC Traceability
- request-AC11 -> This backlog slice. Proof: AC11: The feed reads as a chronology, with kind legible from the row itself.
- request-AC13 -> This backlog slice. Proof: AC13: A quiet period is visible rather than inferred.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_081_a_project_view_that_leads_with_what_is_live`
- Architecture decision(s): (none yet)
- Request: `req_345_make_the_project_view_lead_with_the_work_that_is_live`
- Primary task(s): `task_342_deliver_the_project_view_that_leads_with_live_work`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
