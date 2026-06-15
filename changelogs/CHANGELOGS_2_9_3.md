# Logics Manager 2.9.3

## Fixes

- Harden GitHub Actions release publishing against CodeQL-reported untrusted checkout and expression injection risks while preserving the release-to-publish flow through reusable workflows.
- Add explicit read-only GitHub token permissions to CI and security audit workflows.
- Bound local viewer file open and file preview endpoints to the active repository root, sanitize served content-type headers, and avoid shell-based file opening on Windows.
- Tighten Logics workflow document target resolution so sync operations only read or mutate approved repo-local workflow documents.
- Replace the local viewer document panel's generic "Read-only preview" header with short screen-specific descriptions.
- Tighten release support URL matching, npm registry outage detection, and Windows npm packaging command execution.

## Validation

- `python -m pytest tests/python/test_logics_manager_cli.py`
- `npm run lint -- --quiet`
- `npm run audit:ci`
- `npm run test:viewer-smoke`
- `logics-manager lint`
- `logics-manager audit`
