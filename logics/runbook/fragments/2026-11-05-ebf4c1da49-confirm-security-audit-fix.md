# Mission ebf4c1da49: confirm the scheduled Security audit fix

## Finding and scope

The supplied checkout already contains commit
`24795a479b2347e387b08562973c8cc17df2457c` ("Fix the scheduled security audit
with minimatch 11.0.4"). That commit pins minimatch to 11.0.4 and updates the
lockfile. The scheduled workflow's exact `npm run audit:ci` command passes,
and a fresh `npm ci` reports zero vulnerabilities.

The locked development dependencies include ESLint 10.4.1,
`@eslint-community/eslint-utils` 4.9.1, `@eslint/config-array` 0.23.5, and
typescript-eslint 8.66.0. Their minimatch chain resolves to the existing fixed
11.0.4 override. No further manifest, lockfile, or ESLint configuration change
is justified by the reported findings. The moderate blocking threshold and
existing allowlist are unchanged. This fragment is the only intentional
repository change; no new Logics request chain or operating rule is needed.

## Verification

Every local validation attempt runs through the supplied
`.mission-input/mission-test-runner.py`. Exact commands, durations, and exit
codes are recorded in `.mission-artifacts/mission-tests.jsonl`.

- `npm run audit:ci` passes before and after a clean installation.
- `npm ci && npm run build:assets && /home/user/.local/bin/uv sync --frozen && npm run compile && npm run lint && npm run audit:ci`
  passes. Viewer assets are built before uv sync, as required by CI. Lint
  includes the TypeScript type check and ESLint.
- `npm run test:smoke && npm run test:npm-cli && npm run package:ci` passes.
- Initial Node coverage and Python test attempts inherit `GIT_DIR`,
  `GIT_WORK_TREE`, and `GIT_COMMON_DIR` from the mission environment. These
  variables redirect Git commands away from the tests' temporary repositories.
  Node failures include Git staging failures and unexpected mission history
  in the non-repository age test. Retrying without those three variables is
  an environment correction scoped to the test process.
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR npm run test:coverage`
  passes both source and media coverage gates: 1,026 tests pass in each run.
  The normal workflow coverage configuration excludes the separate viewer
  campaign regression tests; this mission does not change that configuration.
- `npm audit --json && .venv/bin/logics-manager lint --require-status` passes;
  the audit report has an empty vulnerabilities object and zero findings at
  every severity. The local repository runtime is used for the final document
  check because the global runtime reports version 2.24.2 rather than 2.24.3.
- `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR .venv/bin/python -m coverage run --source=logics_manager -m pytest tests/python/ -q`
  passes: 1,703 passed and one skipped. The initial inherited-environment run
  had 65 failures and 15 setup errors; these do not recur in the corrected
  environment. Public pytest and coverage packages were installed into the
  local virtual environment without changing repository dependency files.
- `PATH="$PWD/.venv/bin:$PATH" node scripts/check-python-coverage-floor.mjs`
  passes at 79%, above the unchanged 78% floor.

All final test runs pass after correcting the inherited Git environment.
The complete viewer visual campaign and the non-coverage campaign regression
tests were not run; this dependency-only confirmation follows the workflow's
Node coverage suites. Linux was checked locally; Windows remains a CI check.

## Measured attempts

| Exact command | Duration (seconds) | Exit code |
| --- | ---: | ---: |
| `npm run audit:ci` | 0.510 | 0 |
| `npm ci && npm run build:assets && /home/user/.local/bin/uv sync --frozen && npm run compile && npm run lint && npm run audit:ci` | 10.550 | 0 |
| `npm run test:coverage` | 23.881 | 1 |
| `npm run test:smoke && npm run test:npm-cli && npm run package:ci` | 5.125 | 0 |
| `.venv/bin/python -m coverage run --source=logics_manager -m pytest tests/python/ -q` | 128.109 | 1 |
| `npm run test:coverage:media` | 23.693 | 1 |
| `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR npm run test:coverage` | 47.158 | 0 |
| `logics-manager lint --require-status` | 0.796 | 0 |
| `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_COMMON_DIR .venv/bin/python -m coverage run --source=logics_manager -m pytest tests/python/ -q` | 92.702 | 0 |
| `npm audit --json && .venv/bin/logics-manager lint --require-status` | 1.131 | 0 |
| `PATH="$PWD/.venv/bin:$PATH" node scripts/check-python-coverage-floor.mjs` | 0.626 | 0 |
| `.venv/bin/logics-manager lint --require-status` | 0.757 | 0 |

## Publication handoff

No UI changed, so no new UI captures are required. the orchestrator/Host A owns commits
and publication. Review the existing dependency fix and the current successful
scheduled audit result before considering another dependency update. Full
GitHub CI remains the merge gate. No deployment or host measurement is needed.
