# Changelog (`2.2.0 -> 2.3.0`)

Release `2.3.0` improves the local viewer experience for larger Logics corpora and keeps the browser-hosted viewer closer to the installed app identity.

## Why `2.3.0`

- Larger repositories needed the viewer to stay responsive when grouped sections contain many request, backlog, task, product, or architecture items.
- Filter, grouping, and sorting choices needed to survive a browser reload so operators do not lose their working context.
- The local viewer needed the app icon in browser tabs and a light auto-refresh loop that updates data without reloading or navigating the page.
- Progressive rendering needed keyboard navigation to keep the selected card visible when moving past the initially rendered batch.
- Assistant handoffs needed a direct way to point operators at the relevant Logics item in the local viewer, with a CLI fallback for stopped viewer servers.

## Highlights

- Persisted local viewer filters, grouping, sorting, search, and view mode across reloads.
- Added the Logics app icon as the local viewer favicon.
- Added an in-page local viewer auto-refresh loop that refreshes data every minute without page navigation.
- Added progressive grouped rendering that shows large groups in batches of 10 with an explicit "Show more" control.
- Kept keyboard navigation compatible with progressive groups by expanding the rendered batch before selecting hidden next or previous items.
- Added focused viewer links and `logics-manager view --focus <ref-or-path>` so assistants and operators can open a specific corpus item directly.

## What Changed

### Local Viewer State

- Filter panel choices now restore from browser storage after reload.
- Grouping, sorting, search, and board/list mode share the same persisted viewer state.
- Stored state is bounded to the local viewer UI and does not change Logics documents.

### Browser Viewer Polish

- The generated local viewer HTML now references the packaged Logics icon as a favicon.
- The viewer refreshes its data payload on a timer without forcing a full browser reload or history navigation.
- Refresh failures remain non-disruptive so the current view stays usable while the next refresh can recover.

### Focused Viewer Handoffs

- Viewer URLs can now include `?focus=<ref-or-path>` to select and reveal a specific Logics item after the corpus loads.
- Add `&read=1` to open the focused item in the rendered Markdown preview.
- `logics-manager view --focus <ref-or-path> --open` starts the local viewer and opens the focused URL when a plain localhost link would fail because the server is stopped.
- Focus targets accept workflow refs and repo-relative Logics Markdown paths while rejecting traversal and non-Logics paths.

### Progressive Groups

- Board columns and list sections render grouped items progressively in batches of 10.
- Search results still render fully so matched items are not hidden behind pagination controls.
- Keyboard navigation extends the visible batch before moving selection past the currently rendered cards.

## Upgrade Notes

- Existing viewer URLs and generated data files continue to work.
- The favicon depends on the existing packaged Logics icon asset.
- The auto-refresh interval is fixed at one minute for this release.
- Assistants should provide both a focused localhost link and the equivalent `logics-manager view --focus ... --open` fallback when the viewer may not already be running.

## Validation and Regression Evidence

- `npm test -- tests/webview.board-renderer.test.ts`
- `npm test -- tests/webview.harness-core.test.ts`
- `npm test -- tests/viewer.browser-host.test.ts`
- `python3 -m pytest tests/python/test_logics_manager_cli.py -q`
- `npm run ci:check`
- `npm run release:changelog:validate`
- `git diff --check`
