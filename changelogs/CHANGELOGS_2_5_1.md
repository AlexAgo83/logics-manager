# Changelog (`2.5.0 -> 2.5.1`)

Release `2.5.1` hardens the global CLI update path after mixed pipx, npm, and legacy pip installs exposed confusing version signals.

## Highlights

- Fixed local viewer update notices so packaged Python installs report the installed `logics-manager` version instead of falling back to `0.0.0`.
- Replaced the invalid zsh diagnostic command in self-update PATH conflict guidance.
- Added detected executable paths and zsh cache guidance to make mixed-install cleanup actionable.
- Fixed MCP subprocess calls so full Python tests can run outside the CI wrapper.
- Updated install troubleshooting docs for pipx, npm, and zsh users.

## What Changed

### Viewer Version Reporting

- The local viewer now reads the repository `VERSION` file when available and falls back to Python package metadata when running from an installed package.
- This keeps the viewer update banner aligned with `logics-manager --version` for pipx installs.

### Self-Update Diagnostics

- Self-update PATH conflict guidance now recommends `type -a logics-manager` and `whence -a logics-manager` instead of `command -v -a logics-manager`.
- The warning includes the exact executable paths detected on `PATH`.
- The warning tells zsh users to run `rehash` or open a new terminal after changing installs.

### Documentation

- The README install troubleshooting section now includes pipx diagnostics and zsh cache recovery.

### MCP Testability

- MCP tools now pass the package source root through `PYTHONPATH` when invoking child `logics-manager` commands.
- This keeps command-backed MCP tools working in temporary repositories during direct Python test runs.

## Upgrade Notes

- If several historical installs are present, keep one installation method active. `pipx` is the preferred Python install path.
- After removing or changing installs in zsh, run `rehash` before checking `logics-manager --version`.

## Validation and Regression Evidence

- `python3 -m pytest tests/python/test_logics_manager_cli.py -k "self_update or current_version or update_check"`
- `python3 -m pytest tests/python`
- `npm run ci:check`
- `npm run audit:ci`
- `npm run release:changelog:validate`
- `logics-manager lint --format json`
