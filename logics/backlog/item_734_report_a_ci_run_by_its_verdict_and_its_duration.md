## item_734_report_a_ci_run_by_its_verdict_and_its_duration - Report a CI run by its verdict and its duration
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 01:30:04

# AI Context
- Summary: Six job rows all read `completed / success` in link blue, `pass` appears four times, both ends of the run are shown but never the duration, and a failing job is drawn at exactly the size of a passing one.
- Keywords: ci verdict, run duration, job duration, status colour, failure first, relative time, repeated string
- Use when: Changing how a CI run or its jobs are reported.
- Skip when: Which workflows are reported, and drilling into a job's log content.

# Problem
- `completed / success` is printed on all six job rows in link blue, `pass` appears four times, both ends of the run are shown and the duration is not, no job reports its own time, and a failing job is drawn at exactly the size of a passing one.

# Scope
- In:
  - Lead with the verdict and the run duration.
  - Give each job its duration, order them so the reader knows where to look, and carry status in colour and form.
  - Let a failure lead and the passing jobs collapse to a counted line.
  - Show relative times, with the absolute available.
- Out:
  - Which workflows are reported, and drilling into a job's log content.

# Delivery notes
- **The defect behind "a failing job is drawn at exactly the size of a passing one" was not sizing. The job tones never worked at all.** `ciBadgeTone` takes a badge *state* -- `passing`, `failing`, `running` -- and the job rows were feeding it a raw GitHub `conclusion` or `status`. Every job resolved to `unknown`, so all six rows on a run were drawn identically no matter what happened. `ciStateFromStatus` mirrors `logics_manager/viewer.py::_ci_badge_state`, and says in its own comment that it must stay in step with it: a job read differently on the two sides is a job reported two ways.
- The verdict says what happened, how long it took and how long ago, in one sentence, where four metric tiles sat. Both ends of the run were already in the payload; the duration nobody could see was a subtraction away.
- Each job carries its own duration and a relative time, with the absolute stamp on the tooltip. Jobs are ordered failures first, then anything unresolved, then the passing ones behind a native `<details>` that states how many -- keyboard-reachable without a handler of its own.
- The `Status` row is gone from the run list because the verdict states it; `Started` and `Updated` became the one fact they were hiding.
- Tone is carried by marker shape as well as colour on every job, and by border style on the verdict, so the states stay apart in greyscale.
- Two mistakes of mine worth recording, both caught by the suite rather than by review: the first version fed `ciBadgeTone` the same raw status the old code did, so the verdict rendered blank; and the test fixture said `state: "failing"` where the renderer requires `state: "ok"` with the tone in `badgeState`, so the screen rendered nothing and the assertion blamed the product.

# Acceptance criteria
- AC1: The screen leads with its verdict.
- AC7: The run and each job report their duration; times are relative.
- AC8: Status is colour and form, not a repeated string.
- AC9: A failure leads; passing jobs collapse to a counted line.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The screen leads with its verdict.
- request-AC7 -> This backlog slice. Proof: AC7: The run and each job report their duration; times are relative.
- request-AC8 -> This backlog slice. Proof: AC8: Status is colour and form, not a repeated string.
- request-AC9 -> This backlog slice. Proof: AC9: A failure leads; passing jobs collapse to a counted line.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Notes
- Task `task_344_deliver_the_git_ci_release_and_settings_redesign` was finished via `logics-manager flow finish task` on 2026-08-14.
