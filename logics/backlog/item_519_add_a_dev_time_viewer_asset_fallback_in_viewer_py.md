## item_519_add_a_dev_time_viewer_asset_fallback_in_viewer_py - Add a dev-time viewer asset fallback in viewer.py
> From version: 2.14.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Python runtime
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- viewer.py resolves assets only from the package-local viewer_assets dir, so once that mirror is generated (and gitignored) a fresh clone without a build would serve nothing.

# Scope
- In:
  - Resolve the asset root as: packaged viewer_assets if present, else the repo's clients/shared-web/media (and clients/viewer for the viewer/ html+css)
  - Add a pytest that exercises both resolution branches (packaged present, packaged absent)
- Out:
  - Removing or gitignoring the committed mirror (sibling slice)
  - Any change to asset content or payload shapes

# Acceptance criteria
- AC1: With viewer_assets absent, asset resolution falls back to clients/shared-web/media and clients/viewer.
- AC2: With viewer_assets present (packaged), it is used unchanged.
- AC3: A pytest covers both branches.

# AC Traceability
- request-AC4 -> This backlog slice. Proof: AC1: With viewer_assets absent, asset resolution falls back to clients/shared-web/media and clients/viewer.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)
- Request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Primary task(s): `task_282_orchestrate_single_sourcing_of_shared_web_assets`

# AI Context
- Summary: Add a dev-time viewer asset fallback in viewer.py
- Keywords: scaffolded-backlog, add a dev-time viewer asset fallback in viewer.py, implementation-ready
- Use when: Implementing the scaffolded slice for Add a dev-time viewer asset fallback in viewer.py.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
