## item_641_retire_the_half_bridge_and_say_what_it_did - Retire the half-bridge and say what it did
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: No second record
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The extension carries two of the twelve preference fields across the iframe boundary by hand, keeping them in its global state and posting them back when the frame loads. Once the server is the record, that path is a second source of truth for a subset of the data.
- The same bridge writes a webview state entry that nothing ever reads, which is dead weight that looks like persistence.
- The global state is still useful as a first-paint cache: it avoids a round trip before the frame has asked the server anything. What it must stop being is the answer.

# Scope
- In:
  - Make the server the single record, and reduce the editor's global state to a first-paint cache that is refreshed from it.
  - Remove the webview state write that nothing reads.
  - Keep the frame working when the server has not answered yet, showing the cached values rather than nothing.
  - Cover the precedence in a test: when the cache and the record disagree, the record wins.
- Out:
  - Removing the cache, which is what keeps the first paint immediate.
  - Changing the message channel between the frame and the extension.
  - Making the editor's global state syncable between machines.

# Acceptance criteria
- AC1: The server's record wins whenever it disagrees with the cache.
- AC2: The frame renders cached values before the server answers, and corrects itself once it does.
- AC3: The webview state write that nothing reads is gone.
- AC4: A test covers the disagreement and fails against the current implementation.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: The server's record wins whenever it disagrees with the cache.
- request-AC8 -> This backlog slice. Proof: AC2: The frame renders cached values before the server answers, and corrects itself once it does.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_063_preferences_that_outlive_the_port`
- Architecture decision(s): (none yet)
- Request: `req_315_persist_viewer_preferences_where_they_belong_favourites_for_the_user_the_rest_for_the_repository`
- Primary task(s): `task_312_orchestrate_moving_the_viewer_preferences_off_the_port`

# AI Context
- Summary: Retire the half-bridge and say what it did
- Keywords: scaffolded-backlog, retire the half-bridge and say what it did, implementation-ready
- Use when: Implementing the scaffolded slice for Retire the half-bridge and say what it did.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Low - two of twelve fields, and a write nothing reads
- Rationale: Set by scaffold input or defaulted for grooming.
