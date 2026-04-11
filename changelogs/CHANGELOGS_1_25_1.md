# Changelog (`1.25.0 -> 1.25.1`)

## Major Highlights

- Generated from 12 commit(s) between `v1.25.0` and `HEAD` on 2026-04-11.
- Touched areas: Workflow and Skills, Validation and CI, Release and Changelog Automation, Documentation.
- fix: scope kit update dirty-tree check to logics/skills only
- docs: add requests, backlogs and orchestration task for April 2026 structural audit
- docs: add 3 missing audit items and extend task_127 to 8 waves

## Generated Commit Summary

## Workflow and Skills

- fix: scope kit update dirty-tree check to logics/skills only
- docs: add requests, backlogs and orchestration task for April 2026 structural audit
- docs: add 3 missing audit items and extend task_127 to 8 waves
- docs: complete T127 wave 1 safe wins
- chore: complete T127 wave 4 kit security
- chore: complete T127 wave 5 flow-manager restructure
- chore: complete T127 wave 6 kit coverage

## Validation and CI

- fix: complete T127 wave 2 typing and coverage
- refactor: complete T127 wave 3 kit version extraction
- refactor: complete T127 wave 7 p3 items

## Release and Changelog Automation

- Prepare 1.25.1 release

## Documentation

- chore: close T127 and audit requests

## Validation and Regression Evidence

- `python logics/skills/logics.py flow assist prepare-release --execution-mode execute --format json`
- `npm run release:changelog:validate`
