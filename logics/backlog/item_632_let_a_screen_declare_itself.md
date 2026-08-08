## item_632_let_a_screen_declare_itself - Let a screen declare itself
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: A screen registry
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A screen is dispatched by its title: `setDocument(title, html)`, with the routing spread across conditionals that compare that title string. There are fourteen navigation targets and no place that lists them.
- Adding a screen therefore means editing a router, a wiring block and a conditional chain, and nothing fails if one of the three is forgotten.

# Scope
- In:
  - Declare each screen once, with its id, its title, how it mounts against the store, and how it refreshes.
  - Route on the declaration rather than on the title string.
  - Keep the existing titles and navigation targets exactly as they are, so nothing an operator sees moves.
  - Cover the registry with a check that compares it against the navigation targets in the markup.
- Out:
  - Changing any screen's content, title, or navigation target.
  - Changing how a screen renders.
  - Introducing lazy loading of screens.

# Acceptance criteria
- AC1: Each screen is declared once, and the host routes on the declaration.
- AC2: No routing decision compares a screen title string.
- AC3: Every navigation target in the markup resolves to a declared screen, shown by a check reading both.
- AC4: Titles and navigation targets are unchanged, shown by the existing tests passing unedited.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Each screen is declared once, and the host routes on the declaration.
- request-AC6 -> This backlog slice. Proof: AC2: No routing decision compares a screen title string.
- request-AC7 -> This backlog slice. Proof: AC3: Every navigation target in the markup resolves to a declared screen, shown by a check reading both.
- request-AC8 -> This backlog slice. Proof: AC4: Titles and navigation targets are unchanged, shown by the existing tests passing unedited.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)
- Request: `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`
- Primary task(s): `task_310_orchestrate_naming_the_viewer_architecture`

# AI Context
- Summary: Let a screen declare itself
- Keywords: scaffolded-backlog, let a screen declare itself, implementation-ready
- Use when: Implementing the scaffolded slice for Let a screen declare itself.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - comfort, not correctness, and it depends on the store
- Rationale: Set by scaffold input or defaulted for grooming.
