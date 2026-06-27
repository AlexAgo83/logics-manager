# Contributing

Thanks for helping improve `logics-manager`.

## Getting Started

- Install dependencies with `npm ci`.
- If you are working on the bundled Logics runtime, keep the local entrypoint and repo versioning in sync.
- Use a recent Node.js and Python 3 environment that matches the repo tooling.

## Development Workflow

- Make focused changes and keep commits small when possible.
- Prefer one logical change per commit or per wave.
- Do not edit generated workflow status fields by hand unless the flow specifically requires it.
- For Logics tasks, use `logics-manager flow ...` commands so task, backlog, and request status stay synchronized.
- Shared web assets have a single committed home: edit the file under `clients/shared-web/media/` (or `clients/viewer/`) and commit just that one file. `logics_manager/viewer_assets/` is generated, not committed — `npm run build:assets` regenerates it from those sources, and CI/release run it before building the pip wheel. No manual mirror sync is needed during development.

## Validation

Run the narrowest useful checks first, then expand if needed:

- `npm run compile`
- `npm run lint`
- `npm run test`
- `npm run lint:logics`
- `npm run audit:logics`
- `npm run ci:fast`
- `npm run ci:check`
- `PLUGIN_LIFECYCLE_TESTS=1 npm run test:lifecycle` when validating a release candidate with the VS Code `code` CLI available

If your change touches Logics docs or workflow behavior, also validate the relevant `logics-manager` flow tests or doc checks before opening a PR.

Use `npm run clean:local-artifacts` to preview generated local outputs that are safe to discard, including build products, smoke artifacts, coverage output, graph cache, and Logics cache. Run `npm run clean:local-artifacts -- --apply` only after checking the preview.

`npm run test:lifecycle` skips by default unless `PLUGIN_LIFECYCLE_TESTS=1` is set. A skipped lifecycle run is expected during normal development, but it is not release integration evidence.

## Pull Requests

- Describe what changed and why.
- Mention validation commands you ran.
- Call out any follow-up work or known limits.
- If the change affects release behavior, note the release impact explicitly.

## Logics-Specific Rules

- When a Logics task is finished, close it with the guarded flow command so closure propagates to linked backlog and request docs.
- Update linked docs during the wave that changes the behavior, not only at the end.
- Keep request, backlog, and task references consistent across the chain.
- Prefer curated docs and tests over manual status edits.

## Code Of Conduct

Be respectful, precise, and constructive in reviews and issue discussion.
