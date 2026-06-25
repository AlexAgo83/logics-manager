## item_496_harden_viewer_server_against_malformed_content_length - Harden viewer server against malformed Content-Length
> From version: 2.12.12
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Server robustness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- ~12 do_POST endpoints in viewer.py parse int(Content-Length) and only catch JSONDecodeError, so a malformed header raises an unhandled ValueError and crashes the request.

# Scope
- In:
  - Add a shared _read_json_body(self) helper that parses Content-Length and the JSON body and raises a clean, catchable error
  - Replace the duplicated parse pattern at the ~12 affected endpoints with the helper
  - Return a 400 on malformed input instead of letting the exception escape
- Out:
  - Endpoints that already use the correct except (switch-project, workshop-terminal-resize)
  - Any change to endpoint behavior on well-formed input

# Acceptance criteria
- AC1: A single helper parses Content-Length and the body and is used by every JSON do_POST endpoint.
- AC2: A malformed Content-Length returns a clean 400, verified by a test.
- AC3: The viewer pytest suite passes unchanged.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A single helper parses Content-Length and the body and is used by every JSON do_POST endpoint.
- request-AC12 -> This backlog slice. Proof: AC2: A malformed Content-Length returns a clean 400, verified by a test.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Harden viewer server against malformed Content-Length
- Keywords: scaffolded-backlog, harden viewer server against malformed content-length, implementation-ready
- Use when: Implementing the scaffolded slice for Harden viewer server against malformed Content-Length.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
