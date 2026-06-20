## req_262_guard_viewer_assets_sync_with_a_local_pre_commit_hook_and_fail_loud_ci_check - Guard viewer_assets sync with a local pre-commit hook and fail-loud CI check
> From version: 2.11.6
> Schema version: 1.0
> Status: Draft
> Understanding: 95%
> Confidence: 90%
> Complexity: Low
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The viewer ships as two copies: source under `clients/viewer/` and the served package copy under `logics_manager/viewer_assets/viewer/`, kept in sync by `scripts/dev/sync-viewer-assets.mjs`. Editing the source without re-syncing means changes silently do not reach the running viewer — a recurring "my change didn't take effect" friction across sessions.
- A `check:viewer-assets` script exists (`sync-viewer-assets.mjs --check`) but nothing enforces it: there is no local git hook, and the publish CI runs the *sync* (auto-fixes drift) rather than `--check` (fails on drift), so out-of-sync copies can land in commits unnoticed.
- This request adds a frictionless local guard plus a fail-loud CI check so drift is caught at commit time and can never land.

# Context
- Scripts today (`package.json`): `sync:viewer-assets` (apply) and `check:viewer-assets` (`--check`). No `prepare`/`precommit` script; no `.githooks`/`.husky`; `core.hooksPath` unset (default `.git/hooks`).
- CI: `.github/workflows/publish-pypi.yml:37` runs `node scripts/dev/sync-viewer-assets.mjs` (full sync, no `--check`) — it masks drift instead of failing.
- Approach: add a versioned hook dir (e.g. `.githooks/pre-commit`) wired via `git config core.hooksPath .githooks` from a one-line `npm run setup-hooks` (or a `prepare` script), running `npm run check:viewer-assets` and blocking the commit on drift with a message pointing to `npm run sync:viewer-assets`. Make CI run `check:viewer-assets` (fail-loud) in the test/publish path.
- Out of scope: changing the sync mechanism itself; moving to a single-copy/served-from-source model (that is a separate, larger change tracked elsewhere).

# Acceptance criteria
- AC1: A versioned local git hook runs `check:viewer-assets` on pre-commit and blocks the commit when `clients/viewer/` and `logics_manager/viewer_assets/viewer/` are out of sync, printing the exact remediation command (`npm run sync:viewer-assets`).
- AC2: CI fails loudly on drift — the test/publish workflow runs `check:viewer-assets` (`--check`) so out-of-sync copies cannot land, instead of silently re-syncing.
- AC3: Enabling the hook is one frictionless step (documented `npm run setup-hooks` or auto-wired via `prepare`), opt-in-safe for contributors who do not run it, and changes no existing script behavior.
- AC4: No regression — `check:viewer-assets` exits non-zero only on real drift; existing build/test scripts are unaffected.

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `scripts/dev/sync-viewer-assets.mjs` (sync + `--check`)
- `package.json` (`sync:viewer-assets` `:123`, `check:viewer-assets` `:124`)
- `.github/workflows/publish-pypi.yml:37` (currently runs sync, not `--check`)
- `clients/viewer/` ↔ `logics_manager/viewer_assets/viewer/` (the two synced copies)

# AI Context
- Summary: Add a versioned pre-commit hook plus a fail-loud CI check around `check:viewer-assets` so clients/viewer ↔ viewer_assets drift is caught at commit time and cannot land.
- Keywords: viewer_assets, sync, pre-commit hook, core.hooksPath, CI check, developer ergonomics
- Use when: Preventing the recurring "edited source but viewer didn't change" drift.
- Skip when: Moving to a single-copy / served-from-source model instead (separate larger change).

# Backlog
- `item_460_local_pre_commit_hook_guarding_viewer_assets_sync`
- `item_461_fail_loud_ci_check_on_viewer_assets_drift`
