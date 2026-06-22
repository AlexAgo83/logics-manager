# Logics Manager 2.12.3

## Improvements

- Added a guided New Request flow that captures title, need, and context before launching the assistant-backed request workflow.
- Added a standalone viewer `+New` toolbar action that creates draft request documents directly from the viewer and keeps search available in Activity mode.
- Added user-authored request notes so assistants can safely reformat, translate to English, and clarify viewer-created requests while preserving the original intent.
- Improved custom terminal handling with session preservation, drag-and-drop ordering, compact status badges, Ctrl-C forwarding, loading states, and clearer session labels.
- Added Obsidian-friendly navigation and documentation updates for local Markdown workflows.

## Fixes

- Removed legacy per-column add buttons from corpus board columns in favor of the shared New Request entry point.
- Normalized stale Logics reference paths and reduced false positives in corpus insights.
- Added a Git commit modal to the viewer and tightened related browser-host coverage.

## Validation

- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `python3 -m pytest -q tests/python/test_viewer_cli.py`
- `git diff --check`
