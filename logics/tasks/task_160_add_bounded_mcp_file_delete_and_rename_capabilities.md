## task_160_add_bounded_mcp_file_delete_and_rename_capabilities - Add bounded MCP file delete and rename capabilities
> From version: 2.1.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

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

# Report
- Implementation complete.

# AI Context
- Summary: Implement add bounded mcp file delete and rename capabilities.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_195_add_bounded_mcp_file_delete_and_rename_capabilities`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
