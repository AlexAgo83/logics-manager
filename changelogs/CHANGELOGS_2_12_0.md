# Logics Manager 2.12.0

## Improvements

- Improved the local viewer refresh loop so same-screen updates preserve scroll position, focus, selection, and open sections instead of jumping the operator back to the top.
- Let the local viewer start in repositories that do not have a bootstrapped `logics/` corpus yet, so the bootstrap flow is available without restarting the server.
- Kept CDX terminal typing sourced from the server terminal payload so CDX session badges remain stable across refreshes and reopen flows.
- Added a viewer-specific favicon badge using the Logics three-node mark on a circular white background while leaving the VS Code extension icon unchanged.
- Added fail-loud viewer asset drift protection through the local pre-commit hook and CI sync check.

## Refactors

- Split `logics_manager/viewer.py` by extracting LAN pairing/runtime code into `viewer_lan.py` and Workshop command/terminal runtime code into `viewer_workshop.py`, with compatibility re-exports from `viewer.py`.
- Split `logics_manager/assist.py` command implementations into themed support modules while preserving the public command surface.
- Split the large Python CLI test module into domain-focused test files with shared fixtures.
- Decomposed the VS Code corpus insights HTML implementation into reusable aggregate, chart, and formatting helpers.

## Governance

- Made AC traceability audit findings lifecycle-aware so proof is enforced at closeout rather than blocking early shaping work.
- Added actionable next-step guidance to validation findings and closed the related Logics workflow chains with validation evidence.

## Validation

- `node scripts/ci-check.mjs`
