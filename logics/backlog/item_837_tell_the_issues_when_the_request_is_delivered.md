## item_837_tell_the_issues_when_the_request_is_delivered - Tell the issues when the request is delivered
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Telling the tracker is part of finishing
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 19:24:58

# AI Context
- Summary: Closeout states what would be posted and to which issues; posting happens only on an explicit action, never as a side effect.
- Keywords: closeout, lifecycle update, explicit outward write
- Use when: Finishing a request that names issues.
- Skip when: Looking for automation -- an outward write is never automatic here.

# Problem
- Lifecycle feedback is a `workflow_dispatch` with three inputs, one of them a Logics ref the maintainer must look up. It has run once, for issue #9.
- Finishing a request is the moment when what the issue needs to hear is known and nobody has to look anything up.

# Scope
- In:
  - At closeout, when the request names issues, state exactly what would be posted and to which issues.
  - Post only on an explicit action -- a flag, an answered prompt -- never as a side effect of finishing.
  - Reuse the existing lifecycle vocabulary and the existing workflow's wording rather than inventing a second one.
- Out:
  - Posting automatically, or on any path where the operator did not ask.
  - Closing the issue: labelling and commenting is what the bridge does, and closing stays a human act.
  - Posting anything an issue body supplied.

# Acceptance criteria
- AC1: Finishing a request that names issues reports which issues would be told and what would be said.
- AC2: Nothing is posted without an explicit action, and the dry statement is the default.
- AC3: What is posted matches the lifecycle states the existing workflow already uses.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: Finishing a request that names issues reports which issues would be told and what would be said.
- request-AC5 -> This backlog slice. Proof: AC2: Nothing is posted without an explicit action, and the dry statement is the default.

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
- Rationale: The half that closes the loop, and the only outward write here: worth doing carefully rather than early.

# Validation
- closeout_notice_payload states the label ("logics:<state>") and comment ("Logics lifecycle update: **<state>** — linked workflow: `<ref>`.") for every issue a request names, matching .github/workflows/logics-issue-update.yml's own wording exactly. Nothing is posted unless post=True is passed explicitly; the MCP tool (tell_issues_at_closeout) inverts this to dry_run defaulting true, so the dry statement stays the default while still satisfying the project's "every mutating tool declares dry_run" contract. A failed gh call is reported in errors[] without raising, and posted stays false. Verified live (dry only) against req_302/#9 -- the notice text matches exactly what the real workflow would post. 4 tests in tests/python/test_github_bridge.py, 2 MCP-level tests in test_logics_manager_mcp.py.
