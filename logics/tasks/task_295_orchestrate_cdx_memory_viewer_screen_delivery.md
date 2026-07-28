## task_295_orchestrate_cdx_memory_viewer_screen_delivery - Orchestrate CDX Memory viewer screen delivery
> From version: 2.19.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [ ] 1. Slice 1: Add the read-only `/api/cdx-memory` payload by delegating to the shared cleaned `cdx memory` logic. Validate ready, empty, unavailable, unsupported-json, and noisy payload states with Python tests.
- [ ] 2. Slice 2: Add the CDX Memory sub-screen inside the existing CDX viewer surface, reusing existing CDX markup helpers and stable panel dimensions. Validate populated, scope-switch, toggle, and empty UI states with browser-host tests.
- [ ] 3. Slice 3: Add local quality badges/warnings for ready, high-noise, stale, empty, and unavailable memory without blocking unrelated CDX workflows. Validate warning/fallback behavior.
- [ ] 4. Slice 4: Close test gaps with the smallest visual or browser-host harness coverage available. Do not add a broad screenshot suite unless an existing fixture makes it cheap.
- [ ] 5. Closeout: run focused Python viewer tests, focused browser-host CDX tests, `logics-manager lint --require-status`, `logics-manager audit --group-by-doc`, and `git diff --check`; record exact commands and any deferred larger visual coverage.
- [ ] ADR 009 checkpoint: update affected Logics docs during each meaningful wave and leave the repo commit-ready.
- [ ] Keep commit creation under operator control; do not force one commit per micro-step.
- [ ] GATE: do not close until lint, audit, and scaffold validation pass.

# Backlog
- `item_564_expose_cleaned_cdx_memory_through_a_viewer_api_payload`
- `item_565_render_the_cdx_memory_sub_screen_in_the_viewer`
- `item_566_surface_cdx_memory_quality_warnings_without_blocking_cdx_use`
- `item_567_validate_cdx_memory_screen_integration_with_focused_visual_and_payload_tests`

# Definition of Done (DoD)
- [ ] Generated request, product, backlog, and task docs are present.
- [ ] Context-pack handoff is available when requested.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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
- Summary: Orchestrate CDX Memory viewer screen delivery
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection`
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)
