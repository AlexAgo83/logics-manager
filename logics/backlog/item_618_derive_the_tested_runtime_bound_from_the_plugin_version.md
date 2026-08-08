## item_618_derive_the_tested_runtime_bound_from_the_plugin_version - Derive the tested runtime bound from the plugin version
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90
> Confidence: 85
> Progress: 0
> Complexity: Low
> Theme: Discoverable command contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The plugin warns that a repository's Logics runtime is newer than the version it was tested against. The bound it compares to is a hand-written constant, set once when the check was introduced and bumped by nothing in the release path. The runtime has since moved several minors ahead of it, so the warning fires on every start-up against a repository that is perfectly compatible.
- The plugin and the runtime are released together from this repository at the same version. The warning therefore fires on the pairing it was published as: a plugin telling an operator it has not been tested against the runtime it shipped with.
- A warning that fires unconditionally is a warning nobody reads. The one case it exists for, a runtime genuinely newer than the plugin installed, is the case it can no longer signal.

# Scope
- In:
  - Derive the tested upper bound from the plugin's own version, so the pairing it was released as is never reported as untested.
  - Keep the warning for the case it exists for: a runtime newer than the installed plugin.
  - Keep the lower bound as an explicit constant: it is a real compatibility floor, not a mirror of the current version.
  - Keep the message, the prompt actions, and the once-per-signature suppression as they are.
  - Cover the released pairing and the genuinely-newer runtime in tests.
- Out:
  - Changing what the plugin does when the runtime is too old.
  - Removing the warning, or making it dismissible for good.
  - Changing how the plugin discovers the repository's runtime version.

# Acceptance criteria
- AC1: A repository whose runtime matches the installed plugin's version produces no warning.
- AC2: A runtime newer than the installed plugin still warns, with the plugin's own version stated as the tested bound.
- AC3: A runtime below the floor still warns as too old, unchanged.
- AC4: Releasing a new version needs no edit to keep the bound correct.
- AC5: Regression tests cover the released pairing and the genuinely-newer runtime, and the first fails against the current implementation.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC4: Releasing a new version needs no edit to keep the bound correct.
- request-AC7 -> This backlog slice. Proof: AC5: Regression tests cover the released pairing and the genuinely-newer runtime, and the first fails against the current implementation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_056_say_what_actually_happened`
- Architecture decision(s): (none yet)
- Request: `req_308_report_workflow_outcomes_honestly_across_audit_help_and_closeout`
- Primary task(s): `task_305_orchestrate_the_honest_outcome_corrections`

# AI Context
- Summary: Derive the tested runtime bound from the plugin version
- Keywords: backlog, promote, slice, derive the tested runtime bound from the plugin version
- Use when: You need a bounded backlog item for Derive the tested runtime bound from the plugin version.
- Skip when: The change should go straight to implementation detail.

# Priority
- Priority: Medium - a start-up warning that fires on the pairing it was released as
- Rationale: Trains the operator to dismiss the one warning that would matter.

# Notes
- Generated locally by logics-manager.

# Tasks
- `task_305_orchestrate_the_honest_outcome_corrections`
