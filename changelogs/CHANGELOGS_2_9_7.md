# Logics Manager 2.9.7

## Improvements

- CDX status table now includes an **ON/OFF** toggle column that enables or disables any session directly from the viewer. Clicking the pill calls `cdx enable` or `cdx disable` on the host and flips the button state in place — no page reload required.
- New **Import** control (↑) on the CDX status screen lets you upload a `.cdx` bundle, enter an optional passphrase, and import accounts with or without merging into the existing set. The passphrase is forwarded exclusively through an environment variable (`CDX_IMPORT_PASS`) and never appears in any log or command line.
- New **Export** control (↓) on the CDX status screen lets you select which enabled sessions to bundle, supply an optional encryption passphrase, and choose whether to embed credentials (`--include-auth`). The resulting `cdx-accounts.cdx` file is downloaded automatically in the browser. Disabled sessions are excluded from the selection list. Temporary files are cleaned up on the server immediately after each operation.

## Docs

- Documented the CDX account import/export controls (passphrase handling, merge semantics, enabled-only export) and the ON/OFF toggle column in README.

## Validation

- `logics-manager audit`
- `logics-manager lint`
- `npm run release:changelog:validate`
- `npm run ci:check`
- `git diff --check`
