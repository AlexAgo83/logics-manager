# Changelog (`1.22.2 -> 1.23.0`)

## Major Highlights

- Added corpus navigation planning and generated navigation views, plus the Logics insights entrypoint wiring that makes repository exploration easier.
- Delivered a native markdown preview with related-doc navigation, compact document prefixes, and a more polished read experience inside the extension.
- Refined board and list presentation with compact metric badges, `X/TOTAL` column headers, and a clearer distinction between processed requests and active workflow items.
- Tightened CI and doc hygiene around Logics workflow indicators, release-audit behavior, and repo-local kit support.

## Workflow Navigation And Insights

- Added Logics corpus navigation planning docs and generated navigation views, along with the ADR that describes the navigation model.
- Wired the Logics insights button so users can jump into repository-level corpus exploration from the extension UI.
- Expanded the insights surface to cover corpus navigation, document relationships, and workflow visibility.

## Preview, Board, And Badge Refinements

- Added a native markdown preview for Logics docs with clickable references and related workflow items inside the plugin.
- Refined preview presentation with compact `number - name` document titles and a footer for related docs.
- Added document prefixes, `X/TOTAL` headers, and compact metric badge prefixes so board and list surfaces scan more easily.
- Added compact progress / understanding / confidence badges and refined preview/list header presentation.
- Improved processed-request handling and preview links so linked items stay easier to navigate from the main board.

## Workflow Docs, CI, And Release Hardening

- Added and normalized request/backlog/task workflow docs for the new navigation, badge, and preview work.
- Updated Logics doc indicators and workflow audit behavior so the repo stays release-ready as the workflow evolves.
- Bumped the bundled `logics/skills` submodule for Mermaid and helper/export fixes.
- Updated `.claude` and `.gitignore` guidance for local workspace state and kit-related ignore rules.

## Validation And Regression Evidence

- `npm run release:changelog:validate`
- `npm test -- tests/logicsIndexer.test.ts tests/webview.harness-state-and-persistence.test.ts tests/webview.persistence.test.ts`
