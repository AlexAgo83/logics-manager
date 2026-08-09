## task_316_orchestrate_the_obsidian_graph_navigable_projection - Orchestrate the Obsidian graph-navigable projection
> From version: 2.21.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: claude

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Build ref detection and the wikilink transform in obsidian.py, applied only to refs that resolve to a real doc in the corpus.
- [x] 2. Make `clean()` reverse the transform exactly, and prove it with a round-trip test (sync, then clean, diff against pre-sync).
- [x] 3. Extend `--check` drift detection to flag wikilink mismatches alongside frontmatter drift.
- [x] 4. Add the dedicated test module.
- [x] 5. Update README.md and docs/cli.md wording.
- [x] 6. Validate and index.
- [x] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [x] Keep commit creation under operator control; do not force one commit per micro-step.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`
- `item_659_test_and_document_obsidian_as_a_supported_visualization_surface`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: `obsidian_payload(..., action="sync")` wikilinkifies a real ref; test_sync_converts_a_real_ref_to_a_wikilink passed.
- request-AC2 -> This task. Proof: test_clean_restores_the_canonical_body_byte_for_byte passed (sync then clean round-trips to the pre-sync body).
- request-AC3 -> This task. Proof: test_check_mode_reports_wikilink_drift passed (`--check` flags a hand-reverted wikilink the same way it flags frontmatter drift).
- request-AC4 -> This task. Proof: tests/python/test_obsidian_projection.py (6 tests) added and passing; none existed before this request.
- request-AC5 -> This task. Proof: README.md and docs/cli.md Obsidian sections updated to describe wikilink navigation as delivered, replacing the "may be added later" wording.

# Validation
- (no validation recorded yet)
- pytest tests/python/test_obsidian_projection.py passed on 2026-08-09: 6 passed; full repo suite (1165 tests) passed
- Finish workflow executed on 2026-08-09.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-09.
- Linked backlog item(s): `item_658_generate_reversible_wikilinks_in_the_obsidian_projection`, `item_659_test_and_document_obsidian_as_a_supported_visualization_surface`
- Related request(s): `req_319_standardize_the_obsidian_projection_into_a_graph_navigable_visualization_surface`

# AI Context
- Summary: Orchestrate the Obsidian graph-navigable projection
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_319_standardize_the_obsidian_projection_into_a_graph_navigable_visualization_surface`
- Product brief(s): `prod_067_obsidian_as_a_supported_graph_navigable_visualization_surface_for_logics_corpora`
- Architecture decision(s): (none yet)
