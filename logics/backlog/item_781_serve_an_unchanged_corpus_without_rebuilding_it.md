## item_781_serve_an_unchanged_corpus_without_rebuilding_it - Serve an unchanged corpus without rebuilding it
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Viewer performance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

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
