## item_798_regenerate_the_readme_captures_once_the_fixes_above_land - Regenerate the README captures once the fixes above land
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer redesign follow-through
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 00:26:37

# AI Context
- Summary: Once every other slice of this request lands, the README's screenshots and captures need regenerating again, same treatment req_355 gave the previous redesign wave.
- Keywords: readme captures, screenshot regeneration, req_355 precedent
- Use when: Implementing this backlog item, after every other slice of req_359 is done.
- Skip when: Any of the actual screen fixes — those are the other slices.

# Problem
The README's own screenshots and captures predate this cycle's fixes (the prior refresh, req_355, ran before these gaps were found). Once the fixes in this request land, the captures go stale again for the same reason req_355 existed in the first place.

Two additional gaps reported directly by the operator, not tied to any of the other fixes:
- The README has no capture of the board's list mode at all — worth adding since list mode is a real, well-regarded view of the board and the README currently only shows card mode.
- The README's Health screen capture is misleading ("deceptive") as currently shown and should be removed rather than merely refreshed.

# Scope
- In:
  - Regenerating every README capture affected by the fixes in item_790 through item_797, and refreshing any prose beside them that describes what changed.
  - Adding a new capture of the board's list mode.
  - Removing the Health screen capture and any prose that depends on it.
- Out: any fix to the screens themselves — this slice only runs after the others are Done.

# Acceptance criteria
- AC1: Every README capture affected by this request's fixes is regenerated and visibly reflects the fixed screens.
- AC2: This slice is not started until item_790 through item_797 are Done, so it captures the real end state rather than a partial one.
- AC3: The README includes a capture of the board's list mode.
- AC4: The README no longer includes the Health screen capture, and no prose references it as if it were still there.

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

# Notes
- Task `task_369_regenerate_the_readme_captures_once_the_fixes_above_land` was finished via `logics-manager flow finish task` on 2026-08-15.
