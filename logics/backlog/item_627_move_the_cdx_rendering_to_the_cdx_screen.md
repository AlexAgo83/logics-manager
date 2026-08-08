## item_627_move_the_cdx_rendering_to_the_cdx_screen - Move the cdx rendering to the cdx screen
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Rendering with its screen
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Of the shared render module's exports, 56 are cdx and the cdx screen is their only consumer. They sit in a file everything imports while serving one caller, so reading the render module means reading someone else's screen.
- They hold no state, which is what makes this the cheapest move: nothing has to be threaded, only re-homed.

# Scope
- In:
  - Move the cdx rendering into the cdx module, beside the screen that calls it.
  - Leave the shared render module carrying only what more than one caller uses.
  - Keep the generated bundle byte-identical where the build allows.
  - Lower both files' entries in the size ledger.
- Out:
  - Changing what any rendering function produces.
  - Moving rendering that more than one screen uses.
  - Reworking the render module's remaining exports.

# Acceptance criteria
- AC1: The cdx rendering lives in the cdx module.
- AC2: The shared render module no longer exports rendering only the cdx screen uses.
- AC3: The suite and the campaign pass, and the bundle is regenerated from its sources.
- AC4: Both files' ledger entries are lowered to the values reached.
- AC5: A check asserts the render module exports nothing whose only consumer is the cdx screen, reading that list from the modules rather than from a written list.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: 45 rendering functions (814 lines) moved into `clients/viewer/src/browser-host/cdx.js`; the shared render module went from 2546 to 1732.
- request-AC4 -> This backlog slice. Proof: 798 vitest tests and the viewer campaign pass; `npm run check:viewer-host` confirms the bundle matches its sources.
- request-AC5 -> This backlog slice. Proof: `scripts/check-source-line-budget.mjs` records 1732 for the render module and 5829 for the host, both lowered.
- request-AC7 -> This backlog slice. Proof: `leaves the shared render module carrying nothing only this screen consumes` in `tests/viewer.cdx-module.test.ts`, which derives the list from the modules rather than restating it.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Moved as a fixed-point sweep, not a single pass: each move makes the callers it leaves behind single-consumer in turn, so one pass moved 26 functions and three more rounds moved 19 others, 45 in total. A first attempt at the sweep broke 30 tests and was reverted; the cause was the sweep not recompleting the module's imports between rounds, not the moves. Re-run with imports completed each round, the same 45 moves pass the whole suite and the campaign.

# Links
- Product brief(s): `prod_060_the_browser_host_down_to_the_viewer`
- Architecture decision(s): (none yet)
- Request: `req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved`
- Primary task(s): `task_309_orchestrate_finishing_the_browser_host_split`

# AI Context
- Summary: Move the cdx rendering to the cdx screen
- Keywords: scaffolded-backlog, move the cdx rendering to the cdx screen, implementation-ready
- Use when: Implementing the scaffolded slice for Move the cdx rendering to the cdx screen.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the cheapest of the three, and it has no state at all
- Rationale: Set by scaffold input or defaulted for grooming.
