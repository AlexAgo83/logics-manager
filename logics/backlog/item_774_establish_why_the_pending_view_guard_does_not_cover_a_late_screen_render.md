## item_774_establish_why_the_pending_view_guard_does_not_cover_a_late_screen_render - Establish why the pending-view guard does not cover a late screen render
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 10:45:29

# AI Context
- Summary: `invalidatePendingViews` exists and `setDocument` calls it, so the guard's intent is already in the code -- and the fleet home's state pass rendered over insights anyway.
- Keywords: invalidatePendingViews, setDocument, guard coverage, pending views, root cause first
- Use when: Before changing how a superseded screen render is prevented.
- Skip when: Writing the fix, which this item informs.

# Problem
- `invalidatePendingViews` exists and `setDocument` calls it, so the intent to guard against a superseded render is already in the code -- and the fleet home's state pass rendered over Corpus insights anyway. A guard that exists and does not hold is worth understanding before a second one is added beside it.

# Scope
- In:
  - Establish what the existing guard covers and why this path escapes it.
  - Record the answer where the fix can be shaped by it.
- Out:
  - Writing the fix, which this item informs.

# Finding

**The guard is not broken. It was never asked.**

`isViewStale` decides whether a view token has been superseded, and `setDocument` calls
`invalidatePendingViews`, so the intent to guard against a superseded render is real and
works -- for the screens that take a token. `showCorpusInsights` and `showHealth` do.

`showFleetHome` did not. Nor did `showSettings` or `showChatgptMcp`. All three fetched and
then committed whatever came back, with nothing to judge staleness against, so
`isViewStale` could not have helped them: it was never called.

**And the fleet home carried a second, narrower version of the same mistake.**
`loadProjectState` committed on `options.renderFleetHome || isFleetHomeOpen()`. The flag was
captured before the await, so it meant *"I was the fleet home when I started"* -- which is
not the question. `isFleetHomeOpen()`, sitting right beside it, *is* the question, and the
short-circuit made it unreachable on the one path that needed it.

**What this binds.** The fix extends the existing mechanism rather than adding one beside
it: the three screens take a view token like their siblings, and the fleet home's flag is
replaced by the token every other screen already answers to.

# Acceptance criteria
# Acceptance criteria
- AC2: Why the guard does not cover this path is established and recorded.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC2: Why the guard does not cover this path is established and recorded.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)
- Request: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`
- Primary task(s): `task_351_deliver_the_superseded_render_guard`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_351_deliver_the_superseded_render_guard`

# Notes
- Task `task_351_deliver_the_superseded_render_guard` was finished via `logics-manager flow finish task` on 2026-08-14.
