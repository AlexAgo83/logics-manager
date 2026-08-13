[⬅ Back to README](../README.md) · [Documentation index](./README.md)

# Requirements

- To use the extension:
  - A workspace folder open in VS Code.
  - Git on PATH for workspace and repository repair flows.
  - `logics/` is bootstrapped automatically when needed.
  - The normal path uses the bundled runtime and `logics-manager`.
  - Python 3 on PATH for script-backed workflow actions. The extension accepts `python3`, `python`, `py -3`, or `py`.
- To build, package, or test the extension locally:
  - Node.js + npm.
- Optional CLI tooling:
  - VS Code CLI `code` on PATH for terminal-based VSIX install or `npm run dev`.

Windows notes:
- You do not need the `code` CLI for normal extension usage inside VS Code.
- If Python is installed through the Windows launcher, `py -3` is supported by the extension.
- Repository-managed text files are normalized through [`.gitattributes`](../.gitattributes); let Git handle `CRLF`/`LF` conversion instead of rewriting line endings manually.

## Runtime Compatibility

- Canonical CLI and runtime contract: `logics-manager`
- The bundled runtime is the supported steady-state path for the extension.
- If the bundled runtime is missing or incompatible, create/promote actions fail with explicit error messaging in the extension.

### Runtime smoke checklist

- Create a request from UI (`New Request`) and confirm markdown is generated.
- Create a fixture request with `logics-manager flow new request --title "Smoke test"` and confirm the compact synthetic request shape is generated.
- Create a backlog item and a task from the UI and confirm markdown is generated.
- Open `Read` on a Mermaid-bearing doc and confirm the graph is rendered.
- Run `logics-manager view --port 0 --open`, confirm the browser viewer loads repository docs, then stop it with `Ctrl+C`.
- Promote request -> backlog and confirm links are updated.
- Confirm request/backlog/task generation fails fast if a Mermaid signature or traceability block is stale instead of waiting for audit to find it later.
- Promote backlog -> task and confirm task document is generated.
- Refresh board/details and confirm data remains consistent.

## Validation

- Compile: `npm run compile`
- Lint TS: `npm run lint`
- Unit tests: `npm run test`
- Plugin coverage: `npm run test:coverage`
- VSIX package validation: `npm run package:ci`
- Logics docs lint: `npm run lint:logics`
- Logics workflow audit + docs lint: `npm run audit:logics`
- Strict Logics governance audit: `npm run audit:logics:strict`
- Source line budget guardrail: `npm run check:line-budget`
- Over-long function guardrail: `npm run check:function-length`
- Local viewer browser-host bundle check: `npm run check:viewer-host`
- Generate the packaged viewer assets: `npm run build:assets`
- README metadata drift check: `npm run docs:check`
- Local browser viewer smoke: `logics-manager view --port 0 --open`
- Plugin lifecycle sandbox checks: `PLUGIN_LIFECYCLE_TESTS=1 npm run test:lifecycle`
- Fast extension-focused local check: `npm run ci:fast`
- Full CI-equivalent local check: `npm run ci:check`
- Security audit policy gate: `npm run audit:ci`
- Local generated-artifact cleanup preview: `npm run clean:local-artifacts`

`npm run audit:logics` uses the default active-work profile. It blocks correctness and traceability failures with a nonzero process exit, but reports early companion-doc polish such as missing overview Mermaid diagrams as warnings so drafting and agent handoffs can continue.

`npm run audit:logics:strict` uses the strict governance profile. Use it before release or governance review when companion docs must be complete and warning-class findings should be resolved. Strict governance findings are advisory to active implementation until you choose the strict command; the standard audit remains the mandatory day-to-day gate.

`logics-manager audit --format json` and `logics-manager lint --format json` expose `issue_count`, `warning_count`, `strict_count`, `finding_count`, `can_continue`, and `release_ready`. Agents should treat `issue_count > 0` or `can_continue: false` as blocking active work. Treat `release_ready: false` as a signal that cleanup remains before release-grade validation, not as a standard-audit process failure when there are warnings only.

`npm run ci:check` mirrors the blocking repository CI contract, including Logics strict-status lint, request auto-close sync verification, workflow audit, README badge drift detection, Python tests, CLI smoke checks, TypeScript validation, extension tests, local viewer smoke, and VSIX packaging.

`npm run check:function-length` fails when a function grows past its entry in
`scripts/long_functions_baseline.json`, the ledger of grandfathered over-long functions.
It ran only in CI until req_340, so growth was discovered after the push; it is now part
of `npm run lint`, which CI runs too. Split the function, or re-freeze with
`python3 scripts/check_function_length.py --update` when a split legitimately moved code
around. The ledger should only shrink.

This repository sets no git hooks. `core.hooksPath` was configured for a pre-commit hook
guarding the committed `viewer_assets` mirror; the mirror became generated and the hook
was deleted, so `npm install` now clears that one stale setting and leaves any hooks path
you set yourself alone.

