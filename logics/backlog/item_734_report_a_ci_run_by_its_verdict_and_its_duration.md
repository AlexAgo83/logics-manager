## item_734_report_a_ci_run_by_its_verdict_and_its_duration - Report a CI run by its verdict and its duration
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 12%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
