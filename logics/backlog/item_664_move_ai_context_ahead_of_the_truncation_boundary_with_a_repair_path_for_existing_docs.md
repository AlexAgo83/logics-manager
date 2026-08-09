## item_664_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs - Expose the autofix repair in the viewer, with VS Code parity for free
> From version: 2.21.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Cross-surface repair exposure
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The structure/ac-traceability autofix repair (which `item_663` extends to reposition AI Context) is reachable from the CLI (`flow validate --apply-fixes`, `audit --autofix-structure`) and from MCP (the `autofix_structure` tool shells out to the same command). It is reachable from nowhere else.
- The browser viewer only serves lint/audit read-only (`/api/lint`, `/api/audit`); there is no mutating route to trigger a repair. The VS Code extension exposes six commands (refresh/checkEnvironment/openViewer/restartViewer/openViewerExternal/focusCurrent), none repair-related.
- Building this twice - once for the browser viewer, once for VS Code - would be wasted work: `prod_036_vs_code_embedded_viewer_parity` (Settled) already establishes that VS Code embeds the exact same canonical viewer UI and API as the browser.

# Scope
- In:
  - A new mutating viewer route (e.g. `/api/apply-fixes`) that calls the same underlying `audit --autofix-structure`/`--autofix-ac-traceability` command the CLI and MCP already use - no new repair logic, just a new caller of the existing one.
  - A button on the viewer's health/lint screen, next to findings already marked `--fixable`, that triggers the route.
  - Rely on `prod_036`'s settled architecture (one canonical viewer UI/API shared by browser and VS Code) for VS Code parity; no VS Code-specific code.
  - A test confirming the route produces the same result as the equivalent CLI invocation on the same fixture.
- Out:
  - Any change to the underlying `audit --autofix-structure`/`--autofix-ac-traceability` behavior; this item only adds a caller.
  - A dedicated VS Code command; parity comes from the shared viewer architecture, not new extension code.
  - Exposing every possible CLI flag through the viewer; only the fixable-findings repair action from this request.

# Acceptance criteria
- AC6: The browser viewer gains a mutating route (e.g. `/api/apply-fixes`) that calls the same underlying `audit --autofix-structure`/`--autofix-ac-traceability` command CLI and MCP already use, plus a button on the health/lint screen next to `--fixable` findings to trigger it. Because VS Code embeds the same canonical viewer UI and API (`prod_036`), this reaches VS Code without any VS Code-specific code.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC6: The browser viewer gains a mutating route (e.g. `/api/apply-fixes`) that calls the same underlying `audit --autofix-structure`/`--autofix-ac-traceability` command CLI and MCP already use, plus a button on the health/lint screen next to `--fixable` findings to trigger it. Because VS Code embeds the same canonical viewer UI and API (`prod_036`), this reaches VS Code without any VS Code-specific code.

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
- Request: `logics/request/req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Expose the autofix repair in the viewer, with VS Code parity for free
- Keywords: backlog-groom, request, viewer, apply-fixes, vs code parity, prod_036
- Use when: Use when implementing or reviewing the viewer's apply-fixes route or button.
- Skip when: Skip when the change is unrelated to the viewer's repair exposure.

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_321_move_ai_context_ahead_of_the_truncation_boundary_with_a_repair_path_for_existing_docs.md`.
- Generated locally by logics-manager.
