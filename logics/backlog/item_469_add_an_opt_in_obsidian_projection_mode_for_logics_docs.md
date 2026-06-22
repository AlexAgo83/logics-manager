## item_469_add_an_opt_in_obsidian_projection_mode_for_logics_docs - Add an opt-in Obsidian projection mode for Logics docs
> From version: 2.12.3
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
Give operators an opt-in "Obsidian projection" mode that makes the Logics Markdown corpus comfortable to read, search, and navigate in Obsidian (Properties panel, tag pane, quick-switcher, backlinks, graph view) without changing the default experience.
Project the canonical workflow indicators (type, ref, status, understanding, confidence, theme, title) into deterministic YAML frontmatter, aliases, and tags that Obsidian and Dataview can consume.
Keep the mode fully reversible: a single command applies the projection and a single command removes it, leaving canonical content byte-for-byte unchanged.
Preserve Logics Manager as the only source of truth for lifecycle, lint, audit, flow transitions, generated indicators, Mermaid signatures, and closeout. The projection is a derived view, never an input.
Require no Obsidian plugin and impose no new constraints on operators who never enable the mode.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: With the mode disabled (default), no command adds frontmatter and the corpus is unchanged; operators who never enable the mode see no new constraints.
- AC2: Activation is explicit via `logics.yaml` config and/or an explicit `logics-manager obsidian sync` invocation, and the activation path is documented.
- AC3: `logics-manager obsidian sync` writes deterministic, idempotent frontmatter (type, ref, status, understanding, confidence, theme), an `aliases` entry for the human title, and `tags` derived from type/status/theme; re-running produces no diff.
- AC4: Frontmatter is a non-destructive projection: it is additive above canonical content and never replaces canonical refs, lifecycle indicators, lineage links, Mermaid signatures, or repo-relative paths.
- AC5: `logics-manager obsidian clean` removes the projection and restores canonical content byte-for-byte (verified by round-trip).
- AC6: The Logics parser/lint/audit/index paths tolerate leading frontmatter but treat the blockquote indicators as authoritative; nothing requires frontmatter to parse a doc.
- AC7: A lint guard engages only when frontmatter is present and reports drift between frontmatter and canonical type/ref/status/title, plus edits to managed indicators; `obsidian sync --check` surfaces the same drift for CI.
- AC8: No Obsidian plugin is required, and no community plugin (incl. Dataview) is a runtime dependency.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: With the mode disabled (default), no command adds frontmatter and the corpus is unchanged; operators who never enable the mode see no new constraints.
- request-AC2 -> This backlog slice. Proof: AC2: Activation is explicit via `logics.yaml` config and/or an explicit `logics-manager obsidian sync` invocation, and the activation path is documented.
- request-AC3 -> This backlog slice. Proof: AC3: `logics-manager obsidian sync` writes deterministic, idempotent frontmatter (type, ref, status, understanding, confidence, theme), an `aliases` entry for the human title, and `tags` derived from type/status/theme; re-running produces no diff.
- request-AC4 -> This backlog slice. Proof: AC4: Frontmatter is a non-destructive projection: it is additive above canonical content and never replaces canonical refs, lifecycle indicators, lineage links, Mermaid signatures, or repo-relative paths.
- request-AC5 -> This backlog slice. Proof: AC5: `logics-manager obsidian clean` removes the projection and restores canonical content byte-for-byte (verified by round-trip).
- request-AC6 -> This backlog slice. Proof: AC6: The Logics parser/lint/audit/index paths tolerate leading frontmatter but treat the blockquote indicators as authoritative; nothing requires frontmatter to parse a doc.
- request-AC7 -> This backlog slice. Proof: AC7: A lint guard engages only when frontmatter is present and reports drift between frontmatter and canonical type/ref/status/title, plus edits to managed indicators; `obsidian sync --check` surfaces the same drift for CI.
- request-AC8 -> This backlog slice. Proof: AC8: No Obsidian plugin is required, and no community plugin (incl. Dataview) is a runtime dependency.

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
- Request: `req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs`
- Primary task(s): `task_262_add_an_opt_in_obsidian_projection_mode_for_logics_docs`

# AI Context
- Summary: Add an opt-in Obsidian projection mode for Logics docs
- Keywords: backlog-groom, request, add an opt-in obsidian projection mode for logics docs, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Add an opt-in Obsidian projection mode for Logics docs.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs.md`.
- Generated locally by logics-manager.
- Task `task_262_add_an_opt_in_obsidian_projection_mode_for_logics_docs` was finished via `logics-manager flow finish task` on 2026-06-22.

# Tasks
- `task_262_add_an_opt_in_obsidian_projection_mode_for_logics_docs`
