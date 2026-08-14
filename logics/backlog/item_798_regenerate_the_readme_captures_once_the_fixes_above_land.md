## item_798_regenerate_the_readme_captures_once_the_fixes_above_land - Regenerate the README captures once the fixes above land
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:19:56

# AI Context
- Summary: Once every other slice of this request lands, the README's screenshots and captures need regenerating again, same treatment req_355 gave the previous redesign wave.
- Keywords: readme captures, screenshot regeneration, req_355 precedent
- Use when: Implementing this backlog item, after every other slice of req_359 is done.
- Skip when: Any of the actual screen fixes — those are the other slices.

# Problem
The README's own screenshots and captures predate this cycle's fixes (the prior refresh, req_355, ran before these gaps were found). Once the fixes in this request land, the captures go stale again for the same reason req_355 existed in the first place.

# Scope
- In: regenerating every README capture affected by the fixes in item_790 through item_797, and refreshing any prose beside them that describes what changed.
- Out: any fix to the screens themselves — this slice only runs after the others are Done.

# Acceptance criteria
- AC1: Every README capture affected by this request's fixes is regenerated and visibly reflects the fixed screens.
- AC2: This slice is not started until item_790 through item_797 are Done, so it captures the real end state rather than a partial one.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: As the last step, once the fixes above land, the README's screenshots and captures are regenerated to reflect them (same treatment req_355 gave the previous redesign wave), so published documentation doesn't go stale again.

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
- Rationale: Deliberately last — depends on every other slice being Done first.

# Tasks
- `task_369_regenerate_the_readme_captures_once_the_fixes_above_land`
