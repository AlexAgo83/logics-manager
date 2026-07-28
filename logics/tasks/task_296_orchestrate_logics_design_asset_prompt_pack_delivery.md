## task_296_orchestrate_logics_design_asset_prompt_pack_delivery - Orchestrate Logics Design asset prompt pack delivery
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 93
> Confidence: 88
> Progress: 0
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

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
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- Implementation complete.

# AI Context
- Summary: Orchestrate Logics Design asset prompt pack delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)
