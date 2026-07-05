# Logics Manager 2.16.0

## Canonical viewer in VS Code

- Embeds the canonical local viewer in the Logics panel with managed restart, reload, external-open, and current-document focus actions.
- Routes viewer terminal launches through VS Code while preserving commands containing spaces and quotes.
- Keeps the VS Code-only toolbar compact so the shared viewer remains the primary surface.

## Viewer and CDX hardening

- Persists project recency across embedded viewer restarts and dynamic local ports, keeping favorites ordered by actual last use.
- Adds a split five-hour and weekly CDX usage gauge with symmetric unknown-data handling.
- Terminates viewer processes that miss their startup deadline instead of leaving late orphan servers.
- Keeps shipped viewer assets and source maps synchronized for reliable diagnostics.

## Runtime and workflow reliability

- Restores the `Logics: Check Environment` command and aligns startup compatibility checks with the 2.15 runtime line.
- Recognizes packaged Logics Manager skills as a valid global runtime publication source, avoiding false startup warnings.
- Adds a one-command macOS Extension Development Host check that rebuilds viewer assets before launch.
- Delivers and closes the post-release viewer hardening workflow with clean Logics lint and audit state.

## Validation

- `npm run release:changelog:validate`
- `npm run ci:check`
- `git diff --check`
- `logics-manager lint --require-status`
- `logics-manager audit --group-by-doc`
