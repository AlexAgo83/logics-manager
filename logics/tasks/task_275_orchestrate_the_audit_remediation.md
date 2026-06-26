## task_275_orchestrate_the_audit_remediation - Orchestrate the audit remediation
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Context
- Orchestrate the scaffolded request chain and keep sibling implementation slices linked.

# Plan
- [x] 1. Land the low-risk, high-value correctness work first: the viewer Content-Length helper, the correctness one-liners, and the workshop terminal lock fixes; all are well covered by tests.
- [x] 2. Add the null guards to the public CdxLogicsModel API and re-sync the webview media mirror.
- [x] 3. Unify workflow statuses behind a single source of truth, add Obsolete, validate transitions, and wire the CI divergence guard.
- [x] 4. Address the local-only security findings as one defense-in-depth pass.
- [x] 5. Consolidate the duplicated Python helpers into a shared module, then the viewer SSE/status/render boilerplate.
- [x] 6. Delete the dead MCP annotations, convert call_tool to a dispatch table, drop the CLI validators, and clean up the dead/duplicated client JS/TS code.
- [x] 7. After each slice run lint, audit, pytest, and vitest, and keep all linked docs in sync before closeout.
- [x] GATE: do not close until lint, audit, and scaffold validation pass.

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

# Definition of Done (DoD)
- [x] Generated request, product, backlog, and task docs are present.
- [x] Context-pack handoff is available when requested.
- [x] Validation passes.

# AC Traceability
- request-AC1 -> This task. Proof: item_496 added the shared Content-Length parser; tested in test_viewer_cli.
- request-AC2 -> This task. Proof: item_497 null-guarded the CdxLogicsModel API; tested in webview.logicsModel-nullsafe.test.
- request-AC3 -> This task. Proof: item_498 unified statuses behind statuses.json + generated TS with the check:status-constants guard; tested in test_statuses and workflowStatuses.test.
- request-AC4 -> This task. Proof: item_499 fixed the confirmed correctness one-liners at root; tested in test_sync/flow/mcp.
- request-AC5 -> This task. Proof: item_500 removed dead MCP annotations and added the call_tool dispatch table; tested in test_logics_manager_mcp.
- request-AC6 -> This task. Proof: item_501 took the session lock around the workshop terminal fd/error; tested in test_workshop_cli.
- request-AC7 -> This task. Proof: item_502 consolidated the parsing helpers into doc_parsing; tested in test_doc_parsing.
- request-AC8 -> This task. Proof: item_503 addressed the local-only security findings (link protocol, repo-root path bounding, CSPRNG nonce, /media URL-decode); tested in test_viewer_cli and test_release_contract_schema. The cdx import secret stays in a scoped child env because cdx only supports --passphrase-env (no stdin); see item_503 Notes.
- request-AC9 -> This task. Proof: item_504 extracted the shared SSE streamer and status route table; viewer suite unchanged.
- request-AC10 -> This task. Proof: item_505 deduped client helpers and fixed the NaN comparator; tested in insightsHelpers.test and cspNonce.test.
- request-AC11 -> This task. Proof: no new runtime dependency was introduced; only stdlib and existing tooling are used.
- request-AC12 -> This task. Proof: full pytest (437), vitest (695), lint, and audit pass on the resulting corpus and code.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run scaffold command tests.

# Report
- All ten backlog slices (item_496..item_505) implemented, each with its own commit and regression tests.
- item_496: shared `_read_json_body_strict` makes malformed Content-Length a clean 400 across 25 do_POST endpoints.
- item_499: fixed sync section-note scope, insights ref strip, mcp notification body, mcp dry_run diff paths, flow Progress index.
- item_501: workshop terminal `_master_fd`/`error` access taken under the session lock; imports hoisted.
- item_497: public CdxLogicsModel API null-guarded; webview media mirror re-synced.
- item_498: statuses unified behind `logics_manager/statuses.json` + generated TS module with a `check:status-constants` CI guard; Obsolete selectable; terminal-transition validation on both sides.
- item_503: link-protocol allowlist, repo-root-bounded release paths, CSPRNG nonce, /media URL-decode. The cdx secret stays in a scoped child env (cdx only supports --passphrase-env; stdin is not available), documented in item_503 Notes.
- item_502: shared `doc_parsing` module replaces the duplicated parsing helpers; dead sync `_section_lines` removed.
- item_500: dead MCP hint annotations removed, `call_tool` dispatch table, CLI argparse-only subcommand rejection.
- item_504: shared `_stream_sse_events` helper and `_STATUS_ROUTE_TABLE`; SSE/status/render output byte-for-byte unchanged.
- item_505: deduped insights helpers + UNAVAILABLE_* constants, fixed the NaN timestamp comparator, hardened cdx fetches, removed dead `void webview;`.
- Validation: lint, audit, `lint --require-status`, scaffold tests, pytest (437), and vitest (695) all pass.

# AI Context
- Summary: Orchestrate the audit remediation
- Keywords: scaffolded-task, request-chain-scaffold, orchestration
- Use when: Coordinating implementation of a scaffolded request chain.
- Skip when: Working on one isolated sibling slice.

# Links
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
