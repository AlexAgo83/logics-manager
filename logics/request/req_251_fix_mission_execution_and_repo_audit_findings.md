## req_251_fix_mission_execution_and_repo_audit_findings - Fix mission execution and repository audit findings
> From version: 2.11.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Convert the failed CDX mission output from `2026-06-20` into tracked Logics work instead of leaving findings in a transient stdout artifact.
- Fix the confirmed repository audit findings from that mission with scoped code changes, tests, and validation evidence.
- Fix CDX mission execution/reporting so a run with permission denials and no applied work cannot look like a useful success.
- Add a `logics-manager update` command when available, as an operator-friendly alias for the existing `self-update` workflow.

# Context
- The CDX mission run `f8ee00fbdf7a4e05b6bebcf3513f2ff4` ended with `status: succeeded`, `exit_code: 0`, and very high token usage, but it created no files, no commit, no task report, and stopped on permission denials for `Bash`, `Write`, and the code-review graph MCP. The mission output was useful only as a read-only audit draft.
- The current local session can run `logics-manager status`, `health`, and `audit`, so the mission's permission barrier was a run-context/reporting failure, not a repository workflow blocker.
- Confirmed audit findings to address:
  - `logics_manager/audit.py`: `--autofix-structure` clears all remaining issues after structural edits, which can make audit output falsely clean.
  - `logics_manager/flow.py`: `flow deliver` passes a repo-relative request path into a generated backlog link where a bare request ref is expected.
  - `logics_manager/mcp.py`: HTTP request body reads trust `Content-Length` without an upper bound or non-positive-length rejection.
  - `logics_manager/sync.py`: `search-docs` reports `truncated: true` when matches exactly equal the limit, even if no extra match exists.
  - `logics_manager/config.py`: boolean coercion does not handle common YAML boolean spellings case-insensitively.
  - `logics_manager/cli.py` and README/help docs: flow help omits `validate`, and the update surface should include `logics-manager update` as a friendlier alias for `self-update`.
- Scope also includes tests that prove the mission-status behavior: permission-denied runs must expose the denials and should be classified as blocked/needs-approval rather than a clean, useful success.

# Acceptance criteria
- AC1: The failed mission output is represented in the Logics corpus with backlog/task coverage and no audit finding is left only in the transient CDX stdout artifact.
- AC2: Confirmed repository audit findings are fixed or explicitly rejected with evidence; each accepted fix has targeted regression coverage.
- AC3: CDX mission run/report handling exposes permission denials and classifies blocked write-capable missions distinctly from useful success.
- AC4: `logics-manager update` is available as a documented command path for the same end-user update workflow as `logics-manager self-update`, with help/test coverage.
- AC5: Final validation includes Logics `status`, `health`, `lint --require-status`, `audit --group-by-doc`, and relevant Python/TypeScript test targets.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow.py`
- `logics_manager/audit.py`
- `logics_manager/mcp.py`
- `logics_manager/sync.py`
- `logics_manager/config.py`
- `logics_manager/cli.py`
- `logics_manager/viewer.py`
- `clients/viewer/browser-host.js`
- `logics_manager/assist.py`
- `tests/python/test_logics_manager_cli.py`
- `tests/python/test_logics_manager_mcp.py`
- `tests/viewer.browser-host.test.ts`

# AI Context
- Summary: Track and deliver the failed CDX mission follow-up: convert mission audit findings into corpus work, fix confirmed repository bugs, add `logics-manager update`, and correct mission permission-denial reporting.
- Keywords: cdx-mission, permission-denials, repo-audit, self-update, update-alias, autofix-structure, mcp-content-length, search-docs-truncated
- Use when: You need the current delivery thread for fixing the failed mission execution and its audit findings.
- Skip when: You are working on unrelated viewer layout, release publication, or general workflow grooming.

# Backlog
- none
- `item_445_fix_repository_audit_findings`
- `item_446_fix_cdx_mission_execution_reporting_and_update_alias`
