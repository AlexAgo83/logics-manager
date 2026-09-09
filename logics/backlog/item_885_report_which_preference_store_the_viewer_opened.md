## item_885_report_which_preference_store_the_viewer_opened - Report which preference store the viewer opened
> From version: 2.23.0
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 45%
> Complexity: Low
> Theme: Operator preference store identity
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-09-09 13:02:27

# AI Context
- Summary: The viewer never names the operator preferences file it opened, so a store forked under another HOME reads as lost data; report the path and warn when more than one exists.
- Keywords: operator preferences, store path, environment warning, viewer settings
- Use when: Adding the store path to the viewer info payload and launch banner, or detecting a forked store.
- Skip when: Changing what the store contains or where it lives - that is item_886.

# Problem
- The viewer never states which operator preference file it opened, so a store that forked under another HOME reads as lost favorites and lost projects.
- Re-choosing the discovery root appears to repair it, which hides the cause: the root is written into the store now open, not the one the operator remembers.

# Scope
- In:
  - Add the resolved store path to the payload the Settings screen already builds from, and to the launch banner.
  - Detect other operator preference stores belonging to the current user and report them as a warning naming each path and the one in use.
  - Reuse the existing environment-warning shape rather than inventing a second reporting channel.
- Out:
  - Moving, merging or deleting any store.
  - Scanning the filesystem beyond the known candidate locations.
  - Changing what the store contains.

# Acceptance criteria
- AC1: The viewer info payload and the launch banner both name the absolute path of the store in use.
- AC2: With two stores present for one user, the warning names both and identifies the active one.
- AC3: With one store present, no warning is produced and the payload is otherwise unchanged.
- AC4: `LOGICS_VIEWER_PREFERENCES_HOME` still decides the path, and the reported path is the one actually read and written.
- AC5: A focused regression covers the one-store and two-store cases.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The viewer info payload and the launch banner both name the absolute path of the store in use.
- request-AC2 -> This backlog slice. Proof: AC2: With two stores present for one user, the warning names both and identifies the active one.
- request-AC5 -> This backlog slice. Proof: AC3: With one store present, no warning is produced and the payload is otherwise unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_117_one_operator_record_and_the_viewer_says_which_one_it_opened`
- Architecture decision(s): (none yet)
- Request: `req_388_say_which_operator_preference_store_the_viewer_is_using_and_stop_it_forking_silently`
- Primary task(s): `task_400_make_the_operator_preference_store_visible_then_decide_where_it_belongs`

# Priority
- Priority: High - it turns invisible data loss into a stated fact, and costs nothing
- Rationale: Set by scaffold input or defaulted for grooming.
