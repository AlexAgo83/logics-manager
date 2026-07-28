## item_570_generate_cr_league_style_icon_sheet_and_object_set_prompt_contracts - Generate CR League style icon-sheet and object-set prompt contracts
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Prompt quality
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- AI image generators often fail if the prompt says only 'make icons'; CR League needed precise sheet structure, ordering, no-text constraints, padding, transparent background, and post-generation audit rules.

# Scope
- In:
  - For `icon-sheet`, generate prompt text that asks for 4 columns x 4 rows when appropriate, one centered icon per cell, transparent PNG, generous padding, no labels/text/letters/numbers/grid lines, readable at 24px/32px/48px, varied colors, and explicit left-to-right/top-to-bottom order.
  - For non-16 icon counts, recommend either a smaller grid or multiple sheets, but explain the recommendation rather than forcing arbitrary prompts per image.
  - For `object-set`, generate prompts that preserve consistent style, camera angle, lighting, transparent or simple key-color background, padding, and one object per cell.
  - For `hero-image`, avoid sheet constraints and produce a single composition prompt with aspect ratio, safe crop area, and no unwanted text.
  - Add tests that snapshot the CR League-inspired 4x4 prompt and verify constraints are present.
- Out:
  - A universal prompt that works for every generator.
  - Replacing project-specific art direction.

# Acceptance criteria
- AC1: The 4x4 icon-sheet prompt includes all CR League-derived constraints and explicit asset order.
- AC2: Non-16 counts get a reasonable recommendation without forcing 4x4.
- AC3: Hero-image prompts do not include sheet/grid instructions.
- AC4: Snapshot or focused tests verify the prompt content.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The 4x4 icon-sheet prompt includes all CR League-derived constraints and explicit asset order.
- request-AC4 -> This backlog slice. Proof: AC2: Non-16 counts get a reasonable recommendation without forcing 4x4.
- request-AC5 -> This backlog slice. Proof: AC3: Hero-image prompts do not include sheet/grid instructions.
- request-AC6 -> This backlog slice. Proof: AC4: Snapshot or focused tests verify the prompt content.
- request-AC10 -> This backlog slice. Proof: AC4: Snapshot or focused tests verify the prompt content.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)
- Request: `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`
- Primary task(s): `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# AI Context
- Summary: Generate CR League style icon-sheet and object-set prompt contracts
- Keywords: scaffolded-backlog, generate cr league style icon-sheet and object-set prompt contracts, implementation-ready
- Use when: Implementing the scaffolded slice for Generate CR League style icon-sheet and object-set prompt contracts.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
