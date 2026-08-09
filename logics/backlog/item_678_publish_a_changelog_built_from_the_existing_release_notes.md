## item_678_publish_a_changelog_built_from_the_existing_release_notes - Publish a CHANGELOG built from the existing release notes
> From version: 2.21.2
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 01:00:22

# AI Context
- Summary: Publish a CHANGELOG built from the existing release notes
- Keywords: backlog-groom, request, publish a changelog built from the existing release notes, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Publish a CHANGELOG built from the existing release notes.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
Fifteen releases carry detailed, well-written notes on GitHub, including breaking-change callouts such as v2.20.0's `health` exit-code change. None of it reaches an npm or PyPI reader: there is no `CHANGELOG.md` in the repository and `package.json:25` `files` ships none. A package consumer sees a version number and no history, and cannot discover a breaking change without leaving the registry. The material already exists; only the publishing path is missing.

# Scope
- In:
  - A `CHANGELOG.md` covering at least 2.15 through 2.21, derived from the published release notes rather than rewritten.
  - List it in `package.json` `files` so the npm package carries it, and check the equivalent for the Python distribution.
  - A note in the release runbook so a future release updates it, rather than letting it go stale immediately.
- Out:
  - Rewriting the release notes themselves.
  - Backfilling releases older than 2.15.
  - The roadmap documents `road_001` … `road_007`, which are a corpus-side retrospective and not a changelog.

# Acceptance criteria
- AC6: `CHANGELOG.md` exists, covers 2.15 through 2.21, is listed in `package.json` `files`, and the release runbook names the step that keeps it current.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: `scripts/build/build-changelog.mjs` aggregates the 27 curated notes under `changelogs/` (2.15.0 onward) into `CHANGELOG.md`, reading the repository rather than the GitHub API so it works offline and from a source tarball. `CHANGELOG.md` is listed in `package.json` `files`; `pyproject.toml` gained `readme = "README.md"`, without which the PyPI page carried no description at all. `npm run check:changelog` runs in `ci-check.mjs` and `.github/workflows/ci.yml`, and `docs/release.md` step 2 names the regeneration.

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
- Priority: Medium
- Rationale: Set while scoping req_325's review findings.

# Notes
- Hybrid rationale: Derived from request `req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_325_review_findings_diagnostics_that_disagree_with_the_repository_they_diagnose.md`.
- Generated locally by logics-manager.
