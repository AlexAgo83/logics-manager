# Logics Manager 2.11.6

## Improvements

- Hardened release contract validation with fresher source-gate evidence checks and stricter release metadata handling.
- Improved MCP file safety by rejecting symlink-backed paths and adding regression coverage for MCP path handling.
- Strengthened update-check and MCP error handling so operator-facing failures are clearer and less brittle.
- Updated CDX mission launch behavior to request full filesystem permission for write-enabled missions.
- Refreshed Logics workflow docs and context packs for the release guard and write-mission work.
- Kept viewer host assets in sync with the packaged viewer copy after the workflow and mission refinements.

## Validation

- `node scripts/ci-check.mjs`
