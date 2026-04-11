# Changelog `1.25.2 -> 1.25.3`

## Major Highlights

- Added deterministic task coverage dots on board and list cards, including task cards, covered backlog/request cards, and stacked overflow handling for multiple active tasks.
- Refined the details panel and board presentation: the collapsed details panel now hides the file line, the obsolete action button was removed, and product/architecture cards no longer show the flow row.
- Improved board readability with sticky ambient list headers and kept the 6-week insights window change from the previous delivery wave.

## Workflow and Skills

- `feat: add ambient sticky list sentinels`
- `fix: suppress flow row for product and adr cards`
- `fix: reduce insights timeline window to 6 weeks`
- `fix: hide file label in collapsed detail panel`
- `Hide file line when details panel is collapsed`
- `Refine task badge colors and remove obsolete action`
- `Resolve task coverage dots from usedBy paths`

## Validation and CI

- `test: raise src coverage and close task 129`
- `test: add logicsGlobalKitLifecycle branch coverage`
- `test: extend logicsCodexWorkspace branch coverage`
- `test: close task 128 coverage wave 4`
- `test: extend git runtime coverage`
- `test: cover hybrid assist parsing helpers`

## Documentation

- `docs: close task 130 ux fixes`
- `docs: enrich 1.25.2 release changelog`
- `Clean up task coverage backlog items`

## Validation and Regression Evidence

- `npm run compile`
- `npm run test`
- `npm run lint:logics`
- `python3 logics/skills/logics.py flow assist release-changelog-status --format json`
