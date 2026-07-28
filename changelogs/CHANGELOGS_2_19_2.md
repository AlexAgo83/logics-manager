# Logics Manager 2.19.2

## Operator workflow polish

- Normalizes common workflow status aliases before persistence so CLI updates accept copy-pasted forms like `In Progress`.
- Improves remediation/help output for indicator updates, release evidence examples, RTK command guidance, and packaging truth checks.
- Adds `logics-manager roadmap status/place` for lightweight daily roadmap upkeep.

## CDX Memory inspection

- Adds a shared cleaned `cdx memory` payload, `assist cdx-memory show`, and `/api/cdx-memory`.
- Adds a read-only CDX Memory sub-screen in the viewer with current/global/project scopes, quality warnings, and raw/cleaned excerpts.

## Logics Design prompt packs

- Adds `logics-manager design prompt` for external AI asset generator prompts with transparent-background guidance, 2x2/4x4 sheet heuristics, machining notes, JSON/text output, and repo-bounded prompt-pack writes.

## Validation

- `npm run ci:check`
- `logics-manager lint --require-status`
- `logics-manager audit --group-by-doc`
- `git diff --check`
