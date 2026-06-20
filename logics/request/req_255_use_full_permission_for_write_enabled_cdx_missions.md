## req_255_use_full_permission_for_write_enabled_cdx_missions - Use full permission for write-enabled CDX missions
> From version: 2.11.5
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Write-enabled CDX missions launched from the viewer need to run with enough provider permission to actually create files, run validation, and commit when the selected mission mode asks for it.
- The current viewer plan maps `allowFileWrites=true` to `--permission workspace-write`, which can still trigger Claude approval gates and leave required artifacts unwritten.
- Operators should not discover the mismatch after a long mission. The viewer should either launch with `--permission full` for write-enabled mission modes or block early with a clear session-permission preflight.

# Context
- A `corvus` full-audit mission on `2026-06-20` completed its read-only audit but failed to create the required Logics request because every `logics-manager`, `python3 -m logics_manager`, and file-write attempt was denied behind an interactive approval gate.
- `cdx config corvus` showed `Permission full`, but the viewer-generated mission command used `--permission workspace-write`.
- The relevant planner logic is in `logics_manager/viewer.py`, where write-enabled missions currently derive `permission = "workspace-write" if allow_file_writes else "read-only"`.
- Browser-side mission launch and previews are in `clients/viewer/browser-host.js` and mirrored in `logics_manager/viewer_assets/viewer/browser-host.js`.
- Existing tests in `tests/python/test_logics_manager_cli.py` currently assert `workspace-write` for write-enabled full-audit/release-review/wish-to-request plans and need to be updated with the intended contract.

# Desired outcomes
- Write-enabled CDX mission plans use `--permission full` when the mission is expected to write files or create commits.
- Read-only mission plans continue to use `--permission read-only`.
- The viewer exposes a preflight or plan-state message when a selected session cannot satisfy a write-enabled mission's required permission.
- The rendered mission preview/terminal command makes the permission mode visible enough for the operator to verify before launch.
- Tests cover full-audit, release-review, wish-to-request, and corpus-ready permission selection.
- Documentation or in-view wording clarifies that write-enabled missions require full permission because they may create Logics docs, edit files, run validation, and commit.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/viewer.py`
- `clients/viewer/browser-host.js`
- `logics_manager/viewer_assets/viewer/browser-host.js`
- `tests/python/test_logics_manager_cli.py`
- `tests/viewer.browser-host.test.ts`

# AI Context
- Summary: Change CDX mission planning so write-enabled viewer missions use full permission or fail preflight clearly instead of running under workspace-write and hitting provider approval gates.
- Keywords: cdx-mission, viewer-planner, full-permission, workspace-write, approval-gate, allow-file-writes, mission-preflight, corvus, terminal-command
- Use when: Implementing or reviewing permission selection for viewer-launched CDX missions.
- Skip when: The work is about unrelated mission prompts, CDX status rendering, or Logics workflow lifecycle rules.

# Backlog
- none
