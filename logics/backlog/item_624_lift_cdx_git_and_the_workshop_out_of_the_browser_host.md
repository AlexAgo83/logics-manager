## item_624_lift_cdx_git_and_the_workshop_out_of_the_browser_host - Lift cdx, git, and the workshop out of the browser host
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 70%
> Progress: 100%
> Complexity: High
> Theme: Browser-host sub-systems
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The browser host is 7853 lines: about 1979 of cdx, 1595 of git and 1270 of the workshop, against 276 for the board filters. Reading the filter logic means opening a file that also holds three applications.
- A previous pass extracted the pure helpers and data and then stopped before the shared-state module, judging that move too risky. That judgement holds: the shared state is the hard part, and it is not what this slice moves.

# Scope
- In:
  - Move the cdx, git and workshop surfaces into their own modules, one at a time, each verified before the next.
  - Leave the shared state where it is, and stop and record it when a move would require touching it.
  - Keep the generated bundle byte-identical where the build allows, and say so when it cannot be.
  - Lower the browser host's allowlist entry to the value the lifts actually reach.
  - Run the viewer campaign after each move, as the check that the real interface still works.
- Out:
  - Moving or reshaping the shared state.
  - Changing any lifted sub-system's behavior while moving it.
  - Splitting the render module, which is a separate decision.

# Acceptance criteria
- AC1: The cdx surface lives in its own module; the workshop and git are measured, and git is left where it is with the reason recorded.
- AC2: The full suite and the viewer campaign pass after the move, not only at the end.
- AC3: The browser host's allowlist entry is lowered to the reached value.
- AC4: A move blocked by shared state is stopped and recorded, rather than forced.
- AC5: The moved sub-system keeps a check that it is still reachable from the interface.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `clients/viewer/src/browser-host/cdx.js` (2212 lines); the browser host went from 7789 to 5862.
- request-AC2 -> This backlog slice. Proof: 797 vitest tests and the viewer campaign pass after the move; the 184 browser-host tests exercise the cdx screens through the seam without being edited.
- request-AC3 -> This backlog slice. Proof: `scripts/check-source-line-budget.mjs` records 5862 for the host, down from 7853, with `cdx.js` carrying its own entry.
- request-AC5 -> This backlog slice. Proof: `tests/viewer.cdx-module.test.ts` pins the seam: every destructured name is returned, no owned binding leaks past `cdxState`, `viewerPreferences` is read and never written, and the module does not import the host back.
- request-AC7 -> This backlog slice. Proof: the four tests in `tests/viewer.cdx-module.test.ts` read the owned-binding list from the module itself, so a binding added later is covered without editing the test.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Stopped before moving, and recorded, as AC4 prescribes. Measured coupling to the shared state of the browser-host IIFE, counting only bindings the sub-system does not own: cdx touches 1 (viewerPreferences) across 1979 lines; the workshop touches 3 (latestRepoRoot, latestRepository, viewerPreferences) across 1233; git touches 12 (including latestItems, viewerFilterState, workshopBadgeCounts and seven latestCdx* payloads) across 1595, so a git module would carry most of the viewer's state with it. cdx is the movable one and the largest single win; git is blocked by the shared state this request does not move. The board filters were lifted first as the proving cut: 117 lines into clients/viewer/src/browser-host/filters.js, with the state passed as an argument rather than closed over, which is the shape the cdx lift should follow.

# Links
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)
- Request: `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`
- Primary task(s): `task_308_orchestrate_lifting_the_sub_systems_out_of_the_core`

# AI Context
- Summary: Lift cdx, git, and the workshop out of the browser host
- Keywords: scaffolded-backlog, lift cdx, git, and the workshop out of the browser host, implementation-ready
- Use when: Implementing the scaffolded slice for Lift cdx, git, and the workshop out of the browser host.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the largest file in the repository
- Rationale: Set by scaffold input or defaulted for grooming.
