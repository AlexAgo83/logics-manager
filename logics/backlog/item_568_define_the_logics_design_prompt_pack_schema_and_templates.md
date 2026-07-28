## item_568_define_the_logics_design_prompt_pack_schema_and_templates - Define the Logics Design prompt pack schema and templates
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Design pack model
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Without a stable pack model, prompt output will become ad hoc prose and will miss critical production details such as transparency, ordering, naming, and extraction constraints.

# Scope
- In:
  - Define a small JSON-compatible prompt pack schema with kind, generator_target, source_ref_or_text, style_brief, asset_names, count, layout, transparency/background, dimensions, ordering, negative_constraints, prompt_text, machining_steps, audit_steps, and validation_commands.
  - Add built-in templates for `icon-sheet`, `object-set`, `hero-image`, `ui-icon-replacement`, and `game-object-metadata`.
  - Implement layout recommendation heuristics: 4x4 for 9-16 simple icons, 2x2 for 2-4 semi-complex objects, single image for hero/scenes, and explicit multi-view object packs for metadata workflows.
  - Validate count, grid capacity, duplicate asset names, unsupported dimensions/layouts, and missing style/use-case fields.
  - Keep the schema plain enough for CLI JSON output and future MCP exposure.
- Out:
  - Persisting generated images.
  - Project-specific import scripts beyond generic machining instructions.

# Acceptance criteria
- AC1: The schema can represent icon sheets, object sets, hero images, UI icon replacements, and game-object metadata packs.
- AC2: Layout recommendation returns 4x4, 2x2, single, or multi-view recommendations based on kind/count without forcing a grid when it is not suitable.
- AC3: Invalid packs fail before write with clear field-level errors.
- AC4: Tests cover schema validation and layout recommendation edge cases.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The schema can represent icon sheets, object sets, hero images, UI icon replacements, and game-object metadata packs.
- request-AC3 -> This backlog slice. Proof: AC2: Layout recommendation returns 4x4, 2x2, single, or multi-view recommendations based on kind/count without forcing a grid when it is not suitable.
- request-AC6 -> This backlog slice. Proof: AC3: Invalid packs fail before write with clear field-level errors.
- request-AC8 -> This backlog slice. Proof: AC4: Tests cover schema validation and layout recommendation edge cases.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)
- Request: `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`
- Primary task(s): `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# AI Context
- Summary: Define the Logics Design prompt pack schema and templates
- Keywords: scaffolded-backlog, define the logics design prompt pack schema and templates, implementation-ready
- Use when: Implementing the scaffolded slice for Define the Logics Design prompt pack schema and templates.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
