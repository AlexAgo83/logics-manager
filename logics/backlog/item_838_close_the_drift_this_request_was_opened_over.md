## item_838_close_the_drift_this_request_was_opened_over - Close the drift this request was opened over
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Proven on the case that motivated it
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 16:30:01

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
