# Logics Manager 2.24.6

Make package updates resolve and verify the exact published version. Release date: 2026-11-13.

## Package update reliability

Delivered in PR #66 (commit `079c48319d352e14637094770f11d3bb9ff2ae66`): [M-1042] Resolve and verify exact versions during package updates.

- Resolve the target online through npm or pip/pipx before installing an exact version, bypassing cached registry metadata.
- Verify the installed package version after installation and fail explicitly when an installer reports success without installing the target.
- Show installed and resolved target versions in check and dry-run output, skip installation when already current or newer, and fail explicitly when the registry cannot be reached.
- Keep JSON output machine-readable and resync skills only after a verified update.

## Maintenance

- Align release declarations, the README version badge, and lockfiles for 2.24.6, and regenerate the aggregate changelog.

## Validation

- Mock package managers to cover stale-cache false success, normal upgrades, already-current installs, registry failures, and check/dry-run behavior for npm, pip, and pipx.
