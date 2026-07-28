## req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows - Add Logics Design asset prompt packs for AI-generated artwork workflows
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 93
> Confidence: 88
> Complexity: High
> Theme: Design asset workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Operators need a repeatable way to turn a Logics need or free-form asset request into a copy-paste-ready prompt for an external AI image generator.
- The tool should produce more than a prompt: it should also specify transparency, grid layout, asset count, naming, order, dimensions, padding, and post-processing instructions.
- The tool should recommend 4x4 sheets for simple icon batches when useful, but must not force grid sheets when single-image, 2x2, or object-set generation is a better fit.
- Generated packs should include an asset machining plan inspired by CR League: extraction, recentering, background removal, manual recrop triggers, audit sizes, and integration validation.
- The first implementation should not call image-generation APIs or mutate app assets; it should create a design prompt pack humans or agents can copy into ChatGPT or another generator.
- The output should be usable by another AI developer without rediscovering the CR League rules.

# Context
- CR League board icons worked best when the prompt asked for `4 columns x 4 rows`, 16 transparent icons, one icon centered per 256x256 cell, explicit left-to-right/top-to-bottom order, no text, no letters, no numbers, no grid lines, and generous padding.
- CR League icon import was not prompt-only: useful delivery included stable kebab-case extraction names, Pillow/rembg extraction, manual recrop guidance, audit sheets at 48px/32px/24px, and UI integration checks.
- CR League cars used a different workflow: raw generations outside the app, processed manifests, top/side exports, crop to transparent canvas, metadata, point detection, preview overlays, and calibration knobs for real-world generator/background drift.
- The Logics Manager implementation should be generic enough for icon sheets, object sets, hero images, UI command icons, and game objects with metadata, while staying small and deterministic.
- A design prompt pack should be committed or emitted as markdown/json under a repo-bounded path such as `logics/design/<slug>/`, but should not store generated copyrighted images or generator credentials.
- Implementation guidance: ship prompt-pack generation before any asset-processing automation.
- Implementation guidance: make free-form `--text` the smallest reliable path; add Logics-ref reading if existing sync readers make it cheap.
- Implementation guidance: defer MCP exposure unless the CLI contract is already stable and the adapter is a thin wrapper.
- Implementation guidance: keep 4x4 recommendations heuristic, not mandatory; use 2x2, single-image, or metadata-oriented object prompts when those fit better.
- Open question for the operator: whether the first wave should include machining scripts. Recommendation: no, ship machining instructions first and add scripts only after repeated demand across repositories.

# Acceptance criteria
- AC1: A `logics-manager design` CLI surface can create a design prompt pack from a Logics ref or free-form text and emit both text and JSON output.
- AC2: The pack schema supports asset kind, generator target, transparency/background, dimensions, count, recommended layout, ordering, naming, style constraints, negative constraints, and post-processing steps.
- AC3: The tool recommends layout heuristics without forcing them: 4x4 for simple icon batches, 2x2 for semi-complex sets, one image per prompt for heroes/scenes, and metadata-oriented object sets for game assets.
- AC4: Generated prompt text is copy-paste-ready for external AI generators and explicitly includes constraints such as no text/letters/numbers when relevant.
- AC5: The pack includes machining instructions for extraction, background removal, recentering, manual recrop triggers, transparent output, audit sizes, and integration validation.
- AC6: Built-in templates cover at least icon-sheet, object-set, hero-image, UI-icon-replacement, and game-object-with-metadata workflows.
- AC7: The command can write a repo-bounded markdown/json bundle under `logics/design/<slug>/` and can dry-run without writing.
- AC8: Validation catches impossible or ambiguous inputs such as non-positive count, unsupported grid, duplicate asset names, grid capacity below count, and unsafe output paths.
- AC9: Documentation and examples make clear that Logics Design does not generate images, manage credentials, or replace human visual audit.
- AC10: Focused tests cover CLI text/json output, layout recommendation heuristics, schema validation, repo-bounded writes, and the CR League-inspired 4x4 icon-sheet prompt.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)

# References
- `../cr-league/docs/board-icon-assets-runbook.md` documents the 4x4 icon-sheet prompt contract, extraction names, rembg/Pillow cutting, manual recrop rules, audit sheet, and UI integration validation.
- `../cr-league/docs/car-assets-runbook.md` documents raw generation folders, processed manifests, transparent/cropped exports, metadata, green-screen processing, calibration knobs, and preview/audit flow.
- `../cr-league/scripts/generate-car-assets.py` shows reproducible asset machining after AI generation: chroma key, crop, orientation, light points, wheel contacts, metadata, and preview overlays.
- `logics_manager/flow/__init__.py` and `logics_manager/assist.py` show established CLI parser patterns and agent-facing output conventions.
- `logics_manager/sync.py` context-pack and read-doc commands provide bounded Logics context for request/backlog/task refs.
- `logics_manager/mcp.py` exposes tool schemas for agent clients and can later surface design-pack generation if the CLI contract is stable.
- `tests/python/test_cli_main.py`, `tests/python/test_flow_cli.py`, and related CLI tests cover command contracts and JSON/text output patterns.

# AI Context
- Summary: Add Logics Design asset prompt packs for AI-generated artwork workflows
- Keywords: request-chain-scaffold, add logics design asset prompt packs for ai-generated artwork workflows, development-ready
- Use when: You need to implement or review the scaffolded workflow for Add Logics Design asset prompt packs for AI-generated artwork workflows.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_568_define_the_logics_design_prompt_pack_schema_and_templates`
- `item_569_implement_the_logics_manager_design_cli`
- `item_570_generate_cr_league_style_icon_sheet_and_object_set_prompt_contracts`
- `item_571_add_asset_machining_and_audit_instructions_to_design_packs`
- `item_572_document_and_validate_the_logics_design_workflow`
