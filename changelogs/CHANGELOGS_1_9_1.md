# Changelog (`1.9.0 -> 1.9.1`)

## Major Highlights

- Aligned the VS Code plugin with the Logics companion-doc workflow so product briefs and architecture decisions are visible and actionable from the panel.
- Hardened extension packaging, agent loading, multi-root runtime behavior, and smoke validation for safer real-world use.
- Started a real webview frontend modularization pass without introducing a full framework, reducing the weight of `main.js` and splitting rendering/CSS responsibilities.

## Version 1.9.1

### Logics workflow support in the plugin

- Added native support for companion docs across the plugin workflow model, including `product` and `architecture` document families.
- Surfaced companion docs in the detail panel with open/read/create actions and clearer navigation between supporting docs and the primary flow.
- Added supporting-doc visibility controls, supporting-doc badges, and clearer stage labels in the board and list views.
- Improved detail-panel behavior for long titles and identifiers so the layout remains stable instead of forcing broken overflow behavior.
- Added a `Hide empty columns` filter option so empty `request`, `backlog`, `task`, and supporting-doc columns can disappear from the board when desired.
- Fixed `Hide processed requests` so requests are hidden correctly whether linked backlog/task refs are stored as full paths or as Logics ids.

### Extension hardening and runtime behavior

- Cleaned VSIX packaging boundaries so development-only files are excluded from shipped builds.
- Replaced the narrow agent-definition parser with a real YAML-based loader that supports richer prompts more reliably.
- Made prompt-injection behavior more defensive and improved multi-root project-root selection.
- Added extension smoke coverage for packaged assets and activation readiness.

### Webview frontend structure

- Extracted shared workflow/model helpers, host bridge logic, board rendering, detail rendering, and markdown preview logic into dedicated webview modules.
- Split CSS concerns into dedicated files for layout, toolbar, board/cards, and detail panel styling while preserving lightweight asset loading.
- Kept the webview architecture in vanilla JS/CSS, with `main.js` moving closer to a bootstrap/state shell instead of a monolithic renderer.
- Completed the next modularization pass by extracting dedicated webview runtime modules for status messaging, harness behavior, and split-layout control.

### Validation

- `npm run compile`
- `npm run test`
- `npm run test:smoke`
- `npm run package:ci`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
