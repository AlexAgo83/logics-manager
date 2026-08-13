## item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer - Make the fleet flag decide whether the viewer is a fleet viewer
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 40%
> Complexity: Medium
> Theme: Viewer reliability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The `view` command passes `fleet=True` as a literal, so every viewer is a fleet viewer: the switcher offers fleet root management everywhere and any request without a project parameter lands on the fleet home.
- Keywords: args.fleet, server.fleet, fleet_home, viewer_payload, project switcher, docs/cli.md, adr_028
- Use when: Deciding or changing what `--fleet` controls, or when fleet root management is offered.
- Skip when: The fleet registry's scope, settled by adr_028, and the fleet home's design.

# Problem
- The `view` command constructs the server with `fleet=True` as a literal, so every viewer is a fleet viewer: the switcher offers fleet root management everywhere, and any request without a project parameter lands on the fleet home regardless of the flag. The documentation describes a flag that decides this.

# Scope
- In:
  - Decide what `--fleet` means, given that adr_028 scoped the fleet registry to the operator profile.
  - Make the server mode and the landing view follow from that decision.
  - Show fleet root management when the decision says it applies, and correct `docs/cli.md`.
- Out:
  - The fleet registry's scope, which adr_028 settled.
  - The fleet home's own design.

# Acceptance criteria
- AC4: Server mode and landing view follow from the flag rather than a hardcoded value.
- AC5: Fleet root management is offered exactly when the decision says it applies.
- AC6: `docs/cli.md` matches the behaviour.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Server mode and landing view follow from the flag rather than a hardcoded value.
- request-AC5 -> This backlog slice. Proof: AC5: Fleet root management is offered exactly when the decision says it applies.
- request-AC6 -> This backlog slice. Proof: AC6: `docs/cli.md` matches the behaviour.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)
- Request: `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`
- Primary task(s): `task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
