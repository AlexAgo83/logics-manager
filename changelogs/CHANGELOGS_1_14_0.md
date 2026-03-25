# Changelog (`1.13.0 -> 1.14.0`)

## Major Highlights

- Added a dedicated `Hybrid Insights` panel so the plugin can expose hybrid-assist ROI reporting through a full screen instead of compressing it into transient notifications or command output.
- Added a runtime-backed ROI dispatch surface with measured counters, derived rates, estimated ROI proxies, and recent audit drill-down while keeping the TypeScript layer thin over the shared Logics runtime.
- Advanced the bundled `logics/skills` submodule to the published `v1.4.0` kit line so the plugin release ships the latest bounded hybrid-assist commit execution and aligned runtime behavior.
- Kept release preparation aligned with the plugin version, curated changelog contract, and VSIX packaging flow for `1.14.0`.

## Version 1.14.0

### Hybrid Insights panel and ROI reporting

- Added the `Logics: Open Hybrid Insights` command and the matching `Tools > Hybrid Insights` action in the Orchestrator webview.
- Added a dedicated `Hybrid Assist Insights` webview panel with refresh and source-log drill-down behavior.
- Added runtime-backed rendering for measured counters, derived ratios, estimated ROI proxies, plugin insight sections, and recent audit context.

### Plugin wiring and regression coverage

- Extended the host API, main webview interactions, and provider plumbing so the new insights panel is reachable from both the command palette and the in-plugin tools menu.
- Added regression coverage for the new panel-opening path and kept the webview harness tests aligned with the extra tools-menu entry.
- Preserved the plugin thin-client boundary by continuing to rely on the shared `logics.py flow assist roi-report` runtime surface for report semantics.

### Bundled kit upgrade

- Advanced the bundled `logics/skills` submodule to `v1.4.0`.
- The plugin now packages the latest hybrid-assist flow-manager changes, including bounded commit execution support and the updated release-line documentation from the kit.

## Validation

- `npm run release:changelog:validate`
- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run lint:logics`
- `npm run package:ci`
