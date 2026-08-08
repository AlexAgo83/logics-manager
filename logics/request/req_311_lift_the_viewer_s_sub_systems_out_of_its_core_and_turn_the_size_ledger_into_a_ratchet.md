## req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet - Lift the viewer's sub-systems out of its core, and turn the size ledger into a ratchet
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: Sub-systems with their own file, and a ledger that only shrinks
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Read and change one sub-system without opening the file that holds every other one.
- Let the size guard record progress instead of recording surrender.
- Keep every split provably behavior-free, on code with no type checker to catch a bad move.

# Context
- Fifty-five source files exceed 500 lines and twenty exceed 1000. A guard already exists with a 1000-line budget and an allowlist carrying a justification and a request reference per entry; what has happened is that the allowlist only ever grows, one raised ceiling per delivery.
- Four files hold most of the mass. The viewer's browser host is 7853 lines, the viewer server is 5692, the flow package's entry module is 4725, and the assistant adapter is 2054.
- Measured by domain rather than by size, the shape is not a long file: it is several applications sharing one. In the browser host, cdx accounts for about 1979 lines, git for 1595 and the workshop for 1270, against 276 for the board filters. In the viewer server, cdx accounts for about 1354 and git for 1010, against roughly 2931 for the viewer itself.
- The same three sub-systems therefore appear on both sides of the wire, about 3000 lines in the browser host and about 2400 in the server, each stitched into the viewer core rather than sitting beside it. Route modules already exist for some of them, so the seam is established practice here rather than a new idea.
- The flow package is already a package, so splitting its entry module by verb is the cheapest cut available and needs no new structure.
- The assistant adapter is not a candidate. Its allowlist entry records that extraction was attempted and backed out: the tool selection needs the registry that lives in the same module, so a separate module bought an injection dance and an import cycle for 133 of 316 lines. That decision stands until the registry itself moves.
- The risk is real and already met once: a browser-host split was stopped before the shared-state module, which was judged too risky to move. That judgement holds -- the hard part is the shared state, not the functions around it.

# Acceptance criteria
- AC1: Each lifted sub-system lives in its own module, imported by the core rather than written inside it.
- AC2: No lift changes behavior: the full suite and the viewer campaign pass unchanged, and the bundled assets stay byte-identical where they are generated.
- AC3: Every lift lowers the moved file's entry in the size allowlist rather than raising it.
- AC4: The size guard refuses a raised ceiling unless the entry states what was tried and why it was kept.
- AC5: Shared state is not moved by this request; a lift that would require it stops and says so.
- AC6: The assistant adapter is left alone, and its recorded reason stays recorded.
- AC7: Each lift leaves behind a check that the moved sub-system is still reachable and still behaves.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)

# References
- scripts/check-source-line-budget.mjs
- logics_manager/viewer.py
- clients/viewer/src/browser-host/index.js
- logics_manager/flow/__init__.py
- logics/product/prod_054_guardrails_proportionate_to_the_codebase.md

# AI Context
- Summary: Lift the viewer's sub-systems out of its core, and turn the size ledger into a ratchet
- Keywords: request-chain-scaffold, lift the viewer's sub-systems out of its core, and turn the size ledger into a ratchet, development-ready
- Use when: You need to implement or review the scaffolded workflow for Lift the viewer's sub-systems out of its core, and turn the size ledger into a ratchet.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_623_lift_cdx_and_git_out_of_the_viewer_server`
- `item_624_lift_cdx_git_and_the_workshop_out_of_the_browser_host`
- `item_625_cut_the_flow_entry_module_by_verb`
- `item_626_make_the_size_ledger_a_ratchet`
