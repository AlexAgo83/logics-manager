## task_313_orchestrate_making_the_closeout_gate_satisfiable - Orchestrate making the closeout gate satisfiable
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-08 23:40:07

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. State the proof format in the finding, make the repair produce a passing line, and make the scaffold's output satisfy the gate.
- [x] 2. Derive the proof verdict once and have the three commands agree.
- [x] 3. Judge the working tree rather than the last commit, name only the missing indicators, and say what catches a commit made without them.
- [x] 4. Skip criteria that already carry a proof instead of appending a second one.
- [x] 5. Let the repair respect slice ownership: surfaced by step 1 on this request's own slices, carried by `item_646`.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`
- `item_643_derive_the_proof_verdict_once`
- `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`
- `item_645_repair_without_overwriting_what_was_written_by_hand`
- `item_646_let_the_ac_repair_respect_which_slice_owns_which_criterion`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`. Proof: `test_the_expected_form_names_the_target_and_the_keyword` in `tests/python/test_gate_you_can_satisfy.py`.
- request-AC2 -> `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`. Proof: `test_a_placeholder_is_not_a_proof` and `test_no_line_at_all_is_distinguished_from_an_unfilled_one`; the AC was corrected during implementation, recorded in the slice's decision note.
- request-AC3 -> `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`. Proof: `test_the_scaffold_emits_one_traceability_line_per_criterion`, which scaffolds a real corpus.
- request-AC4 -> `item_643_derive_the_proof_verdict_once`. Proof: `test_only_one_module_decides_what_counts_as_a_proof` and `test_the_legacy_allowance_is_named_not_reimplemented`.
- request-AC5 -> `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`. Proof: `test_a_committed_document_is_not_flagged_by_the_working_tree_gate` and `test_the_commit_check_still_catches_it`.
- request-AC6 -> `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`. Proof: `test_the_finding_names_only_indicators_a_remediation_can_change`.
- request-AC7 -> `item_645_repair_without_overwriting_what_was_written_by_hand`. Proof: `test_a_hand_written_proof_is_left_alone`.
- request-AC7 -> `item_646_let_the_ac_repair_respect_which_slice_owns_which_criterion`. Proof: `test_a_hand_written_proof_is_left_alone` and `test_the_orchestration_task_still_answers_for_every_criterion` in `tests/python/test_gate_you_can_satisfy.py`.
- request-AC8 -> every slice. Proof: the thirteen tests in `tests/python/test_gate_you_can_satisfy.py`, each run against the previous implementation and failing there.

# Validation
- (no validation recorded yet)
- command: `python -m pytest tests/python -q` | result: passed | date: 2026-08-08 | note: 1115 python tests passed
- Finish workflow executed on 2026-08-08.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-08.
- Linked backlog item(s): `item_642_say_what_a_proof_looks_like_and_produce_one_that_passes`, `item_643_derive_the_proof_verdict_once`, `item_644_let_the_indicator_gate_be_cleared_by_doing_what_it_says`, `item_645_repair_without_overwriting_what_was_written_by_hand`
- Related request(s): `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`

# AI Context
- Summary: Orchestrate making the closeout gate satisfiable
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_316_make_the_closeout_gate_teachable_self_consistent_and_non_destructive`
- Product brief(s): `prod_064_a_gate_you_can_satisfy`
- Architecture decision(s): (none yet)
