# Logics Manager 2.12.1

## Improvements

- Added real-time local viewer sync through `/api/events` server-sent events, with component-aware refreshes for corpus, Git, CI, and CDX changes while keeping polling as a fallback.
- Updated background refreshes to use the unified status endpoint so Git, CI, and CDX badges stay current without opening their screens.
- Made the manual refresh action reload only the current viewer screen instead of forcing broader viewer churn.
- Preserved scroll position, focused controls, and open sections during same-screen refreshes so auto-refresh does not interrupt operator context.

## Viewer UX

- Added a unified file preview path with forced loads, line counts, syntax highlighting, and inline line numbers.
- Improved code viewer row layout, activity markers, project chrome, and viewer preview behavior.
- Added the board/list slider beside search and a gear icon on the Settings button.
- Made CDX activity badges count-based and used the shared usage gauge in the CDX status OK column.

## Governance

- Closed the viewer UX workflow documentation for the post-2.12.0 delivery batch.

## Validation

- `node scripts/ci-check.mjs`
