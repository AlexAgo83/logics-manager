# Logics Manager 2.15.1

## Viewer and Workshop terminal

- Added Workshop system-terminal mode, including a viewer launch endpoint and UI toggle in Settings.
- Reports system-terminal launch failures in the viewer instead of failing silently.
- Reduced Workshop terminal renderer load while preserving the in-view terminal path.

## Viewer reliability

- Captures local viewer runtime errors for easier diagnosis.
- Preserves project view state across activity updates.
- Adds a refresh button to the viewer bootstrap warning banner.
- Lets CDX handoff choose the source session.

## Validation

- `node scripts/ci-check.mjs`
- `logics-manager health`
- `logics-manager audit`
- `logics-manager lint`
