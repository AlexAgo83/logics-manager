## item_728_make_the_fleet_flag_decide_whether_the_viewer_is_a_fleet_viewer - Make the fleet flag decide whether the viewer is a fleet viewer
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 93%
> Confidence: 85%
> Progress: 60%
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

# Decision

Taken 2026-08-13. The operator delegated this after it was raised twice; it is recorded
as revisable rather than settled, and overturning it costs one line plus the doc.

**`--fleet` decides which screen the viewer opens on. It does not decide what the server
can do.**

Every viewer stays fleet-capable. `adr_028` scoped the fleet registry to the operator
profile, so one local server serves the whole fleet and the project switcher offers fleet
root management from any launch. Making the capability conditional would contradict that
decision and would mean an operator who launched without the flag could not reach the
fleet at all.

What was wrong is that capability and intent were the same flag, so any request without a
`project` parameter landed on the Fleet home -- including a plain `view` inside a project.
That is what made `--fleet` close to a no-op, and it is what surprised the operator into
raising this.

| Launch | Opens on |
| --- | --- |
| `logics-manager view` | the launch project's board |
| `logics-manager view --fleet` | the Fleet home |
| any URL carrying `?project=<id>` | that project's board |

**Why not the alternative.** Making the server mode follow the flag would match what
`docs/cli.md` promised, but it would make the fleet unreachable from an ordinary launch
and put `adr_028` back in question for a wording problem. Rewriting the sentence is
cheaper than narrowing the product.

**Revisit if** an operator wants a viewer that genuinely cannot see other projects -- a
shared or restricted context, say. That is a capability question and would reopen this.

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
