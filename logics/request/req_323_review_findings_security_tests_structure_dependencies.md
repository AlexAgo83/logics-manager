## req_323_review_findings_security_tests_structure_dependencies - Review findings: security, tests, structure, dependencies
> From version: 2.21.1
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 17:42:50

# AI Context
- Summary: Capture, not scope, a set of evidence-backed findings from a whole-repo review (security, test coverage, code structure, dependency/packaging health). No fix has been applied; no backlog item exists yet for any of these.
- Keywords: review, security, test-coverage, path-traversal, mcp-tool-definitions, help-text-extraction, coverage-floor, lockfile-drift, ac10
- Use when: Scoping which of these findings deserve real work via `/corpus`.
- Skip when: Looking for already-implemented work — this doc is a candidate list, not a delivery record.

# Needs
- Consolidate the four independently-implemented repo-root path-escape guards into one shared helper: `logics_manager/mcp.py:628` `_relative_path()` (most rigorous — rejects `..`, resolves against repo root, walks intermediate components for symlinks), `logics_manager/viewer.py:491` `_resolve_repo_doc_path()` (no symlink check, no explicit `..` rejection), `logics_manager/viewer_git.py:469` `_normalize_git_file_path()` (never resolves against the repo root at all — no final containment check), `logics_manager/viewer_project_tools.py:38` `_inside_file()` (no symlink or absolute-path check). Same guard, four different levels of strictness, no shared code; `viewer_git.py`'s missing final containment check is the one worth a second, security-focused look.
- Extract `logics_manager/mcp.py:71-433` (`TOOL_DEFINITIONS`, ~362 lines, a pure JSON-schema data literal using only the local `_tool_schema()` helper) into its own module. The file's line-budget entry cites an extraction "attempted and backed out" for the tool *dispatcher* (req_303) — that reasoning does not cover this static schema table, which needs nothing back from `mcp.py` and has no import-cycle risk.
- Extract `logics_manager/flow/__init__.py:240-741` (~500 lines of pure help-text string builders — `_build_new_help` through `_build_progress_kind_help`, depending only on local formatting helpers defined in the same block) into its own module, following the same "vocabulary vs. verbs" split the file's own line-budget comment already used for `flow/docs.py`.
- Fix the Python coverage floor in `scripts/ci-check.mjs:99-107` (`coverage report --fail-under=75`): the comment directly above it states "the floor sits below the measured value so the build does not start red" — a self-documented rubber stamp that will not catch a coverage regression until it drops below whatever the actual (unstated) number already is.
- Regenerate `package-lock.json` — its `version` field (`2.21.0`) is stale by one patch version against `package.json`'s `"version": "2.21.1"`.
- Add direct test coverage for `logics_manager/assist_workflow.py` (225 lines) — the one Python module found with zero direct or transitive test reference by name anywhere under `tests/python/`. `clients/vscode/src/logicsCodexWorkflowBootstrapSupport.ts` (504 lines) is the equivalent standout on the TypeScript side: its sole consumer (`logicsCodexWorkflowOperations.ts`) also has no direct test file.

# Context
- This review used the project's own `/review-project` skill: read the code, ran the project's own validation, captured findings as one request — no fixes applied.
- Baseline before this review: `logics-manager health --format json` reported `issue_count: 0`, `stale_doc_count: 0` across 1399 docs — the corpus itself is clean; these findings are about the surrounding code, not the corpus.
- Security sweep (LAN auth, path traversal in file-serving routes, subprocess usage, secrets handling, MCP tool capability gating, `eval`/`exec`/`pickle`/unsafe `yaml.load`/`os.system`) found nothing exploitable: no `shell=True` anywhere in `logics_manager/`, no literal credentials, LAN tokens stored only as SHA-256 hashes compared with `hmac.compare_digest`, and `mcp.py`'s capability table defaults unknown tools to `MUTATING` (fail-closed). The one soft spot it surfaced is the path-guard inconsistency captured above, not a live exploit.
- Line-budget concerns are not raised here as fresh findings: the ledger (`scripts/check-source-line-budget.mjs`) is an active, working ratchet (item_626, Done) that already requires a stated reason per raised ceiling and already lowers entries when files shrink. The top outliers (`clients/viewer/src/browser-host/index.js` at 4219 lines, `logics_manager/flow/__init__.py` at 3682, `logics_manager/viewer.py` at 3396) each carry a coherent, specific justification — except for the two concrete extractable seams named above, which the existing justifications do not actually cover.
- `logics_manager/viewer.py` and its own route modules (`viewer_cdx_routes.py`, `viewer_workshop_routes.py`) have a genuine circular import (`from . import viewer as _viewer` importing back the module that imports them at load time). It works today only because the back-import binds the module object rather than a name, deferring all attribute access to call time — documented as intentional in the route modules' docstrings, but load-order-fragile: noted here as a risk to be aware of, not a proven bug, so it is not listed as a Need.
- Test-suite hygiene otherwise reads clean: no unconditional skip/xfail/todo markers in either test suite (only environment-conditional `skipif`, e.g. missing `node`/`pty`), and the two "flaky" comment hits found are already-implemented mitigations, not open flake admissions.
- `package.json`'s one exact-pinned dependency (`"ws": "8.21.0"`, vs. caret ranges everywhere else) is duplicated in the `overrides` block at the same version, which reads as a deliberate override-consistency choice rather than an oversight — not listed as a Need, noted here in case it resurfaces.

# Acceptance criteria
- AC1: The four repo-root path-escape guards are consolidated into one shared helper, used by `mcp.py`, `viewer.py`, `viewer_git.py`, and `viewer_project_tools.py`, with a test proving the strictest existing behavior (symlink walk, `..` rejection, final containment check) applies uniformly everywhere.
- AC2: `mcp.py`'s `TOOL_DEFINITIONS` literal is extracted to its own module with no behavior change (`mcp serve`'s `tools/list` output is byte-for-byte identical before and after).
- AC3: `flow/__init__.py`'s help-text builders are extracted to their own module with no behavior change (every `--help` output is identical before and after).
- AC4: The Python coverage floor in `scripts/ci-check.mjs` either states the real current measured percentage as its floor, or is replaced with a ratchet mechanism consistent with the line-budget ledger's own pattern (item_626).
- AC5: `package-lock.json` is regenerated and its version field matches `package.json`.
- AC6: `assist_workflow.py` gains a dedicated test file exercising its own exported functions directly, not only transitively through CLI-level tests.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/mcp.py`
- `logics_manager/viewer.py`
- `logics_manager/flow/__init__.py`
- `scripts/ci-check.mjs`
- `logics_manager/assist_workflow.py`
- `tests/python/test_logics_manager_cli.py`

# Backlog
- none
