## item_577_make_indicator_updates_kind_aware_and_honestly_exitable - Make indicator updates kind-aware and honestly exitable
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 92
> Confidence: 86
> Progress: 100%
> Complexity: Medium
> Theme: Gates
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The mutation path validates against a single global tuple of approved indicators while the linter declares them per document kind, so the two disagree and the gate can recommend a flag the target kind does not accept.
- On a roadmap the recommended remedy cannot work, leaving the marker for non-semantic edits as the only exit, which forces labelling a semantic edit as non-semantic.
- Passing current values returns unchanged and leaves the gate red, so clearing it requires inventing numeric drift, which degrades the indicators into edit counters.
- Written values drop the percent suffix the templates use, so a corpus ends up mixing two forms for one indicator.

# Scope
- In:
  - Validate requested indicators against the target document kind, sourced from the same declaration the linter uses.
  - Make the error name the set that kind accepts.
  - Add a re-baseline path that refreshes the signature without changing any value.
  - Correct the gate's suggested remedy so it is achievable for every kind it fires on.
  - Preserve the template format when writing indicator values.
  - Extend the same mutation path to the `Related request`, `Related backlog`,
    `Related task` and `Related product` indicator family, so an existing document
    can be linked to a chain after the fact.
- Out:
  - Changing which indicators each kind declares.
  - Adding a command that reports approved indicators up front, which belongs to the deferred `doctor` request.

# Acceptance criteria
- AC1: Requesting an indicator the target kind does not declare fails with an error naming that kind's accepted set.
- AC2: The per-kind indicator set is read from one declaration, with a test asserting the mutation path and the linter cannot diverge.
- AC3: A body edit that changes no indicator value can be re-baselined, clearing the gate without altering any value.
- AC4: The gate's suggested remedy succeeds on a roadmap that legitimately keeps its status.
- AC5: A written indicator value matches the format the templates use, verified on a document that already carries the suffixed form.
- AC6: An existing document can be linked to a request, backlog item, task or product brief through a command, with no hand edit of an indicator line.

# AC Traceability
- request-AC10 -> This backlog slice. Proof: AC1: Requesting an indicator the target kind does not declare fails with an error naming that kind's accepted set.
- request-AC11 -> This backlog slice. Proof: AC2: The per-kind indicator set is read from one declaration, with a test asserting the mutation path and the linter cannot diverge.
- request-AC12 -> This backlog slice. Proof: AC3: A body edit that changes no indicator value can be re-baselined, clearing the gate without altering any value.
- request-AC4 -> This backlog slice. Evidence needed: Scaffolded AC traceability is derived from `backlog_items[].request_acs` in the scaffold input, mapping each request AC to the backlog item that claims it.
- request-AC5 -> This backlog slice. Evidence needed: Scaffolding reports every request acceptance criterion claimed by no backlog item, at scaffold time rather than at review time.
- request-AC6 -> This backlog slice. Evidence needed: Scaffolded `# Validation` carries one line that cannot be mistaken for evidence, and that the `validation_evidence_missing` gate still rejects.
- request-AC7 -> This backlog slice. Evidence needed: Validation evidence stating a zero failure count is accepted. A single bullet reading `npm test passed (26 assertions, 0 failures)` satisfies the closeout preflight.
- request-AC8 -> This backlog slice. Evidence needed: `flow companion architecture` and `flow companion product` produce documents that pass `logics-manager lint` immediately, with no missing indicator.
- request-AC9 -> This backlog slice. Evidence needed: Companion bodies contain no content about any product other than the one named in the invocation, and every placeholder is impossible to mistake for content.
- request-AC13 -> This backlog slice. Evidence needed: Reference extraction ignores references inside fenced code blocks and inline code spans, so a document can quote a reference without creating a link.
- request-AC14 -> This backlog slice. Evidence needed: Every reference accepted by `flow validate` is accepted by every other command that takes a reference, or the error names the kind restriction rather than reporting the document as missing.
- request-AC15 -> This backlog slice. Evidence needed: Every audit finding that names a repair command is fixed by that command, or the finding no longer names one.
- request-AC16 -> This backlog slice. Evidence needed: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- `Kind.mutable_indicators` is the single declaration; the gate's remedy names only accepted flags; `--touch` stamps a review date for an honest re-baseline; written values keep the template percent form; the `Related *` family is settable.

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make indicator updates kind-aware and honestly exitable
- Keywords: scaffolded-backlog, make indicator updates kind-aware and honestly exitable, implementation-ready
- Use when: Implementing the scaffolded slice for Make indicator updates kind-aware and honestly exitable.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