`npm run check:line-budget` fails when a real source file in `logics_manager`, `clients`, or `scripts` exceeds 1000 lines unless the file is explicitly allowlisted in `scripts/check-source-line-budget.mjs`. The allowlist is temporary project debt for the oversized-source modularization program. When a slice splits a listed file into smaller modules, remove that file from the allowlist in the same commit so CI prevents it from growing back.

The standalone local viewer host is built with esbuild from `clients/viewer/src/browser-host/index.js`. Run `npm run bundle:viewer-host` after editing the source entrypoint, then `npm run check:viewer-host` to verify that `clients/viewer/browser-host.js` is byte-stable.

The VS Code Logics panel embeds the canonical local viewer by starting a
managed `logics-manager view --host 127.0.0.1 --port 0 --no-open` process and
loading that loopback URL in a webview iframe. That command targets the
workspace project but reuses the same operator-scoped viewer singleton as
`logics-manager view --fleet`; keep normal viewer routes in Python and add
TypeScript only for VS Code lifecycle, focus, CSP, or documented bridge
exceptions.

The VS Code and local-viewer shared webview scripts `mainApp.js` and
`renderBoardApp.js` are hand-authored directly under `clients/shared-web/media/`
alongside the other shared media files. Editing any shared web asset is a
single-file change — commit just that file. `logics_manager/viewer_assets/` is
generated (not committed): `npm run build:assets` regenerates it from
`clients/shared-web/media` + `clients/viewer`, and CI/release run it before
building the pip wheel. The local viewer serves these sources directly, so no
build step is needed just to run it.

`npm run audit:ci` enforces the repository audit policy locally. It runs `npm audit --json` against the configured npm registry, blocks new actionable vulnerabilities, and only allows the explicitly documented temporary exceptions tracked in the backlog. If the registry is unreachable, the command fails as `registry unavailable` rather than reporting a clean advisory state. `npm run package:ci` is local-only package validation and does not require registry access after dependencies are installed.

`npm run clean:local-artifacts` previews the bounded local cleanup set for generated outputs: `artifacts/`, `build/`, `coverage/`, and `logics/.cache/`. Add `-- --apply` to remove only those repo-relative paths after inspecting the preview.

`npm run test:viewer-smoke` runs the viewer UI campaign and writes `artifacts/local-viewer-smoke/report.txt` and `summary.json`: every check it performed, with a verdict and the value it measured. A failed check does not end the run, and the run exits non-zero when any check failed. See the [viewer UI campaign runbook](./runbooks/viewer-ui-campaign.md) for how to read a KO and where a finding goes. A localhost socket bind denial is recorded as an explicit skipped result. CI still has non-skipped coverage for the viewer path: Linux/macOS-capable environments exercise Chrome or the JSDOM fallback, while Windows CI runs a server/API smoke that proves the shell and `/api/items` path without launching a browser.

`npm run test:lifecycle` is an opt-in sandbox integration check for extension install, reinstall, and uninstall behavior. By default it exits 0 with an explicit skipped message. To run it for release validation, install the VS Code `code` CLI on `PATH`, ensure packaging works locally, then run `PLUGIN_LIFECYCLE_TESTS=1 npm run test:lifecycle`. Treat a skipped lifecycle run as "not exercised", not as full integration coverage.

Oversized runtime, viewer, and test files are tracked through `logics/architecture/adr_020_split_the_oversized_plugin_and_workflow_surfaces_into_focused_modules.md`. The decomposition rule is correctness-first: extract pure helpers and API contracts before cosmetic file-size work, keep entrypoints thin, and cover each seam with targeted Python, Vitest, or smoke tests before moving on.

Current coverage goals are behavior-focused:

| Hotspot | Goal |
| --- | --- |
| `logicsFlowOperations.ts` | Keep promotion, closeout, and validation command routing covered through user-visible success and failure paths. |
| `logicsViewProvider.ts` | Cover refresh, command dispatch, and degraded bootstrap behavior before extracting orchestration helpers. |
| `logicsViewDocumentController.ts` | Cover document open/read routing, missing-file handling, and safe preview fallbacks. |
| `renderMarkdown.js` | Cover rendered Markdown semantics that users inspect directly: front matter stripping, escaping, task lists, tables, code fences, and Mermaid fallback. |
| `hostApi.js` / `harnessApi.js` | Cover message contract shape, fallback behavior outside VS Code, and project-root harness transitions. |

The enforced coverage floors are intentionally split by surface: `npm run test:coverage:src` guards extension source coverage and `npm run test:coverage:media` guards browser media coverage. Viewer behavior that is hard to measure meaningfully in unit coverage stays protected by browser-host tests and `npm run test:viewer-smoke`.

CI runs compile, lint, tests, Logics docs lint, and VSIX packaging validation on every `push` and `pull_request` via `.github/workflows/ci.yml`.

## Windows Validation From macOS

Use a two-layer strategy:

- CI is the fast default. The repository now validates supported Windows flows in GitHub Actions on `windows-latest`.
- A real Windows VM is still required for targeted debugging and release confidence on shell, PATH, launcher, filesystem, and VS Code host behavior.

Recommended local VM path from macOS:

