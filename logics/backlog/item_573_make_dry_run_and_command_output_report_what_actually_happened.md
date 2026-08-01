## item_573_make_dry_run_and_command_output_report_what_actually_happened - Make dry-run and command output report what actually happened
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Truthful output
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `flow companion` and `flow roadmap propose` print an unconditional past-tense summary line after their dry-run preview, so the output states that a document was created when nothing was written.
- `logics-manager index` prints the same success line whether or not it changed the file, `flow start` silently modifies linked backlog items, and `flow progress` never states the resulting value.
- These cost almost nothing to hit and were caught only by double-checking, which makes them the highest latent risk in the lot: an agent that trusts the message skips the real invocation.

# Scope
- In:
  - Make the trailing summary line in `cmd_companion` and `cmd_roadmap_propose` conditional on dry-run, matching the conditional form `flow scaffold` already uses.
  - Make `logics-manager index` distinguish a write from a no-op in its output.
  - Make `flow start` name every document it modified, not only the one passed on the command line.
  - Make `flow progress` state the resulting progress value.
  - Cover each command with a test asserting that dry-run output contains no past-tense completion claim.
- Out:
  - Changing what any of these commands actually write.
  - Reworking the dry-run preview format itself, which is useful as it stands.

# Acceptance criteria
- AC1: `flow companion architecture --dry-run` and `flow roadmap propose --dry-run` produce no line asserting creation, and the filesystem is unchanged after each.
- AC2: `logics-manager index` output distinguishes a run that wrote the index from a run that did not.
- AC3: `flow start` output lists every modified document, verified against the actual change set.
- AC4: `flow progress` output states the resulting progress value.
- AC5: A test asserts that no dry-run path in the flow CLI emits a past-tense completion claim.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `flow companion architecture --dry-run` and `flow roadmap propose --dry-run` produce no line asserting creation, and the filesystem is unchanged after each.
- request-AC16 -> This backlog slice. Proof: AC2: `logics-manager index` output distinguishes a run that wrote the index from a run that did not.
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
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- `flow companion` and `flow roadmap propose` say "Would create" on dry-run; `index` reports Unchanged on a no-op; `flow start` lists every modified document; `flow progress` already stated the resulting value and now has a test pinning it.

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make dry-run and command output report what actually happened
- Keywords: scaffolded-backlog, make dry-run and command output report what actually happened, implementation-ready
- Use when: Implementing the scaffolded slice for Make dry-run and command output report what actually happened.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
