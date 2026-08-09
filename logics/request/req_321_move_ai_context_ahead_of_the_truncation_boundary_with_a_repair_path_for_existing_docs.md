## req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs - Move AI Context ahead of the truncation boundary, with a repair path for existing docs
> From version: 2.21.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Doc generation and structure repair
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 13:53:32

# Needs
- Position `# AI Context` right after the indicator block in every doc template, so it is not dropped by the default head-truncated reads (`flow show`, `read_logics_doc`) that many docs already exceed today.
- Give existing docs a deterministic, on-demand repair path to the same position, reusing the existing autofix-structure mechanism rather than a new command.
- Prove the fix against a concrete case: a doc read with the default 4000-char budget must include AI Context after the fix, where it demonstrably does not today.
- Make the repair reachable from every surface, not only the CLI and MCP it already reaches - specifically the browser viewer, and by extension VS Code, which today have no way to trigger it at all.

# Context
- `flow show` and the `read_logics_doc` MCP tool truncate with a plain `content[:max_chars]` slice - default 4000 characters, `_document_preview` for diffs defaults to 1600 - with no section awareness. Whatever falls after that many characters is silently dropped.
- `# AI Context` is placed near the end of every doc kind's template today: after Companion docs/References for a request, after AC Traceability/Decision framing/Links for a backlog item, after Validation/Report for a task. It is the one section whose entire purpose is fast relevance triage for an agent deciding whether to read further - placed exactly where a default bounded read is least likely to reach it.
- This is demonstrable on docs authored in this same session: req_318 is 14,340 characters, item_657 is 7,800, task_315 is 6,693 - all exceed the default 4000-character budget, so a default `flow show` on any of them today stops before ever reaching AI Context.
- `_autofix_structure()` (logics_manager/audit.py) already normalizes doc structure deterministically today - canonicalizing the Status and Schema version indicators and inserting missing DoR/DoD checklists - reachable both per-ref via `flow validate <ref> --apply-fixes` and corpus-wide via `audit --autofix-structure`. It already has the primitives needed (`_extract_section_bounds`, `_insert_section`) to cut a section out from wherever it is and reinsert it elsewhere; repositioning AI Context is an extension of this existing mechanism, not a new command.
- Doc templates are written by the generator functions in logics_manager/flow/ (and wherever request/backlog/task/product/roadmap templates are defined); their section order needs the same fix so a newly created doc does not reintroduce the problem the repair just fixed on existing ones.
- Checking every surface for this repair: CLI has it (`flow validate --apply-fixes`, `audit --autofix-structure`); MCP has it (the `autofix_structure` tool shells out to the same `audit --autofix-structure` command, confirmed by reading its dispatch); Codex/Hermes/Antigravity inherit both once req_318 wires their MCP/skill access, needing nothing extra here. The browser viewer has no mutating route for it at all - it only serves lint/audit read-only (`/api/lint`, `/api/audit`) - and neither does the VS Code extension, which exposes six commands (refresh/checkEnvironment/openViewer/restartViewer/openViewerExternal/focusCurrent), none of them repair-related.
- `prod_036_vs_code_embedded_viewer_parity` (Settled) already establishes that VS Code embeds the exact same canonical viewer UI and API as the browser - "one backend API contract for viewer data and actions" is a stated goal there. So one new mutating viewer route plus one button reaches both surfaces; no VS Code-specific code is needed on top.

# Acceptance criteria
- AC1: Every doc template (request, backlog, task, and any other kind that writes an AI Context section) places `# AI Context` immediately after the indicator block, before any other body section, for newly created docs.
- AC2: `_autofix_structure()` repositions an existing doc's `# AI Context` section to immediately after its indicator block when found elsewhere, leaving every other section's content and order unchanged.
- AC3: The repair is reachable both per-ref (`flow validate <ref> --apply-fixes`) and corpus-wide (`audit --autofix-structure`), matching the existing autofix UX, with no new command surface.
- AC4: The repair is idempotent - running it twice on an already-repaired doc makes no further change.
- AC5: A test proves the concrete case that motivated this: a doc whose full content exceeds the default 4000-char `--max-chars` budget has its AI Context section included in a default-budget `flow show`/`read_logics_doc` read after the fix, where it was excluded before.
- AC6: The browser viewer gains a mutating route (e.g. `/api/apply-fixes`) that calls the same underlying `audit --autofix-structure`/`--autofix-ac-traceability` command CLI and MCP already use, plus a button on the health/lint screen next to `--fixable` findings to trigger it. Because VS Code embeds the same canonical viewer UI and API (`prod_036`), this reaches VS Code without any VS Code-specific code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_069_ai_context_that_a_bounded_read_actually_reaches`
- Architecture decision(s): (none yet)

# References

# AI Context
- Summary: Move AI Context ahead of the truncation boundary, with a repair path for existing docs
- Keywords: request-chain-scaffold, move ai context ahead of the truncation boundary, with a repair path for existing docs, development-ready
- Use when: You need to implement or review the scaffolded workflow for Move AI Context ahead of the truncation boundary, with a repair path for existing docs.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_662_move_ai_context_ahead_of_the_truncation_boundary_in_doc_templates`
- `item_663_extend_autofix_structure_to_reposition_ai_context_in_existing_docs`
- `item_664_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs`
