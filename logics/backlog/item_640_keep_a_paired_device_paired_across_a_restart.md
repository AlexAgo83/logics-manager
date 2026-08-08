## item_640_keep_a_paired_device_paired_across_a_restart - Keep a paired device paired across a restart
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Pairing that survives
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A paired network device's bearer token is kept in the same origin-scoped browser storage as the preferences. When the extension restarts on a new port, the token is gone and the device has to be paired again.
- This was never reported as a preference problem because it does not look like one, but it has exactly the same cause and disappears with the same fix.
- The token is a credential, so where it is kept and for how long is a decision to make deliberately rather than by moving it along with everything else.

# Scope
- In:
  - Keep a paired device's token where a restart does not lose it, and state where that is and why.
  - Keep the existing pairing flow, its short-lived PIN, and the fact that tokens are stored hashed on the server.
  - State what clears a pairing, so an operator can revoke one deliberately.
  - Cover a restart in a test: a paired device stays paired.
- Out:
  - Changing the pairing mechanism, the PIN, or the token format.
  - Changing what a paired device is allowed to do.
  - Making pairings survive a machine change.

# Acceptance criteria
- AC1: A device paired before a restart is still paired after one.
- AC2: The pairing flow, its PIN, and the server-side hashing are unchanged.
- AC3: An operator can clear a pairing deliberately, and it stays cleared.
- AC4: A test covers the restart and fails against the current implementation.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: A device paired before a restart is still paired after one.
- request-AC8 -> This backlog slice. Proof: AC2: The pairing flow, its PIN, and the server-side hashing are unchanged.

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
