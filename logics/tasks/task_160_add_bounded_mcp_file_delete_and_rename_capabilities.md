## task_160_add_bounded_mcp_file_delete_and_rename_capabilities - Add bounded MCP file delete and rename capabilities
> From version: 2.1.1
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
- `item_359_add_bounded_mcp_file_delete_and_rename_capabilities`

# Acceptance criteria
- AC1: An MCP action can delete a Logics file by repo-relative path when the path is inside an approved Logics directory.
- AC2: The delete action supports dry_run mode and returns the target path, whether the file would be deleted or was deleted, and any validation errors.
- AC3: An MCP action can rename or move a Logics file from one repo-relative path to another when both paths are inside approved Logics directories.
- AC4: The rename action supports dry_run mode and returns the source path, destination path, whether the rename would be applied or was applied, and any validation errors.
- AC5: Both actions reject paths outside approved Logics directories, absolute paths, parent-directory traversal, and unsupported file extensions.
- AC6: Both actions provide deterministic responses and do not expose unrestricted directory listing or arbitrary filesystem operations.
- AC7: A smoke test confirms that an invalid request file can be renamed to a convention-compliant filename or deleted, after which Logics lint no longer reports the original bad filename.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_160_add_bounded_mcp_file_delete_and_rename_capabilities.md` after implementation.
- Finish workflow executed on 2026-05-27.
- Linked backlog/request close verification passed.

# Report
- Implementation complete.
- Finished on 2026-05-27.
- Linked backlog item(s): `item_359_add_bounded_mcp_file_delete_and_rename_capabilities`
- Related request(s): `req_195_add_bounded_mcp_file_delete_and_rename_capabilities`

# AI Context
- Summary: Implement add bounded mcp file delete and rename capabilities.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_195_add_bounded_mcp_file_delete_and_rename_capabilities`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- AC1 -> `delete_logics_file`. Proof: `logics_manager/mcp.py` validates paths through `_markdown_file_path` against approved Logics directories before deletion.
- AC2 -> Delete dry-run response. Proof: `test_mcp_bounded_delete_and_rename_tools` asserts `would_delete` in dry-run and `deleted` after execution.
- AC3 -> `rename_logics_file`. Proof: the MCP tool validates source and destination repo-relative paths before applying `Path.rename`.
- AC4 -> Rename dry-run response. Proof: `test_mcp_bounded_delete_and_rename_tools` asserts `would_rename`, source path, destination path, and eventual `renamed`.
- AC5 -> Rejection coverage. Proof: `test_mcp_file_tools_reject_unapproved_paths` covers paths outside approved areas and unsupported extensions; `_relative_path` also rejects absolute paths and traversal.
- AC6 -> Bounded deterministic operations. Proof: the tools operate on one explicit Markdown file path and expose no directory listing or arbitrary filesystem primitive.
- AC7 -> Cleanup smoke coverage. Proof: `test_mcp_bounded_delete_and_rename_tools` renames an invalid request file and then deletes it, leaving no original bad filename behind.
