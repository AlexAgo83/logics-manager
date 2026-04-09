# Contributing

Thanks for helping improve `cdx-logics-vscode`.

## Getting Started

- Install dependencies with `npm ci`.
- If you are working on the bundled Logics kit, keep `logics/skills` initialized and up to date.
- Use a recent Node.js and Python 3 environment that matches the repo tooling.

## Development Workflow

- Make focused changes and keep commits small when possible.
- Prefer one logical change per commit or per wave.
- Do not edit generated workflow status fields by hand unless the flow specifically requires it.
- For Logics tasks, use the flow-manager commands so task, backlog, and request status stay synchronized.

## Validation

Run the narrowest useful checks first, then expand if needed:

- `npm run compile`
- `npm run lint`
- `npm run test`
- `npm run lint:logics`
- `npm run audit:logics`
- `npm run ci:fast`
- `npm run ci:check`

If your change touches Logics docs or workflow behavior, also validate the relevant flow-manager tests or doc checks before opening a PR.

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

