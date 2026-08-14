## item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone - Find out whether a relaunch can reuse a server that is gone
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 50%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Launches reported reusing a viewer on a port killed seconds earlier and the browser refused to connect; a later start-kill-relaunch bound cleanly, so it is timing-dependent and may not be a defect at all.
- Keywords: viewer reuse registry, liveness probe race, ERR_CONNECTION_REFUSED, not reproducible on demand
- Use when: Investigating a viewer relaunch that points at a server no longer listening.
- Skip when: Changing the reuse registry before the question is answered.

# Problem
- Launches during delivery reported `Reusing the viewer already running for <root> at http://127.0.0.1:8804?project=...` and the browser then failed with a connection-refused error, on ports killed seconds earlier. A later attempt to reproduce -- start, kill, relaunch on a different port -- bound cleanly, so this is timing-dependent and may be a race between the registry entry and its liveness probe.

# Scope
- In:
  - Establish whether it reproduces, and under what timing.
  - Record the answer either way; closing this as not-reproducible is a result.
- Out:
  - Changing the reuse registry before the question is answered.

# Acceptance criteria
- AC5: The answer is established and recorded.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC5: The answer is established and recorded.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_090_a_viewer_that_knows_which_screen_you_are_on`
- Architecture decision(s): (none yet)
- Request: `req_354_stop_a_slow_screen_from_rendering_over_the_one_the_operator_moved_to`
- Primary task(s): `task_351_deliver_the_superseded_render_guard`

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.
