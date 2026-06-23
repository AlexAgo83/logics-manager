# Logics Manager 2.12.10

## Fixes

- Kept the workshop terminal's xterm instance and PTY resize state stable across viewer refreshes, preventing terminal sizing drift during interactive sessions.
- Improved release workflow detection so the viewer recognizes release automation that is not named exactly `release.yml`.

## Validation

- `rtk npm run release:changelog:validate`
- `rtk npm run ci:check`
- `rtk git diff --check`
