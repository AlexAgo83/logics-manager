## item_640_keep_a_paired_device_paired_across_a_restart - Keep a paired device paired across a restart
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Pairing that survives
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 00:05:20

# Problem
- WITHDRAWN. The premise was not verified before the slice was written, and it does not hold.
- The claim was that a paired device's token shares the origin-scoped browser storage that loses the preferences, so a restart on a new port strands it. Two facts refute it. The token is held by the paired device's own browser against the LAN origin, and `--lan` does not change the bind port, which defaults to 8765 -- so that origin is stable across restarts. And the server side is already persistent: `LanDeviceRegistry` is JSON-backed under `~/.cache/logics-manager/devices.json`, with tokens stored as hashes.
- The inference came from noticing that `deviceTokenKey` sits in the same browser store as the preferences, and stopping there. Where the store lives matters only if the origin changes, and for a LAN device it does not.
- A narrower case does remain, and is not this slice: an operator who binds the LAN viewer with `--port 0`, or whose machine changes IP, strands a paired device's token behind an origin that no longer exists. The answer to that would be to let a device re-pair without confusion, not to move the token. Raise it as its own slice if it is ever met in practice.

# Scope
- In:
  - Nothing. The slice is withdrawn, and this document is the record of why.
- Out:
  - Moving the pairing token, which would change where a credential lives to solve a problem that does not exist.

# Acceptance criteria
- AC1: The withdrawal states what was claimed, what was measured, and what refutes it.
- AC2: The residual case is named, so it can be raised on evidence rather than rediscovered by inference.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: withdrawn after measurement; this document records what was claimed, what was measured, and what refutes it.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_063_preferences_that_outlive_the_port`
- Architecture decision(s): (none yet)
- Request: `req_315_persist_viewer_preferences_where_they_belong_favourites_for_the_user_the_rest_for_the_repository`
- Primary task(s): `task_312_orchestrate_moving_the_viewer_preferences_off_the_port`

# AI Context
- Summary: Keep a paired device paired across a restart
- Keywords: scaffolded-backlog, keep a paired device paired across a restart, implementation-ready
- Use when: Implementing the scaffolded slice for Keep a paired device paired across a restart.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - a real capability quietly lost to the same cause
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_312_orchestrate_moving_the_viewer_preferences_off_the_port`

# Notes
- Task `task_312_orchestrate_moving_the_viewer_preferences_off_the_port` was finished via `logics-manager flow finish task` on 2026-08-09.
