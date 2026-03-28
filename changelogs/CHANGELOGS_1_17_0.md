# Changelog (`1.16.0 -> 1.17.0`)

## Major Highlights

- Hardened repository-facing safety boundaries in the extension by rejecting pathological repo-local YAML agent manifests before parse, rendering board errors as plain text, and replacing coarse bootstrap checks with canonical repository-state inspection.
- Tightened maintainer trust flows with a real local `ci:check` contract, a blocking actionable-vulnerability audit gate, and clearer release-ready governance coverage across the Logics docs.
- Reworked the tools menu information architecture with grouped sections and a contextual `Recommended` block, and made recent activity cells expose `Updated` directly for faster triage.
- Advanced the bundled `logics/skills` submodule to the released `v1.6.1` kit line and continued bounded webview modularization by extracting the tools-panel layout seam into its own module.

## Version 1.17.0

### Repository safety and validation hardening

- Added deterministic size and nesting guardrails around repo-local `agents/openai.yaml` parsing so hostile manifests fail as validation issues instead of stressing the extension host.
- Replaced raw HTML injection on the board error path with safe text rendering, preserving operator-visible diagnostics without trusting extension-provided error strings as markup.
- Aligned local validation with the real repository contract through `scripts/ci-check.mjs`, and replaced the report-only audit workflow with `audit:ci`, which now blocks new actionable `npm audit` findings while documenting the remaining temporary toolchain exception.

### Canonical bootstrap and workflow-governance cleanup

- Replaced coarse bootstrap detection with explicit canonical bootstrap inspection so non-canonical or incomplete kit setups stay repairable instead of being treated as already healthy.
- Fixed Logics governance drift by normalizing decorated progress parsing, adding refresh-vs-lint Mermaid regression coverage, and cleaning the targeted placeholder debt surfaced by the audit wave.
- Added companion architecture and product docs for the delivery wave so the backlog set from `item_194` to `item_204` stays decision-complete under strict workflow audit rules.

### Tools menu and activity-panel scanability

- Reorganized the tools menu into grouped intent-based sections with a contextual `Recommended` area that surfaces the most relevant actions without removing any commands from the menu.
- Shortened and clarified several tool labels while keeping disabled actions understandable through preserved placement and explicit titles.
- Added `Updated` metadata to activity cells with compact formatting and graceful fallback for invalid timestamps, making quick triage more useful in narrow widths.

### Bundled kit and bounded modularization

- Advanced the bundled `logics/skills` submodule to the published `v1.6.1` release so the plugin ships the latest global-reviewer progress parsing and Mermaid lint regression fixes.
- Continued the modular vanilla-webview direction by extracting tools-panel layout behavior into `media/toolsPanelLayout.js`, reducing concentration in `media/webviewChrome.js` without introducing framework churn.

## Validation

- `npm run release:changelog:validate`
- `npm run ci:check`
