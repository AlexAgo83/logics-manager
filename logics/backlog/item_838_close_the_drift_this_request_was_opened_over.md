## item_838_close_the_drift_this_request_was_opened_over - Close the drift this request was opened over
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Progress: 100%
> Complexity: Low
> Theme: Proven on the case that motivated it
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 20:04:46

# AI Context
- Summary: Issues #20 and #21, open against a delivered req_357, closed using what this chain builds rather than by hand.
- Keywords: req_357, issue 20, issue 21, proof on the real case
- Use when: Proving the mechanism on the case that motivated it.
- Skip when: Backfilling the ten issues that closed without a link -- they are history.

# Problem
- Issues #20 and #21 are open against a req_357 that is Done, which is the observation this request exists because of.
- Fixing it by hand would leave the mechanism unproven on the only case anyone has actually met.

# Scope
- In:
  - Waits on `item_835_attach_an_issue_to_a_request_that_already_exists` and `item_837_tell_the_issues_when_the_request_is_delivered`: this slice is the proof that those two work, so it has nothing to run before they exist.
  - Attach #20 and #21 to req_357 with the command item_835 adds.
  - Tell those issues with the closeout notice item_837 adds, explicitly.
  - Re-run the reconciliation report and record what it says before and after.
- Out:
  - Backfilling the ten issues that closed without a link: they are history, and nothing is waiting on them.
  - Closing the issues, which stays a human act.

# Acceptance criteria
- AC1: req_357 names both issues, written by the command rather than by hand.
- AC2: Both issues carry the lifecycle update, posted by the mechanism.
- AC3: The reconciliation report no longer lists them, and the before and after are recorded.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: req_357 names both issues, written by the command rather than by hand.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)
- Request: `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`
- Primary task(s): `task_383_orchestrate_the_issue_bridge_work`

# Priority
- Priority: Medium
- Rationale: The work is not proven until it fixes the case that motivated it

# Validation
- Attached #20/#21 to req_357 via item_835's attach command (94e3a902, 12786498) -- AC1 met. Told both via item_837's closeout notice, `post=True`: posted `logics:delivered` label + "Logics lifecycle update: **delivered** -- linked workflow: `req_357_...`." Verified live with `gh issue view --json number,state,labels,comments`: both carry it, state stays OPEN (closing is a human act, out of scope). AC2 met. Before (attached, not yet told), issues still flagged: `done_requests_with_open_issues: [{"issue":"21",...,"request_status":"done"}, {"issue":"20",...,"request_status":"done"}]` This exposed a real gap in item_834's design: an OPEN issue against a Done request was flagged with no way to tell "already told, awaiting a human close" from "never told" -- identical shape. Fixed in a3b68575: the report now checks whether the issue already carries the label item_837 would post and excludes it if so. After the fix + real posts: `{"open_issues_with_no_request": [], "done_requests_with_open_issues": [], "closed_issues_with_open_request": []}` #20/#21 no longer appear anywhere. AC3 met. Full suite re-run: pytest 1431 passed; vitest 971 passed (87 files) + known pre-existing jsdom teardown noise, unrelated.

# Tasks
- `task_383_orchestrate_the_issue_bridge_work`

# Notes
- Task `task_383_orchestrate_the_issue_bridge_work` was finished via `logics-manager flow finish task` on 2026-08-15.
