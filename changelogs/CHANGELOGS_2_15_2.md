# Logics Manager 2.15.2

## Viewer crash resilience

- Detects unexpectedly blank document and project views, records the failure, and restores a usable surface.
- Re-renders failed screens from application state and pauses automatic refresh after repeated identical failures to prevent crash loops.
- Tracks interrupted viewer sessions with a heartbeat so abrupt renderer exits can be diagnosed after restart.

## Durable diagnostics

- Persists bounded, repository-scoped viewer diagnostics outside the repository and groups repeated failures by fingerprint.
- Adds browser, memory, viewport, Logics Manager version, and Git commit metadata while scrubbing URL query strings and fragments.
- Adds `logics-manager view diagnostics` and a Settings action to copy recent diagnostics.
- Ships deterministic viewer source maps so recorded stack traces resolve to the modular browser-host sources.

## Viewer navigation

- Keeps the Settings version link pointed at the Logics Manager repository instead of replacing it with the active project's remote.

## Python packaging

- Restores the `logics_manager.flow` subpackage in PyPI wheels so `logics-manager flow finish` and the other flow commands remain available after pip or pipx installation.

## Validation

- `node scripts/ci-check.mjs`
- `logics-manager health`
- `logics-manager audit`
- `logics-manager lint`
