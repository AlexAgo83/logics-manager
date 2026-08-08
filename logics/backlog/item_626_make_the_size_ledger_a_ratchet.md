## item_626_make_the_size_ledger_a_ratchet - Make the size ledger a ratchet
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: A guard that records progress
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The size guard's allowlist has only ever grown: each delivery that made a file longer raised its ceiling, with a comment recording what was added. Nothing asks whether the growth was necessary, and nothing lowers an entry when a file shrinks.
- The function-length guard next door already behaves better: it reports a file that has come back under its ceiling and offers to shrink the ledger. The size guard has no equivalent.

# Scope
- In:
  - Lower an entry automatically, or report it as lowerable, when a file comes in under its recorded ceiling.
  - Require a raised ceiling to state what was tried and why the size was kept, the way the assistant adapter's entry already does.
  - Keep the 1000-line budget itself unchanged.
  - Cover both directions in a test: a file that shrank, and a file that grew without a stated reason.
- Out:
  - Lowering the default budget.
  - Failing a delivery for an entry that is already recorded and justified.
  - Applying the same rule to test files.

# Acceptance criteria
- AC1: A file under its recorded ceiling is reported, and the ledger can be lowered without hand-editing.
- AC2: A raised ceiling without a stated reason is refused.
- AC3: The assistant adapter's recorded reason satisfies the rule and stays as it is.
- AC4: Tests cover a shrunk file and an unjustified growth, and fail against the current implementation.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: A file under its recorded ceiling is reported, and the ledger can be lowered without hand-editing.
- request-AC4 -> This backlog slice. Proof: AC2: A raised ceiling without a stated reason is refused.
- request-AC6 -> This backlog slice. Proof: AC3: The assistant adapter's recorded reason satisfies the rule and stays as it is.
- request-AC7 -> This backlog slice. Proof: AC4: Tests cover a shrunk file and an unjustified growth, and fail against the current implementation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)
- Request: `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`
- Primary task(s): `task_308_orchestrate_lifting_the_sub_systems_out_of_the_core`

# AI Context
- Summary: Make the size ledger a ratchet
- Keywords: scaffolded-backlog, make the size ledger a ratchet, implementation-ready
- Use when: Implementing the scaffolded slice for Make the size ledger a ratchet.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - without it the next delivery raises a ceiling again
- Rationale: Set by scaffold input or defaulted for grooming.
