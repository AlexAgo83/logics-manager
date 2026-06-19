# Logics Manager 2.11.1

## Improvements

- Made full-audit and release-review Workshop missions always draft a Logics request so review work starts with a tracked corpus entry.
- Added a Run in terminal path for Workshop handoff missions, including a clearer terminal name and streaming CDX mission output.
- Required `--json` for CDX mission terminal launches so terminal-run reporting follows the expected machine-readable contract.
- Kept the viewer board recoverable when a render error occurs instead of leaving the browser surface stuck.
- Tuned Workshop run UX with terminal-first defaults and Shift+Enter redraw behavior.
- Synced packaged viewer assets with the client viewer changes.

## Validation

- `logics-manager status`
- `rtk npm run -s release:changelog:validate`
- `rtk logics-manager health`
- `rtk logics-manager audit`
- `rtk logics-manager lint`
- `rtk node scripts/ci-check.mjs`
- `git diff --check`
