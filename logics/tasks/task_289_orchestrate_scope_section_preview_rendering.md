## task_289_orchestrate_scope_section_preview_rendering - Orchestrate Scope section preview rendering
> From version: 2.17.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Add the minimal Scope-list detection to the shared markdown renderer, keeping generic lists as the fallback.
- [x] 2. Add compact CSS for the structured Scope groups in the viewer stylesheet.
- [x] 3. Cover the generated Scope sample and generic fallback in renderer tests.
- [x] 4. Add or extend one viewer-host document preview test to assert the structured Scope output.
- [x] 5. Regenerate the viewer bundle if the browser-host or assets require it, then run targeted tests and Logics validation.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_539_render_scope_in_and_out_groups_as_structured_preview_blocks`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Proof: Implemented in commit a27aa13c; validated with renderMarkdown vitest, viewer browser-host read-preview vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `a27aa13c`
- request-AC3 -> This task. Proof: Implemented in commit a27aa13c; validated with renderMarkdown vitest, viewer browser-host read-preview vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `a27aa13c`
- request-AC5 -> This task. Proof: Implemented in commit a27aa13c; validated with renderMarkdown vitest, viewer browser-host read-preview vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `a27aa13c`
- request-AC7 -> This task. Proof: Implemented in commit a27aa13c; validated with renderMarkdown vitest, viewer browser-host read-preview vitest, lint:ts, check:viewer-host, and Logics lint/audit. Source: `a27aa13c`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- command: `npm test -- tests/renderMarkdown.test.ts; npm test -- tests/viewer.browser-host.test.ts -t 'opens read preview when a focused URL requests read mode'; npm run lint:ts; npm run check:viewer-host` | result: passed | date: 2026-07-12 | note: Scope renderer and viewer preview checks passed; TypeScript lint and viewer bundle check passed.
- Finish workflow executed on 2026-07-12.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-07-12.
- Linked backlog item(s): `item_539_render_scope_in_and_out_groups_as_structured_preview_blocks`
- Related request(s): `req_292_improve_scope_section_rendering_in_document_previews`

# AI Context
- Summary: Orchestrate Scope section preview rendering
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_292_improve_scope_section_rendering_in_document_previews`
- Product brief(s): `prod_040_readable_scope_sections_in_document_previews`
- Architecture decision(s): (none yet)
