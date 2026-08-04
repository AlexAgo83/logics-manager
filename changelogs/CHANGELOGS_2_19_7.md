# Logics Manager 2.19.7

## GitHub Issues become a guarded Logics intake

- Bug reports and feature requests can enter through GitHub Issue forms.
- Applying `logics:triage` creates a reviewable Logics Request PR instead of
  changing `main` directly.
- Requests created by people, agents, or GitHub record their provenance and an
  approval checkpoint. Lifecycle feedback posts one label and one comment,
  without mirroring discussion threads.

## Project shortcuts now survive workspace changes

The embedded VS Code viewer stores favorite and recently used Logics projects in
extension global state, rather than workspace-scoped webview state. Favorites
and recents now survive restarting VS Code and changing workspaces.

## Security

- Updated transitive dependency overrides for `fast-uri`, `undici`, and
  `brace-expansion`; `npm audit` reports no known vulnerabilities.

## Validation

- Targeted Python and VS Code webview tests passed.
- `npm run compile`, Logics lint, and workflow audit passed.
