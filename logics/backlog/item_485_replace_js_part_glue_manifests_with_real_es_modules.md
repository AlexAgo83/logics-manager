## item_485_replace_js_part_glue_manifests_with_real_es_modules - Replace JS part-glue manifests with real ES modules
> From version: 2.12.8
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Frontend decomposition
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- browser-host (23), render-board-app (3), and main-app (3) are split into numbered _NN.js fragments of exactly 450 lines each, cutting through the middle of functions, so no fragment is valid standalone JS.
- index.js is a fake manifest: a `browserHostPartFiles`/`webviewPartFiles` string array parsed by regex in the build, then readFileSync(...).join("") concatenated before esbuild, so esbuild sees one blob with zero module boundaries (the frontend mirror of the Python exec part-glue).

# Scope
- In:
  - Replace the numbered _NN.js fragments with real ES modules split by responsibility, imported directly by index.js
  - Drop the regex string-manifest and the readFileSync(...).join("") concatenation in build-viewer-browser-host.mjs and build-webview-media.mjs; let esbuild resolve real imports
  - Keep the bundled browser-host.js / webview artifacts byte-stable through sync-viewer-assets.mjs
- Out:
  - The Python exec part-glue (handled by sibling slices item_482/item_483)
  - Changing viewer runtime behavior, HTML/CSS contracts, or rendered output

# Acceptance criteria
- AC1: The numbered _NN.js fragments and the regex string-manifests are removed; index.js imports real ES modules that esbuild resolves directly.
- AC2: Resulting frontend source modules are split by responsibility (not by a fixed line count) and none cut through a function.
- AC3: The bundled browser-host.js and webview artifacts stay byte-stable and sync-viewer-assets.mjs --check passes.

# AC Traceability
- request-AC9 -> This backlog slice. Proof: AC1: The numbered _NN.js fragments and the regex string-manifests are removed; index.js imports real ES modules that esbuild resolves directly.
- request-AC7 -> This backlog slice. Proof: AC3: The bundled browser-host.js and webview artifacts stay byte-stable and sync-viewer-assets.mjs --check passes.
- request-AC8 -> This backlog slice. Proof: AC2: Resulting frontend source modules are split by responsibility (not by a fixed line count) and none cut through a function.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_026_importable_module_remediation`
- Architecture decision(s): (none yet)
- Request: `req_273_replace_exec_compile_part_glue_with_importable_modules`
- Primary task(s): `task_270_orchestrate_the_exec_part_glue_remediation`

# AI Context
- Summary: Replace JS part-glue manifests with real ES modules
- Keywords: scaffolded-backlog, replace js part-glue manifests with real es modules, implementation-ready
- Use when: Implementing the scaffolded slice for Replace JS part-glue manifests with real ES modules.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
