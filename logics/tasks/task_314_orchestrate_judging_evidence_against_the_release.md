## task_314_orchestrate_judging_evidence_against_the_release - Orchestrate judging evidence against the release
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Resolve the release commit from the tag, compare release-tree evidence against it, and keep the untagged case working.
- [ ] 2. Let each gate declare which comparison it makes, record the choice for the shipped gates, and document it.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_647_compare_release_tree_evidence_against_the_tagged_commit`
- `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC2 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC3 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC5 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC6 -> `item_647_compare_release_tree_evidence_against_the_tagged_commit`. Proof deferred to slice closeout.
- request-AC4 -> `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`. Proof deferred to slice closeout.
- request-AC5 -> `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`. Proof deferred to slice closeout.
- request-AC6 -> `item_648_say_which_gates_are_about_the_branch_and_which_about_the_release`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate judging evidence against the release
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_317_judge_release_evidence_against_the_commit_the_release_was_cut_from`
- Product brief(s): `prod_065_evidence_about_the_release`
- Architecture decision(s): (none yet)
