# Changelog (`1.9.1 -> 1.9.2`)

## Major Highlights

- Fixed the marketplace/runtime packaging regression that left the extension stuck loading after install.
- Included the runtime dependencies required by the packaged extension instead of relying on workspace-local `node_modules`.
- Hardened the VSIX smoke checks so packaged dependency regressions are caught before release.

## Version 1.9.2

### Packaging hotfix

- Included the `yaml` runtime package in the published VSIX so extension activation no longer fails in marketplace-installed builds.
- Included the bundled `mermaid.min.js` asset required for rendered Markdown diagram previews in packaged builds.
- Reduced the hotfix scope to the minimum packaged runtime assets instead of shipping the whole Mermaid distribution tree.

### Validation hardening

- Extended the VSIX smoke checks to assert that packaged runtime dependencies are present.
- Added an explicit regression guard to ensure the heavyweight `mermaid.js` development bundle is not accidentally shipped.

### Validation

- `npm run test:smoke`
- `npm run package`
- `npm run release:changelog:validate`

