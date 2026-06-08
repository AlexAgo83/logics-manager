# Changelog (`2.3.2 -> 2.3.3`)

Release `2.3.3` fixes the Python-packaged local viewer so `logics-manager view` serves the browser UI when installed from PyPI or through `pipx`.

## Why `2.3.3`

- The `2.3.2` Python package contained the CLI modules but did not include the local viewer HTML, CSS, JavaScript, media, or Mermaid vendor asset.
- In a PyPI or `pipx` install, the viewer server could start but `/` returned `{"ok": false, "error": "Not found"}` because `clients/viewer/index.html` was only available in the source tree and npm package.
- Operators using npm were less likely to hit this because the npm package already ships the `clients/` assets.

## Highlights

- Added packaged viewer assets under `logics_manager/viewer_assets`.
- Made `viewer.py` fall back to those packaged assets when source-tree `clients/...` paths are absent.
- Included the viewer assets in Python wheel and source distributions.
- Added regression coverage for serving the local viewer from packaged assets.

## What Changed

### Python Viewer Packaging

- The PyPI package now includes:
  - `index.html`, `browser-host.js`, and `viewer.css`
  - shared web CSS, JavaScript, icons, and rendering helpers
  - `mermaid.min.js` for rendered Markdown diagrams
- `logics-manager view` now resolves source assets in a repo checkout and packaged assets in an installed Python environment.

### Regression Coverage

- Added a server-level test that forces the viewer to use packaged assets and verifies `/`, `/browser-host.js`, `/viewer.css`, `/media/main.css`, and `/vendor/mermaid.min.js`.
- Verified wheel and sdist builds include the packaged viewer files.

## Upgrade Notes

- PyPI and `pipx` users affected by the JSON `Not found` page should upgrade to `2.3.3`.
- npm users can stay on npm, but `2.3.3` keeps npm, PyPI, and source installs aligned for the local viewer.

## Validation and Regression Evidence

- `python -m pytest tests/python/test_logics_manager_cli.py -q -k viewer`
- `python -m pytest tests/python/test_logics_manager_cli.py -q`
- `python -m build --wheel`
- `python -m build --sdist`
- venv smoke install from built wheel
- `npm run ci:check`
