# Changelog (`2.0.3 -> 2.0.4`)

Release `2.0.4` adds a first-class CLI self-update command and keeps legacy runtime cleanup tied to the bootstrap path.

## Why `2.0.4`

- The CLI needed an explicit update path so operators can refresh the installed runtime from the command line.
- The update flow must work for both `pip` and `npm` installations instead of assuming one packaging path.
- Legacy repo-local runtime artifacts still needed to be cleaned up as part of bootstrap/migration for older projects.

## Highlights

- Added `logics-manager self-update` with `pip`, `npm`, and `auto` selection.
- Documented the CLI update flow in the README.
- Kept bootstrap-based cleanup for legacy `.claude/` and `logics/skills` artifacts in old repositories.

## What Changed

### CLI Self-Update

- Added a dedicated `self-update` command to the Python CLI.
- The command now upgrades the Python package with `pip` when the package is installed that way.
- The same command falls back to `npm install -g @grifhinz/logics-manager@latest` for global npm installs.
- A `--dry-run` option was added so the exact update command can be reviewed without changing anything.

### Legacy Runtime Cleanup

- Bootstrap now removes legacy repo-local `.claude/` and `logics/skills/` artifacts when they are present.
- Bootstrap convergence treats those artifacts as migration debt instead of acceptable repository state.
- Added regression coverage for the migration cleanup path.

### Release Metadata

- Bumped the extension, Python package, npm package, and lockfile version surfaces to `2.0.4`.
- Updated the README version badge so the documented release target matches the repo version.

## Upgrade Notes

- If you installed `logics-manager` with `pip`, `logics-manager self-update` will use `pip`.
- If you installed it with `npm`, `logics-manager self-update` will use `npm` unless you force a manager explicitly.
- Older repos can now be cleaned up by rerunning bootstrap after the extension update.

## Validation and Regression Evidence

- `python -m pytest python_tests -q`
- `rtk npm test`
- `npm run package`
