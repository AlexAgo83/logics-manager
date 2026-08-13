## item_711_present_the_fleet_home_as_the_root_view_in_fleet_mode - Present the fleet home as the root view in fleet mode
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Under `--fleet` the board renders first and `showFleetHome` layers a dismissable panel over it; suppress both the board and the dismiss chrome so the entry screen is a destination.
- Keywords: fleet home, fleetHome payload, document panel, close chrome, topbar pill, browser host, extension host parity
- Use when: Changing what `view --fleet` renders at launch, or the fleet home's panel chrome and topbar identity.
- Skip when: Changing the document panel mechanism, or Fleet reached by navigation from inside a project.

# Problem
- With `payload.fleetHome` set, the board renders first and `showFleetHome` layers a dismissable document panel over it, so the product's entry screen carries a Close button and closing it lands the operator on a project they never chose.

# Scope
- In:
  - Suppress the board render and the panel's dismiss chrome when the fleet home is the launch view.
  - Identify the fleet in the topbar instead of naming the launch project, and print the screen title once.
  - Keep Fleet's `screenRegistry` entry and its refresh behaviour intact.
- Out:
  - The document panel mechanism itself, and Fleet reached by navigation from inside a project.

# Acceptance criteria
- AC1: No Close/Minimize chrome and no board behind the fleet home under `--fleet`.
- AC2: The topbar identifies the fleet, and the title appears once.
- AC10: Changed in the browser-host source, rebuilt, and identical in both surfaces.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: No Close/Minimize chrome and no board behind the fleet home under `--fleet`.
- request-AC2 -> This backlog slice. Proof: AC2: The topbar identifies the fleet, and the title appears once.
- request-AC10 -> This backlog slice. Proof: AC10: Changed in the browser-host source, rebuilt, and identical in both surfaces.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_080_a_fleet_home_an_operator_can_triage_from`
- Architecture decision(s): (none yet)
- Request: `req_344_make_the_fleet_home_read_as_the_product_s_first_screen`
- Primary task(s): `task_341_deliver_the_fleet_home_first_screen_redesign`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
