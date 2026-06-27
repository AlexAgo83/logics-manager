## item_521_retire_the_mirror_sync_check_tooling_and_update_ci_contributor_docs - Retire the mirror sync/check tooling and update CI + contributor docs
> From version: 2.14.1
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Build tooling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- sync-webview-media, sync-viewer-assets, check:webview-media-mirror, and check:viewer-assets exist only to keep the committed mirror honest; once the mirror is generated they are redundant or should fold into build:assets.

# Scope
- In:
  - Fold the two sync scripts into the single build:assets generator and delete the now-dead ones
  - Remove the committed-mirror lint gates (or repoint them to verify the generated artifact in CI only)
  - Update CONTRIBUTING / dev docs and the CI pipeline to the single-source edit + build:assets flow
- Out:
  - Any runtime code behavior change

# Acceptance criteria
- AC1: The redundant sync/check npm scripts are removed or folded into build:assets.
- AC2: lint no longer requires committed-mirror parity.
- AC3: Contributor docs describe the one-source edit plus build:assets flow.

# AC Traceability
- request-AC2 -> This backlog slice. Proof: AC1: The redundant sync/check npm scripts are removed or folded into build:assets.
- request-AC7 -> This backlog slice. Proof: AC2: lint no longer requires committed-mirror parity.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_034_shared_web_asset_single_sourcing`
- Architecture decision(s): (none yet)
- Request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Primary task(s): `task_282_orchestrate_single_sourcing_of_shared_web_assets`

# AI Context
- Summary: Retire the mirror sync/check tooling and update CI + contributor docs
- Keywords: scaffolded-backlog, retire the mirror sync/check tooling and update ci + contributor docs, implementation-ready
- Use when: Implementing the scaffolded slice for Retire the mirror sync/check tooling and update CI + contributor docs.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
