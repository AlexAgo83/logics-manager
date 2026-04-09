# Changelog (`1.23.0 -> 1.23.2`)

## Major Highlights

- Expanded Logics corpus navigation and discovery with generated index and relationship views, plus the related ADR and task chain that document the navigation model.
- Improved preview ergonomics across the board and read surfaces by trimming duplicated preview content, tightening Markdown parsing, and cleaning up file metadata labels.
- Kept the delivered request, backlog, task, and skills docs in sync through the preview and traceability follow-up work so the corpus stays easy to navigate and audit.

## Workflow Navigation And Insights

- Added the generated corpus navigation views and the supporting architecture, product, request, backlog, and task docs for corpus-scale browsing.
- Wired the Logics insights entrypoint so repository exploration stays close to the extension workflow.

## Preview, Board, And Metadata Refinements

- Improved board preview Markdown rendering and removed duplicated title and instruction content from preview panels.
- Tightened task preview checkbox parsing and Mermaid diagram generation.
- Updated the read preview header to use a cleaner `File:` label and kept hover previews compact by hiding repeated linked-doc metadata.

## Workflow Docs, Skills, And Traceability

- Synced request, backlog, and task docs after the preview delivery waves closed.
- Bumped `logics/skills` for reminder wording and doc template cleanup.
- Updated Logics docs and CI traceability so the corpus stays consistent as release waves land.

## Validation And Regression Evidence

- `npm test -- tests/logicsHtml.test.ts tests/webview.harness-preview-and-context.test.ts`
- `npm run lint:ts`
- `python3 logics/skills/logics.py flow assist release-changelog-status --format json`
