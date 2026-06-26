# Logics Manager 2.14.0

## Viewer

- Added minimizable desktop viewer screens with a bottom-left dock for restoring or closing saved screens.
- Kept minimized screen pills readable by increasing dock border contrast against the viewer background.
- Made board card metadata conditional: theme, status, and updated details stay hidden until the card is selected.
- Refined viewer warning state refresh so transient UI warnings do not linger across viewer updates.

## Workflow

- Added priority-aware backlog ordering so assistant-driven execution can surface higher-priority work first.
- Populated item priority on authoring and scaffolding paths and exposed priority on viewer cards.
- Closed the related assistant-prioritization and minimizable-screen product briefs for this release wave.
- Retuned existing source line-budget allowances for the current viewer and flow growth while keeping the default new-file guard in place.

## Workshop

- Bumped the Workshop terminal xterm integration and kept the browser viewer assets synchronized.
- Improved heavy TUI output handling in Workshop terminal rendering.

## Validation

- `rtk npm run release:changelog:validate`
- `rtk npm run docs:check`
- `rtk logics-manager health`
- `rtk logics-manager audit`
- `rtk logics-manager lint`
- `rtk node scripts/ci-check.mjs`
