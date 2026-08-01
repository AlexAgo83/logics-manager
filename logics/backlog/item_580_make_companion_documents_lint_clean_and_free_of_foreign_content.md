## item_580_make_companion_documents_lint_clean_and_free_of_foreign_content - Make companion documents lint-clean and free of foreign content
> From version: 2.19.5
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Generated content
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The architecture companion generator does not emit the indicator its own linter requires, so every invocation is followed by a guaranteed lint failure the caller must fix by hand.
- Its body is hardcoded prose about this tool's own architecture, which leaked verbatim into an unrelated product's decision record and was discarded in full.
- The generated text was plausible enough not to read as a placeholder, which is why it had to be detected as wrong before it could be replaced.

# Scope
- In:
  - Emit the indicator the linter requires for architecture documents.
  - Replace the hardcoded body with neutral prompts that cannot be mistaken for content.
  - Apply the same treatment to the product companion generator.
  - Assert in a test that a freshly generated companion passes lint with no manual edit.
- Out:
  - Generating substantive content for companion documents from the invocation.
  - Changing which indicators the linter requires.

# Acceptance criteria
- AC1: A freshly generated architecture companion passes `logics-manager lint` with no manual edit.
- AC2: No generated companion body contains content about a product other than the one named in the invocation.
- AC3: Every generated placeholder is recognisable as a placeholder on sight.
- AC4: A test generates each companion kind and asserts lint passes immediately.

# AC Traceability
- request-AC8 -> This backlog slice. Proof: AC1: A freshly generated architecture companion passes `logics-manager lint` with no manual edit.
- request-AC9 -> This backlog slice. Proof: AC2: No generated companion body contains content about a product other than the one named in the invocation.
- request-AC3 -> This backlog slice. Evidence needed: No scaffolded document asserts work that has not happened. A freshly scaffolded task at zero progress contains no completion claim in any section.
- request-AC4 -> This backlog slice. Evidence needed: Scaffolded AC traceability is derived from `backlog_items[].request_acs` in the scaffold input, mapping each request AC to the backlog item that claims it.
- request-AC5 -> This backlog slice. Evidence needed: Scaffolding reports every request acceptance criterion claimed by no backlog item, at scaffold time rather than at review time.
- request-AC6 -> This backlog slice. Evidence needed: Scaffolded `# Validation` carries one line that cannot be mistaken for evidence, and that the `validation_evidence_missing` gate still rejects.
- request-AC7 -> This backlog slice. Evidence needed: Validation evidence stating a zero failure count is accepted. A single bullet reading `npm test passed (26 assertions, 0 failures)` satisfies the closeout preflight.
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
- Architecture companions emit `> Drivers:` and pass lint immediately; both companion bodies carry parenthesised prompts instead of prose about this tool.

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make companion documents lint-clean and free of foreign content
- Keywords: scaffolded-backlog, make companion documents lint-clean and free of foreign content, implementation-ready
- Use when: Implementing the scaffolded slice for Make companion documents lint-clean and free of foreign content.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_297_orchestrate_agent_facing_correctness_remediation`

# Notes
- Task `task_297_orchestrate_agent_facing_correctness_remediation` was finished via `logics-manager flow finish task` on 2026-08-01.
