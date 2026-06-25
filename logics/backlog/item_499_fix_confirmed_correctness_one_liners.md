## item_499_fix_confirmed_correctness_one_liners - Fix confirmed correctness one-liners
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Correctness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Several confirmed high/medium defects are each a one-line fix: sync.py section-note scope, insights.py un-stripped ref, mcp.py JSON-RPC notification error body, mcp.py inverted dry_run diff paths, and flow Progress insertion index.

# Scope
- In:
  - Scope the sync.py duplicate-bullet check to the target section instead of the whole document
  - Strip the captured ref in insights.py so the docs_by_ref lookup succeeds
  - Return no response body for a JSON-RPC notification (request_id is None) on tool error in mcp.py
  - Correct the mcp.py dry_run diff paths so real mutations diff the targeted path and dry-run diffs nothing unexpected
  - Fix the flow Progress insertion index so Progress lands after the other metadata
- Out:
  - The workshop terminal races (handled by a sibling slice)
  - The lower-severity items left for later (_state_from_gates ordering)
  - Any larger refactor of these modules

# Acceptance criteria
- AC1: Each listed defect is fixed at its root with a regression test where behavior is observable.
- AC2: The JSON-RPC notification path returns no error body for request_id None.
- AC3: pytest passes with no regressions.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: Each listed defect is fixed at its root with a regression test where behavior is observable.
- request-AC12 -> This backlog slice. Proof: AC2: The JSON-RPC notification path returns no error body for request_id None.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Fix confirmed correctness one-liners
- Keywords: scaffolded-backlog, fix confirmed correctness one-liners, implementation-ready
- Use when: Implementing the scaffolded slice for Fix confirmed correctness one-liners.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
