## item_628_lift_the_workshop_out_of_the_browser_host - Lift the workshop out of the browser host
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Workshop module
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
- request-AC2 -> This backlog slice. Proof: AC1: The workshop surface lives in its own module.
- request-AC4 -> This backlog slice. Proof: AC2: Its own state is private to that module, and the host reaches what it needs through one named seam.
- request-AC5 -> This backlog slice. Proof: AC3: The suite and the campaign pass after the move.
- request-AC6 -> This backlog slice. Proof: AC4: The host's ledger entry is lowered and the new module carries its own.
- request-AC7 -> This backlog slice. Proof: AC5: A seam check reads its list of owned bindings from the module itself.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

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
