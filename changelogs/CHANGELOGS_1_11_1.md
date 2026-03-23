# Changelog (`1.11.0 -> 1.11.1`)

## Major Highlights

- Rolls the bundled Logics kit forward to the corrected `v1.1.0` tag target that fixes Windows overlay cleanup during `doctor --fix`.
- Restores Windows CI and release reliability for the Codex workspace overlay workflow introduced in `1.11.0`.

## Version 1.11.1

### Windows overlay cleanup fix

- Updated the bundled `logics/skills` submodule to the latest `cdx-logics-kit` `v1.1.0` commit.
- Pulled in the Windows-specific fix that handles reparse-point cleanup safely instead of calling `shutil.rmtree()` on symbolic-link-like overlay entries.
- Eliminated the failing `test_doctor_fix_rebuilds_missing_overlay` path that had broken Windows kit validation in CI and release workflows.

### Validation

- `python3 -m unittest discover -s logics/skills/tests -p 'test_*.py' -v`
- `python3 logics/skills/tests/run_cli_smoke_checks.py`
- `npm run test`
- `npm run release:changelog:validate`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics-flow-manager/scripts/workflow_audit.py --group-by-doc`
