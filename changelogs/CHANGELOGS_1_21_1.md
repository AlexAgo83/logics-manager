# Changelog (`1.21.0 -> 1.21.1`)

## Major Highlights

- `Publish Release` is now guarded by explicit GitHub capability checks and stays visible but disabled with a precise reason when the repository is not publishable.
- `Check Environment` is now more actionable, with a global summary, recommended fixes, current status, technical details, and stronger `Recommended` promotion when the repository actually needs attention.
- The plugin now handles older Logics repositories more gracefully with proactive `Update Logics Kit` guidance, repo-local bootstrap reconciliation, Claude bridge repair, and broader `.env*` remediation.
- The bundled `logics/skills` submodule is updated to `v1.9.1`.

## Release Workflow Guards

- Added explicit GitHub capability inspection before enabling `Publish Release` in the UI.
- `Publish Release` now remains visible but disabled with a precise reason when the repository has no compatible GitHub remote or when `gh` is unavailable.
- Added repo-local consent in `logics.yaml` for any future helper that fast-forwards the local `release` branch.
- `Prepare Release` messaging no longer implies AI execution when only the deterministic readiness check ran.
- The plugin now handles already-published versions by proposing the next patch version instead of appearing to do nothing.

## Environment And Migration UX

- `Check Environment` has been reworked into an action-first QuickPick with explicit section ordering: `Summary`, `Recommended actions`, `Current status`, `Technical details`.
- Remediation actions now use operator-facing wording (`Fix now`, `Optional`) instead of ambiguous technical labels.
- The extension can perform a silent startup check and proactively suggest `Update Logics Kit` when it detects an older canonical kit.
- Canonically bootstrapped but incomplete repositories are no longer treated as automatically converged.
- Bootstrap reconciliation now covers `logics.yaml`, `.gitignore`, runtime artifacts, and environment placeholders.

## Claude Parity And Assistant-Neutral Wording

- Shared plugin surfaces now use assistant-neutral wording instead of Codex-only wording when the same flow also works with Claude.
- The context-pack UI, session hints, and several guidance strings now use `Assistant` / `AI assistant` wording.
- `Repair Logics Kit` can now recreate the expected Claude bridge files (`.claude/commands/*`, `.claude/agents/*`) instead of only repairing the Codex path.

## Version And Runtime Reliability

- The plugin and runtime now verify `package.json` / `VERSION` alignment, and the changelog/release scripts prefer `package.json` when it exists.
- `Prepare Release` and `Publish Release` now block already tagged or published versions instead of treating a live release as ready.
- API key placeholders are now updated across every root-level `.env*` file, with `.env.local` created only when no env file exists.
- `.vscodeignore` now excludes `.env*` files from the VSIX correctly.

## Bundled Kit Update

- Updated the bundled `logics/skills` submodule to `v1.9.1`.
- The bundled kit includes hardened release flows, already-published version detection, version-artifact synchronization, and bootstrap improvements across all `.env*` files.

## Validation

- `npm run lint:ts`
- `npm test`
- `npm run test:smoke`
- `npm run ci:check`
