## item_631_let_the_server_s_change_notice_invalidate_the_cache - Let the server's change notice invalidate the cache
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Told, not guessed
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The server streams a `changed` event carrying component names, and already speaks a vocabulary of nine: git, ci, release, releaseRuns, cdx, cdxRuns, cdxHistory, cdxDisk and cdxMemory. The client subscribes to it.
- Beside that, the client keeps fourteen `latest*` caches and twenty-nine signature comparisons, deciding by hand whether what it holds is still good. That is the same question the event answers, asked again in a second language.
- The hard part is not the wiring but the contract: each component name must correspond to exactly one cache entry. A vocabulary that half-matches would replace twenty-nine heuristics with twenty-nine special cases, which is worse than what is there now.

# Scope
- In:
  - Key the store's cached entries on the component names the server already emits, starting from that vocabulary rather than inventing one.
  - Invalidate an entry when the notice names its component, and drop the hand-written comparison that guessed it.
  - State, for any comparison that survives, what the notice does not cover and why.
  - Keep the polling fallback correct when the stream is unavailable, and cover that path explicitly.
  - Extend the server's vocabulary only where a cache has no component name, and record each addition.
- Out:
  - Adding an endpoint.
  - Removing the polling fallback.
  - Changing how any payload is produced on the server.
  - Caching anything not already cached.

# Acceptance criteria
- AC1: Each cached entry is keyed on a component name the server emits, and the mapping is one to one.
- AC2: A `changed` notice invalidates exactly the entries it names, shown by a test that sends one and observes what refetches.
- AC3: Every removed signature comparison is either covered by the notice or kept with a stated reason.
- AC4: With the stream unavailable, the viewer still refreshes correctly through polling, covered by a test.
- AC5: A check asserts the client's component keys are a subset of the server's vocabulary, read from both sides rather than restated.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: Each cached entry is keyed on a component name the server emits, and the mapping is one to one.
- request-AC3 -> This backlog slice. Proof: AC2: A `changed` notice invalidates exactly the entries it names, shown by a test that sends one and observes what refetches.
- request-AC4 -> This backlog slice. Proof: AC3: Every removed signature comparison is either covered by the notice or kept with a stated reason.
- request-AC6 -> This backlog slice. Proof: AC4: With the stream unavailable, the viewer still refreshes correctly through polling, covered by a test.
- request-AC7 -> This backlog slice. Proof: AC5: A check asserts the client's component keys are a subset of the server's vocabulary, read from both sides rather than restated.
- request-AC8 -> This backlog slice. Proof: AC5: A check asserts the client's component keys are a subset of the server's vocabulary, read from both sides rather than restated.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_061_the_architecture_written_down`
- Architecture decision(s): (none yet)
- Request: `req_313_write_down_the_architecture_the_viewer_already_has_a_named_store_server_driven_invalidation_declared_screens`
- Primary task(s): `task_310_orchestrate_naming_the_viewer_architecture`

# AI Context
- Summary: Let the server's change notice invalidate the cache
- Keywords: scaffolded-backlog, let the server's change notice invalidate the cache, implementation-ready
- Use when: Implementing the scaffolded slice for Let the server's change notice invalidate the cache.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the client recomputes what the server already announced
- Rationale: Set by scaffold input or defaulted for grooming.
