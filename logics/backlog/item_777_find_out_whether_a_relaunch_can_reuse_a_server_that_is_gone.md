## item_777_find_out_whether_a_relaunch_can_reuse_a_server_that_is_gone - Find out whether a relaunch can reuse a server that is gone
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 11:26:41

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

# Answer

**Not reproducible, and not a defect in the registry.** Established 2026-08-14 by driving
`claim_or_reuse` directly against a controlled registry, using the `LOGICS_VIEWER_REGISTRY_PATH`
override the module already provides for exactly this kind of test.

| Situation | Result |
| --- | --- |
| Live server, entry 60s old | reused, no rebind |
| **Dead port, entry 60s old** | **binds fresh** -- no stale reuse |
| Dead port, entry claimed 0.1s ago | binds fresh, after the 1.9s startup grace |
| Dead port, entry claimed 1.9s ago | binds fresh in 0.11s |
| Alive when probed | reused, correctly |

`_is_alive_or_starting` probes `/api/live`, falls back to `/api/status`, and only then
consults the startup grace. A registry entry pointing at a port that answers nothing is
never reused, however old or fresh the entry is.

**What was actually observed during delivery.** The remaining window is real but narrow: a
server that is alive when probed and dies before the browser navigates. That is precisely
what this session was doing -- killing viewers and relaunching them, repeatedly, within
seconds. The `ERR_CONNECTION_REFUSED` followed the kill, not a stale registry entry.

**One observation, not a defect.** A relaunch within two seconds of a *dead* recent claim
waits the full 1.9s startup grace before binding, polling a port that will never answer. It
is correct -- the grace exists so a viewer still starting up is not raced -- and it costs
two seconds in the one case where the claim is dead rather than starting. Recorded so that
whoever next reads a slow relaunch knows where the time went.

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

# Tasks
- `task_351_deliver_the_superseded_render_guard`

# Notes
- Task `task_351_deliver_the_superseded_render_guard` was finished via `logics-manager flow finish task` on 2026-08-14.
