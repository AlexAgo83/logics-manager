# Logics Manager 2.23.0

This release makes project onboarding and change review first-class surfaces in
Logics Manager. A new connector-facing project context layer explains what a project
is and what has changed recently, while the viewer gains a Review timeline that makes
local and committed changes readable without leaving the app.

## Project context for connected assistants

The MCP surface now exposes project onboarding tools that summarize the loaded
project, active work, recent activity, and relevant resources through bounded context
instead of forcing an assistant to guess from raw files. The supporting corpus closes
the connector workflow that motivated this release: a fresh chat can ask for a project
and receive a useful overview before drilling into exact documents or code.

## Review timeline in the viewer

The viewer now has a Review surface with a timeline of committed bursts and local
working-tree changes. The timeline keeps the local-change tile visible, distinguishes
it with its own tint, renders empty future slots as quiet cells, and shows changed
files with filename-first rows and compact stats.

Commit diffs now use the selected commit subject as the detail title. Diff panes show
only five context lines by default, keep line numbers synchronized from hunk headers,
separate multiple hunks visually, and still offer a bounded "load the rest" path when
more context is needed.

## Explorer and activity readability

Explorer previews now stay anchored to the detail pane width instead of stretching the
layout, and markdown/code previews reuse the shared line-numbered renderer. The
activity screen also starts with a broader default set of groups so recent work is
visible without extra clicks.

## Validation

- `npm run release:changelog:validate`
- `npm run docs:check`
- `logics-manager health`
- `logics-manager audit`
- `logics-manager lint`
- `node scripts/ci-check.mjs`
