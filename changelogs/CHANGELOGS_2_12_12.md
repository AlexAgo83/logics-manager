# Logics Manager 2.12.12

## Viewer

- Added a Server menu with Restart and Stop actions so running viewer sessions can be controlled directly from the browser surface.
- Grouped Git controls into an Actions menu and added an explicit Fetch action, keeping the Git toolbar compact while preserving manual refresh workflows.
- Reconnected the workshop terminal stream after sleep/wake interruptions so resumed sessions recover terminal output without requiring a full viewer restart.

## Validation

- `rtk npm run release:changelog:validate`
- `rtk npm run ci:check`
- `rtk git diff --check`
