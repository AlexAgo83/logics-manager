## item_623_lift_cdx_and_git_out_of_the_viewer_server - Lift cdx and git out of the viewer server
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Server sub-systems
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The viewer server is 5692 lines, of which roughly 1354 are cdx and 1010 are git. What remains is about 2931 lines that are actually the viewer.
- The seam already exists: route modules were extracted for some sub-systems, so this is following established practice in the same file rather than inventing a boundary.

# Scope
- In:
  - Move the cdx surface into its own module, imported by the server.
  - Move the git surface into its own module, imported by the server.
  - Keep the request handler as the only place that knows which module owns a route.
  - Lower the server's entry in the size allowlist to the value the lift actually reaches.
  - Keep the existing tests passing unchanged, and cover each moved surface's reachability.
- Out:
  - Changing any route's behavior, payload, or path.
  - Moving the workshop, which already has its own route module.
  - Splitting what remains of the viewer core.

# Acceptance criteria
- AC1: The cdx and git surfaces live in their own modules.
- AC2: Every route answers as it did before, shown by the existing tests passing unchanged.
- AC3: The server's allowlist entry is lowered to the reached value.
- AC4: A test covers each moved surface's reachability through the handler.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `logics_manager/viewer_cdx.py` (1523 lines) and `logics_manager/viewer_git.py` (1064); `viewer.py` went from 5692 to 3332.
- request-AC2 -> This backlog slice. Proof: the 1091-test Python suite passes; the lift restored two definitions the extraction had swallowed, `_normalize_workspace_path` and `CI_RECENT_RUNS_LIMIT`, each caught by a failing test rather than by inspection.
- request-AC3 -> This backlog slice. Proof: `scripts/check-source-line-budget.mjs` records 3332 for `viewer.py`, down from 5937, with the two lifted modules carrying their own entries.
- request-AC7 -> This backlog slice. Proof: `tests/python/test_viewer_subsystem_modules.py` (18 cases), including `test_the_sub_systems_import_in_either_order`, which caught a circular import the lift had introduced and now pins the lazy viewer proxy that fixes it.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)
- Request: `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`
- Primary task(s): `task_308_orchestrate_lifting_the_sub_systems_out_of_the_core`

# AI Context
- Summary: Lift cdx and git out of the viewer server
- Keywords: scaffolded-backlog, lift cdx and git out of the viewer server, implementation-ready
- Use when: Implementing the scaffolded slice for Lift cdx and git out of the viewer server.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the cheapest cut, on an established seam
- Rationale: Set by scaffold input or defaulted for grooming.
