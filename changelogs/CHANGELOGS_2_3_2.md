# Changelog (`2.3.1 -> 2.3.2`)

Release `2.3.2` tightens the `logics-manager self-update` flow for operators who installed the Python package through `pipx` and for machines with both npm and Python installs on `PATH`.

## Why `2.3.2`

- `pipx install logics-manager` is the recommended Python install path on Debian, Ubuntu, and WSL, but `self-update --manager auto` still preferred the plain pip branch when the installed distribution was visible.
- Operators with both npm and pipx installs can update npm successfully while their shell keeps resolving an older `logics-manager` executable first.
- The externally managed Python guidance needed to distinguish updating an existing pipx install from migrating a system Python install into pipx.

## Highlights

- Added a `pipx` self-update manager.
- Made automatic manager selection prefer `pipx upgrade logics-manager` when the CLI is running from a pipx-managed virtual environment.
- Improved PEP 668 guidance so existing pipx users get the direct `pipx upgrade logics-manager` command.
- Added post-npm-update PATH conflict guidance when multiple `logics-manager` executables are discoverable.

## What Changed

### pipx Self-Update

- `logics-manager self-update --manager pipx` now runs `pipx upgrade logics-manager`.
- `logics-manager self-update` now detects the pipx venv layout and selects the pipx manager automatically when `pipx` is available.
- If `--manager pipx` is requested without `pipx` on `PATH`, the CLI fails with an explicit setup message instead of falling through to pip or npm.

### Mixed Install Diagnostics

- Successful npm self-updates now warn when more than one `logics-manager` executable is on `PATH`.
- The diagnostic points operators at `command -v -a logics-manager`, `pipx list`, and `npm list -g @grifhinz/logics-manager --depth=0`.
- README update guidance now documents `pipx upgrade logics-manager` separately from `pipx install --force logics-manager`.

## Upgrade Notes

- Existing npm and pip update commands still work.
- Existing pipx users should run `logics-manager self-update` or `logics-manager self-update --manager pipx`.
- `--break-system-packages` remains available only for explicit pip updates and is still not recommended for Debian, Ubuntu, or WSL system Python installs.

## Validation and Regression Evidence

- `python -m pytest tests/python/test_logics_manager_cli.py -q`
- `npm run ci:check`
- `npm run release:changelog:validate`
- `git diff --check`
