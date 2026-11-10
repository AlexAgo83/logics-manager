# Mission 31dd6f7df2: prepare logics-manager 2.24.3

## Scope and assumptions

Prepare the requested patch release from main commit
`24795a479b2347e387b08562973c8cc17df2457c` on the isolated mission branch.
No repository changes file requires a higher version, so retain 2.24.3.
The empty maintenance input is interpreted as release metadata maintenance only.

Follow `CONTRIBUTING.md`, `docs/cli.md`, `docs/release.md`, and the version
sources in `logics/release/contract.json`. Align `VERSION`, `package.json`,
`pyproject.toml`, the README badge, the Claude plugin declaration, both npm
lockfile version fields, and the editable project entry in `uv.lock`.

The English curated changelog dated 2026-11-02 credits PR #56 and its exact
commit for the minimatch 11.0.4 security audit fix. Maintenance is listed
separately. Regenerate `CHANGELOG.md` with `npm run build:changelog`.
No application, dependency resolution, audit policy, or release workflow changes
are needed in this preparation.

## Validation

Every local check runs through `.mission-input/mission-test-runner.py` with its
entire exact command as one argument. Measured receipts and logs are retained
in `.mission-artifacts/`; the receipt is not edited.

Initial environment findings:

- `npm test` started before compilation finished, so the npm packaging test
  could not find the generated Mermaid vendor asset. Compilation now provides it.
- Inherited `GIT_DIR`, `GIT_WORK_TREE`, and `GIT_COMMON_DIR` redirected Git
  operations in temporary test repositories. Unset those variables for retries;
  leave repository files and Git configuration untouched.
- Chromium is prepared under `/cache/playwright` but absent from PATH. An
  untracked symlink in `.venv/bin` makes it discoverable for validation retries.
- The first `node scripts/ci-check.mjs` attempt stopped at Python lint because
  system Python had no Ruff. Install public coverage, pytest and Ruff packages
  into the local virtual environment and prepend `.venv/bin` for the retry.
- The checkout's `.git` pointer names an unavailable external worktree directory;
  full Git-dependent viewer checks still depend on the ordinary GitHub checkout.

## Publication handoff

Leave all release changes in the working tree for the orchestrator/Host A to commit and
open the release PR through the existing merge guards. Do not tag, push,
publish, update a host, or alter release workflows. No host measurement is
required. VS Code lifecycle integration requires the unavailable `code` CLI;
no lifecycle integration pass is claimed. GitHub CI remains the merge gate,
including the Windows checks that cannot run on this Linux worker.

## Final results

- Required release changelog validation, README docs check, lint (including
  TypeScript type checking), compilation, aggregate changelog check, frozen
  offline uv synchronization, and whitespace validation pass.
- VSIX packaging, extension smoke checks, and npm CLI smoke checks pass.
- The CI retry passes audit policy, Python lint, workflow lint/audit/doctor,
  and both Node coverage suites: 1,002 tests pass in each suite and both
  coverage gates pass. It exits nonzero at the viewer campaign.
- The final full `npm test` run passes 1,002 tests and fails only the two
  tests in `tests/viewer.campaign-report.test.ts`; each campaign subprocess
  reaches its 300-second timeout. Initial Git fixture and missing vendor
  asset failures are resolved by the validation environment corrections.
- The desktop Chromium campaign reports five failed checks:
  `desktop: every screen reports when it is done`,
  `desktop: review timeline: reachable`, `desktop: git: reachable`,
  `desktop: git history domain: reachable`, and `desktop: ci: reachable`.
  The first reports "Project is not a Git repository"; the remaining checks
  time out. Report and capture are preserved in
  `.mission-artifacts/viewer-smoke/report.txt`, `summary.json`, and `desktop.png`.
  No UI source changed, so this is diagnostic evidence, not a visual redesign
  acceptance claim.
- Independent Python runs, with and without coverage, each pass 1,703 tests
  with one skipped. The coverage floor initially had no completed report,
  then saw partial data after the CI attempt stopped. After the independent
  coverage run, the same check passes at 79%, above the unchanged 78% floor.
- Local overall test status remains failed. Review the version/changelog
  alignment and require complete green GitHub CI in an ordinary checkout.
  No timeout, test exclusion, coverage threshold, or audit exception was changed.

## Measured local attempts

All exact commands below were passed unchanged to the supplied timer. Retry
shells clear the three inherited Git location variables and prepend the local
virtual environment to PATH, as described above. Durations come directly from
the timer receipt. The two CI attempts include their child checks.

| Exact command | Duration (seconds) | Exit code |
| --- | ---: | ---: |
| `npm test` | 20.954 | 1 |
| `npm run release:changelog:validate` | 0.15 | 0 |
| `npm run docs:check` | 0.219 | 0 |
| `npm run lint` | 7.57 | 0 |
| `npm run compile` | 2.513 | 0 |
| `npm run check:changelog` | 0.132 | 0 |
| `node scripts/ci-check.mjs` | 4.738 | 1 |
| `npm run package:ci` | 1.511 | 0 |
| `node scripts/ci-check.mjs` | 486.85 | 1 |
| `npm test` | 600.685 | 1 |
| `uv sync --frozen --offline` | 0.453 | 0 |
| `git diff --check` | 0.208 | 0 |
| `npm run test:smoke` | 2.664 | 0 |
| `npm run test:npm-cli` | 0.164 | 0 |
| `.venv/bin/python -m pytest tests/python/ -q` | 139.149 | 0 |
| `node scripts/check-python-coverage-floor.mjs` | 0.364 | 1 |
| `node scripts/check-python-coverage-floor.mjs` | 0.642 | 1 |
| `.venv/bin/python -m coverage run --source=logics_manager -m pytest tests/python/ -q` | 139.399 | 0 |
| `node scripts/check-python-coverage-floor.mjs` | 0.625 | 0 |
| `git diff --check` | 0.192 | 0 |
