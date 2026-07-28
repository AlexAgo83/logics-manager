## task_295_orchestrate_cdx_memory_viewer_screen_delivery - Orchestrate CDX Memory viewer screen delivery
> From version: 2.19.1
> Schema version: 1.0
> Status: Done
> Understanding: 93
> Confidence: 88
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Owner: codex

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.
- Build for daily inspection first: scope, source, quality status, latest useful handoff, warnings, and raw/cleaned toggle.
- Keep raw excerpts folded by default and never allow memory mutation from this screen.
- Reuse the shared cleaned memory payload; do not add a separate viewer-only scraper.

# Plan
- [ ] 1. Slice 1: Add the read-only `/api/cdx-memory` payload by delegating to the shared cleaned `cdx memory` logic. Validate ready, empty, unavailable, unsupported-json, and noisy payload states with Python tests.
- [ ] 2. Slice 2: Add the CDX Memory sub-screen inside the existing CDX viewer surface, reusing existing CDX markup helpers and stable panel dimensions. Validate populated, scope-switch, toggle, and empty UI states with browser-host tests.
- [ ] 3. Slice 3: Add local quality badges/warnings for ready, high-noise, stale, empty, and unavailable memory without blocking unrelated CDX workflows. Validate warning/fallback behavior.
- [ ] 4. Slice 4: Close test gaps with the smallest visual or browser-host harness coverage available. Do not add a broad screenshot suite unless an existing fixture makes it cheap.
- [ ] 5. Closeout: run focused Python viewer tests, focused browser-host CDX tests, `logics-manager lint --require-status`, `logics-manager audit --group-by-doc`, and `git diff --check`; record exact commands and any deferred larger visual coverage.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Delivery guidance
- Build for daily inspection first: scope, source, quality status, latest useful handoff, warnings, and raw/cleaned toggle.
- Keep raw excerpts folded by default and never allow memory mutation from this screen.
- Reuse the shared cleaned memory payload; do not add a separate viewer-only scraper.

# Backlog
- `item_564_expose_cleaned_cdx_memory_through_a_viewer_api_payload`
- `item_565_render_the_cdx_memory_sub_screen_in_the_viewer`
- `item_566_surface_cdx_memory_quality_warnings_without_blocking_cdx_use`
- `item_567_validate_cdx_memory_screen_integration_with_focused_visual_and_payload_tests`

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# AC Traceability
- request-AC1 -> This task. Proof: scaffold command generated the request-chain corpus.
- request-AC4 -> This task. Proof: optional context-pack handoff is supported.
- request-AC6 -> This task. Proof: dry-run and collision checks bound file changes.
- request-AC8 -> This task. Proof: CLI help documents the one-pass scaffold workflow.
- request-AC2 -> This task. Evidence needed: The screen fetches a viewer API payload backed by the shared cleaned `cdx memory` logic and supports at least current and global scopes.
- request-AC3 -> This task. Evidence needed: The screen renders source path, scope, bytes before/after cleaning, estimated noise ratio, detected repo, warnings, and latest useful handoff excerpt.
- request-AC5 -> This task. Evidence needed: Empty memory, unavailable `cdx memory`, unsupported JSON, and noisy-memory cleanup states are rendered explicitly and do not blank the viewer.
- request-AC7 -> This task. Evidence needed: Python tests cover the viewer payload for populated, empty, unavailable, and noisy memory cases.
- request-AC2 -> This task. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC3 -> This task. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC5 -> This task. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`
- request-AC7 -> This task. Proof: Implemented assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with scope controls, warnings, and raw/cleaned excerpts. Validation: npm run ci:check passed and focused Memory tests passed. Source: `task_295_orchestrate_cdx_memory_viewer_screen_delivery`

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.
- Implemented shared CDX memory payload, assist cdx-memory show, /api/cdx-memory, and the read-only CDX Memory viewer sub-screen with current/global/project scope controls plus raw/cleaned toggle and warnings. Validation: focused Python payload/API tests passed, focused browser-host CDX Memory test passed, npm run ci:check passed.
- Finish workflow executed on 2026-07-28.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-07-28.
- Linked backlog item(s): `item_564_expose_cleaned_cdx_memory_through_a_viewer_api_payload`, `item_565_render_the_cdx_memory_sub_screen_in_the_viewer`, `item_566_surface_cdx_memory_quality_warnings_without_blocking_cdx_use`, `item_567_validate_cdx_memory_screen_integration_with_focused_visual_and_payload_tests`
- Related request(s): `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`

# AI Context
- Summary: Orchestrate CDX Memory viewer screen delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)
