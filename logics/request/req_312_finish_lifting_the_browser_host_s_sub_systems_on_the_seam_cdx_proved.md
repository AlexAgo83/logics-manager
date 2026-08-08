## req_312_finish_lifting_the_browser_host_s_sub_systems_on_the_seam_cdx_proved - Finish lifting the browser host's sub-systems, on the seam cdx proved
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Three lifts the cdx seam made possible
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Read and change the workshop, or git, without opening the file that holds the viewer.
- Keep a sub-system's rendering with the sub-system, rather than in a module shared with everything else.
- Bring the browser host down to what is actually the viewer.

# Context
- A previous request lifted the cdx screen out of the browser host: 2212 lines into their own module, the host down from 7789 to 5862. The seam is a factory returning its functions by name, so the host destructures them back into scope and forty-three call sites moved without being touched, plus one named accessor for the state the host still reaches.
- That lift changed the measurements it was blocked by. Counting only the bindings a sub-system does not own, git touched twelve before the cdx lift and touches five after it: seven of the twelve were cdx payloads, and they now sit behind the cdx accessor. What was recorded as blocked is no longer the same problem.
- Measured on the host as it stands: git and CI account for about 1726 lines and touch five bindings they do not own; the workshop accounts for about 1233 and touches three; the document and project surfaces are small enough not to be worth their own module yet.
- The rendering is in the wrong place. Of the render module's exports, 56 are cdx and nothing but the cdx screen consumes them, so they sit in a file shared by everything while serving one caller. They hold no state at all, which makes moving them the cheapest of the three.
- The shared state itself -- the sixty-one bindings the host's closure holds -- is deliberately not touched here, as it was not touched by the request before this one. Every lift pays an accessor for it, which is a cost worth naming but not worth paying for by a state rewrite in the same breath.
- The size ledger now lowers itself when a file shrinks and refuses a raised ceiling without a stated reason, so each lift is expected to move its entry down.

# Acceptance criteria
- AC1: The cdx rendering lives with the cdx screen, and the shared render module no longer carries it.
- AC2: The workshop lives in its own module, reached through the same kind of seam the cdx screen uses.
- AC3: The git and CI surface lives in its own module, on that same seam.
- AC4: No lift changes behavior: the full suite and the viewer campaign pass after each one, not only at the end.
- AC5: Every lift lowers its file's entry in the size ledger rather than raising it.
- AC6: The host's shared state is not rewritten; a lift that would require it stops and says so.
- AC7: Each lifted sub-system keeps a check on its seam that reads its own list from the module, so a binding added later is covered without editing the check.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_060_the_browser_host_down_to_the_viewer`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_059_sub_systems_beside_the_core_not_inside_it.md
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/cdx.js
- clients/viewer/src/browser-host/render.js
- scripts/check-source-line-budget.mjs

# AI Context
- Summary: Finish lifting the browser host's sub-systems, on the seam cdx proved
- Keywords: request-chain-scaffold, finish lifting the browser host's sub-systems, on the seam cdx proved, development-ready
- Use when: You need to implement or review the scaffolded workflow for Finish lifting the browser host's sub-systems, on the seam cdx proved.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_627_move_the_cdx_rendering_to_the_cdx_screen`
- `item_628_lift_the_workshop_out_of_the_browser_host`
- `item_629_lift_git_and_ci_out_of_the_browser_host`
