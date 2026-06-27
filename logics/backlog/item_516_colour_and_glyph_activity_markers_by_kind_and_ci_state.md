## item_516_colour_and_glyph_activity_markers_by_kind_and_ci_state - Colour and glyph activity markers by kind and CI state
> From version: 2.14.1
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85
> Progress: 100%
> Complexity: Medium
> Theme: Viewer UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- CI and git entries render with bare letter pills and no CI colour, so a failed run is indistinguishable from a passing one and operational events blend into the document flow.

# Scope
- In:
  - Propagate the CI run badgeState through getActivityEntries onto the entry so the renderer can place it on the marker dataset
  - In renderActivityPanel, set a kind glyph (branch for git, check/cross/dot for CI by state) and a data-badge-state attribute on the marker while keeping the existing title/aria-label
  - Add toolbar.css rules: CI marker tints per badge state, a CI kind tint, and a per-kind left accent stripe on git/CI entries
  - Run scripts/dev/sync-webview-media.mjs and confirm --check passes
- Out:
  - Recomposing the meta line text (handled by the sibling slice)
  - Any host-side change to how events are built

# Acceptance criteria
- AC1: CI markers are green/red/amber/grey by badgeState, driven by a marker dataset value.
- AC2: Git and CI markers show distinct unicode glyphs with the kind/id still in the accessible label and tooltip.
- AC3: Git and CI entries show a kind-coloured left accent stripe.
- AC4: scripts/dev/sync-webview-media.mjs --check passes after the edit.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: CI markers are green/red/amber/grey by badgeState, driven by a marker dataset value.
- request-AC2 -> This backlog slice. Proof: AC2: Git and CI markers show distinct unicode glyphs with the kind/id still in the accessible label and tooltip.
- request-AC3 -> This backlog slice. Proof: AC3: Git and CI entries show a kind-coloured left accent stripe.
- request-AC5 -> This backlog slice. Proof: AC4: scripts/dev/sync-webview-media.mjs --check passes after the edit.
- request-AC6 -> This backlog slice. Proof: AC4: scripts/dev/sync-webview-media.mjs --check passes after the edit.
- request-AC7 -> This backlog slice. Evidence needed: Activity-panel render tests cover the state-coloured CI marker, the kind glyphs, and the recomposed git/CI lines; the full vitest suite passes.
- request-AC8 -> This backlog slice. Evidence needed: logics-manager lint and audit pass on the resulting workflow corpus.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_033_recent_activity_feed_legibility`
- Architecture decision(s): (none yet)
- Request: `req_284_make_the_recent_activity_feed_legible_for_git_and_ci_events`
- Primary task(s): `task_281_orchestrate_the_recent_activity_feed_legibility_polish`

# AI Context
- Summary: Colour and glyph activity markers by kind and CI state
- Keywords: scaffolded-backlog, colour and glyph activity markers by kind and ci state, implementation-ready
- Use when: Implementing the scaffolded slice for Colour and glyph activity markers by kind and CI state.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_281_orchestrate_the_recent_activity_feed_legibility_polish`

# Notes
- Task `task_281_orchestrate_the_recent_activity_feed_legibility_polish` was finished via `logics-manager flow finish task` on 2026-06-27.
