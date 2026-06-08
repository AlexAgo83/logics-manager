# Changelog (`2.3.0 -> 2.3.1`)

Release `2.3.1` hardens the CLI self-update path for Debian, Ubuntu, WSL, and mixed npm/Python installations.

## Why `2.3.1`

- Debian and Ubuntu Python installations can be externally managed, which blocks direct system `pip install --upgrade` calls under PEP 668.
- Some operators install the npm package successfully while an older Python `logics-manager` binary remains earlier on `PATH`, leaving `logics-manager --version` stuck on the older version.
- The automatic self-update manager selection needed to respect npm-packaged runtimes instead of being misled by a stale Python distribution on the same machine.

## Highlights

- Added a guard that detects externally managed Python environments before running a pip self-update.
- Added operator guidance for safe `pipx` migration and npm updates when system Python cannot be updated with pip.
- Made `self-update --manager auto` prefer npm when the CLI is running from the npm package, even if an older Python distribution is also installed.
- Documented PATH conflict diagnostics for cases where npm updates succeed but the shell still resolves an older `logics-manager`.

## What Changed

### Self-Update Safety

- `logics-manager self-update --manager pip` now stops before invoking pip when Python is externally managed, unless the operator explicitly passes `--break-system-packages`.
- The guidance points Debian, Ubuntu, and WSL operators at `pipx install --force logics-manager` instead of system Python mutation.
- The npm update command remains available for npm installs: `npm install -g @grifhinz/logics-manager@latest`.

### npm/Python Mixed Installs

- Auto manager selection now detects npm-packaged runtime layout and updates through npm when npm is available.
- This prevents a stale Python package from redirecting an npm-installed CLI into the pip update path.
- The README now includes `command -v -a logics-manager` and direct npm binary checks for diagnosing PATH precedence issues.

## Upgrade Notes

- Operators on Debian, Ubuntu, or WSL should prefer `pipx` for Python installs, or npm for the npm package.
- `--break-system-packages` remains available as an explicit advanced override, but it is not used by default.
- If npm reports a successful update but `logics-manager --version` still shows an older version, inspect PATH ordering before reinstalling.

## Validation and Regression Evidence

- `PYTHONPATH="$PWD" pytest tests/python/test_logics_manager_cli.py -q -k self_update`
- `npm view @grifhinz/logics-manager version dist-tags --json`
