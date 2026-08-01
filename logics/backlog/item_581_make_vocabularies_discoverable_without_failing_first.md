## item_581_make_vocabularies_discoverable_without_failing_first - Make vocabularies discoverable without failing first
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
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
- request-AC3 -> This backlog slice. Evidence needed: No scaffolded document asserts work that has not happened. A freshly scaffolded task at zero progress contains no completion claim in any section.
- request-AC4 -> This backlog slice. Evidence needed: Scaffolded AC traceability is derived from `backlog_items[].request_acs` in the scaffold input, mapping each request AC to the backlog item that claims it.
- request-AC5 -> This backlog slice. Evidence needed: Scaffolding reports every request acceptance criterion claimed by no backlog item, at scaffold time rather than at review time.
- request-AC6 -> This backlog slice. Evidence needed: Scaffolded `# Validation` carries one line that cannot be mistaken for evidence, and that the `validation_evidence_missing` gate still rejects.
- request-AC7 -> This backlog slice. Evidence needed: Validation evidence stating a zero failure count is accepted. A single bullet reading `npm test passed (26 assertions, 0 failures)` satisfies the closeout preflight.
- request-AC8 -> This backlog slice. Evidence needed: `flow companion architecture` and `flow companion product` produce documents that pass `logics-manager lint` immediately, with no missing indicator.
- request-AC9 -> This backlog slice. Evidence needed: Companion bodies contain no content about any product other than the one named in the invocation, and every placeholder is impossible to mistake for content.
- request-AC10 -> This backlog slice. Evidence needed: `sync update-indicators` validates the requested indicators against the target document kind, and its error names the set that kind accepts.
- request-AC11 -> This backlog slice. Evidence needed: A semantic body edit that does not change status can be re-baselined without changing any indicator value and without labelling the edit non-semantic.
- request-AC12 -> This backlog slice. Evidence needed: Indicator values are written in the same format the templates use, so a corpus never mixes two forms for one indicator.
- request-AC13 -> This backlog slice. Evidence needed: Reference extraction ignores references inside fenced code blocks and inline code spans, so a document can quote a reference without creating a link.
- request-AC14 -> This backlog slice. Evidence needed: Every reference accepted by `flow validate` is accepted by every other command that takes a reference, or the error names the kind restriction rather than reporting the document as missing.
- request-AC15 -> This backlog slice. Evidence needed: Every audit finding that names a repair command is fixed by that command, or the finding no longer names one.
- request-AC16 -> This backlog slice. Evidence needed: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- `flow list` lists in its documented default form; new `flow statuses` reports each kind's status vocabulary and settable indicators; the scaffold schema documents the enums and `priority`.

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

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
