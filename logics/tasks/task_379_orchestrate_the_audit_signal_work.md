## task_379_orchestrate_the_audit_signal_work - Orchestrate the audit signal work
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Sequences the audit signal work: group, let a document settle a group, prove the original shape still fires, then say what is left.
- Keywords: orchestration, audit noise, duplicate proof
- Use when: Implementing this task.
- Skip when: Anything about what a proof must contain -- that is not touched here.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Group the shared proofs first: it is the smallest change and it makes the remaining volume readable enough to judge the rest.
- [x] 2. Add the declaration, then apply it to the documents in this corpus that are the legitimate pattern -- not to all of them.
- [x] 3. Prove the item_784 shape still fires, before believing the quieter number.
- [x] 4. Re-measure the audit by code and record what is left, with its number.
- [x] 5. Take every count from the working tree, not from the installed CLI: the two disagreed by 425 warnings while this was being scoped.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_821_report_a_shared_proof_once_not_once_per_pair`
- `item_822_let_a_document_settle_a_deliberate_shared_proof`
- `item_823_prove_the_check_still_finds_what_it_was_built_for`
- `item_824_say_what_the_audit_s_remaining_warnings_are`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task, via `item_821_report_a_shared_proof_once_not_once_per_pair`. Proof: `duplicate_proof_ac_groups` returns one group per shared proof and the finding names every criterion in it. On this corpus 437 findings became 127 -- the number of things there were to look at all along.
- request-AC2 -> This task, via `item_822_let_a_document_settle_a_deliberate_shared_proof`. Proof: `> Shared proof: AC1, AC2` settles the group it names and nothing else; the finding now names the line to write; and writing it does not trip the indicator gate, since recording a review is not work changing.
- request-AC3 -> This task, via `item_823_prove_the_check_still_finds_what_it_was_built_for`. Proof: the item_784/GH#20 shift shape is still reported after the grouping, and a declaration naming other criteria, only part of the group, or nothing parseable leaves it standing. item_823's own AC2 is recorded as revised, not met: a shifted block and a shared wave are the same bytes, so no rule can stop a declaration from covering one -- what holds is that silencing is never implicit or broad.
- request-AC4 -> This task, via `item_824_say_what_the_audit_s_remaining_warnings_are`. Proof: audit warnings on this corpus went 437 -> 127 (grouping) -> 13 (open documents only) -> 6 after grooming the request in flight. The six left are five deferred task-level proofs on this request, which close with it, and one `lineage_mentioned_but_not_declared`.
- request-AC5 -> This task, via `item_824_say_what_the_audit_s_remaining_warnings_are`. Proof: the finding that dominated the report was reporting the normal case, and is narrowed at the point where it is decided -- open documents only, with the reasoning recorded in `_duplicate_proof_issues` beside the two sibling checks that already did this. One check is left doing something similar and is recorded rather than fixed: `lineage_mentioned_but_not_declared` reads a citation of prior work in `# References` as undeclared lineage, which is the same family as the anchor defect fixed alongside this work. One finding, on one document; noted here rather than opened as a slice.

# Validation
- `tests/python/test_audit_cli.py`: 55 cases, including the grouping, the declaration's limits, the item_784 shape surviving both, and the open-document scope.
- Full Python suite run at the end of the slice: 1388 passed after fixing four viewer tests that item_814's warm-up had broken -- their fake servers stand in for a server and had not been taught `warm_corpus_reports`.
- Every count taken from the working tree, never from the installed CLI.
- Finish workflow executed on 2026-08-15.
- Linked backlog/request close verification passed.

# Report
- The check is unchanged in what it looks for and reports 6 warnings where it reported 437, because it now asks once per group and only where the answer can still change something.
- The premise turned out to be sharper than the scoping: all 122 documents it fired on were `Done`. The two sibling checks in the same file already skip closed documents, and say why in their own docstrings; this one did not, which is the whole of the 91%.
- The installed `logics-manager` on PATH was a second, older global install shadowing the current one, and it under-reported the corpus by 425 warnings while this was being scoped. Fixed by installing into the prefix PATH actually uses; the duplicate install is still there and will diverge again.
- Finished on 2026-08-15.
- Linked backlog item(s): `item_821_report_a_shared_proof_once_not_once_per_pair`, `item_822_let_a_document_settle_a_deliberate_shared_proof`, `item_823_prove_the_check_still_finds_what_it_was_built_for`, `item_824_say_what_the_audit_s_remaining_warnings_are`
- Related request(s): `req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on`

# Links
- Request: `req_368_make_the_duplicate_proof_check_say_something_a_reader_can_act_on`
- Product brief(s): `prod_099_an_audit_worth_reading`
- Architecture decision(s): (none yet)
