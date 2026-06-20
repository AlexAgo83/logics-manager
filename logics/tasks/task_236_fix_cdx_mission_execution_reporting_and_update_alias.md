## task_236_fix_cdx_mission_execution_reporting_and_update_alias - Fix CDX mission execution reporting and update alias
> From version: 2.11.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

# Backlog
- `item_446_fix_cdx_mission_execution_reporting_and_update_alias`

# Acceptance criteria
- AC3: CDX mission run/report handling exposes permission denials and classifies blocked write-capable missions distinctly from useful success.
- AC4: `logics-manager update` is available as a documented command path for the same end-user update workflow as `logics-manager self-update`, with help/test coverage.
- AC5: Final validation includes Logics `status`, `health`, `lint --require-status`, `audit --group-by-doc`, and relevant Python/TypeScript test targets.

# AC Traceability
- request-AC3 -> This task. Proof: this task covers backend and viewer handling for CDX permission-denial runs and reports.
- request-AC4 -> This task. Proof: this task covers the `logics-manager update` alias, root help, README, and CLI tests.
- request-AC5 -> This task. Proof: this task owns final validation evidence for CDX mission reporting, update alias tests, and Logics health/lint/audit gates.
- request-AC1 -> This task. Evidence needed: The failed mission output is represented in the Logics corpus with backlog/task coverage and no audit finding is left only in the transient CDX stdout artifact.
- request-AC2 -> This task. Evidence needed: Confirmed repository audit findings are fixed or explicitly rejected with evidence; each accepted fix has targeted regression coverage.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_236_fix_cdx_mission_execution_reporting_and_update_alias.md` after implementation.
- Implemented and verified CDX mission reporting and update alias: permission-denial runs are marked blocked in payloads and viewer reports, nested mission output is parsed from CDX result text, and logics-manager update aliases self-update. Validation: python3 -m pytest tests/python/test_logics_manager_cli.py tests/python/test_logics_manager_mcp.py -q passed (322 passed); npm test -- tests/viewer.browser-host.test.ts tests/logicsManagerCliHelp.test.ts --run passed (111 passed); logics-manager lint --require-status OK; logics-manager audit --group-by-doc OK.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_446_fix_cdx_mission_execution_reporting_and_update_alias`
- Related request(s): `req_251_fix_mission_execution_and_repo_audit_findings`

# AI Context
- Summary: Implement fix cdx mission execution reporting and update alias.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_251_fix_mission_execution_and_repo_audit_findings`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
