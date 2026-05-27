## item_359_add_bounded_mcp_file_delete_and_rename_capabilities - Add bounded MCP file delete and rename capabilities
> From version: 2.1.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Allow operators to delete obsolete or invalid Logics files through a bounded MCP action when a generated document needs to be removed.
Allow operators to rename Logics files through a bounded MCP action when a filename violates conventions or needs to be corrected.
Prevent manual repository cleanup from being required for common remediation flows such as bad filenames, duplicate generated requests, or smoke-test artifacts.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: An MCP action can delete a Logics file by repo-relative path when the path is inside an approved Logics directory.
- AC2: The delete action supports dry_run mode and returns the target path, whether the file would be deleted or was deleted, and any validation errors.
- AC3: An MCP action can rename or move a Logics file from one repo-relative path to another when both paths are inside approved Logics directories.
- AC4: The rename action supports dry_run mode and returns the source path, destination path, whether the rename would be applied or was applied, and any validation errors.
- AC5: Both actions reject paths outside approved Logics directories, absolute paths, parent-directory traversal, and unsupported file extensions.
- AC6: Both actions provide deterministic responses and do not expose unrestricted directory listing or arbitrary filesystem operations.
- AC7: A smoke test confirms that an invalid request file can be renamed to a convention-compliant filename or deleted, after which Logics lint no longer reports the original bad filename.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: An MCP action can delete a Logics file by repo-relative path when the path is inside an approved Logics directory.
- request-AC2 -> This backlog slice. Proof: AC2: The delete action supports dry_run mode and returns the target path, whether the file would be deleted or was deleted, and any validation errors.
- request-AC3 -> This backlog slice. Proof: AC3: An MCP action can rename or move a Logics file from one repo-relative path to another when both paths are inside approved Logics directories.
- request-AC4 -> This backlog slice. Proof: AC4: The rename action supports dry_run mode and returns the source path, destination path, whether the rename would be applied or was applied, and any validation errors.
- request-AC5 -> This backlog slice. Proof: AC5: Both actions reject paths outside approved Logics directories, absolute paths, parent-directory traversal, and unsupported file extensions.
- request-AC6 -> This backlog slice. Proof: AC6: Both actions provide deterministic responses and do not expose unrestricted directory listing or arbitrary filesystem operations.
- request-AC7 -> This backlog slice. Proof: AC7: A smoke test confirms that an invalid request file can be renamed to a convention-compliant filename or deleted, after which Logics lint no longer reports the original bad filename.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_195_add_bounded_mcp_file_delete_and_rename_capabilities.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Add bounded MCP file delete and rename capabilities
- Keywords: backlog-groom, request, add bounded mcp file delete and rename capabilities, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add bounded MCP file delete and rename capabilities.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_195_add_bounded_mcp_file_delete_and_rename_capabilities` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_195_add_bounded_mcp_file_delete_and_rename_capabilities.md`.
- Generated locally by logics-manager.
- Task `task_160_add_bounded_mcp_file_delete_and_rename_capabilities` was finished via `logics-manager flow finish task` on 2026-05-27.

# Tasks
- `task_160_add_bounded_mcp_file_delete_and_rename_capabilities`
