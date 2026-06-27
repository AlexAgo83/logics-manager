## item_520_generate_viewer_assets_at_build_time_and_untrack_the_mirror - Generate viewer_assets at build time and untrack the mirror
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Build tooling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- logics_manager/viewer_assets/** is a committed byte-copy mirror, so every shared-web edit drags 30+ identical mirror files into the diff and needs a manual sync to stay honest.

# Scope
- In:
  - Add a single build:assets command that regenerates viewer_assets from clients/shared-web/media + clients/viewer
  - git rm -r --cached logics_manager/viewer_assets and add it to .gitignore
  - Wire build:assets into the pip sdist/wheel build so package-data is populated, and have CI verify the built wheel contains complete viewer_assets
- Out:
  - Changing pyproject package-data declarations beyond what the generated layout requires
  - Retiring the now-redundant mirror sync/check scripts (final slice)

# Acceptance criteria
- AC1: logics_manager/viewer_assets is gitignored and absent from git; build:assets regenerates it deterministically.
- AC2: python -m build produces a wheel containing complete viewer_assets/media and viewer_assets/viewer.
- AC3: A clean checkout + build:assets + build + install serves the viewer identically to today.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: logics_manager/viewer_assets is gitignored and absent from git; build:assets regenerates it deterministically.
- request-AC2 -> This backlog slice. Proof: AC2: python -m build produces a wheel containing complete viewer_assets/media and viewer_assets/viewer.
- request-AC5 -> This backlog slice. Proof: AC3: A clean checkout + build:assets + build + install serves the viewer identically to today.
- request-AC6 -> This backlog slice. Proof: AC3: A clean checkout + build:assets + build + install serves the viewer identically to today.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)
- Request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Primary task(s): `task_282_orchestrate_single_sourcing_of_shared_web_assets`

# AI Context
- Summary: Generate viewer_assets at build time and untrack the mirror
- Keywords: scaffolded-backlog, generate viewer_assets at build time and untrack the mirror, implementation-ready
- Use when: Implementing the scaffolded slice for Generate viewer_assets at build time and untrack the mirror.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
