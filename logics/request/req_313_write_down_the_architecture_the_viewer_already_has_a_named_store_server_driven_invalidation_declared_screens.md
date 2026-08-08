## req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens - Write down the architecture the viewer already has: a named store, server-driven invalidation, declared screens
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Complexity: High
> Theme: An explicit architecture, assembled from what is already there
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-09 01:36:26

# Needs
- Reach the viewer's shared state through one named thing rather than three hand-built seams.
- Let the server's own change notice decide what is stale, instead of the client guessing.
- Add a screen by declaring it, rather than by threading it through a router and a wiring block.

# Context
- Five lifts took the browser host from 7853 lines to 4065 and produced four screen modules. Each one converged on the same shape without anyone deciding it: a factory that receives what it needs, private state, and a named accessor for the state it does not own. The structure is real; it is written down nowhere, so it is implemented three times by hand as `cdxState`, `workshopState` and `gitState`.
- What remains in the host is not a sub-system. It is 41 mutable bindings and 30 constants in one closure, of which 14 are server payload caches, 4 are screen state, and 3 are timers or in-flight guards.
- The invalidation channel already exists and is already component-aware. The server streams `changed` events carrying a list of component names, and the client subscribes to it and falls back to polling when the stream drops. The server's own vocabulary is nine names: git, ci, release, releaseRuns, cdx, cdxRuns, cdxHistory, cdxDisk and cdxMemory.
- Beside that channel, the client keeps fourteen ad hoc caches and twenty-nine signature comparisons -- staleness detection written by hand, recomputing what the event just announced. Nothing here needs a new endpoint; what is missing is letting the notice drive the cache.
- Screens are dispatched by title: `setDocument(title, html)` against fourteen navigation targets, with the routing spread across conditionals that test the title string.
- One constraint bounds every option. The same source serves the standalone viewer and the extension webview, under a strict content policy with no external runtime and a bundle that must stay byte-stable. That rules out importing a framework, and it is why this request assembles what is present rather than replacing it.
- This request meets `req_315` on one binding. Naming the in-memory owner of the shared state and deciding where a preference is persisted are different questions, and `req_315` answers the second. Whichever lands first, the other builds on it rather than beside it; the slices say so on both sides.
- The rendering model -- HTML strings into innerHTML, event delegation -- is deliberately left alone. It works, and changing it would be a rewrite whose payoff is developer comfort, not correctness.

# Acceptance criteria
- AC1: The viewer's shared state lives in one named module, and each screen reaches what it does not own through it rather than through a hand-built accessor.
- AC2: WITHDRAWN after measurement -- the vocabulary maps onto seven of thirty-two caches, three of the matches are interface state, and every screen already fetches when it opens. Recorded on `item_631`.
- AC3: WITHDRAWN -- the comparisons are optimistic-update bookkeeping, not staleness detection. Recorded on `item_631`.
- AC4: The polling fallback keeps working when the stream is unavailable, and a run with no stream is still correct.
- AC5: A screen is added by declaring it, and the host routes without testing screen titles.
- AC6: No framework, no new runtime, and no new endpoint: the bundle keeps its current shape and the extension webview keeps working.
- AC7: Each phase is independently correct: the suite, the viewer campaign, and the repository check pass after each one, not only at the end.
- AC8: Each phase leaves behind a check that reads its list from the code rather than restating it.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_060_the_browser_host_down_to_the_viewer.md
- clients/viewer/src/browser-host/index.js
- clients/viewer/src/browser-host/cdx.js
- logics_manager/viewer.py
- docs/runbooks/viewer-ui-campaign.md

# AI Context
- Summary: Write down the architecture the viewer already has: a named store, server-driven invalidation, declared screens
- Keywords: request-chain-scaffold, write down the architecture the viewer already has: a named store, server-driven invalidation, declared screens, development-ready
- Use when: You need to implement or review the scaffolded workflow for Write down the architecture the viewer already has: a named store, server-driven invalidation, declared screens.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_630_name_the_viewer_s_shared_state`
- `item_631_let_the_server_s_change_notice_invalidate_the_cache`
- `item_632_let_a_screen_declare_itself`
