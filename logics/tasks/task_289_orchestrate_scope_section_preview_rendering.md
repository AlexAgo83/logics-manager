## task_289_orchestrate_scope_section_preview_rendering - Orchestrate Scope section preview rendering
> From version: 2.17.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 80%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Add the minimal Scope-list detection to the shared markdown renderer, keeping generic lists as the fallback.
- [ ] 2. Add compact CSS for the structured Scope groups in the viewer stylesheet.
- [ ] 3. Cover the generated Scope sample and generic fallback in renderer tests.
- [ ] 4. Add or extend one viewer-host document preview test to assert the structured Scope output.
- [ ] 5. Regenerate the viewer bundle if the browser-host or assets require it, then run targeted tests and Logics validation.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_539_render_scope_in_and_out_groups_as_structured_preview_blocks`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.

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
- Summary: Orchestrate Scope section preview rendering
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_292_improve_scope_section_rendering_in_document_previews`
- Product brief(s): `prod_040_readable_scope_sections_in_document_previews`
- Architecture decision(s): (none yet)
