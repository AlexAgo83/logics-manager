# Logics Manager 2.11.0

## Improvements

- Added release contract discovery commands and rules so release readiness can be inspected from explicit repository configuration.
- Improved viewer status refresh with TTL-backed payload caching, ETag revalidation, and stale async render guards.
- Added a consolidated `/api/status` endpoint for badge refresh consumers.
- Kept Workshop terminal sizing synchronized with the viewport.
- Improved Workshop terminal input handling for Shift+Enter newlines, including bracketed paste and kitty CSI-u sequences.
- Synced packaged viewer assets with the client viewer changes.
- Improved Workshop terminal controls with in-place redraws on Refresh and per-terminal Clear actions.
- Kept CDX status payloads fresh from badge polling.
- Added CDX session names and a larger clickable usage gauge on terminal rows.

## Validation

- `logics-manager status`
- `rtk logics-manager health`
- `rtk npm run -s release:changelog:validate`
- `rtk logics-manager audit`
- `rtk logics-manager lint`
- `rtk node scripts/ci-check.mjs`
- `git diff --check`
