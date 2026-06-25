## item_504_consolidate_duplicated_viewer_boilerplate - Consolidate duplicated viewer boilerplate
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer deduplication
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- _stream_workshop_terminal and _stream_workshop_session in viewer.py share ~42 near-identical lines, seven status endpoints repeat the same route boilerplate, and the render functions each repeat json.dumps boilerplate.

# Scope
- In:
  - Extract a shared _stream_sse_events(session, parse_item_fn, event_name, sleep_delay) helper
  - Drive the seven status endpoints from a single route table or helper
  - Route the render functions through the existing shared render payload helper
- Out:
  - Changing SSE event shapes, status payloads, or render output
  - Restructuring unrelated viewer routes

# Acceptance criteria
- AC1: The two SSE streamers share one helper and the status endpoints share one mechanism.
- AC2: SSE, status, and render output are byte-for-byte unchanged.
- AC3: The viewer pytest suite passes unchanged.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: The two SSE streamers share one helper and the status endpoints share one mechanism.
- request-AC12 -> This backlog slice. Proof: AC2: SSE, status, and render output are byte-for-byte unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Consolidate duplicated viewer boilerplate
- Keywords: scaffolded-backlog, consolidate duplicated viewer boilerplate, implementation-ready
- Use when: Implementing the scaffolded slice for Consolidate duplicated viewer boilerplate.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
