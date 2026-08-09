## task_316_orchestrate_the_obsidian_graph_navigable_projection - Orchestrate the Obsidian graph-navigable projection
> From version: 2.21.1
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
- [ ] 1. Build ref detection and the wikilink transform in obsidian.py, applied only to refs that resolve to a real doc in the corpus.
- [ ] 2. Make `clean()` reverse the transform exactly, and prove it with a round-trip test (sync, then clean, diff against pre-sync).
- [ ] 3. Extend `--check` drift detection to flag wikilink mismatches alongside frontmatter drift.
- [ ] 4. Add the dedicated test module.
- [ ] 5. Update README.md and docs/cli.md wording.
- [ ] 6. Validate and index.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`
- `item_659_test_and_document_obsidian_as_a_supported_visualization_surface`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`. Proof deferred to slice closeout.
- request-AC2 -> `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`. Proof deferred to slice closeout.
- request-AC3 -> `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`. Proof deferred to slice closeout.
- request-AC4 -> `item_659_test_and_document_obsidian_as_a_supported_visualization_surface`. Proof deferred to slice closeout.
- request-AC5 -> `item_659_test_and_document_obsidian_as_a_supported_visualization_surface`. Proof deferred to slice closeout.

# Validation
- (no validation recorded yet)

# Report
- Not started.

# AI Context
- Summary: Orchestrate the Obsidian graph-navigable projection
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_319_standardize_the_obsidian_projection_into_a_graph_navigable_visualization_surface`
- Product brief(s): `prod_067_obsidian_as_a_supported_graph_navigable_visualization_surface_for_logics_corpora`
- Architecture decision(s): (none yet)
