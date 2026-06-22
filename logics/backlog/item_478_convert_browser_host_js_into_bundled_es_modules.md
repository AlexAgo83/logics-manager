## item_478_convert_browser_host_js_into_bundled_es_modules - Convert browser-host.js into bundled ES modules
> From version: 2.12.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Frontend decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- clients/viewer/browser-host.js is a single 10152-line IIFE with 439 functions and no module boundaries.

# Scope
- In:
  - Carve the IIFE into ES modules under clients/viewer/src/ (auth/lan, modals, preferences/state, fetch, columns, rendering, etc.)
  - Bundle to the existing browser-host.js artifact via the esbuild pipeline from the guardrails slice
  - Keep sync-viewer-assets.mjs emitting an identical shipped artifact
- Out:
  - Changing viewer runtime behavior or HTML/CSS contracts
  - Introducing a frontend framework

# Acceptance criteria
- AC1: Source ES modules each target under 500 lines.
- AC2: tests/viewer.browser-host.test.ts passes against the bundled output.
- AC4: The bundled browser-host.js is byte-stable and sync-viewer-assets.mjs --check passes.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Source ES modules each target under 500 lines.
- request-AC2 -> This backlog slice. Proof: AC2: tests/viewer.browser-host.test.ts passes against the bundled output.
- request-AC4 -> This backlog slice. Proof: AC4: The bundled browser-host.js is byte-stable and sync-viewer-assets.mjs --check passes.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)
- Request: `req_270_modularize_oversized_source_files_across_the_codebase`
- Primary task(s): `task_267_orchestrate_the_oversized_source_modularization_program`

# AI Context
- Summary: Convert browser-host.js into bundled ES modules
- Keywords: scaffolded-backlog, convert browser-host.js into bundled es modules, implementation-ready
- Use when: Implementing the scaffolded slice for Convert browser-host.js into bundled ES modules.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
