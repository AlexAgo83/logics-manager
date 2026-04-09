# Changelog (`1.23.1 -> 1.23.2`)

## Major Highlights

- Tightened the read preview experience so the rendered header now shows `File:` instead of repeating the item id and path separately.
- Kept the board cells compact by removing repeated document metadata and other linked-doc noise from hover previews.

## Preview And Board Metadata

- The read preview header now labels the file path as `File:` and keeps the title focused on the document name.
- Board hover previews stay concise: `Status`, `Updated`, and flow context remain visible, while `References` and `Used by` stay hidden from cells.

## Validation And Regression Evidence

- `npm test -- tests/logicsHtml.test.ts tests/webview.harness-preview-and-context.test.ts`
- `npm run lint:ts`

