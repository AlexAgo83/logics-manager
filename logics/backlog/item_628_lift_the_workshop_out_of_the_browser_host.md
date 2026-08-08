## item_628_lift_the_workshop_out_of_the_browser_host - Lift the workshop out of the browser host
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Workshop module
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:18:51

# Problem
- The workshop accounts for about 1233 lines across 56 functions in the host, and touches three bindings it does not own: the repository root, the repository itself, and the viewer preferences. That is one more than the cdx screen needed, on a smaller surface.
- Its own state -- the terminal registry, the badge counts, the resize timer -- moves with it, the way the cdx screen's did.

# Scope
- In:
  - Move the workshop surface into its own module, on the factory-and-accessor seam the cdx screen uses.
  - Keep its own state private to the module, and reach the three host bindings through the seam.
  - Verify with the suite and with the campaign, which drives the real interface.
  - Lower the host's ledger entry and give the new module its own.
- Out:
  - Changing any workshop behavior, including the terminal runtime.
  - Rewriting the host's shared bindings.
  - Moving the workshop's server side, which already has its own module.

# Acceptance criteria
- AC1: The workshop surface lives in its own module.
- AC2: Its own state is private to that module, and the host reaches what it needs through one named seam.
- AC3: The suite and the campaign pass after the move.
- AC4: The host's ledger entry is lowered and the new module carries its own.
- AC5: A seam check reads its list of owned bindings from the module itself.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: `clients/viewer/src/browser-host/workshop.js` (1305 lines); the host went from 5829 to 4784.
- request-AC4 -> This backlog slice. Proof: 802 vitest tests and the viewer campaign pass; `ci-check` exits 0.
- request-AC5 -> This backlog slice. Proof: `scripts/check-source-line-budget.mjs` records 4784 for the host, down from 5829, with `workshop.js` carrying its own entry.
- request-AC6 -> This backlog slice. Proof: the three bindings it does not own are read through the seam and never written, pinned by `reads the three host bindings it does not own, and writes none of them` in `tests/viewer.cdx-module.test.ts`.
- request-AC7 -> This backlog slice. Proof: the four workshop tests in the same file read the owned-binding list from the module itself.
- request-AC1 -> This backlog slice. Evidence needed: The cdx rendering lives with the cdx screen, and the shared render module no longer carries it.
- request-AC3 -> This backlog slice. Evidence needed: The git and CI surface lives in its own module, on that same seam.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- Textual brace-counting was abandoned for a real parser: an acorn pass over the host's IIFE gave exact statement ranges, after brace counting put one function's end 2200 lines past its closing brace because template literals carry braces too. Three seam gaps the tests then found, each fixed rather than worked around: the diagnostics object is created 480 lines below the wiring so it is passed as thunks; three cdx functions the workshop calls are passed the same way, since the cdx screen is wired below it; and the import completion missed , which is what left the workspace explorer silently inert.

# Links
- Product brief(s): `prod_060_the_browser_host_down_to_the_viewer`
- Architecture decision(s): (none yet)
- Request: `req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved`
- Primary task(s): `task_309_orchestrate_finishing_the_browser_host_split`

# AI Context
- Summary: Lift the workshop out of the browser host
- Keywords: scaffolded-backlog, lift the workshop out of the browser host, implementation-ready
- Use when: Implementing the scaffolded slice for Lift the workshop out of the browser host.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the cleanest remaining sub-system
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_309_orchestrate_finishing_the_browser_host_split`

# Notes
- Task `task_309_orchestrate_finishing_the_browser_host_split` was finished via `logics-manager flow finish task` on 2026-08-08.
