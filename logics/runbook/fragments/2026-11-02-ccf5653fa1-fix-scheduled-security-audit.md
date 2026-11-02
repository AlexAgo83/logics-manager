# Mission ccf5653fa1: fix the scheduled Security audit

## Change and scope

Replace the existing minimatch 10-specific brace-expansion override with an exact
`minimatch: 11.0.4` override and regenerate the npm lockfile. This removes the
moderate globparts amplification denial-of-service advisory from the ESLint and
typescript-eslint development dependency chains (and the shared vsce chain).
The only added package is `@isaacs/nonrecursive-glob-match` 1.0.3;
`brace-expansion` remains at the fixed version 5.0.12.

Registry inspection showed that even the latest ESLint and typescript-estree
releases still request minimatch 10. Updating those direct dependencies alone
would not resolve the finding. Keep their current locked versions to minimize
change. No ESLint configuration migration is required. Node 22 used locally and
Node 24 used by CI both satisfy minimatch 11's engine requirement.

The moderate severity threshold and existing audit exceptions are unchanged.
No new exception was added. This is a dependency correction with no product or
workflow contract change; it does not require a new Logics request chain.

## Verification

Every local validation attempt is measured by
`.jarvis-input/mission-test-runner.py`; exact commands, durations and exit codes
are recorded in `.jarvis-artifacts/mission-tests.jsonl`.

- The original `npm run audit:ci` reproduced the reported blocking findings.
- A clean `npm ci` with the changed lockfile succeeds and reports zero vulnerabilities.
- `npm run audit:ci` now reports `Audit policy: OK`.
- `npm run lint` passes, including TypeScript type checking and ESLint.
- Viewer assets were built before the frozen uv sync and compilation. The first
  attempt could not find uv on PATH; the retry using its installed absolute path
  succeeded, as did `npm run compile`.
- `npm run test:coverage` passes both the source and media coverage gates:
  1,002 tests pass in each run.
- Python coverage/pytest passes: 1,703 passed and one skipped. The coverage floor
  passes at 79%, above the unchanged 78% floor.
- Python Ruff and Logics lint pass.
- `npm run package:ci` passes.
- Extension smoke checks and the npm CLI smoke check pass.

## Sandbox limits and publication handoff

The first full Node test run passed 1,003 tests and failed the campaign reporting
test while the smoke script fell back to JSDOM. The standalone viewer smoke run
also failed on JSDOM's unimplemented canvas context. The shared Playwright
Chromium was installed but absent from PATH. A local, untracked symlink made it
available to the repository's existing Chrome discovery logic for retries.

An unchanged source copy with the original package manifest and lockfile,
installed independently with `npm ci`, reproduces the same campaign assertion
failure (one failed, one passed). Its audit still reports ten moderate findings.
This comparison is recorded in `.jarvis-artifacts/baseline-campaign.log`.

With Chromium, the desktop viewer smoke run completed and reported five failed
checks: the remote Git screen reports "Project is not a Git repository", and
review timeline, Git, Git history, and CI reachability time out. Git itself
cannot read the external worktree configuration in this mission sandbox.
These are the sandbox limitations identified in the mission input, not a reason
to change the audit policy or unrelated viewer/Git code.

The full Node test retry with Chromium passed 1,002 tests and failed only the two
campaign reporting tests: each reached its existing 300-second timeout. The
standalone campaign takes longer than that budget in this restricted checkout.
Do not raise test budgets, skip tests, or change unrelated viewer behavior for
this dependency fix. The local test status must therefore be reported as failed,
while the implementation is ready for publication and GitHub CI validation.

Jarvis/Tower owns committing and PR publication. Leave these changes in the
working tree; do not push or open a PR from this mission. GitHub CI, including the
complete campaign and ordinary Git checkout access, remains the full merge gate.
There is no deployment or host measurement requirement for this dependency fix.

## Measured local attempts

All commands below were passed unchanged as one argument to the supplied runner.
The baseline comparison is diagnostic and is expected to reproduce an existing failure.

| Exact command | Duration (seconds) | Exit code |
| --- | ---: | ---: |
| `npm run audit:ci` | 1.101 | 1 |
| `npm ci` | 5.184 | 0 |
| `npm run build:assets && uv sync --frozen && npm run compile` | 0.148 | 127 |
| `npm run lint` | 3.483 | 0 |
| `npm run audit:ci` | 0.461 | 0 |
| `npm run build:assets && /home/aagos/.local/bin/uv sync --frozen && npm run compile` | 1.847 | 0 |
| `npm run test` | 16.138 | 1 |
| `npm run test:coverage` | 85.524 | 0 |
| `npm run package:ci` | 1.174 | 0 |
| `npm run test:smoke && npm run test:npm-cli` | 2.487 | 0 |
| `.venv/bin/python -m coverage run --source=logics_manager -m pytest tests/python/ -q` | 141.353 | 0 |
| `VIEWER_CAMPAIGN_VIEWPORTS=desktop VIEWER_CAMPAIGN_SKIP_SLOW_CHECKS=1 npm run test:viewer-smoke` | 2.402 | 1 |
| `PATH="$PWD/.jarvis-artifacts/bin:$PATH" npm run test` | 601.323 | 1 |
| `PATH="$PWD/.jarvis-artifacts/bin:$PATH" VIEWER_CAMPAIGN_VIEWPORTS=desktop VIEWER_CAMPAIGN_SKIP_SLOW_CHECKS=1 npm run test:viewer-smoke` | 382.090 | 1 |
| `.venv/bin/python -m ruff check logics_manager tests/python scripts && npm run lint:logics` | 2.845 | 0 |
| `cd .jarvis-artifacts/baseline && npm ci && npm run test -- tests/viewer.campaign-report.test.ts` | 17.596 | 1 |
| `PATH="$PWD/.venv/bin:$PATH" node scripts/check-python-coverage-floor.mjs` | 0.634 | 0 |
| `.venv/bin/logics-manager lint --require-status` | 0.387 | 0 |
