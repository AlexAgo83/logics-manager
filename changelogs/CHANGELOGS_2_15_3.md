# Logics Manager 2.15.3

## Bundled agent skills

- Ships reusable agent skills as package data, starting with `/corpus`, which encodes the full request → product brief → backlog → orchestration task → context pack scaffold flow with its validation and commit steps.
- Adds `logics-manager skills list` and `logics-manager skills install [names...] [--target-dir DIR] [--force]` to deploy bundled skills into a harness skills directory (Claude Code and Codex share the `skills/<name>/SKILL.md` format).
- Adds `skills install --all-profiles` to detect every harness skills directory on the machine (`~/.claude`, `~/.codex`, and cdx profile homes) and install into each in one command.
- Advertises the install command in the generated agent instructions and documents the feature in `docs/cli.md` and the README.

## Viewer crash diagnostics

- Session heartbeats now carry vital signs (JS heap usage, document panel visibility, content and board child counts) persisted server-side, so an unclean-session report can tell an OOM-killed tab from a healthy tab that simply stopped.
- Unclean-session reports include the last known stats and the age of the final heartbeat.
- Records a `blank-ui` diagnostic when the document panel is hidden and the main layout stays empty across consecutive heartbeat ticks — a blank state MutationObservers cannot see.

## Validation

- `node scripts/ci-check.mjs`
- `logics-manager health`
- `logics-manager audit`
- `logics-manager lint`
