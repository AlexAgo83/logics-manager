# Logics Manager 2.9.1

## Fixes

- Include the vendored xterm.js Workshop terminal assets in the Python package used by `pipx` / `logics-manager self-update`, so the standalone browser viewer serves the same Workshop terminal frontend as the VSIX and npm package.

## Validation

- `python -m build`
- Wheel contents checked for `logics_manager/viewer_assets/media/vendor/xterm/xterm.js`
- `npm run release:changelog:validate`
