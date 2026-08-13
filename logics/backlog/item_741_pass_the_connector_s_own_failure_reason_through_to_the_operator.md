## item_741_pass_the_connector_s_own_failure_reason_through_to_the_operator - Pass the connector's own failure reason through to the operator
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The tunnel exits with a precise port-in-use message; the capture thread drops every line that matches neither of its two regexes, and the fallback error is guarded on a `returncode` still `None` because nothing awaited the child.
- Keywords: start_mcp_connector, capture thread, regex-only parsing, returncode None, poll wait, connector payload error
- Use when: Changing how the viewer supervises the MCP connector child or reports why it stopped.
- Skip when: The tunnel's port selection, and what the connector does once running.

# Problem
- The tunnel exits with a precise, actionable message about a port already in use. The capture thread tests each line against two regexes and drops the rest; the fallback error is guarded on a `returncode` that is still `None` because nothing awaited the child; so `status` reports a stopped connector with an empty error.

# Scope
- In:
  - Establish the child's exit status before judging its outcome.
  - Retain enough of the child's output to explain a failure, rather than only what matched a pattern.
  - Surface that reason through the connector payload.
- Out:
  - The tunnel's port selection, and what the connector does once running.

# Acceptance criteria
- AC1: The child's own reason is what the operator sees.
- AC2: Exit status is established before the outcome is judged.
- AC3: Unmatched output is not discarded when it is the only explanation available.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The child's own reason is what the operator sees.
- request-AC2 -> This backlog slice. Proof: AC2: Exit status is established before the outcome is judged.
- request-AC3 -> This backlog slice. Proof: AC3: Unmatched output is not discarded when it is the only explanation available.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_084_a_viewer_that_repeats_what_it_was_told`
- Architecture decision(s): (none yet)
- Request: `req_348_stop_the_viewer_from_swallowing_a_diagnostic_and_from_repeating_a_stale_update`
- Primary task(s): `task_345_deliver_the_connector_diagnostics_and_the_version_aware_update_check`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
