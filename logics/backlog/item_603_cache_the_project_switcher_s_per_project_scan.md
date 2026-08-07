## item_603_cache_the_project_switcher_s_per_project_scan - Cache the project switcher's per-project scan
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Viewer responsiveness
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The per-project scan takes about six seconds across thirty-three sibling corpora and runs again on every menu open, because it was wired directly to the per-repository reports.
- The viewer already has a time-to-live cache used for its git, CI, and session panels, and the scan simply does not use it.

# Scope
- In:
  - Route the per-project scan through the viewer's existing cached-component mechanism.
  - Keep the on-demand trigger: the scan must still not run while the viewer starts.
  - Keep per-project failure isolation intact.
  - Cover the caching behavior in a test so a second request within the window does not rescan.
- Out:
  - Changing the cache's expiry policy for other components.
  - Making the scan concurrent.
  - Changing what the scan reports.

# Acceptance criteria
- AC1: A second request within the cache window does not rescan the projects.
- AC2: The scan still runs on demand rather than during viewer startup.
- AC3: A project that fails is still reported with its error while the others render.
- AC4: A test asserts the underlying reports are not rebuilt on a cached request.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: A second request within the cache window does not rescan the projects.
- request-AC8 -> This backlog slice. Proof: AC2: The scan still runs on demand rather than during viewer startup.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_054_guardrails_proportionate_to_the_codebase`
- Architecture decision(s): (none yet)
- Request: `req_306_act_on_the_repository_review_measurement_honesty_guardrails_and_the_viewer_module_split`
- Primary task(s): `task_303_orchestrate_the_repository_review_remediation`

# AI Context
- Summary: Cache the project switcher's per-project scan
- Keywords: scaffolded-backlog, cache the project switcher's per-project scan, implementation-ready
- Use when: Implementing the scaffolded slice for Cache the project switcher's per-project scan.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - a regression shipped with the switcher feature
- Rationale: Set by scaffold input or defaulted for grooming.
