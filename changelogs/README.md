# cdx-logics-vscode Changelogs

Versioned changelog artifacts live in this folder.

Contract:
- filename pattern: `CHANGELOGS_x_y_z.md`
- version source of truth: repository `package.json`
- generation moment: at delivery closure time, using the real current project version at that moment

Release workflow contract:
- tag format: `vX.Y.Z`
- preferred changelog path for tag `vX.Y.Z`: `changelogs/CHANGELOGS_X_Y_Z.md`
- GitHub Release should use the curated file body when it exists
- if the file is missing, the release flow may fall back to generated release notes without failing in v1

Local helpers:
- `npm run release:changelog:resolve`
- `npm run release:changelog:validate`
