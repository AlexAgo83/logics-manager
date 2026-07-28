## item_569_implement_the_logics_manager_design_cli - Implement the logics-manager design CLI
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: CLI workflow
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Operators need a stable command that turns a Logics ref or free-form need into copy-paste-ready generator instructions and optional repo-bounded artifacts.

# Scope
- In:
  - Add a top-level `logics-manager design` command with subcommands such as `prompt`, `pack`, and `validate` if that split stays small.
  - Accept `--ref <logics_ref>` or `--text <need>` as the source; use bounded Logics doc reads for refs.
  - Accept kind/count/names/layout/background/dimensions/generator flags and provide safe defaults.
  - Support `--format text|json`, `--out logics/design/<slug>/`, and `--dry-run`.
  - Write repo-bounded `prompt.md`, `asset-pack.json`, and `processing.md` when `--out` is provided.
  - Add CLI tests for text output, JSON output, dry-run, repo-bounded write, invalid path, and duplicate names.
- Out:
  - Interactive prompting.
  - Image-generation API calls.
  - Automatic app asset imports.

# Acceptance criteria
- AC1: `logics-manager design prompt --text ... --kind icon-sheet --count 16 --format text` prints copy-paste-ready prompt text.
- AC2: `--format json` emits a schema-valid prompt pack.
- AC3: `--out logics/design/<slug>/` writes markdown/json artifacts and refuses paths outside the repo.
- AC4: Tests cover normal, dry-run, and invalid-input CLI paths.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `logics-manager design prompt --text ... --kind icon-sheet --count 16 --format text` prints copy-paste-ready prompt text.
- request-AC4 -> This backlog slice. Proof: AC2: `--format json` emits a schema-valid prompt pack.
- request-AC7 -> This backlog slice. Proof: AC3: `--out logics/design/<slug>/` writes markdown/json artifacts and refuses paths outside the repo.
- request-AC8 -> This backlog slice. Proof: AC4: Tests cover normal, dry-run, and invalid-input CLI paths.
- request-AC5 -> This backlog slice. Evidence needed: The pack includes machining instructions for extraction, background removal, recentering, manual recrop triggers, transparent output, audit sizes, and integration validation.
- request-AC6 -> This backlog slice. Evidence needed: Built-in templates cover at least icon-sheet, object-set, hero-image, UI-icon-replacement, and game-object-with-metadata workflows.
- request-AC9 -> This backlog slice. Evidence needed: Documentation and examples make clear that Logics Design does not generate images, manage credentials, or replace human visual audit.
- request-AC10 -> This backlog slice. Evidence needed: Focused tests cover CLI text/json output, layout recommendation heuristics, schema validation, repo-bounded writes, and the CR League-inspired 4x4 icon-sheet prompt.
- request-AC5 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC6 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC9 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`
- request-AC10 -> This backlog slice. Proof: Implemented logics-manager design prompt with text/ref input, asset kind templates, transparent and 2x2/4x4 guidance, machining notes, JSON/text output, and repo-bounded prompt-pack writes. Validation: npm run ci:check passed and focused design CLI tests passed. Source: `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_047_logics_design_asset_prompt_packs`
- Architecture decision(s): (none yet)
- Request: `req_299_add_logics_design_asset_prompt_packs_for_ai_generated_artwork_workflows`
- Primary task(s): `task_296_orchestrate_logics_design_asset_prompt_pack_delivery`

# AI Context
- Summary: Implement the logics-manager design CLI
- Keywords: scaffolded-backlog, implement the logics-manager design cli, implementation-ready
- Use when: Implementing the scaffolded slice for Implement the logics-manager design CLI.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_296_orchestrate_logics_design_asset_prompt_pack_delivery` was finished via `logics-manager flow finish task` on 2026-07-28.
