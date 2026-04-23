# Changelog (`2.0.0 -> 2.0.1`)

Release `2.0.1` hardens the bundled-runtime transition from `2.0.0` by fixing installability, runtime probing, and content-only repository diagnostics.

## Why `2.0.1`

- The VSIX packaging path needed to normalize the embedded extension package name so installs do not try to create a scoped directory with a slash in it.
- Hybrid runtime probing still depended on the legacy `flow` entrypoint and needed to move to the canonical `logics_manager` CLI surface.
- Repositories without bundled runtime content were still being pushed through stale bootstrap and publication prompts that no longer match the current product contract.
- This release exists to make the current runtime and packaging model behave cleanly in fresh repositories and on reinstall.

## Highlights

- Fixed VSIX install metadata so the packaged extension resolves as `logics-manager`.
- Updated hybrid runtime probing to use `python -m logics_manager assist runtime-status --format json`.
- Reduced misleading bootstrap, repair, and publication prompts in repos that do not expose a repo-local runtime source.
- Revalidated packaging, diagnostics, and smoke checks after the behavior changes.

## What Changed

### Packaging and Installability

- Normalized the embedded `package.json.name` value during VSIX creation so extension installation does not fail on a scoped package path.
- Added a smoke check to catch accidental reintroduction of a scoped install target in the deliverable.

### Runtime Probe and Diagnostics

- Switched the hybrid runtime status probe to the canonical `assist runtime-status` command.
- Kept content-only repositories from treating the missing hybrid probe as a hard environment blocker.

### Bootstrap and Repair UX

- Removed stale “update runtime” and publication prompts from repositories that no longer expose `logics/skills` as a runtime source.
- Kept bootstrap and repair actions focused on real repo-local repair paths instead of legacy publication flows.

## Upgrade Notes

- Install the `2.0.1` VSIX instead of reusing `2.0.0`; the newer package fixes the install-path issue.
- If you were testing on a repo without bundled runtime content, re-run bootstrap after updating to confirm the diagnostics now stay on the supported path.

## Validation and Regression Evidence

- `npm run lint:ts`
- `npm test`
- `npm run package`
- `node tests/run_extension_smoke_checks.mjs`
