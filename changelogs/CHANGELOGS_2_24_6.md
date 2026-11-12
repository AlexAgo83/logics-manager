# Logics Manager 2.24.6

Make package updates resolve and verify the exact published version.

## Package update reliability

- Resolve the target online through npm or pip/pipx before installing an exact version, bypassing cached registry metadata.
- Verify the installed package version after installation and fail explicitly when an installer reports success without installing the target.
- Show installed and resolved target versions in check and dry-run output, skip installation when already current or newer, and fail explicitly when the registry cannot be reached.
- Keep JSON output machine-readable and resync skills only after a verified update.

## Validation

- Mock package managers to cover stale-cache false success, normal upgrades, already-current installs, registry failures, and check/dry-run behavior for npm, pip, and pipx.
