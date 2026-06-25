## req_278_act_on_the_multi_agent_audit_hardening_and_cleanup - Act on the multi-agent audit: hardening and cleanup
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Codebase hardening
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- The local viewer server no longer raises an unhandled exception when a request arrives with a malformed Content-Length header on any JSON endpoint.
- The public CdxLogicsModel JavaScript API tolerates null or undefined items at its boundary instead of throwing a TypeError.
- Workflow status values have a single source of truth shared by Python and TypeScript, the Obsolete status is selectable, and invalid status transitions are rejected by the state machine.
- A batch of confirmed one-line correctness defects across sync, insights, and the MCP surface are fixed at their root.
- Dead and over-engineered code in the MCP and CLI surfaces is removed so the modules are smaller and easier to navigate.
- The workshop terminal accesses its master file descriptor and error field under a lock so concurrent write, resize, and read-loop close cannot race.
- Duplicated Python parsing helpers are consolidated into one shared module so behavior cannot drift between callers.
- Local-only security findings are addressed as defense-in-depth without changing user-facing behavior.
- Duplicated viewer boilerplate (SSE streaming, status routes, json.dumps) is consolidated.
- Dead and duplicated client JS/TS code is removed and fragile fetch and sort paths are made safe.

# Context
- A multi-agent audit (bugs, security, architecture) produced 96 raw findings; 82 were confirmed after adversarial verification (3 critical, 16 high, 29 medium, 34 low). This request acts on the confirmed set, grouped into coherent slices.
- The Content-Length defect is systemic: ~12 endpoints copy the same parse pattern and only catch JSONDecodeError, while switch-project and workshop-terminal-resize already show the correct except; the lazy fix is one shared helper.
- The status divergence is both debt and a real user bug: markItemObsolete writes Obsolete but the TypeScript dropdown does not list it, CLOSED_STATUSES differs, and there is no validation that a status transition is legal.
- The workshop terminal races are real but currently medium impact because OSError is already caught downstream; the fix is to take the existing lock around master-fd and error-field access.
- Security findings were all downgraded to low real impact: vectors are local-only/dev, operate on trusted committed files, or sit inside the webview sandbox; they are bundled as a single defense-in-depth slice, not treated as urgent.
- Helper duplication spans audit/lint/sync/assist_support/insights with subtly inconsistent return types and behavior, which is itself a latent bug source.
- Existing pytest and vitest suites cover the public behavior of the affected modules and act as the regression safety net.

# Acceptance criteria
- AC1: A shared helper parses Content-Length and the JSON body once and is used by every JSON do_POST endpoint in viewer.py; a malformed Content-Length yields a clean 400, not an unhandled exception, verified by a test.
- AC2: Every public CdxLogicsModel function guards against null/undefined item at its entry and returns a safe default instead of throwing, verified by a test.
- AC3: Workflow statuses are defined once and consumed by both Python and TypeScript; the Obsolete status is selectable, CLOSED_STATUSES is identical on both sides, and invalid status transitions are rejected, with a CI guard against divergence.
- AC4: The confirmed correctness one-liners are fixed at root: sync.py section-note scoping, insights.py ref strip, mcp.py JSON-RPC notification returns no error body, mcp.py dry_run diff paths, flow Progress insertion index.
- AC5: The dead MCP tool annotations are removed, call_tool dispatches via a handler table, and the hardcoded CLI subcommand validators are dropped in favor of argparse's own validation.
- AC6: The workshop terminal master file descriptor and error field are only read and mutated under the session lock, verified by a test exercising concurrent write/resize/close.
- AC7: Duplicated Python helpers (_extract_refs, _indicator_value, _section_lines, _git_changed_paths, _progress_value, document collection) live in one shared module with a single signature each; the dead sync.py _section_lines is removed.
- AC8: The local-only security findings are addressed: link href protocol is validated, contract and changelog paths are bounded to the repo root, the CSP nonce uses a CSPRNG, the import secret is not exposed via the child environment, and /media/ paths are URL-decoded before resolution.
- AC9: Duplicated viewer boilerplate is consolidated: one SSE streaming helper, one status-route mechanism, and a shared json.dumps render path.
- AC10: Dead and duplicated client JS/TS code is removed (cdxRunStatusDetail, redefined escapeHtml/asString/parseTimestamp, duplicate constants, unused void/declare statements) and fragile paths are fixed (fetch checks response.ok before .json(); the insights sort comparator no longer returns NaN).
- AC11: No new runtime dependency is introduced; only the standard library and existing tooling are used.
- AC12: The full pytest and vitest suites pass with no behavior regressions, and logics-manager lint and audit pass on the resulting corpus and code.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py` (~12 do_POST endpoints parse Content-Length without catching ValueError; duplicated SSE and status-route boilerplate)
- `clients/shared-web/media/logicsModel.js` (public CdxLogicsModel functions dereference item without null guard)
- `logics_manager/flow/__init__.py`, `logics_manager/lint.py`, `logics_manager/audit.py`, `logics_manager/insights.py` vs `clients/vscode/src/insightsAggregate.ts`, `clients/vscode/src/logicsViewProviderSupport.ts` (status sets duplicated and divergent across Python and TypeScript; no status-transition validation)
- `logics_manager/sync.py`, `logics_manager/assist_support.py`, `logics_manager/audit.py`, `logics_manager/insights.py` (duplicated _extract_refs, _indicator_value, _section_lines, _git_changed_paths, _progress_value helpers)
- `logics_manager/mcp.py` (dead tool annotations + 363-line call_tool god function), `logics_manager/cli.py` (hardcoded subcommand validators)
- `logics_manager/viewer_workshop.py` (master fd and error field accessed without lock; duplicated session classes)
- `clients/vscode/src/workflowSupport.ts`, `logicsReadPreviewHtml.ts`, `logics_manager/release.py`, `logics_manager/viewer.py` (local-only security defense-in-depth: XSS protocol, path traversal, weak nonce, secret env, missing URL-decode)

# AI Context
- Summary: Act on the multi-agent audit: hardening and cleanup
- Keywords: request-chain-scaffold, act on the multi-agent audit: hardening and cleanup, development-ready
- Use when: You need to implement or review the scaffolded workflow for Act on the multi-agent audit: hardening and cleanup.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_496_harden_viewer_server_against_malformed_content_length`
- `item_497_make_the_public_cdxlogicsmodel_api_null_safe`
- `item_498_unify_and_guard_workflow_statuses_across_python_and_typescript`
- `item_499_fix_confirmed_correctness_one_liners`
- `item_500_delete_dead_and_over_engineered_mcp_and_cli_code`
- `item_501_remove_workshop_terminal_race_conditions`
- `item_502_consolidate_duplicated_python_parsing_helpers`
- `item_503_address_local_only_security_findings_as_defense_in_depth`
- `item_504_consolidate_duplicated_viewer_boilerplate`
- `item_505_clean_up_duplicated_and_dead_client_js_ts_code`
