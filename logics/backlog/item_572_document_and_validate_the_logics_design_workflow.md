## item_572_document_and_validate_the_logics_design_workflow - Document and validate the Logics Design workflow
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Documentation and validation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- A new design command will be misused unless its boundaries are explicit: prompt pack generation only, no image generation, no credentials, no automatic app import.

# Scope
- In:
  - Document when to use `logics-manager design` versus `sync context-pack`, `flow scaffold`, and project-specific asset import scripts.
  - Add examples for icon-sheet, object-set, hero-image, and game-object-metadata packs.
  - Document output files and how another AI should consume them.
  - Add validation command guidance for generated packs and closeout notes.
  - If small, expose the stable schema to MCP after the CLI contract lands.
- Out:
  - A visual design system authoring guide.
  - Generator-specific credentials or API instructions.

# Acceptance criteria
- AC1: README or docs include concise `logics-manager design` examples and non-goals.
- AC2: Generated packs include clear next steps for external generation and local audit.
- AC3: Tests or docs verify the command does not promise automatic image generation.
- AC4: MCP exposure is either implemented with tests or explicitly deferred in the task report.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: README or docs include concise `logics-manager design` examples and non-goals.
- request-AC9 -> This backlog slice. Proof: AC2: Generated packs include clear next steps for external generation and local audit.
- request-AC10 -> This backlog slice. Proof: AC3: Tests or docs verify the command does not promise automatic image generation.
- request-AC4 -> This backlog slice. Evidence needed: Generated prompt text is copy-paste-ready for external AI generators and explicitly includes constraints such as no text/letters/numbers when relevant.
- request-AC5 -> This backlog slice. Evidence needed: The pack includes machining instructions for extraction, background removal, recentering, manual recrop triggers, transparent output, audit sizes, and integration validation.
- request-AC6 -> This backlog slice. Evidence needed: Built-in templates cover at least icon-sheet, object-set, hero-image, UI-icon-replacement, and game-object-with-metadata workflows.
- request-AC8 -> This backlog slice. Evidence needed: Validation catches impossible or ambiguous inputs such as non-positive count, unsupported grid, duplicate asset names, grid capacity below count, and unsafe output paths.
- request-AC4 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC5 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC6 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
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
- Summary: Document and validate the Logics Design workflow
- Keywords: scaffolded-backlog, document and validate the logics design workflow, implementation-ready
- Use when: Implementing the scaffolded slice for Document and validate the Logics Design workflow.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_296_orchestrate_logics_design_asset_prompt_pack_delivery` was finished via `logics-manager flow finish task` on 2026-07-28.
