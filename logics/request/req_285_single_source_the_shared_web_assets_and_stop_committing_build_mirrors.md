## req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors - Single-source the shared web assets and stop committing build mirrors
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Build tooling
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Editing a shared-web asset means changing and committing exactly one file, with no manual re-bundle or re-sync step in between.
- No committed file is a byte-for-byte copy of another committed file, so diffs stop carrying two or three identical copies of every change.
- Both delivery targets (the pip wheel and the VS Code extension) keep shipping complete, working assets, produced by a single build step at package/release time.
- The Python tool still runs from a fresh git clone with no Node build, so contributors are not blocked.

# Context
- build-webview-media.mjs performs no transformation: it reads each src entry and writes it verbatim to clients/shared-web/media and logics_manager/viewer_assets/media, so clients/shared-web/src/render-board-app/index.js is byte-identical to clients/shared-web/media/renderBoardApp.js.
- The only hand-authored sources are clients/shared-web/media/** (CSS, mainCore.js, helpers) plus clients/viewer/**; the two src twins and all of logics_manager/viewer_assets/** are generated copies kept honest by check:webview-media, check:webview-media-mirror, and check:viewer-assets.
- viewer.py resolves runtime assets from PACKAGE_VIEWER_ASSETS_ROOT = Path(__file__).parent / 'viewer_assets', which is why the mirror is committed: the Python tool must find assets inside its own package dir, including when run from a clone without Node.
- The VS Code extension ships clients/shared-web/media/ and clients/viewer/* (package.json files[]); the pip wheel ships logics_manager/viewer_assets/** (pyproject package-data). A Node package (vsix) and a Python package (wheel) cannot share one physical directory, so two copies exist at ship time by construction — the open question is only whether the second copy is committed or generated.
- clients/viewer/browser-host.js is a real esbuild bundle from clients/viewer/src (req_273) and must NOT be confused with the shared-web 'bundle', which is a plain copy.
- check-source-line-budget.mjs already excludes the generated media bundles and carries budgets keyed on clients/shared-web/src/* paths, so removing the src twins requires repointing those budget entries.

# Acceptance criteria
- AC1: Each shared-web asset has exactly one committed, hand-authored home; no committed file is a byte-for-byte copy of another committed file.
- AC2: Editing a shared-web asset requires changing and committing a single file, with no manual bundle/sync step during development.
- AC3: The redundant clients/shared-web/src twins are removed and their lint / line-budget references repoint to the canonical clients/shared-web/media files.
- AC4: logics_manager runs from a fresh git clone with no Node build and still serves the viewer, via a fallback to the canonical source when packaged viewer_assets is absent.
- AC5: The pip wheel and the VS Code extension still ship complete, working assets, produced by a single build step run at package/release time.
- AC6: logics_manager/viewer_assets is no longer tracked in git; a single build:assets step regenerates it deterministically and CI verifies the shipped artifact.
- AC7: logics-manager lint and audit pass and the full pytest and vitest suites pass with no behavior change to the viewer or webview.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)

# References
- `scripts/build/build-webview-media.mjs` (copies clients/shared-web/src/{main-app,render-board-app}/index.js to media + viewer_assets — byte-for-byte, no transform)
- `scripts/dev/sync-webview-media.mjs` (mirrors clients/shared-web/media -> logics_manager/viewer_assets/media, 36 files)
- `scripts/dev/sync-viewer-assets.mjs` (mirrors clients/viewer -> logics_manager/viewer_assets/viewer, 3 files)
- `clients/shared-web/src/render-board-app/index.js` and `clients/shared-web/src/main-app/index.js` (redundant byte-identical twins of the media bundles)
- `clients/shared-web/media/` (authored CSS + mainCore.js + helpers, plus the two generated bundles renderBoardApp.js / mainApp.js)
- `logics_manager/viewer_assets/` (committed mirror shipped by the pip package)
- `logics_manager/viewer.py` (PACKAGE_VIEWER_ASSETS_ROOT = Path(__file__).parent / 'viewer_assets' at lines 208-209)
- `pyproject.toml` ([tool.setuptools.package-data] ships viewer_assets/**)
- `package.json` (files[] ships clients/shared-web/media/ and clients/viewer/* for the VS Code extension)
- `scripts/check-source-line-budget.mjs` (budgets reference clients/shared-web/src/* paths and exclude the generated media bundles)

# AI Context
- Summary: Single-source the shared web assets and stop committing build mirrors
- Keywords: request-chain-scaffold, single-source the shared web assets and stop committing build mirrors, development-ready
- Use when: You need to implement or review the scaffolded workflow for Single-source the shared web assets and stop committing build mirrors.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_518_collapse_the_redundant_clients_shared_web_src_twins_into_media`
- `item_519_add_a_dev_time_viewer_asset_fallback_in_viewer_py`
- `item_520_generate_viewer_assets_at_build_time_and_untrack_the_mirror`
- `item_521_retire_the_mirror_sync_check_tooling_and_update_ci_contributor_docs`
