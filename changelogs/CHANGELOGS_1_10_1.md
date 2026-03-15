# Changelog (`1.10.0 -> 1.10.1`)

## Major Highlights

- Stabilized list/details behavior with more consistent empty-group filtering, safer scroll ownership, and anchored detail actions.
- Slimmed the VSIX package and reduced internal monoliths so the extension and bundled skills are easier to maintain and release.
- Strengthened regression coverage around list filters and layout CSS to catch the UI issues that were regressing most often.

## Version 1.10.1

### UI consistency and ergonomics

- Applied `Hide empty columns` consistently in list mode for stage-grouped views.
- Moved `Refresh` out of the primary toolbar and into the Tools menu to keep view controls focused.
- Fixed detail-panel scroll ownership so content scrolls independently while action buttons stay anchored at the bottom.

### Packaging and release quality

- Reduced VSIX file count and package footprint by bundling the extension host entry and packaging only release-critical assets.
- Kept Mermaid preview support working with the bundled release layout.

### Maintainability refactors

- Split the webview bootstrap into selector, persistence, and chrome-focused modules.
- Split the extension host entrypoint into a dedicated provider, preview HTML helper, and host utility modules.
- Split the monolithic webview harness tests by behavior domain.
- Split the Logics flow-manager script into a CLI entrypoint plus workflow support module.
- Split the React/Render bootstrap script into phase-oriented asset modules plus a smaller CLI entrypoint.

### Regression coverage

- Added list-mode regression coverage for empty-stage filtering.
- Tightened layout CSS assertions so critical selector rules are checked more explicitly.

### Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
