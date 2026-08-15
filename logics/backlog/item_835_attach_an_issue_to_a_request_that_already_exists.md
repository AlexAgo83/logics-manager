## item_835_attach_an_issue_to_a_request_that_already_exists - Attach an issue to a request that already exists
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: The link can be made when it is noticed
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 19:24:58

# AI Context
- Summary: Declare provenance after the fact, because the request is almost always written before anyone thinks about the issue.
- Keywords: provenance, attach issue, existing request, intake shape
- Use when: An existing request turns out to cover a GitHub issue.
- Skip when: Creating a request from an issue -- `create_request` already carries provenance.

# Problem
- Provenance can only be declared when a request is created, and the request is almost always written first -- from a conversation, not from a triaged issue.
- So req_357's two issues live in `# References` as URLs, and req_302 is the only request in the corpus carrying a `# Provenance` section.

# Scope
- In:
  - A command that attaches one or more issues to an existing request, writing the same `# Provenance` shape the intake already writes.
  - Refuse a URL that is not a GitHub issue, matching the rule `create_request` already enforces.
  - Leave the document's indicators to the tools that own them, as with every other write.
- Out:
  - A general provenance editor for every companion kind.
  - Detaching, until something needs it.
  - Inventing a second provenance format.

# Acceptance criteria
- AC1: Attaching an issue to an existing request produces the same `# Provenance` shape intake produces.
- AC2: Attaching a second issue to the same request keeps both.
- AC3: A non-issue URL is refused with the reason, by the same rule `create_request` uses.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Attaching an issue to an existing request produces the same `# Provenance` shape intake produces.
- request-AC4 -> This backlog slice. Proof: AC2: Attaching a second issue to the same request keeps both.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_103_an_issue_bridge_on_the_path_people_walk`
- Architecture decision(s): (none yet)
- Request: `req_372_put_the_github_issue_bridge_on_the_path_the_work_actually_takes`
- Primary task(s): `task_383_orchestrate_the_issue_bridge_work`

# Priority
- Priority: High
- Rationale: The direction the real flow needs and the only one missing

# Validation
- attach_issue (mcp_request.py, exposed as the attach_github_issue MCP tool) writes the same '# Provenance' shape create_request produces on a first attach (Origin/External id/External issue/Approval), and appends another id/issue bullet pair on a second attach rather than replacing the section -- Approval stays the single trailing line. A non-issue URL is refused with the same rule create_request enforces. Reachable from the CLI today through the existing `mcp call` passthrough (verified end-to-end against a real repo), so no new CLI surface was needed. dry_run writes nothing. 4 new tests in tests/python/test_logics_manager_mcp.py.
