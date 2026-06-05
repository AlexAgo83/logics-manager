# Changelog (`2.1.1 -> 2.1.2`)

Release `2.1.2` reduces Logics validation friction for agents and polishes the CLI entrypoint.

## Why `2.1.2`

- Standard Logics validation was too punitive for draft/proposed workflow work, especially when companion docs were missing Mermaid blocks or primary request links.
- Agent-facing audit payloads needed clearer continuation signals instead of treating every finding as equally blocking.
- The root CLI help had become dense enough that common workflows were harder to scan than they should be.
- npm global and symlinked CLI installs needed a direct-invocation guard that works from the installed executable path.

## What Changed

- Added progressive validation severity with `warnings`, `strict`, and blocking `issues`.
- Added audit payload fields such as `can_continue`, `release_ready`, `warning_count`, `strict_count`, and severity-grouped findings.
- Kept strict governance available through `npm run audit:logics:strict` while making standard validation less noisy for active authoring.
- Added repair guidance for Mermaid signature drift with `logics-manager sync refresh-mermaid-signatures`.
- Reworked root CLI help into workflow-oriented sections for common usage, authoring, validation, integrations, and maintenance.
- Fixed npm wrapper direct invocation when the published binary is reached through a symlink.
- Documented the standard-vs-strict validation profile in `README.md` and captured the product brief in `logics/product/prod_012_reduce_logics_validation_friction_for_agents.md`.

## Upgrade Notes

- Install or update the CLI with `npm install -g @grifhinz/logics-manager@latest`.
- Use the default audit profile during active authoring.
- Use `npm run audit:logics:strict` before release, governance review, or when mature accepted docs must be fully enforced.

## Validation and Regression Evidence

- `npm run ci:check`
- `npm test`
- `python3 -m pytest python_tests -q`
- `npm run release:changelog:validate`
- `npm pack --dry-run`
- `git diff --check`
