## item_629_lift_git_and_ci_out_of_the_browser_host - Lift git and CI out of the browser host
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Git and CI module
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 22:18:51

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
- request-AC3 -> This backlog slice. Proof: `clients/viewer/src/browser-host/git.js` (885 lines); the host went from 4784 to 4065.
- request-AC4 -> This backlog slice. Proof: 802 vitest tests and the viewer campaign pass; `ci-check` exits 0.
- request-AC5 -> This backlog slice. Proof: `scripts/check-source-line-budget.mjs` records 4065 for the host, with `git.js` carrying its own entry.
- request-AC6 -> This backlog slice. Proof: the two bindings it does not own are read through the seam and written nowhere, pinned by `reads the two host bindings it does not own, and writes neither` in `tests/viewer.cdx-module.test.ts`.
- request-AC7 -> This backlog slice. Proof: the four git tests in the same file read the owned-binding list from the module itself.
- request-AC1 -> This backlog slice. Evidence needed: The cdx rendering lives with the cdx screen, and the shared render module no longer carries it.
- request-AC2 -> This backlog slice. Evidence needed: The workshop lives in its own module, reached through the same kind of seam the cdx screen uses.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed
- The screen router this slice was asked to place turned out not to exist. The earlier measurement that raised it -- showGitStatus holding 51 references to cdx state -- came from spans that ran each function to the start of the next one, so showGitStatus had absorbed its neighbours. Measured with a parser it is 65 lines and touches nothing of cdx, so there was no router to place and no decision to record beyond this one: the question was an artifact of the measurement, not a property of the code.

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

# Tasks
- `task_309_orchestrate_finishing_the_browser_host_split`

# Notes
- Task `task_309_orchestrate_finishing_the_browser_host_split` was finished via `logics-manager flow finish task` on 2026-08-08.
