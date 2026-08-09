## item_674_stop_doctor_reporting_a_single_npm_install_as_a_duplicate_of_itself - Stop doctor reporting a single npm install as a duplicate of itself
> From version: 2.21.2
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Stop doctor reporting a single npm install as a duplicate of itself
- Keywords: backlog-groom, request, stop doctor reporting a single npm install as a duplicate of itself, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Stop doctor reporting a single npm install as a duplicate of itself.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`logics-manager doctor` reports the one and only npm install as a duplicate of itself, on every npm install, permanently. `running_executable_path()` (`logics_manager/cli.py:269`) reads `sys.argv[0]`, which inside the process the npm wrapper spawns is `scripts/logics-manager.py`. The PATH entry for the same install resolves to `scripts/npm/logics-manager.mjs`, the Node wrapper that did the spawning. `shadowing_executables()` (`logics_manager/cli.py:341`) compares the two resolved paths, finds them different, and classifies the install as a shadow of itself. Observed on 2.21.2: `doctor --format json` -> `environment_warnings[0].message` names `~/.local/npm-global/bin/logics-manager` while `path` is that install's own `scripts/logics-manager.py`, with `type -a logics-manager` listing exactly one distinct file. The warning is not merely noise: its remediation text advises `npm uninstall -g @grifhinz/logics-manager`, which on a correct single-install machine removes the user's only install.

# Scope
- In:
  - Compare install roots rather than entry-point files, so a wrapper and the interpreter entry it spawns are recognised as one install.
  - Cover the npm-wrapper case in a regression test: `sys.argv[0]` set to the spawned Python entry while PATH holds the Node bin of the same install, asserting no warning.
  - Cover the genuine-duplicate case in the same test file, asserting the warning still fires.
- Out:
  - The pipx/pip install layout beyond keeping its current behaviour green.
  - The wording of the remediation text, unless narrowing the check makes part of it wrong.
  - Anything in the sibling slices: schema backfill, CI doctor, code scanning alerts, CHANGELOG.

# Acceptance criteria
- AC1: On a machine with exactly one npm install, `doctor` emits no `duplicate_executables` warning, and a regression test covers the case where `sys.argv[0]` is the spawned Python entry point of the same install whose Node bin is on PATH.
- AC2: With two genuine installs present, `doctor` still reports the duplicate — the fix narrows the check without disabling it.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: deferred to task closeout.
- request-AC2 -> This backlog slice. Proof: deferred to task closeout.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose`
- Primary task(s): `task_322_orchestrate_the_diagnostics_and_release_surface_cleanup`

# Priority
- Priority: High
- Rationale: Set while scoping req_325's review findings.

# Notes
- Hybrid rationale: Derived from request `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose.md`.
- Generated locally by logics-manager.
