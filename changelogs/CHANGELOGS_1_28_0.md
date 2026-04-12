# Changelog (`1.27.0 -> 1.28.0`)

## Major Highlights

- Generated from 9 commit(s) between `v1.27.0` and `HEAD` on 2026-04-12.
- Touched areas: Workflow and Skills, Validation and CI.
- Cards now keep all metadata badges on a single row, while the request/task marker stays as a separate corner cue.
- The corpus explorer map now favors compact family tiles instead of a dense relationship graph, which makes the overview easier to scan.
- The tools menu and timeline labels were tightened so the top-level UI stays compact and predictable.

## Generated Commit Summary

## Workflow and Skills

- Cards now keep all metadata badges on a single row
- The request/task marker remains outside the main badge strip
- The corpus explorer map now uses compact family tiles
- Workflow docs for the badge-row and corpus-map cleanup were closed

## Validation and CI

- Unify tools menu and compact timeline labels
- Tighten day timeline window and tools close behavior
- Keep card badges on one row
- Simplify corpus map readability
- Unify card badge strip layout

## Validation and Regression Evidence

- `npm test` -> 49 files, 449 tests passed
- `npm run lint:ts` -> passed
- `npm run compile` -> passed
- `npm run test:smoke` -> passed
- `PLUGIN_LIFECYCLE_TESTS=1 npm run test:lifecycle` -> skipped because the VS Code `code` CLI is unavailable in this environment
- `npm run test:coverage:src` -> passed
- `npm run test:coverage:media` -> passed
