## req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout - Report workflow outcomes honestly across audit, help, and closeout
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Truthful audit verdicts, discoverable flags, and unambiguous command outcomes
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-08

# Needs
- Let a request be abandoned without the audit demanding the implementation chain that was deliberately never built.
- Let an operator discover a flag the tool itself recommends, from that command's own help.
- Let a caller tell a closeout that failed from a closeout that succeeded while an unrelated check failed.
- Let a reviewed edit be re-baselined twice in one day, so the recommended remediation can clear the finding it is recommended for.
- Stop warning an operator that a released plugin was never tested against the runtime it was released with.

# Context
- Three defects reported from real use of the workflow tooling, each one a surface that reports something other than what happened.
- The audit collapses every terminal status into one set: done, archived, obsolete, validated, settled and superseded all answer true to the same done check. That set is right for chain propagation and for filtering active work, but the delivered-request checks reuse it, so an intentionally abandoned request is asked to justify itself as if it had shipped.
- Closing an explicitly abandoned integration request in an operations corpus produced a blocking finding stating the delivered request had no linked backlog items. There is no backlog because the work was decided against, which is the point of the status. The acceptance-criteria traceability pass reaches the same request through a different route and would report the missing backlog again under another code.
- The same hand-maintained-duplicate pattern reaches the plugin. Its tested-runtime upper bound is a constant set once when the check was added and bumped by nothing since, while the runtime moved several minors past it. Since plugin and runtime ship together at the same version, the start-up warning now fires on the exact pairing the release produced.
- The lint command recommends re-baselining a reviewed body-only edit with a touch flag. The flag exists, is declared with its own help text, and works. The help screen for that command is a hand-written block of text listing the flags, and it lists neither the touch flag nor the relation flags. The tool therefore recommends a flag that its own help denies having.
- That command is one instance of a general drift. Comparing declared flags against the printed screens finds nine flags missing across seven commands, including the three structured validation flags on closeout that the implementation skill relies on. Each screen maintains a parallel hand-written list, so every screen drifts independently and silently.
- Closeout runs an optional repository-wide audit after it has already finished the task and propagated the chain. An unrelated blocking finding anywhere in the repository turns the returned outcome false while the task is genuinely closed and the changes are genuinely on disk. A caller reading only that outcome, and an operator reading the printed FAILED line, both conclude the closeout did not happen.
- Failing the closeout before it mutates anything is not available: the audit is repository-wide, so a blocker held by an unrelated corpus would make the command unusable, and some blockers are exactly what the closeout is about to repair.

# Acceptance criteria
- AC1: An abandoned request is not asked for linked backlog items, under any audit code.
- AC2: A delivered request still requires linked backlog items and still reports incomplete ones.
- AC3: Chain propagation and active-work filtering keep treating every terminal status alike, as they do today.
- AC4: Every flag a command declares appears on that command's help screen, derived from the declaration rather than restated beside it.
- AC5: A closeout that finishes the task reports that the task closed, distinctly from whether the post-close checks passed.
- AC6: The printed outcome of such a closeout does not read as a failure to close.
- AC7: Each defect leaves behind a test that fails against the current code.
- AC8: A reviewed edit can be re-baselined even when the document was already re-baselined earlier the same day.
- AC9: A version bound that must track a released version is derived from it, not restated beside it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_048_agent_facing_correctness_of_generated_docs_and_cli_contracts.md
- logics/product/prod_049_agent_facing_correctness_remediation.md
- logics/product/prod_052_reliable_cli_help_and_command_contract_discovery.md

# AI Context
- Summary: Report workflow outcomes honestly across audit, help, and closeout
- Keywords: request-chain-scaffold, report workflow outcomes honestly across audit, help, and closeout, development-ready
- Use when: You need to implement or review the scaffolded workflow for Report workflow outcomes honestly across audit, help, and closeout.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_611_stop_asking_abandoned_requests_for_an_implementation_chain`
- `item_612_make_the_indicator_update_help_list_the_flags_the_command_accepts`
- `item_613_report_a_closed_task_as_closed_even_when_a_post_close_check_fails`
- `item_614_let_a_same_day_re_baseline_actually_clear_the_indicator_gate`
- `item_618_derive_the_tested_runtime_bound_from_the_plugin_version`
