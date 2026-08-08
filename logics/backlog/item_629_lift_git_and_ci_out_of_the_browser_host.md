## item_629_lift_git_and_ci_out_of_the_browser_host - Lift git and CI out of the browser host
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Git and CI module
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Git and CI account for about 1726 lines and touch five bindings they do not own: the item list, the filter state, the repository root, the share URL, and the workshop badge counts. Before the cdx lift the count was twelve, seven of which were cdx payloads now behind the cdx accessor.
- The coupling is concentrated rather than spread: the previous lift found one host function holding 51 of 59 references, a screen router named for git that is not only git. Whether that function belongs to this module or stays behind is the decision this slice has to make explicitly.

# Scope
- In:
  - Move the git and CI surface into its own module, on the same seam.
  - Decide, and record, where the screen router belongs rather than letting its name settle it.
  - Reach the five host bindings through the seam, without rewriting them.
  - Verify with the suite and the campaign after the move.
  - Lower the host's ledger entry and give the new module its own.
- Out:
  - Rewriting the host's shared state.
  - Changing any git or CI behavior, including the commit and diff flows.
  - Moving the server-side git module, which is already separate.

# Acceptance criteria
- AC1: The git and CI surface lives in its own module.
- AC2: The screen router's home is decided and recorded, with the reason.
- AC3: The five host bindings are reached through the seam, and none of them is rewritten.
- AC4: The suite and the campaign pass after the move.
- AC5: The host's ledger entry is lowered and the new module carries its own.
- AC6: A seam check reads its list of owned bindings from the module itself.

# AC Traceability
- request-AC3 -> This backlog slice. Proof: AC1: The git and CI surface lives in its own module.
- request-AC4 -> This backlog slice. Proof: AC2: The screen router's home is decided and recorded, with the reason.
- request-AC5 -> This backlog slice. Proof: AC3: The five host bindings are reached through the seam, and none of them is rewritten.
- request-AC6 -> This backlog slice. Proof: AC4: The suite and the campaign pass after the move.
- request-AC7 -> This backlog slice. Proof: AC5: The host's ledger entry is lowered and the new module carries its own.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_060_the_browser_host_down_to_the_viewer`
- Architecture decision(s): (none yet)
- Request: `req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved`
- Primary task(s): `task_309_orchestrate_finishing_the_browser_host_split`

# AI Context
- Summary: Lift git and CI out of the browser host
- Keywords: scaffolded-backlog, lift git and ci out of the browser host, implementation-ready
- Use when: Implementing the scaffolded slice for Lift git and CI out of the browser host.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the largest remaining surface, unblocked by the cdx lift
- Rationale: Set by scaffold input or defaulted for grooming.
