## item_581_make_vocabularies_discoverable_without_failing_first - Make vocabularies discoverable without failing first
> From version: 2.19.5
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 10%
> Complexity: Medium
> Theme: Discoverability
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Status vocabularies and scaffold input enums are named only in failure messages, so the only way to learn them is to guess wrong.
- The documented scaffold key list omits the `complexity` enum and omits a key the input silently accepts, so neither the accepted set nor the rejected set is discoverable up front.
- `flow list` prints its usage block in the exact default form its own help text gives as the first example.
- Most of the time lost in the field was vocabulary discovery.

# Scope
- In:
  - Make `flow list` produce a listing in its documented default form.
  - Surface the status vocabulary and the scaffold input enums in help output rather than only in errors.
  - Reconcile the documented scaffold key list with the accepted key set, in both directions.
  - Cover the default form of `flow list` with a test.
- Out:
  - A `doctor` command reporting per-document vocabularies, which is deferred to its own request.
  - Changing any vocabulary.

# Acceptance criteria
- AC1: `logics-manager flow list` with no arguments produces a listing.
- AC2: The status vocabulary for each document kind is reachable from help output without triggering a failure.
- AC3: The scaffold input enums are documented where the keys are documented.
- AC4: The documented scaffold key list and the accepted key set agree, verified by a test.

# AC Traceability
- request-AC17 -> This backlog slice. Proof: AC1: `logics-manager flow list` with no arguments produces a listing.
- request-AC18 -> This backlog slice. Proof: AC2: The status vocabulary for each document kind is reachable from help output without triggering a failure.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make vocabularies discoverable without failing first
- Keywords: scaffolded-backlog, make vocabularies discoverable without failing first, implementation-ready
- Use when: Implementing the scaffolded slice for Make vocabularies discoverable without failing first.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Low
- Rationale: Set by scaffold input or defaulted for grooming.
