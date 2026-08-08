## item_638_give_the_viewer_a_preference_store_that_does_not_depend_on_the_port - Give the viewer a preference store that does not depend on the port
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: One record, two scopes
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 23:11:54

# Problem
- Every preference is in one browser storage entry, and browser storage is scoped to the origin, port included. The extension serves the viewer on an ephemeral port, so each session reads an empty store.
- The twelve stored fields divide cleanly. Four describe the operator: the favourites, the last-used timestamps, whether the workshop uses the system terminal, and the auto-refresh interval. Eight describe a corpus: the workshop's active tab and terminal order, and the six cdx column and filter selections.
- The server already knows the repository it serves and the machine it runs on, and it serves both the standalone viewer and the extension. Nothing else in the system knows both.

# Scope
- In:
  - Persist operator preferences in a user-level file, and corpus preferences alongside the repository they describe.
  - Serve both through the viewer's API, so the standalone viewer and the extension read the same record.
  - Keep the browser store as a cache for first paint, not as the record.
  - Meet `item_630` cleanly: that slice names the in-memory owner, this one names the record. If `item_630` has landed, persist through the store it established rather than beside it; if it has not, do not introduce a second in-memory owner that it would then have to unpick.
  - Carry over what an operator already has on first run, rather than starting them empty.
  - Cover the split with a test that reads the field list from the code rather than restating it.
- Out:
  - Adding preferences or changing what an existing one means.
  - Changing the extension's port.
  - Syncing between machines.
  - Moving the diagnostic breadcrumbs, which are deliberately local to a session's browser.

# Acceptance criteria
- AC1: An operator preference set in one repository applies in another.
- AC2: A corpus preference set in one repository does not appear in another.
- AC3: The standalone viewer and the extension read the same values, whatever port either was served from.
- AC4: Preferences already stored in the browser are carried over on first run and not lost.
- AC5: A test derives the operator-versus-corpus split from the code, so a field added later must be placed.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: An operator preference set in one repository applies in another.
- request-AC3 -> This backlog slice. Proof: AC2: A corpus preference set in one repository does not appear in another.
- request-AC6 -> This backlog slice. Proof: AC3: The standalone viewer and the extension read the same values, whatever port either was served from.
- request-AC7 -> This backlog slice. Proof: AC4: Preferences already stored in the browser are carried over on first run and not lost.
- request-AC8 -> This backlog slice. Proof: AC5: A test derives the operator-versus-corpus split from the code, so a field added later must be placed.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_063_preferences_that_outlive_the_port`
- Architecture decision(s): (none yet)
- Request: `req_315_persist_viewer_preferences_where_they_belong_favourites_for_the_user_the_rest_for_the_repository`
- Primary task(s): `task_312_orchestrate_moving_the_viewer_preferences_off_the_port`

# AI Context
- Summary: Give the viewer a preference store that does not depend on the port
- Keywords: scaffolded-backlog, give the viewer a preference store that does not depend on the port, implementation-ready
- Use when: Implementing the scaffolded slice for Give the viewer a preference store that does not depend on the port.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a changing origin is why nothing survives
- Rationale: Set by scaffold input or defaulted for grooming.
