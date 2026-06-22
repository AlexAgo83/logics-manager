## task_262_add_an_opt_in_obsidian_projection_mode_for_logics_docs - Add an opt-in Obsidian projection mode for Logics docs
> From version: 2.12.3
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.

# Backlog
- `item_469_add_an_opt_in_obsidian_projection_mode_for_logics_docs`

# Acceptance criteria
- AC1: With the mode disabled (default), no command adds frontmatter and the corpus is unchanged; operators who never enable the mode see no new constraints.
- AC2: Activation is explicit via `logics.yaml` config and/or an explicit `logics-manager obsidian sync` invocation, and the activation path is documented.
- AC3: `logics-manager obsidian sync` writes deterministic, idempotent frontmatter (type, ref, status, understanding, confidence, theme), an `aliases` entry for the human title, and `tags` derived from type/status/theme; re-running produces no diff.
- AC4: Frontmatter is a non-destructive projection: it is additive above canonical content and never replaces canonical refs, lifecycle indicators, lineage links, Mermaid signatures, or repo-relative paths.
- AC5: `logics-manager obsidian clean` removes the projection and restores canonical content byte-for-byte (verified by round-trip).
- AC6: The Logics parser/lint/audit/index paths tolerate leading frontmatter but treat the blockquote indicators as authoritative; nothing requires frontmatter to parse a doc.
- AC7: A lint guard engages only when frontmatter is present and reports drift between frontmatter and canonical type/ref/status/title, plus edits to managed indicators; `obsidian sync --check` surfaces the same drift for CI.
- AC8: No Obsidian plugin is required, and no community plugin (incl. Dataview) is a runtime dependency.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_262_add_an_opt_in_obsidian_projection_mode_for_logics_docs.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement add an opt-in obsidian projection mode for logics docs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
