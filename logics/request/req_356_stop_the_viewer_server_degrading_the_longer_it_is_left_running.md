## req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running - Stop the viewer server degrading the longer it is left running
> From version: 2.21.9
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:06:04

# AI Context
- Summary: The payload endpoint answered in 6.1s on a fresh server and 38.0s on one up 2h30, over the same corpus; the build itself is 3.7s, so the rest is the request queueing behind the server's own 15-second polling, which rebuilds all 1615 documents every time.
- Keywords: payload rebuild, auto-refresh cadence, idle CPU, staleness check, corpus scale, campaign card timeout
- Use when: Changing how the viewer builds, caches or refreshes its payload, or investigating a viewer that has become slow while left open.
- Skip when: What the payload contains, and the board's paging, which item_765 settled.

# Needs
- Raised by the operator, 2026-08-14, after the dev viewer became unusable mid-session: the server has to stop getting slower the longer it runs.
- Found while diagnosing something else. The visual campaign had been failing on 'Timed out waiting for cards' for several sessions, and the cause was not the campaign: the viewer it drives was answering too slowly to be driven.
- Every measurement below was taken on this repository's own corpus at 1615 documents, against the running dev viewer and against the payload builder in isolation.

# Context
- **The same request takes six times longer on a server that has been up a while.** the viewer's items endpoint (`viewer.py`, route `/api/items`) returned 5.8 MB in **38.0 s** and again in **37.6 s** on a server up for 2h30. The same request against a freshly started server on the same corpus: **6.1 s**. Nothing about the corpus changed between the two.
- **The work itself does not account for it.** Profiled in-process, `viewer_data_payload` builds the whole payload in **3.7 s** and `json.dumps` of the result takes **0.04 s** for 4.5 MB. So roughly 34 of those 38 seconds are not the payload being built -- they are the request waiting.
- **The server is busy with its own refreshing.** The dev viewer process was measured at **85% CPU with 83 minutes of CPU time over about 2h30 of wall clock**. **Correction, established while delivering this: "with nobody interacting with it" was wrong.** 124 headless Chrome processes left over from this cycle's capture scripts were still connected, each holding an event stream the server polls once a second. The reading is real and the polling cost it exposes is real, but the number is a server under many clients, not an idle one. The idle figure this request should be judged against is the one recorded in `item_782`, taken with zero connections. The client polls that same endpoint on a 15-second timer (`auto_refresh_interval_seconds`, default 15), each poll rebuilds the payload from scratch, and every open tab runs its own timer. There is no cache: two consecutive requests one second apart each did the full work.
- **Nothing bounds the growth.** The payload builder walks all 1615 documents on every request -- `collect_viewer_items` is the bulk of it, and within it `_extract_section_lines` runs 16150 times and `_extract_references` 1615 times, all over file contents that did not change between polls. The cost is linear in corpus size and the poll interval is a constant, so the ratio of work to idle only moves one way as a corpus grows.
- **This is why the campaign looked flaky.** The campaign waits for the board to draw cards, and against a degraded server the payload arrives after the wait expires. Several sessions were spent raising the campaign's own timeouts, which changed nothing, because the campaign was reporting a real condition of the product.
- Out of scope: what the payload contains, and the board's own paging, which `item_765` reconciled separately.
- Known risk: a cache that serves a stale payload is worse than a slow one, because the operator cannot tell. Whatever is done here has to be correct across an edit landing on disk, which is the case the viewer exists to show.

# Acceptance criteria
- AC1: A viewer left running answers a payload request in the same time as a freshly started one, measured on this repository's corpus after an hour of idling.
- AC2: Repeated requests against an unchanged corpus do not repeat the work, and the measurement showing so is recorded.
- AC3: A change on disk is reflected in the next payload the viewer serves, so nothing here can show the operator a corpus that no longer exists.
- AC4: The refresh cadence accounts for how long a refresh actually takes, rather than being a constant chosen when the corpus was small.
- AC5: Idle CPU is bounded and stated: a viewer nobody is using does not consume a core.
- AC6: A regression fails when payload work is repeated for an unchanged corpus, and when a changed document fails to appear.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)

# References
- logics_manager/viewer.py
- logics_manager/viewer_docs.py
- clients/viewer/src/browser-host/index.js
- tests/run_local_viewer_visual_smoke.mjs
- tests/viewer.campaign-report.test.ts
- logics/backlog/item_765_make_the_panel_and_the_board_agree_on_what_is_shown.md

# Backlog
- `item_781_serve_an_unchanged_corpus_without_rebuilding_it`
- `item_782_make_the_refresh_cadence_follow_what_a_refresh_costs`
- `item_783_fail_when_the_work_is_repeated_or_a_change_is_missed`
