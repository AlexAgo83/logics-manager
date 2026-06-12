# Logics Manager 2.8.1

## Highlights

- Fixes audit behavior so failing audit checks propagate non-zero exits instead of being masked by follow-up lint work.
- Improves viewer workspace navigation with a file explorer view, better file previews, configurable CDX status columns, and persisted auto-refresh preferences.
- Polishes CDX status controls with provider filtering, clearer table behavior, and branch CI visibility when the current local head has not been pushed yet.
- Hardens CDX mission closeout timeouts and release metadata drift checks.

## Workflow Corpus

- Adds and closes the workflow chain for persisted viewer preferences, CDX status controls, and workspace file views.
- Adds audit validation follow-up docs and records the release metadata drift verification path.
- Updates the Logics index for the completed audit and viewer follow-up work.

## Validation

- `npm run release:changelog:validate`
- `npm run docs:check`
- `logics-manager lint --require-status`
- `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
- `npm run ci:check`
- `npm run package`
