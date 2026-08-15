## item_828_let_the_restart_rebind_its_own_port - Let the restart rebind its own port
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: A restart that comes back
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: let, restart, rebind, own, port
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- `allow_reuse_address = False` on every platform also refuses the one case SO_REUSEADDR exists for: rebinding a port whose only occupant is the TIME_WAIT of the connection that just asked for the restart.
- So Settings' Restart re-execs into an EADDRINUSE exit and the viewer is gone, on the address the operator is looking at.

# Scope
- In:
  - Allow the rebind where it is safe, and keep refusing where it is not -- the Windows behaviour that motivated the original decision is what the refusal was for.
  - A test that fails if a restart stops coming back.
  - Keep the existing collision test passing unchanged: two viewers on one port is still an error.
- Out:
  - Retrying the bind in a loop, which would make a real collision take seconds to report.
  - Changing how the process re-execs.

# Acceptance criteria
- AC1: After a restart, a request to the same address is answered.
- AC2: Starting a second viewer on a port with a live listener still fails with the same message.
- AC3: The platform difference is stated where the value is set, so the next reader does not undo it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: After a restart, a request to the same address is answered.
- request-AC2 -> This backlog slice. Proof: AC2: Starting a second viewer on a port with a live listener still fails with the same message.
- request-AC4 -> This backlog slice. Proof: AC3: The platform difference is stated where the value is set, so the next reader does not undo it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_101_a_restart_that_comes_back`
- Architecture decision(s): (none yet)
- Request: `req_370_make_settings_restart_bring_the_viewer_back`
- Primary task(s): `task_381_orchestrate_the_restart_fix`

# Priority
- Priority: High - a control in the product destroys the thing it acts on
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_381_orchestrate_the_restart_fix` was finished via `logics-manager flow finish task` on 2026-08-15.
