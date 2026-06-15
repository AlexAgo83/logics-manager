# Logics Manager 2.9.2

## Fixes

- Ship the current standalone browser viewer HTML, CSS, and host script in the Python package so `logics-manager view` exposes the Workshop, LAN, responsive viewer, and xterm.js integration released in 2.9.0.

## Validation

- `python -m pytest tests/python/test_logics_manager_cli.py -q -k python_viewer_assets`
- `python -m build`
- Wheel contents checked for the updated viewer `index.html`, `browser-host.js`, `viewer.css`, and xterm assets.
- Runtime HTTP check against `logics-manager view` for Workshop/LAN/xterm markup and assets.