- Apple Silicon: UTM with Windows 11 ARM is the pragmatic low-cost option.
- Intel Mac: UTM or another Windows-capable VM is fine.

Suggested VM checklist:

1. Install VS Code, Git, Python 3, and Node.js inside the VM.
2. Confirm launchers from the Windows shell you actually care about (`git --version`, `py -3 --version` or `python --version`, `node --version`, `npm --version`).
3. Clone the repo and run `npm ci`.
4. Run the automated baseline first: `npm run ci:check` and `python -m logics_manager lint`.
5. Smoke the real Windows-only paths:
   - install the `.vsix` from VS Code or with `code --install-extension ...`
   - trigger `Bootstrap Logics`
   - run `Logics: Check Environment`
   - run `logics-manager assist runtime-status --format json` and confirm `windows_safe_entrypoint` still points to `python -m logics_manager flow assist ...`
   - run `logics-manager assist diff-risk --backend auto --format json` and `logics-manager assist validation-checklist --format json`
   - confirm those shared-runtime commands still work without relying on any repo-local Codex overlay path
   - create a request, backlog item, and task
   - promote request -> backlog and backlog -> task
   - confirm `py -3` or `python` launcher resolution works as expected
6. Use the VM for release preparation and any bug that smells like shell quoting, PATH resolution, case-insensitive paths, symlink restrictions, or extension-host behavior. Do not treat macOS-only local simulation as a full Windows substitute.

## Accessibility Baseline

For new UI controls in this project:
- Every interactive control must expose an accessible name (`aria-label` or visible text).
- Icon-only controls must include a `title` tooltip for discoverability.
- Dynamic toggles must keep ARIA state in sync (`aria-expanded`, `aria-disabled`, `aria-pressed`).
- Custom interactive elements must be keyboard reachable (`tabindex`) and activatable (`Enter`/`Space`).
- Keep hover/focus descriptions consistent across toolbar, board, menus, and details panel.

## Dev-only affordances

The viewer can offer a synthetic **demo board** covering every card state, so the board can
be inspected without a real corpus. It is off unless you ask for it:

```bash
LOGICS_MANAGER_DEMO_BOARD=1 python3 -m logics_manager view
```

Accepted values are `1`, `true`, `yes` and `on`. Anything else, including an unset variable,
leaves the demo board out.

It is an opt-in rather than something inferred from the tree because inference shipped it. The
gate used to recognise a development checkout by the presence of `clients/shared-web/media`,
and the npm package and the VS Code extension both ship that directory beside
`logics_manager/` — so `REPO_ROOT` landed on the package root, the marker was found, and users
got the demo board. An environment variable cannot travel inside a release artifact, and a
packaging change cannot invert it. `tests/python/test_viewer_cli.py` rebuilds each published
layout and asserts the gate stays closed in all of them.

## Static guardrails

```bash
python3 -m ruff check logics_manager tests/python scripts
python3 scripts/check_function_length.py
python3 -m coverage run --source=logics_manager -m pytest tests/python -q
python3 -m coverage report --fail-under=73
```

All four run in `scripts/ci-check.mjs`.

**Ruff is deliberately narrow.** `F401` (unused import) is off: this codebase
re-exports on purpose — `assist.py` re-exports ~66 names from `assist_support`
so existing call sites and monkeypatch targets keep working, and
`tests/python/conftest.py` is a shared import surface for the suite. Enabling it
would report ~583 findings, nearly all intentional. `I001` (import sorting) is
off for the same reason: it rewrites blocks without fixing a defect.

**The function-length ceiling is 120 lines**, with the existing violations
grandfathered in `scripts/long_functions_baseline.json`. That file is a debt
ledger, and it should only shrink. A new or grown over-long function fails the
build; `--update` re-freezes it after a legitimate split.

**Python coverage sits around 76%**, with the floor at 75. The floor check runs
after the test suite, which is backgrounded, because coverage data does not
exist before it finishes.

## Viewer route modules

`viewer.py` serves the corpus. Two subsystems that are not the viewer live in
their own modules and are dispatched from it:

| Module | Routes |
| --- | --- |
| `viewer_cdx_routes.py` | the session cockpit (`/api/cdx-*`) |
| `viewer_workshop_routes.py` | the workshop terminal (`/api/workshop-*`) |
| `viewer_project_tools.py` | project i18n and theme |

Each exposes `handle_get(handler, route, parsed)` and `handle_post(handler,
parsed)`, returning `True` when it handled the route and `False` to let the
caller keep dispatching. Returning `True` for a route it did not handle would
swallow the response, so that is covered by a test.

Route classification stays in `viewer.py`: `VIEWER_MUTATING_ROUTES` still lists
the moved mutating routes, which is what keeps them behind loopback or a paired
device over the network.

The two viewer route modules sit lower (47% and 42%). Their request-layer
branches — malformed bodies, missing arguments, unknown ids, and the mutating
classification — are covered; what is not is the success path of each write,
which needs a live session cockpit or a real PTY. That is a deliberate stopping
point, not an oversight.
