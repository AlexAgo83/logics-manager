## item_574_report_roadmap_headings_that_are_not_parsed_as_milestones - Report roadmap headings that are not parsed as milestones
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
- A milestone heading with a non-numeric version was dropped silently: `flow roadmap validate` returned `OK` with a lowered count and named nothing.
- A milestone invisible to the tooling is a milestone that gets skipped, and the count was the only clue that anything had been lost.

# Scope
- In:
  - Make roadmap milestone parsing collect `##` headings it declines to parse and report each one.
  - Report them as warnings that name the heading verbatim, so the operator can see what was dropped.
  - Cover the case with a test using a heading whose version segment is not numeric.
- Out:
  - Widening the accepted milestone version grammar, which is a separate decision.
  - Changing the `OK` verdict when only unparsed headings are present.

# Acceptance criteria
- AC1: A roadmap containing a heading with a non-numeric version segment produces a warning naming that heading verbatim.
- AC2: The milestone count and the reported headings together account for every `##` heading in the document.
- AC3: A test covers a roadmap mixing parsed and unparsed headings.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: A roadmap containing a heading with a non-numeric version segment produces a warning naming that heading verbatim.
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
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- `roadmap validate` collects `##` headings it declined to parse and names each verbatim; the payload exposes `unparsed_headings`.

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Report roadmap headings that are not parsed as milestones
- Keywords: scaffolded-backlog, report roadmap headings that are not parsed as milestones, implementation-ready
- Use when: Implementing the scaffolded slice for Report roadmap headings that are not parsed as milestones.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
