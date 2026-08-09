## task_314_orchestrate_judging_evidence_against_the_release - Orchestrate judging evidence against the release
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Resolve the release commit from the tag, compare release-tree evidence against it, and keep the untagged case working.
- [x] 2. Let each gate declare which comparison it makes, record the choice for the shipped gates, and document it.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_647_compare_release_tree_evidence_against_the_tagged_commit`
- `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC2 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC3 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC5 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC6 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC4 -> `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`. Proof deferred to slice closeout.
- request-AC5 -> `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`. Proof deferred to slice closeout.
- request-AC6 -> `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`. Proof deferred to slice closeout.
- request-AC1 -> This task. Proof: `_release_commit`/`_commit_for_tag` (logics_manager/release.py) resolve the release commit from the tag, not `HEAD`; `test_release_status_stays_valid_at_tagged_commit_after_later_commits_land` (tests/python/test_release_contract_schema.py).
- request-AC2 -> This task. Proof: same test asserts the `ci` gate (comparison: release) stays `passed` after a closeout commit lands past the tag.
- request-AC3 -> This task. Proof: `_release_commit` falls back to the working commit when no tag resolves; `test_release_status_no_tag_falls_back_to_working_commit`.
- request-AC4 -> This task. Proof: gate `comparison`/`comparison_reason` fields (schema + contract.json + fixtures), reported in `_gate_payload` and `render_release_status`; `test_release_status_reports_comparison_and_names_it_in_branch_judged_gate` asserts `git_push` reports `comparison: branch`.
- request-AC5 -> This task. Proof: `_evidence_is_stale` names the comparison in the blocking reason (e.g. `evidence targets a different commit (release)` / `(branch)`); `test_release_status_blocks_ci_evidence_from_wrong_commit` and `test_release_status_reports_comparison_and_names_it_in_branch_judged_gate`.
- request-AC6 -> This task. Proof: the three tests above were added with the fix and fail against the prior `HEAD`-only, comparison-less implementation.

# Validation
- `python3 -m pytest -q` passed 2026-08-09: 1130 passed (includes new release-comparison tests).
- `logics-manager lint`: OK.
- `logics-manager audit`: OK (0 blocking; pre-existing AC-traceability warnings on req_317 clear once linked backlog items close).
- `logics-manager flow validate task_314_orchestrate_judging_evidence_against_the_release item_647_compare_release_tree_evidence_against_the_tagged_commit item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`: 0 findings.
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_647_compare_release_tree_evidence_against_the_tagged_commit`, `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`
- Related request(s): `req_317_judge_release_evidence_against_the_commit_the_release_was_cut_from`

# AI Context
- Summary: Orchestrate judging evidence against the release
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_317_judge_release_evidence_against_the_commit_the_release_was_cut_from`
- Product brief(s): `prod_065_evidence_about_the_release`
- Architecture decision(s): (none yet)
