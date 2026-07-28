## task_296_orchestrate_logics_design_asset_prompt_pack_delivery - Orchestrate Logics Design asset prompt pack delivery
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 93
> Confidence: 88
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- Ship prompt-pack generation before any asset-processing automation.
- Make free-form `--text` the smallest reliable path; add Logics-ref reading if existing sync readers make it cheap.
- Defer MCP unless the CLI schema has stabilized and the adapter is a thin wrapper.
- Keep 4x4 recommendations heuristic, not mandatory.

# Plan
- [ ] 1. Slice 1: Define the prompt-pack schema and template model. Add validation and layout recommendation tests before the CLI writes anything.
- [ ] 2. Slice 2: Implement the smallest top-level `logics-manager design` CLI that can read a Logics ref or free-form text and emit text/json prompt packs, with repo-bounded optional writes.
- [ ] 3. Slice 3: Add prompt renderers for icon-sheet, object-set, hero-image, UI-icon-replacement, and game-object-metadata workflows, including CR League-derived 4x4 icon-sheet rules.
- [ ] 4. Slice 4: Add machining/audit instruction rendering for sheet extraction, transparency, recentering, manual recrop, multi-size audit, and metadata-oriented game objects.
- [ ] 5. Slice 5: Document command usage, boundaries, output files, and examples; add MCP schema exposure only if the CLI contract is stable and the implementation is small.
- [ ] 6. Closeout: run focused Python CLI tests, prompt snapshot tests, `logics-manager lint --require-status`, `logics-manager audit --group-by-doc`, and `git diff --check`; record exact commands and any deferred image-processing automation.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Delivery guidance
- Ship prompt-pack generation before any asset-processing automation.
- Make free-form `--text` the smallest reliable path; add Logics-ref reading if existing sync readers make it cheap.
- Defer MCP unless the CLI schema has stabilized and the adapter is a thin wrapper.
- Keep 4x4 recommendations heuristic, not mandatory.

# Backlog
- `item_568_define_the_logics_design_prompt_pack_schema_and_templates`
- `item_569_implement_the_logics_manager_design_cli`
- `item_570_generate_cr_league_style_icon_sheet_and_object_set_prompt_contracts`
- `item_571_add_asset_machining_and_audit_instructions_to_design_packs`
- `item_572_document_and_validate_the_logics_design_workflow`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Evidence needed: The pack schema supports asset kind, generator target, transparency/background, dimensions, count, recommended layout, ordering, naming, style constraints, negative constraints, and post-processing steps.
- request-AC3 -> This task. Evidence needed: The tool recommends layout heuristics without forcing them: 4x4 for simple icon batches, 2x2 for semi-complex sets, one image per prompt for heroes/scenes, and metadata-oriented object sets for game assets.
- request-AC5 -> This task. Evidence needed: The pack includes machining instructions for extraction, background removal, recentering, manual recrop triggers, transparent output, audit sizes, and integration validation.
- request-AC7 -> This task. Evidence needed: The command can write a repo-bounded markdown/json bundle under `logics/design/<slug>/` and can dry-run without writing.
- request-AC9 -> This task. Evidence needed: Documentation and examples make clear that Logics Design does not generate images, manage credentials, or replace human visual audit.
- request-AC10 -> This task. Evidence needed: Focused tests cover CLI text/json output, layout recommendation heuristics, schema validation, repo-bounded writes, and the CR League-inspired 4x4 icon-sheet prompt.
- request-AC2 -> This task. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC3 -> This task. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC5 -> This task. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC7 -> This task. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC9 -> This task. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC10 -> This task. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Implemented top-level logics-manager design prompt with text/ref input, supported asset kinds, transparent/opaque guidance, 2x2/4x4 layout heuristics, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: focused CLI tests passed and npm run ci:check passed.
- Finish workflow executed on 2026-07-28.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-07-28.
- Linked backlog item(s): `item_568_define_the_logics_design_prompt_pack_schema_and_templates`, `item_569_implement_the_logics_manager_design_cli`, `item_570_generate_cr_league_style_icon_sheet_and_object_set_prompt_contracts`, `item_571_add_asset_machining_and_audit_instructions_to_design_packs`, `item_572_document_and_validate_the_logics_design_workflow`
- Related request(s): `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`

# AI Context
- Summary: Orchestrate Logics Design asset prompt pack delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)
