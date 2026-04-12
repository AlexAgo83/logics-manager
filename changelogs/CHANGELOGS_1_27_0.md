# Changelog (`1.26.1 -> 1.27.0`)

## Major Highlights

- Generated from 20 commit(s) between `v1.26.1` and `HEAD` on 2026-04-12.
- Touched areas: Workflow and Skills, Validation and CI.
- Refine Logics docs and badge palettes
- Promote recent requests into backlog and tasks
- Remove empty backlog artifact

## Generated Commit Summary

## Workflow and Skills

- Refine Logics docs and badge palettes
- Promote recent requests into backlog and tasks
- Remove empty backlog artifact
- Remove empty task artifact
- Mark delivery timeline button task done
- Mark kit update task done
- Mark bootstrap convergence task done
- Mark duplicated constants extraction item done
- Type environment helpers and close item 291
- Mark vsix cleanup item done
- Extract kit bootstrap helper module
- Mark flow manager reorganization item done
- Close requests 178-185 as Done
- Normalize done task checklists

## Validation and CI

- Improve insights timeline button contrast
- Allow kit updates with unrelated root changes
- Require AGENTS and LOGICS in bootstrap convergence
- Add request badges alongside task coverage dots
- Add corpus explorer map and timeline views
- Allow maintenance edits to keep indicators stable

## Validation and Regression Evidence

- `npm run audit:logics` passed after normalizing closed-task checklists and maintenance-edit markers.
- `npm run lint:ts` passed on the release branch after the workflow helper extraction and version bump.
- `npm run test:coverage:src` passed and preserved the target coverage levels after the latest plugin changes.
