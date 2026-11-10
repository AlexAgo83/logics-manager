# Mission a6d9021cd1: retry Marketplace network failures

## Scope and assumptions

Treat "up to 3 times" as three total publish attempts, with 60 seconds between
failed network attempts. Keep the existing VSCE_PAT environment binding and
package path. Replay only vsce's own output, without retry messages or token
inspection. Stop immediately on other errors and preserve the failing exit code.

Accept vsce's duplicate message only when it identifies the package publisher,
name, and exact current version. This covers both workflow reruns and a lost
response after a successful publication. The installed vsce implementation in
`node_modules/@vscode/vsce/out/publish.js` supplies the message format.
Use the Marketplace name `cdx-logics-vscode` from the packaging helper, which
overrides the npm package name. A regression check guards that naming contract.

Follow CONTRIBUTING.md and the existing Vitest workflow-test pattern. Record the
maintenance change in the current curated release note, without changing versions
or creating a release. Regenerating CHANGELOG.md produces no aggregate change
because its summary and section headings are unchanged.

## Verification

All local test and validation attempts use the supplied mission-test-runner.py.
Its unedited receipts are in `.mission-artifacts/mission-tests.jsonl`.
The workflow tests execute the actual YAML Bash body with fake publish and sleep
commands. They cover success, network retries and exhaustion, immediate failure,
wrong-version and wrong-extension duplicates, exact duplicates, unchanged token
binding, and the absence of additional log output.

The full Node suite clears inherited GIT_DIR, GIT_WORK_TREE, and GIT_COMMON_DIR so
temporary Git fixtures use their own repositories. Its viewer campaign initially
fails in JSDOM mode while Chromium is not on PATH; retry that file with the prepared Chromium
executable exposed through an artifact-directory symlink. The Python environment
initially lacks pytest; install public pytest, Ruff, and coverage into the local
virtual environment and retry the full Python suite. No dependency declarations
or lockfiles change.

Completed checks:

- `npx vitest run tests/test_release_marketplace.test.ts`: all three measured
  attempts pass; the final run passes 24 tests including the packaged identity.
- `npm run compile` and `npm run lint`: pass, including TypeScript checking.
- `npm run check:changelog && npm run release:changelog:validate && logics-manager lint && logics-manager audit`:
  pass. The global CLI reports version 2.24.2, so also run this checkout's Python
  lint and audit below.
- `.venv/bin/python -m ruff check logics_manager tests/python scripts && .venv/bin/python -m logics_manager lint && .venv/bin/python -m logics_manager audit`:
  pass using repository version 2.24.3.
- `npm run package:ci && npm run test:smoke && npm run test:npm-cli`: pass.
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR .venv/bin/python -m pytest tests/python/ -q`:
  1,703 pass, one skipped. The earlier attempt without installed pytest collected
  no tests and exited nonzero.
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR npm test`:
  1,022 pass; `tests/viewer.campaign-report.test.ts` fails its injected-failure
  assertion. The targeted Chromium retry is recorded separately.
- `PATH="$PWD/.mission-artifacts/bin:$PATH" npx vitest run tests/viewer.campaign-report.test.ts`:
  both tests pass with Chromium and the original workspace Git environment.
  This resolves the only Node test failure; a single full-suite invocation with
  all checks green is still left to ordinary GitHub CI.
- `git diff --check && .venv/bin/python -m logics_manager lint`: pass.
- `npm run docs:check && git diff --check`: pass.

## Measured attempts

The durations below are copied from the supplied timer receipt, including the
initial failed attempts and all retries. No test failures remain after retries.

| Exact command | Duration (seconds) | Exit code |
| --- | ---: | ---: |
| `npx vitest run tests/test_release_marketplace.test.ts` | 2.872 | 0 |
| `npm run compile` | 2.199 | 0 |
| `npm run check:changelog && npm run release:changelog:validate && logics-manager lint && logics-manager audit` | 2.908 | 0 |
| `npm run lint` | 4.265 | 0 |
| `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR npm test` | 15.662 | 1 |
| `.venv/bin/python -m pytest tests/python/ -q` | 0.031 | 1 |
| `npm run package:ci && npm run test:smoke && npm run test:npm-cli` | 5.416 | 0 |
| `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR .venv/bin/python -m pytest tests/python/ -q` | 95.781 | 0 |
| `PATH="$PWD/.mission-artifacts/bin:$PATH" npx vitest run tests/viewer.campaign-report.test.ts` | 225.151 | 0 |
| `.venv/bin/python -m ruff check logics_manager tests/python scripts && .venv/bin/python -m logics_manager lint && .venv/bin/python -m logics_manager audit` | 2.173 | 0 |
| `git diff --check && .venv/bin/python -m logics_manager lint` | 0.961 | 0 |
| `npx vitest run tests/test_release_marketplace.test.ts` | 2.626 | 0 |
| `npm run docs:check && git diff --check` | 0.270 | 0 |
| `npx vitest run tests/test_release_marketplace.test.ts` | 2.679 | 0 |
| `git diff --check && .venv/bin/python -m logics_manager lint` | 0.941 | 0 |
| `git diff --check && .venv/bin/python -m logics_manager lint` | 2.545 | 0 |

## Handoff

Leave changes uncommitted for the orchestrator/Host A. A reviewer should check the bounded
network-error allowlist, exact-version duplicate handling, and green GitHub CI on
Linux and Windows. Actual Marketplace publication is deferred to the authorized
release workflow; no credentials, publication, or host measurement are needed
for this maintenance change.
