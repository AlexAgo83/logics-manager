## req_195_add_bounded_mcp_file_delete_and_rename_capabilities - Add bounded MCP file delete and rename capabilities
> From version: 2.1.1
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Allow operators to delete obsolete or invalid Logics files through a bounded MCP action when a generated document needs to be removed.
- Allow operators to rename Logics files through a bounded MCP action when a filename violates conventions or needs to be corrected.
- Prevent manual repository cleanup from being required for common remediation flows such as bad filenames, duplicate generated requests, or smoke-test artifacts.

# Context
- A previous request was generated with a French filename containing an accented character, which caused the Logics lint to report a bad filename.
- The exposed MCP tools currently provide creation, promotion, closing, linting, auditing, and bounded append/update operations, but no delete or rename operation was available when cleanup was needed.
- Without delete or rename support, invalid generated files can remain in the working tree and continue to affect lint and audit output.
- The capability must remain bounded to Logics-approved paths and must not become unrestricted filesystem access.

# Acceptance criteria
- AC1: An MCP action can delete a Logics file by repo-relative path when the path is inside an approved Logics directory.
- AC2: The delete action supports dry_run mode and returns the target path, whether the file would be deleted or was deleted, and any validation errors.
- AC3: An MCP action can rename or move a Logics file from one repo-relative path to another when both paths are inside approved Logics directories.
- AC4: The rename action supports dry_run mode and returns the source path, destination path, whether the rename would be applied or was applied, and any validation errors.
- AC5: Both actions reject paths outside approved Logics directories, absolute paths, parent-directory traversal, and unsupported file extensions.
- AC6: Both actions provide deterministic responses and do not expose unrestricted directory listing or arbitrary filesystem operations.
- AC7: A smoke test confirms that an invalid request file can be renamed to a convention-compliant filename or deleted, after which Logics lint no longer reports the original bad filename.

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
- `logics_manager/assist.py`
- `python_tests/test_logics_manager_cli.py`

# AI Context
- Summary: Draft a bounded request for add bounded mcp file delete and rename capabilities.
- Keywords: request-draft, logics-manager, python runtime, bundled CLI
- Use when: You need a new bounded request doc for the Logics workflow.
- Skip when: The work already has an existing request or should go straight to a backlog slice.

# Backlog
- none
- `item_359_add_bounded_mcp_file_delete_and_rename_capabilities`
