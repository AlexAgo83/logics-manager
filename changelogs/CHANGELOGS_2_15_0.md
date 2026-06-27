# Logics Manager 2.15.0

## Shared web assets (req_285)

- Collapsed the byte-identical `clients/shared-web/src` twins into `clients/shared-web/media`, which is now the single hand-authored source for the shared webview scripts.
- `logics_manager/viewer_assets` is now generated at build time (`npm run build:assets`) and untracked from git, instead of a committed mirror — editing a shared web asset is a one-file change.
- `viewer.py` resolves assets repo-first and falls back to the packaged mirror, so a fresh clone serves the viewer with no build; the pip wheel keeps shipping complete assets, verified in CI.
- Retired the redundant mirror sync/check tooling, the mirror-parity lint gates, and the viewer-drift pre-commit hook.

## Recent Activity feed legibility (req_284)

- Git and CI activity markers now use distinct unicode glyphs (branch for git; check/cross/dot for CI by run health) coloured by badge state, with a per-kind left accent stripe; the kind and id stay in the tooltip and accessible label.
- Git and CI meta lines are recomposed into human summaries — `workflow · outcome · Nm ago` and `action · branch @ shortsha · Nm ago` — reusing the existing relative-time helper, degrading gracefully when data is absent.

## Scaffold robustness (req_286)

- `flow scaffold request-chain` now pre-flight validates input (enum domains for profile/mode/complexity) before any write, so an invalid value fails fast under both `--dry-run` and apply instead of throwing mid-apply.
- Scaffold apply is atomic: a mid-apply failure rolls back created docs and restores `INDEX.md`, leaving the repo unchanged and consuming no ids.
- `flow validate`/`audit` resolve short workflow refs (e.g. `req_286`) and emit a "did you mean" hint for ambiguous or missing refs.
- The scaffold input schema is discoverable via `--print-schema`/`--example`, now referenced from the flow help.

## Validation

- `python3 -m pytest tests/python/` (456 passed)
- `npx vitest run` (702 passed)
- `npm run lint`
- `logics-manager lint` / `logics-manager audit` (clean)
