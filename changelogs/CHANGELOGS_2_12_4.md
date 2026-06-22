# Logics Manager 2.12.4

## Improvements

- Added an opt-in Obsidian projection mode with managed frontmatter, clean/check support, lint drift detection, and CLI documentation.
- Added release-run visibility in the local viewer and refreshed release/docs surfaces for the split documentation index.
- Improved local viewer startup and terminal polish with versioned start banners, launch confirmation when no corpus is present, and more reliable shutdown handling.
- Moved screen-level Workshop, Remote, and CDX segments into the document header so they stay close to the active screen controls while preserving the topbar menus.

## Fixes

- Fixed project switching and toolbar state so filters, search, Settings, and Activity/Project controls remain stable across viewer modes.
- Tightened document-header segment alignment so tabs match the height and vertical alignment of header action buttons.
- Compactly renders Explorer preview notices for selected directories, oversized files, and unsupported/binary files instead of stretching placeholder blocks through the preview pane.
- Added horizontal scrolling for Explorer file previews without changing vertical scrolling behavior.

## Validation

- `rtk npm test -- tests/viewer.browser-host.test.ts`
- `rtk npm run check:viewer-assets`
- `rtk logics-manager lint --require-status`
- `rtk logics-manager audit`
