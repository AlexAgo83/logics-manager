[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# Deploy / Release (VSIX)

Release work is governed by `logics/release/contract.json`. Before preparing or
publishing, inspect the repo-owned state:

```bash
logics-manager release status
```

If a project does not have a contract yet, generate a local-first draft instead
of copying a neighboring project's workflow:

```bash
logics-manager release discover --write
```

1. Bump the version in `package.json`, `pyproject.toml`, and root `VERSION` when preparing a release manually.
2. Curate the matching changelog entry in `changelogs/CHANGELOGS_X_Y_Z.md`.
3. Validate that the changelog matches the current package version:

```bash
npm run release:changelog:validate
```

4. Build and package:

```bash
npm run package
```

This creates `logics-manager-<version>.vsix` in the repo root.

5. Smoke-test the package locally:

```bash
npm run install:vsix
```

6. Push the release commit, wait for CI to pass, then push the `v<version>` tag. The release workflow gates on green CI for the tagged commit, creates the GitHub release with the VSIX and curated changelog, and publishes to the VS Code Marketplace, npm, and PyPI automatically.

If the current plugin version is already published, `logics-manager assist next-step` can now propose the next release step instead of stalling on an already-live tag.
