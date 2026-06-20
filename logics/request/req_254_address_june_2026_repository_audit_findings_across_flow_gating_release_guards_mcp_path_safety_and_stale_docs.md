## req_254_address_june_2026_repository_audit_findings_across_flow_gating_release_guards_mcp_path_safety_and_stale_docs - Address June 2026 repository audit findings across flow gating, release guards, MCP path safety, and stale docs
> From version: 2.11.5
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Repository hardening
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Capture the read-only repository audit run from `2026-06-20` as tracked Logics work rather than leaving findings in a transient mission artifact.
- Fix confirmed correctness, validation, and security-hardening findings with scoped changes and regression coverage.
- Close the highest-risk test gaps around closure-gating helpers and correct tracked stale documentation.
- Keep this as a draft request for later triage; do not promote it as part of the audit capture.

# Context
- The `corvus` full-audit mission completed read-only against the `main` checkout at `2.11.5`.
- The mission did not persist this request because its run context denied every `logics-manager`, `python3 -m logics_manager`, and direct file-write attempt behind an interactive approval gate.
- The mission did leave a separate in-flight code fix for terminal mission launch scripts: `clients/viewer/browser-host.js`, `logics_manager/viewer_assets/viewer/browser-host.js`, and `tests/viewer.browser-host.test.ts` changed `.join("\\n")` to `.join("\n")` so the generated shell wrapper receives real line breaks.
- The audit findings below were verified by direct source reading in the mission transcript.

# Findings
- HIGH `logics_manager/flow_evidence.py:42`: `has_validation_evidence` accepts any bare `pass` substring. Text such as `do not bypass the gate` can satisfy closeout/finish validation without real evidence. Line 44 similarly accepts `ok` substrings in phrases such as `broken test command`.
- HIGH `logics_manager/flow_evidence.py:49` and `logics_manager/audit.py:389`: `has_ac_proof` / `_has_ac_with_proof` are doc-wide substring checks, not per-AC checks. Any AC id plus any `Proof:` anywhere can mark every AC as traced.
- MED `logics_manager/flow.py:870`: `_extract_refs` matches `_\\d{3}_`, but generated ids use `:03d` minimum width. At id `1000` and above, lineage and propagation references can silently stop matching.
- MED `logics_manager/mcp.py:411`: `_relative_path` checks only the leaf for `is_symlink()` while callers act on the unresolved path. A directory symlink inside `logics/` can escape intended bounded delete/rename scope.
- MED `logics_manager/release.py:152`: `_current_version` returns the first detected version and does not assert agreement across `VERSION`, `pyproject.toml`, and `package.json`.
- MED `logics_manager/release.py:354`: release evidence with missing `target_version`, `commit`, or `tag` is treated as fresh for any target; JSONL appends are also unlocked.
- MED `logics_manager/audit.py:836`: after `--autofix-ac-traceability`, the recompute loop can drop `ac_no_linked_backlog` / `ac_no_linked_tasks` blockers when linked sets are empty.
- MED `logics_manager/audit.py:26`: terminal statuses such as `obsolete`, `validated`, `settled`, and `superseded` are excluded from `STATUS_DONE`, causing some terminal docs to be treated as open.
- LOW `logics_manager/release.py:163` and `logics_manager/assist.py:634`: git subprocess calls omit `timeout=`, risking indefinite hangs.
- LOW `logics_manager/mcp.py`: MCP/HTTP error details can expose absolute repo paths and raw subprocess stdout/stderr to clients.
- LOW `logics_manager/update_check.py`: version comparison ignores pre-release/fourth segment forms, and failed fetches can cache an empty latest version.
- STALE DOC `SECURITY.md:9`: supported versions list only `2.9.x` although the current release is `2.11.5`.
- STALE DOC `CONTRIBUTING.md:3`: the retired project name `cdx-logics-vscode` is still used.
- LOCAL DRIFT `LOGICS.md`: local guidance references a missing `logics/skills` submodule and `logics-ui-steering` skill path. Tracked source is already clean, so this is local artifact drift rather than a product source change.

# Desired outcomes
- `has_validation_evidence` rejects non-evidence text and cannot pass on substrings such as `bypass`, `passed around`, or `broken`.
- `has_ac_proof` and `_has_ac_with_proof` evaluate proof per criterion, not doc-wide, and tests cover multi-criterion false positives.
- `_extract_refs` and sibling ref parsing support ids of any width, with a regression for id `1000` or above.
- MCP path validation confines every path component and delete/rename operations cannot escape through directory symlinks.
- Release readiness asserts cross-source version agreement and rejects evidence missing target/version provenance.
- Audit autofix keeps missing-link blockers visible, and terminal statuses are handled consistently.
- `SECURITY.md` and `CONTRIBUTING.md` are updated for the current version and project name.
- Validation includes focused tests for flow evidence, MCP path safety, release readiness, and Logics `lint` / `audit`.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/flow_evidence.py`
- `logics_manager/flow.py`
- `logics_manager/audit.py`
- `logics_manager/mcp.py`
- `logics_manager/release.py`
- `logics_manager/update_check.py`
- `logics_manager/assist.py`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `tests/python/test_logics_manager_cli.py`

# AI Context
- Summary: Triage follow-up for the June 2026 full repository audit: tighten closure-gating evidence checks, widen ref parsing, harden MCP path safety and release guards, fix audit autofix/terminal-status gaps, and refresh stale docs.
- Keywords: validation-evidence-gate, ac-proof-per-ac, extract-refs-width, mcp-symlink-confinement, release-version-agreement, evidence-staleness, autofix-ac-traceability, status-done-terminal, security-md-versions, flow-evidence-tests
- Use when: You need the delivery thread for the June 2026 repository audit follow-up.
- Skip when: The work is about unrelated viewer layout, mission UX, or general workflow grooming.

# Backlog
- none
- `item_449_address_june_2026_repository_audit_findings_across_flow_gating_release_guards_mcp_path_safety_and_stale_docs`
