## item_518_collapse_the_redundant_clients_shared_web_src_twins_into_media - Collapse the redundant clients/shared-web/src twins into media
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85
> Progress: 100%
> Complexity: Low
> Theme: Build tooling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- clients/shared-web/src/{main-app,render-board-app}/index.js are byte-identical copies of the media bundles, produced by a build step that only copies. The twin doubles every edit and adds a check:webview-media gate for nothing.

# Scope
- In:
  - Delete clients/shared-web/src and author renderBoardApp.js / mainApp.js directly under clients/shared-web/media
  - Repoint scripts/check-source-line-budget.mjs budget entries (and any lint targeting src/) to the canonical clients/shared-web/media files
  - Remove the build-webview-media.mjs script plus the bundle:webview-media and check:webview-media npm scripts and their CI wiring
- Out:
  - The committed viewer_assets mirror (handled by a sibling slice)
  - The clients/viewer/src esbuild bundle, which is a real build and stays

# Acceptance criteria
- AC1: clients/shared-web/src no longer exists; renderBoardApp.js and mainApp.js are the hand-authored files under clients/shared-web/media.
- AC2: line-budget and lint reference the media files and npm run lint passes.
- AC3: build-webview-media.mjs and check:webview-media are gone and no script copies src -> media.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: clients/shared-web/src no longer exists; renderBoardApp.js and mainApp.js are the hand-authored files under clients/shared-web/media.
- request-AC3 -> This backlog slice. Proof: AC2: line-budget and lint reference the media files and npm run lint passes.
- request-AC4 -> This backlog slice. Evidence needed: logics_manager runs from a fresh git clone with no Node build and still serves the viewer, via a fallback to the canonical source when packaged viewer_assets is absent.
- request-AC5 -> This backlog slice. Evidence needed: The pip wheel and the VS Code extension still ship complete, working assets, produced by a single build step run at package/release time.
- request-AC6 -> This backlog slice. Evidence needed: logics_manager/viewer_assets is no longer tracked in git; a single build:assets step regenerates it deterministically and CI verifies the shipped artifact.
- request-AC7 -> This backlog slice. Evidence needed: logics-manager lint and audit pass and the full pytest and vitest suites pass with no behavior change to the viewer or webview.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)
- Request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Primary task(s): `task_282_orchestrate_single_sourcing_of_shared_web_assets`

# AI Context
- Summary: Collapse the redundant clients/shared-web/src twins into media
- Keywords: scaffolded-backlog, collapse the redundant clients/shared-web/src twins into media, implementation-ready
- Use when: Implementing the scaffolded slice for Collapse the redundant clients/shared-web/src twins into media.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_282_orchestrate_single_sourcing_of_shared_web_assets`

# Notes
- Task `task_282_orchestrate_single_sourcing_of_shared_web_assets` was finished via `logics-manager flow finish task` on 2026-06-27.
