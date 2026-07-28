## item_571_add_asset_machining_and_audit_instructions_to_design_packs - Add asset machining and audit instructions to design packs
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Asset machining
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The prompt alone is not enough; CR League succeeded because the asset workflow also defined extraction, background removal, recentering, manual recrop, audit sheets, and app integration checks.

# Scope
- In:
  - Generate processing instructions for sheet extraction: crop cells, remove background, trim alpha, recenter on transparent 256x256 or configured canvas, and write kebab-case filenames.
  - Generate manual recrop triggers: chopped icon, foreign cell fragments, surviving shadow, off-center bbox, unreadable 24px preview.
  - Generate audit instructions for full-size and 48px/32px/24px previews, including rejection criteria.
  - Generate object metadata guidance when kind is `game-object-metadata`, including optional anchors, contact points, orientation, light points, and calibration knobs.
  - Keep instructions generic and clearly marked as post-generation guidance, not automatic execution.
- Out:
  - Bundling rembg/Pillow or other image dependencies into Logics Manager.
  - Running background removal or crop scripts.

# Acceptance criteria
- AC1: Icon-sheet packs include extraction, recentering, manual recrop, and multi-size audit steps.
- AC2: Game-object packs include metadata and calibration guidance inspired by the car asset workflow.
- AC3: Packs clearly state that human visual audit remains required.
- AC4: Tests verify machining sections appear for sheet/object kinds and stay absent or simplified for hero images.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Icon-sheet packs include extraction, recentering, manual recrop, and multi-size audit steps.
- request-AC9 -> This backlog slice. Proof: AC2: Game-object packs include metadata and calibration guidance inspired by the car asset workflow.
- request-AC10 -> This backlog slice. Proof: AC3: Packs clearly state that human visual audit remains required.
- request-AC4 -> This backlog slice. Evidence needed: Generated prompt text is copy-paste-ready for external AI generators and explicitly includes constraints such as no text/letters/numbers when relevant.
- request-AC6 -> This backlog slice. Evidence needed: Built-in templates cover at least icon-sheet, object-set, hero-image, UI-icon-replacement, and game-object-with-metadata workflows.
- request-AC7 -> This backlog slice. Evidence needed: The command can write a repo-bounded markdown/json bundle under `logics/design/<slug>/` and can dry-run without writing.
- request-AC8 -> This backlog slice. Evidence needed: Validation catches impossible or ambiguous inputs such as non-positive count, unsupported grid, duplicate asset names, grid capacity below count, and unsafe output paths.
- request-AC4 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC6 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC7 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC8 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)
- Request: `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`
- Primary task(s): `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# AI Context
- Summary: Add asset machining and audit instructions to design packs
- Keywords: scaffolded-backlog, add asset machining and audit instructions to design packs, implementation-ready
- Use when: Implementing the scaffolded slice for Add asset machining and audit instructions to design packs.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_296_orchestrate_logics_design_asset_prompt_pack_delivery` was finished via `logics-manager flow finish task` on 2026-07-28.
