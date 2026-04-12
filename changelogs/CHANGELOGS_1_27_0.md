# Changelog (`1.26.1 -> 1.27.0`)

Release `1.27.0` is a maintenance-heavy delivery focused on keeping the Logics corpus and plugin surface cleaner, safer, and easier to navigate.

## Highlights

- Stronger doc hygiene for closed workflow items, including maintenance-edit handling and checklist normalization.
- Better visual signals in Logics Insights, with clearer active timeline filters, compact legend labels, and richer request/task badges.
- Safer workflow and kit maintenance, including root-dirty-safe kit updates, bootstrap convergence checks, and a shared bootstrap helper module.
- Structural cleanup in the kit, including flow-manager script organization, `.vsix` cleanup, and environment helper typing.

## What Changed

### Workflow and Skills

- Refined Logics docs and badge palettes.
- Promoted recent requests into backlog items and tasks.
- Removed empty backlog and task artifacts.
- Marked the delivery timeline button task, kit update task, bootstrap convergence task, duplicated constants item, `.vsix` cleanup, flow-manager reorganization, and request-badge work as done.
- Closed requests `178` through `185`.
- Normalized done-task checklists so the workflow audit stays green on completed work.

### Validation and CI

- Improved insights timeline button contrast.
- Allowed kit updates with unrelated root changes.
- Required `AGENTS.md` and `LOGICS.md` in bootstrap convergence.
- Added request badges alongside task coverage dots.
- Added the corpus explorer map and timeline views.
- Allowed maintenance edits to keep indicators stable.

### Evidence

- `npm run audit:logics` passed after the closed-task checklist normalization.
- `npm run lint:ts` passed on the release branch after the helper extraction and version bump.
- `npm run test:coverage:src` passed and preserved the target coverage levels after the latest plugin changes.
