# Changelog (`1.15.0 -> 1.16.0`)

## Major Highlights

- Corrected hybrid runtime health semantics so missing Claude bridge files no longer mark an otherwise healthy Ollama-backed runtime as degraded.
- Added an explicit per-flow backend policy in the shared hybrid runtime, making it clear which flows stay `ollama-first` under `auto` and which remain `codex-only`.
- Expanded the plugin’s thin-client hybrid assist surface with new operator actions for `Triage Item`, `Assess Diff Risk`, `Validation Checklist`, and `Doc Consistency`.
- Tightened release and operator hygiene around the shared runtime by ignoring generated hybrid audit/measurement artifacts and documenting the Windows-safe post-global-kit shared runtime path.

## Version 1.16.0

### Hybrid runtime status semantics and bridge alignment

- Reclassified Claude bridge availability as optional adapter metadata instead of degraded runtime health.
- Unified Claude bridge detection between the shared Python runtime and the VS Code extension, including compatibility across supported bridge variants.
- Kept runtime-status output explicit about backend readiness, Claude bridge availability, and the supported shared entrypoint for hybrid assist commands.

### Explicit per-flow backend policy

- Added per-flow backend policy metadata to the shared hybrid contract so `auto` no longer means “Ollama for everything when healthy”.
- Kept bounded proposal flows such as `diff-risk` eligible for local-first execution while keeping `next-step` policy-routed to Codex under `auto`.
- Preserved audit, measurement, fallback, and degraded semantics in the shared runtime as delegation expanded.

### Broader hybrid assist operator surface

- Added plugin/operator entrypoints for `Triage Item`, `Assess Diff Risk`, `Validation Checklist`, and `Doc Consistency`.
- Kept the plugin thin by routing those actions through `python logics/skills/logics.py flow assist ...` instead of duplicating backend logic in TypeScript.
- Continued surfacing backend-aware completion notifications so operators can see whether a result came from Ollama, Codex, or a degraded fallback path.

### Runtime artifact and Windows-path hygiene

- Stopped tracking generated hybrid runtime audit and measurement artifacts in git.
- Updated bootstrap behavior in the bundled kit so those generated files are ignored proactively in new repositories.
- Extended the Windows/post-global-kit release notes and README guidance around the supported shared runtime entrypoint and VM validation checklist.

## Validation

- `npm run release:changelog:validate`
- `npm run ci:check`
- `npm run package`
