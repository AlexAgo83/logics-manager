## item_474_establish_modularization_guardrails_and_viewer_esbuild_bundle_pipeline - Establish modularization guardrails and viewer esbuild bundle pipeline
> From version: 2.12.7
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Build tooling
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- There is no enabling pipeline to bundle viewer ES modules and no guardrail preventing files from growing back past the line budget.

# Scope
- In:
  - Add an esbuild bundle step (reusing the existing esbuild dependency) that compiles clients/viewer/src/*.js into the single browser-host.js artifact
  - Wire the bundle step ahead of scripts/dev/sync-viewer-assets.mjs so the shipped artifact stays byte-stable in CI
  - Add a line-budget guardrail (lint rule or vitest/pytest check) that flags new source files over the agreed threshold
- Out:
  - The actual decomposition of any monolith (handled by sibling slices)
  - Adopting any framework or new runtime dependency

# Acceptance criteria
- AC1: An esbuild-based bundle command exists and produces browser-host.js from a src/ entrypoint.
- AC2: A documented line-budget guardrail fails CI when a source file exceeds the threshold.
- AC3: sync-viewer-assets.mjs --check still passes after bundling.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: An esbuild-based bundle command exists and produces browser-host.js from a src/ entrypoint.
- request-AC7 -> This backlog slice. Proof: AC2: A documented line-budget guardrail fails CI when a source file exceeds the threshold.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_025_oversized_source_modularization`
- Architecture decision(s): (none yet)
- Request: `req_270_modularize_oversized_source_files_across_the_codebase`
- Primary task(s): `task_267_orchestrate_the_oversized_source_modularization_program`

# AI Context
- Summary: Establish modularization guardrails and viewer esbuild bundle pipeline
- Keywords: scaffolded-backlog, establish modularization guardrails and viewer esbuild bundle pipeline, implementation-ready
- Use when: Implementing the scaffolded slice for Establish modularization guardrails and viewer esbuild bundle pipeline.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
