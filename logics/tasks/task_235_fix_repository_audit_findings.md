## task_235_fix_repository_audit_findings - Fix repository audit findings
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
- `item_445_fix_repository_audit_findings`

# Acceptance criteria
- AC1: The failed mission output is represented in the Logics corpus with backlog/task coverage and no audit finding is left only in the transient CDX stdout artifact.
- AC2: Confirmed repository audit findings are fixed or explicitly rejected with evidence; each accepted fix has targeted regression coverage.

# AC Traceability
- request-AC1 -> This task. Proof: `req_251`, `item_445`, and this task capture the failed mission's audit findings as tracked Logics work.
- request-AC2 -> This task. Proof: this task covers fixes and tests for the confirmed audit findings in `audit.py`, `flow.py`, `mcp.py`, `sync.py`, and `config.py`.
- request-AC3 -> This task. Evidence needed: CDX mission run/report handling exposes permission denials and classifies blocked write-capable missions distinctly from useful success.
- request-AC4 -> This task. Evidence needed: `logics-manager update` is available as a documented command path for the same end-user update workflow as `logics-manager self-update`, with help/test coverage.
- request-AC5 -> This task. Evidence needed: Final validation includes Logics `status`, `health`, `lint --require-status`, `audit --group-by-doc`, and relevant Python/TypeScript test targets.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_235_fix_repository_audit_findings.md` after implementation.
- Implemented and verified repository audit fixes: audit autofix preserves unrelated findings, flow deliver uses canonical request refs, MCP rejects oversized bodies, search-docs truncation is exact, config boolean coercion handles YAML spellings. Validation: python3 -m pytest tests/python/test_logics_manager_cli.py tests/python/test_logics_manager_mcp.py -q passed (322 passed); logics-manager lint --require-status OK; logics-manager audit --group-by-doc OK.
- Finish workflow executed on 2026-06-20.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-06-20.
- Linked backlog item(s): `item_445_fix_repository_audit_findings`
- Related request(s): `req_251_fix_mission_execution_and_repo_audit_findings`

# AI Context
- Summary: Implement fix repository audit findings.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_251_fix_mission_execution_and_repo_audit_findings`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
