## item_705_define_standalone_fleet_launch_and_bounded_operator_fleet_roots - Define standalone fleet launch and bounded operator fleet roots
> From version: 2.21.8
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Launch and discovery contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-12 10:19:19

# AI Context
- Summary: Establish the minimal launch and discovery contract: explicit fleet mode plus persisted roots, each scanned one level deep only.
- Keywords: define, standalone, fleet, launch, bounded, operator, roots
- Use when: Implementing CLI launch resolution, operator preferences, or bounded project discovery.
- Skip when: Changing only project-scoped viewer data or the server reuse registry.

# Problem
- The viewer resolves a launch repository from the current working directory, so launching it outside a project enters bootstrap onboarding rather than a useful fleet surface.
- Sibling discovery depends on an already-known launch repository. There is no operator-owned set of bounded roots from which a standalone viewer can discover a fleet.

# Scope
- In:
  - Add an explicit `view --fleet` launch mode that starts from any directory and opens a fleet home without bootstrap confirmation.
  - Persist a small `fleetRoots` operator preference alongside existing operator viewer preferences; validate, deduplicate, and tolerate roots that later disappear.
  - Reuse the existing immediate-child discovery rule from `fleet`, broadened only enough to show bootstrappable project directories, with no recursion.
  - Make `--repo-root` and focus resolve a named target consistently for the project-oriented launch path.
- Out:
  - Automatic home-directory discovery or an always-running filesystem watcher.
  - Changing a project's `logics.yaml` or committing operator fleet choices into a repository.

# Acceptance criteria
- AC1: `logics-manager view --fleet --open` starts or reuses the standalone fleet viewer from any directory, including one with no repository or Logics corpus, without prompting to bootstrap the current directory.
- AC2: The fleet viewer lets an operator add and remove bounded fleet roots stored in operator-scoped preferences; discovery scans only immediate child directories, lists both Logics and bootstrappable projects, and never recursively scans the home directory or disk.
- AC6: Existing repo-oriented commands remain compatible: `logics-manager view --repo-root DIR --focus REF` targets that project in the shared viewer, and launching `view` without `--fleet` keeps the documented project-oriented behavior.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `logics-manager view --fleet --open` starts or reuses the standalone fleet viewer from any directory, including one with no repository or Logics corpus, without prompting to bootstrap the current directory.
- request-AC2 -> This backlog slice. Proof: AC2: The fleet viewer lets an operator add and remove bounded fleet roots stored in operator-scoped preferences; discovery scans only immediate child directories, lists both Logics and bootstrappable projects, and never recursively scans the home directory or disk.
- request-AC6 -> This backlog slice. Proof: AC6: Existing repo-oriented commands remain compatible: `logics-manager view --repo-root DIR --focus REF` targets that project in the shared viewer, and launching `view` without `--fleet` keeps the documented project-oriented behavior.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_078_a_standalone_fleet_home_for_the_canonical_logics_viewer`
- Architecture decision(s): `adr_028_scope_the_fleet_viewer_registry_to_the_operator_profile_and_resolve_project_context_per_request`
- Request: `req_342_launch_a_standalone_logics_fleet_viewer_through_one_shared_local_server`
- Primary task(s): `task_339_deliver_the_standalone_fleet_viewer_and_singleton_server`

# Priority
- Priority: High - it creates the requested project-independent entry point and the safe discovery boundary every later slice uses
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_339_deliver_the_standalone_fleet_viewer_and_singleton_server`

# Notes
- Task `task_339_deliver_the_standalone_fleet_viewer_and_singleton_server` was finished via `logics-manager flow finish task` on 2026-08-13.
