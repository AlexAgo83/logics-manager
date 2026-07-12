# Logics Manager 2.17.1

## Viewer and VS Code fixes

- Fixes the VS Code embedded viewer's **Open GitHub repository** action so it opens the configured GitHub remote reliably.
- Makes Git History commit rows clickable in the viewer and renders the selected commit diff in the existing Git detail pane through a read-only, bounded `/api/git-commit-diff` endpoint.
- Improves Logics document previews by rendering generated `Scope` sections as structured `In` and `Out` groups while keeping unsupported lists on the generic renderer path.

## Logics workflow updates

- Adds `logics-manager flow progress task <ref> --progress <n>%` so task progress can be updated through managed indicators instead of hand-editing Markdown.
- Propagates task start/progress changes to linked backlog items during development.
- Updates generated task guidance to make ADR 009 checkpoints explicit: update affected Logics docs during each meaningful wave and leave the repository commit-ready without automatic commits.

## Validation

- `python -m pytest tests/python/test_cli_main.py`
- `python -m pytest tests/python/test_viewer_cli.py -k "git_commit_diff_payload or git_diff_payload"`
- `npm test -- tests/renderMarkdown.test.ts tests/viewer.browser-host.test.ts`
- `npm run lint:ts`
- `npm run check:viewer-host`
- `python -m logics_manager lint --require-status`
- `python -m logics_manager audit --group-by-doc`
