## item_639_let_two_windows_agree_on_the_favourites - Let two windows agree on the favourites
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: A set, merged rather than overwritten
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Favourites are a set, and today the whole list is written wholesale by whichever window wrote last. With two windows open, starring in one and starring in another loses one of the two.
- The reported expectation is explicitly that favourites are global across windows, which makes the concurrent write the normal case rather than an edge one.
- Scalar preferences do not have this problem in the same way: the last writer winning is a defensible answer for a single value, and pretending otherwise would buy complexity for nothing.

# Scope
- In:
  - Merge a favourite change into what is stored rather than replacing the stored list.
  - Make the write atomic, so a crash mid-write cannot leave a truncated file.
  - Let a window notice a favourite starred elsewhere, through the change channel the viewer already has.
  - Keep last-writer-wins for scalar preferences, and say so.
  - Cover the concurrent case in a test that writes from two clients.
- Out:
  - A general conflict-resolution mechanism for every preference.
  - Locking the file for the duration of a session.
  - Real-time synchronisation of anything other than favourites.

# Acceptance criteria
- AC1: Starring in one window and starring in another leaves both favourites present.
- AC2: Unstarring removes exactly one entry and leaves the rest.
- AC3: A write interrupted partway leaves the previous content readable, not a truncated file.
- AC4: A window shows a favourite starred elsewhere without being restarted.
- AC5: Tests cover two clients writing at once and fail against the current implementation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Starring in one window and starring in another leaves both favourites present.
- request-AC4 -> This backlog slice. Proof: AC2: Unstarring removes exactly one entry and leaves the rest.
- request-AC8 -> This backlog slice. Proof: AC3: A write interrupted partway leaves the previous content readable, not a truncated file.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_063_preferences_that_outlive_the_port`
- Architecture decision(s): (none yet)
- Request: `req_315_persist_viewer_preferences_where_they_belong_favourites_for_the_user_the_rest_for_the_repository`
- Primary task(s): `task_312_orchestrate_moving_the_viewer_preferences_off_the_port`

# AI Context
- Summary: Let two windows agree on the favourites
- Keywords: scaffolded-backlog, let two windows agree on the favourites, implementation-ready
- Use when: Implementing the scaffolded slice for Let two windows agree on the favourites.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - the reported case is several windows open at once
- Rationale: Set by scaffold input or defaulted for grooming.
