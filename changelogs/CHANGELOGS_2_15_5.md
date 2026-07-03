# Logics Manager 2.15.5

## Viewer terminal handling

- Fixes system terminal command launching, including Windows custom terminal commands.
- Tracks external terminal references so viewer terminal status updates stay accurate.
- Clarifies terminal mode wording in the viewer.

## Validation

- `node scripts/ci-check.mjs`
- `logics-manager health`
- `logics-manager audit`
- `logics-manager lint`
