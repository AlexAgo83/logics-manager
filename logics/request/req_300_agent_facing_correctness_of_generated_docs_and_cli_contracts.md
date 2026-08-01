## req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts - Agent-facing correctness of generated docs and CLI contracts
> From version: 2.19.5
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Agent-facing correctness
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Generated documents must be true about the project they are generated into, or visibly empty, never confidently wrong.
- Command output must describe what actually happened, so an agent that trusts it does not proceed on a false premise.
- A reference form accepted by one command must be accepted by every command that takes a reference, or the error must explain the kind restriction.
- A gate must have at least one exit that is a true statement.
- Advertised repairs must fix the findings that name them, or the findings must stop implying a repair exists.

# Context
- A full session on an external project using logics-manager 2.19.5 produced sixteen findings, recorded with verbatim invocations and outputs in prod_048.
- The workflow model itself held up; what failed is generated content and CLI contract consistency.
- Two defect classes dominate: documents that assert things that are false, and commands whose accepted input, repair behaviour, or success message does not match what they do.
- The sixteen findings collapse onto roughly eight edit sites, which is the shape that drives this slicing.
- Finding 10 is a regression introduced by a hardening fix in v2.10.0; findings 1, 2 and 3 are frozen boilerplate that has never been correct.
- Ordering is risk-first, not cost-first: the two cheapest findings carry the highest latent risk because both are silent by construction.
- Out of scope by explicit decision: a `doctor` command, and an escape syntax for citing references in prose.

# Acceptance criteria
- AC1: No dry-run path reports a completed action. Every dry-run message uses the conditional form, and no trailing summary line contradicts it.
- AC2: Roadmap validation reports every `##` heading it did not parse as a milestone, naming the heading, instead of silently lowering the count.
- AC3: No scaffolded document asserts work that has not happened. A freshly scaffolded task at zero progress contains no completion claim in any section.
- AC4: Scaffolded AC traceability is derived from `backlog_items[].request_acs` in the scaffold input, mapping each request AC to the backlog item that claims it.
- AC5: Scaffolding reports every request acceptance criterion claimed by no backlog item, at scaffold time rather than at review time.
- AC6: Scaffolded `# Validation` carries one line that cannot be mistaken for evidence, and that the `validation_evidence_missing` gate still rejects.
- AC7: Validation evidence stating a zero failure count is accepted. A single bullet reading `npm test passed (26 assertions, 0 failures)` satisfies the closeout preflight.
- AC8: `flow companion architecture` and `flow companion product` produce documents that pass `logics-manager lint` immediately, with no missing indicator.
- AC9: Companion bodies contain no content about any product other than the one named in the invocation, and every placeholder is impossible to mistake for content.
- AC10: `sync update-indicators` validates the requested indicators against the target document kind, and its error names the set that kind accepts.
- AC11: A semantic body edit that does not change status can be re-baselined without changing any indicator value and without labelling the edit non-semantic.
- AC12: Indicator values are written in the same format the templates use, so a corpus never mixes two forms for one indicator.
- AC13: Reference extraction ignores references inside fenced code blocks and inline code spans, so a document can quote a reference without creating a link.
- AC14: Every reference accepted by `flow validate` is accepted by every other command that takes a reference, or the error names the kind restriction rather than reporting the document as missing.
- AC15: Every audit finding that names a repair command is fixed by that command, or the finding no longer names one.
- AC16: `logics-manager index`, `flow start` and `flow progress` each report what they actually changed, including no-ops and documents modified beyond the one named.
- AC17: The status vocabulary and the scaffold input enums are discoverable without triggering a failure, and the documented key list matches the accepted key set.
- AC18: `logics-manager flow list` produces a listing in the default form shown as the first example in its own help text.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)

# References
- `logics/product/prod_048_agent_facing_correctness_of_generated_docs_and_cli_contracts.md` is the field report this remediation implements, with per-finding root causes and correction sites.
- `logics_manager/flow/__init__.py` owns scaffold templates, companion generation, repair commands, closeout, and the flow CLI surface.
- `logics_manager/flow_evidence.py` owns `has_validation_evidence`, the closeout preflight detector that rejects validation evidence containing failure counts.
- `logics_manager/sync.py` owns `update_workflow_indicators_payload` and the single global `APPROVED_WORKFLOW_INDICATORS` tuple.
- `logics_manager/lint.py` declares indicator sets per document kind in `KINDS`, which the mutation path in sync.py does not consult.
- `logics_manager/audit.py` extracts references and strips only fenced mermaid blocks, not other fences or inline code spans.
- `logics_manager/skill_assets/corpus/SKILL.md` documents the scaffold input keys and omits `priority` and the `complexity` enum.
- Commit `72d3553e` (v2.10.0) introduced the substring blocklist that causes the closeout validation regression.
- Commits `cd68dbf7`, `f92d9d20` and `cc31f320` (v2.0.0) introduced the scaffold and companion boilerplate that has never been correct.

# AI Context
- Summary: Agent-facing correctness of generated docs and CLI contracts
- Keywords: request-chain-scaffold, agent-facing correctness of generated docs and cli contracts, development-ready
- Use when: You need to implement or review the scaffolded workflow for Agent-facing correctness of generated docs and CLI contracts.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_573_make_dry_run_and_command_output_report_what_actually_happened`
- `item_574_report_roadmap_headings_that_are_not_parsed_as_milestones`
- `item_575_stop_scaffolded_tasks_asserting_work_that_has_not_happened`
- `item_576_accept_precise_validation_evidence_at_closeout`
- `item_577_make_indicator_updates_kind_aware_and_honestly_exitable`
- `item_578_stop_resolving_references_inside_code`
- `item_579_make_repair_commands_accept_the_references_they_name_and_fix_the_findings_that_name_them`
- `item_580_make_companion_documents_lint_clean_and_free_of_foreign_content`
- `item_581_make_vocabularies_discoverable_without_failing_first`
