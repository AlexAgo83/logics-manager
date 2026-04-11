# Changelog `1.25.1 -> 1.25.2`

## Fixes

- Preserved native path separators for relation paths that resolve outside the workspace root. This fixes the Windows regression where external paths were rewritten with `/` and no longer matched the expected local path form.

## Release and Versioning

- Bumped `package.json`, `package-lock.json`, `VERSION`, and the README badge to `1.25.2`.
- Regenerated the curated release changelog for the release tag `v1.25.2`.

## Validation and Regression Evidence

- `npm test -- tests/logicsProviderUtils.test.ts`
- `npm run release:changelog:validate`
- `python logics/skills/logics.py flow assist prepare-release --execution-mode execute --format json`
- `python logics/skills/logics.py flow assist publish-release --execution-mode execute --push --format json`
