## item_578_stop_resolving_references_inside_code - Stop resolving references inside code
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Reference handling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-01

# Problem
- Reference extraction strips fenced mermaid blocks only, so a reference quoted in any other fence or in an inline code span is resolved as a genuine link.
- Writing the field report tripped the audit three times, and quoting the diagnostic reproduced the diagnostic.
- Any document that discusses references cannot show one without inventing an unresolvable link, and the rule cannot distinguish a document that links to a missing document from a document that is about links.

# Scope
- In:
  - Exclude all fenced code blocks and inline code spans from reference extraction, not only mermaid fences.
  - Apply the exclusion everywhere references are extracted, so lint, audit and repair agree.
  - Cover the case with a document quoting a reference in a fence, in an inline span, and as a genuine link.
- Out:
  - An escape syntax for citing a reference in running prose, which is deferred and largely subsumed by this fix.

# Acceptance criteria
- AC1: A reference inside a fenced code block is not resolved as a link, whatever the fence language.
- AC2: WITHDRAWN during implementation. This originally required inline code spans to be excluded too. That is incompatible with the corpus: backticks are how every genuine link is written (`- Request: \`req_...\``), so excluding inline spans would delete every real reference rather than only the quoted ones. Fenced blocks carry the whole reported defect; inline spans must keep resolving.
- AC3: A genuine reference outside a fence is still resolved, including one written as an inline span, with a test covering all forms in one document.
- AC4: Lint, audit and the repair commands agree on which references a document contains.

# AC Traceability
- request-AC13 -> This backlog slice. Proof: AC1: A reference inside a fenced code block is not resolved as a link.
- request-AC2 -> This backlog slice. Evidence needed: Roadmap validation reports every `##` heading it did not parse as a milestone, naming the heading, instead of silently lowering the count.
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
- request-AC14 -> This backlog slice. Evidence needed: Every reference accepted by `flow validate` is accepted by every other command that takes a reference, or the error names the kind restriction rather than reporting the document as missing.
- request-AC15 -> This backlog slice. Evidence needed: Every audit finding that names a repair command is fixed by that command, or the finding no longer names one.
- request-AC16 -> This backlog slice. Evidence needed: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.
- request-AC17 -> This backlog slice. Evidence needed: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- request-AC18 -> This backlog slice. Evidence needed: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Reference extraction excludes every fenced block, not only mermaid. AC2 withdrawn: excluding inline spans would delete every genuine link, since backticks are this corpus's link notation.

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Stop resolving references inside code
- Keywords: scaffolded-backlog, stop resolving references inside code, implementation-ready
- Use when: Implementing the scaffolded slice for Stop resolving references inside code.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
