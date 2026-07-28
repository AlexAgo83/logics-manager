## req_298_add_a_cdx_memory_viewer_screen_for_cleaned_handoff_inspection - Add a CDX Memory viewer screen for cleaned handoff inspection
> From version: 2.19.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer memory inspection
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Operators need a viewer-native way to inspect Codex memory quality before handing memory-derived context to another assistant.
- The CDX Memory screen should reuse the cleaned `cdx memory` payload from the assistant context work rather than scraping raw `.cdx/contexts` paths itself.
- The screen must be read-only: it can show current/global scopes, quality warnings, and raw/cleaned excerpts, but must not edit, clear, or append memory.
- The UI should fit inside the existing CDX area and share existing viewer CDX visual patterns instead of adding a new top-level product surface.
- Unavailable `cdx memory`, empty memory, noisy memory, and stale handoff states need explicit UI states so the operator can trust what they are seeing.

# Context
- The broader operator-ergonomics corpus already asks for `logics-manager assist cdx-memory show --scope current --clean --format json` and a read-only CDX Memory viewer sub-screen.
- `cdx memory list --json` returns current/global scopes and paths, while `cdx memory show --json` can return very noisy content with ANSI/TUI fragments.
- Existing viewer CDX areas already expose session/status/history/mission information; Memory belongs as a CDX sub-screen beside those surfaces, not as a new global navigation category.
- Existing CDX rendering helpers already cover rows, badges, pills, detail code blocks, path links, and empty states. The smallest correct UI should reuse these helpers.
- The screen should favor inspection and confidence: source scope, bytes before/after, estimated noise ratio, detected repo, latest useful handoff, warnings, and a raw/cleaned toggle.

# Acceptance criteria
- AC1: The viewer exposes a CDX Memory sub-screen or tab that is reachable from the existing CDX surface without adding a new top-level navigation item.
- AC2: The screen fetches a viewer API payload backed by the shared cleaned `cdx memory` logic and supports at least current and global scopes.
- AC3: The screen renders source path, scope, bytes before/after cleaning, estimated noise ratio, detected repo, warnings, and latest useful handoff excerpt.
- AC4: The screen provides a compact raw/cleaned inspection toggle without allowing memory mutation.
- AC5: Empty memory, unavailable `cdx memory`, unsupported JSON, and noisy-memory cleanup states are rendered explicitly and do not blank the viewer.
- AC6: Badges or status labels make high-noise, stale, or unavailable memory visible from the CDX area.
- AC7: Python tests cover the viewer payload for populated, empty, unavailable, and noisy memory cases.
- AC8: Browser-host tests cover the CDX Memory screen rendering, scope switching, raw/cleaned toggle, warning state, and no-overlap/empty-state behavior.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_046_cdx_memory_viewer_inspection`
- Architecture decision(s): (none yet)

# References
- `logics/backlog/item_562_use_cdx_memory_as_the_structured_source_for_assistant_context.md` defines the shared cleaned `cdx memory` payload and read-only viewer intent.
- `logics/request/req_297_improve_logics_operator_ergonomics_for_evidence_memory_packaging_and_roadmap_flow.md` includes AC7 for a CDX Memory sub-screen.
- `logics_manager/viewer.py` owns local viewer API payloads and existing CDX endpoints such as cdx status, runs, history, disk, and mission flows.
- `clients/viewer/src/browser-host/render.js` owns reusable CDX rendering helpers and `.viewer-cdx__*` markup patterns.
- `clients/viewer/src/browser-host/index.js` owns CDX screen state, fetching, badges, busy states, and menu wiring.
- `clients/viewer/viewer.css` owns local viewer styling, including CDX panels and responsive constraints.
- `tests/python/test_viewer_cli.py` covers viewer endpoint payloads.
- `tests/viewer.browser-host.test.ts` covers browser-host CDX rendering and interaction states.

# AI Context
- Summary: Add a CDX Memory viewer screen for cleaned handoff inspection
- Keywords: request-chain-scaffold, add a cdx memory viewer screen for cleaned handoff inspection, development-ready
- Use when: You need to implement or review the scaffolded workflow for Add a CDX Memory viewer screen for cleaned handoff inspection.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_564_expose_cleaned_cdx_memory_through_a_viewer_api_payload`
- `item_565_render_the_cdx_memory_sub_screen_in_the_viewer`
- `item_566_surface_cdx_memory_quality_warnings_without_blocking_cdx_use`
- `item_567_validate_cdx_memory_screen_integration_with_focused_visual_and_payload_tests`
