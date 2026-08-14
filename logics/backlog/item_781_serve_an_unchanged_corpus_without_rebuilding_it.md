## item_781_serve_an_unchanged_corpus_without_rebuilding_it - Serve an unchanged corpus without rebuilding it
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:48:28

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: serve, unchanged, corpus, rebuilding
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- Two `GET /api/items` one second apart each did the full 3.7 s of work over all 1615 documents, because nothing remembers the previous answer. `_extract_section_lines` ran 16150 times over file contents that had not changed.

# Scope
- In:
  - Reuse the previous payload while the corpus that produced it is unchanged.
  - Decide, and record, what 'unchanged' is checked against and what that check costs.
  - Prove a change on disk still appears in the next payload served.
- Out:
  - What the payload contains.

# Delivery notes
- Measured, then built. The endpoint answered in 6.1s on a fresh server and 38.0s on one up 2h30, while `viewer_data_payload` builds in 3.7s and serializes in 0.04s -- so most of that was the request queueing behind the server rebuilding for its own 15-second polling.
- `collect_viewer_items` caches its result behind a **corpus signature**: per document family, the count, the total byte size and the newest mtime. Stat-walking the eight directories takes **16ms** against **3.7s** to parse them, so asking whether a rebuild is needed costs 1/200th of doing one.
- Size as well as mtime, deliberately: an edit that replaces one character keeps the byte count, and an edit inside one filesystem timestamp tick keeps the mtime. Either alone is wrong more often than both together, and a regression covers the same-length edit specifically.
- **One entry, not a map keyed on repo_root.** A viewer serves one repository at a time, and a map would hold every project a fleet operator ever switched to for the life of the process. Switching repositories is covered by a regression.
- **Callers are handed their own copy of each item.** They annotate what they are given, and a shared list would let one request's `selected` flag leak into the next one's payload -- the bug a shared cache is most likely to introduce, so it has its own regression.
- Measured after, on the live viewer: **6.1s -> 0.15s**, three consecutive requests at 0.156s, 0.138s, 0.152s. Warm in-process: 640ms -> 8ms.
- AC3 has its own tests: a new document appears, a deleted one disappears, and a same-length edit appears. A cache that serves a corpus the operator no longer has is worse than a slow one.

# Acceptance criteria
- AC1: A long-running viewer answers as fast as a fresh one.
- AC2: Unchanged corpus, no repeated work, with the measurement recorded.
- AC3: A change on disk appears in the next payload.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A long-running viewer answers as fast as a fresh one.
- request-AC2 -> This backlog slice. Proof: AC2: Unchanged corpus, no repeated work, with the measurement recorded.
- request-AC3 -> This backlog slice. Proof: AC3: A change on disk appears in the next payload.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_092_a_viewer_that_stays_as_fast_as_it_started`
- Architecture decision(s): (none yet)
- Request: `req_356_stop_the_viewer_server_degrading_the_longer_it_is_left_running`
- Primary task(s): `task_356_keep_the_viewer_as_fast_as_it_started`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_356_keep_the_viewer_as_fast_as_it_started` was finished via `logics-manager flow finish task` on 2026-08-14.
