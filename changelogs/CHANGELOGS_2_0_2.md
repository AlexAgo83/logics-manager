# Changelog (`2.0.1 -> 2.0.2`)

Release `2.0.2` tightens the post-`2.0.1` release path by fixing bootstrap repair gating for content-only repositories and restoring scoped npm publishing.

## Why `2.0.2`

- Content-only repositories were still surfacing a repair action that could never complete because they do not bundle the bootstrap runtime entrypoint.
- The temporary unscoped npm publish workaround was reverted so the npm package identity stays aligned with the repository and release tooling.
- The publish workflow needed to use the standard npm auth secret path so the release pipeline can publish the scoped package again.
- This release exists to make the current release flow and repo-state gating consistent with the bundled-runtime model.

## Highlights

- Suppressed `Repair Logics setup on this branch` for repositories that do not bundle `scripts/logics-manager.py`.
- Kept bootstrap and repair prompts aligned with what the repository can actually repair.
- Restored scoped npm package publishing for `@grifhinz/logics-manager`.
- Wired the npm publish workflow to the standard `NPM_TOKEN` secret path.

## What Changed

### Bootstrap and Repair Gating

- Changed bootstrap-state inspection so the repair action is only offered when the bundled runtime entrypoint is present.
- Updated the view provider and bootstrap support layer to treat content-only repositories as non-bootstrappable instead of degraded-but-repairable.
- Added regression coverage for `inspectLogicsBootstrapState(root, false)` to lock in the new contract.

### npm Publishing

- Restored the scoped package name `@grifhinz/logics-manager`.
- Put the npm publish workflow back on the scoped package identity and a standard `NPM_TOKEN` secret.

### Release Metadata

- Bumped the extension, Python package, npm package, and lockfile version surfaces to `2.0.2`.
- Updated the README version badge so the documented release target matches the repo version.

## Upgrade Notes

- If you are on a content-only repository, `Bootstrap` should remain unavailable unless the repo bundles the runtime entrypoint.
- If you manage npm publishing for this repository, make sure `NPM_TOKEN` is configured in GitHub secrets for the publish workflow.

## Validation and Regression Evidence

- `npm test`
- `npm run lint:ts`
- `npm run package`
