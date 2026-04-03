# Changelog (`1.17.0 -> 1.18.0`)

## Major Highlights

- Made bootstrap detection branch-aware so switching Git branches now refreshes the extension state automatically instead of leaving stale Logics readiness assumptions in place.
- Clarified degraded-state messaging across missing and incomplete setups so operators immediately understand when Logics is absent only on the active branch and when repair is possible.
- Added focused regression coverage for ready-to-missing and ready-to-partial bootstrap transitions, including prompt suppression behavior across repeated branch changes.

## Version 1.18.0

### Branch-aware bootstrap refresh

- Added a watcher on `.git/HEAD` so branch switches trigger the same repository refresh path as Logics document changes.
- Cleared stale bootstrap assumptions when the active branch changes, allowing the extension to recompute whether `logics/` is present, partially bootstrapped, or fully ready.
- Re-keyed bootstrap prompt suppression by `root::bootstrapStatus` so a new degraded state on the same repository can prompt again without spamming users when they revisit a previously dismissed state.

### Clearer branch-local recovery messaging

- Updated the missing-Logics prompt copy to explain that the active branch does not have Logics set up yet, instead of framing the problem as a repository-wide failure.
- Distinguished incomplete branch setups from fully missing ones with repair-oriented titles and messages for missing `logics/skills` and other partial bootstrap states.
- Aligned read-only capability summaries and inline refresh errors with the same branch-local wording so the degraded state remains understandable outside the bootstrap prompt.

### Regression coverage for branch transitions

- Added environment-level tests covering `ready -> missing-logics` and `ready -> partial-bootstrap` transitions after re-inspection.
- Added provider-level tests proving bootstrap prompts reappear only for genuinely new states, preserve prior dismissals for repeated states, and avoid offering canonical bootstrap flows for malformed setups.
- Closed `task_108`, `item_205`, `item_206`, `item_207`, and `req_118` after the branch-switch recovery flow and its regression suite were completed.

## Validation

- `npm run release:changelog:validate`
- `npm run test`
- `npm run ci:check`
