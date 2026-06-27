## prod_034_shared_web_asset_single_sourcing - Shared web asset single-sourcing
> Date: 2026-06-27
> Status: Proposed
> Related request: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
> Related backlog: `item_518_collapse_the_redundant_clients_shared_web_src_twins_into_media`, `item_519_add_a_dev_time_viewer_asset_fallback_in_viewer_py`, `item_520_generate_viewer_assets_at_build_time_and_untrack_the_mirror`, `item_521_retire_the_mirror_sync_check_tooling_and_update_ci_contributor_docs`
> Related task: `task_282_orchestrate_single_sourcing_of_shared_web_assets`
> Related architecture: (none yet)
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
Collapse the triple-copied shared-web assets (src twin -> media bundle -> committed viewer_assets mirror) down to a single committed source, generating the pip package's viewer_assets as a build artifact instead of versioning it.

# Goals
- One committed source of truth per asset, so every edit is a one-file diff.
- Generate the pip-shipped viewer_assets at build/release time rather than committing a mirror.
- Keep the Python tool runnable straight from a clone via a fallback to the canonical asset source.

# Non-goals
- Changing any viewer or webview runtime behavior, payload shape, or user-facing feature.
- Touching the real clients/viewer/src esbuild bundle pipeline (browser-host.js).
- Introducing a new framework, bundler, or runtime dependency.

# Scope and guardrails
- In: scaffolded request, product, backlog, orchestration task, validation, and handoff context.
- Out: unrelated workflow docs and implementation of generated tasks.

# Key product decisions
- Use structured input as the source of truth for generated docs.
- Keep generated write paths local and repo-bounded.

# Success signals
- Generated docs pass lint and audit without broad manual rewrites.
- Context-pack output can be handed to an implementation agent directly.

# References
- Product back-reference: `req_285_single_source_the_shared_web_assets_and_stop_committing_build_mirrors`
- Task back-reference: `task_282_orchestrate_single_sourcing_of_shared_web_assets`
