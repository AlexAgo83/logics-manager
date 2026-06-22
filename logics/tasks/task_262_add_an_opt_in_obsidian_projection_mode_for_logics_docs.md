## task_262_add_an_opt_in_obsidian_projection_mode_for_logics_docs - Add an opt-in Obsidian projection mode for Logics docs
> From version: 2.12.3
> Schema version: 1.0
> Status: Done
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.

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
- `rtk python3 -m pytest tests/python/test_cli_main.py -q -k 'obsidian or main_prints_help'`
- `rtk python3 -m py_compile logics_manager/obsidian.py logics_manager/cli.py logics_manager/lint.py logics_manager/config.py`
- `rtk logics-manager lint --require-status`
- `rtk logics-manager audit`
- rtk python3 -m pytest tests/python/test_cli_main.py -q -k 'obsidian or main_prints_help' passed; rtk python3 -m py_compile logics_manager/obsidian.py logics_manager/cli.py logics_manager/lint.py logics_manager/config.py passed; rtk logics-manager lint --require-status passed; rtk logics-manager audit passed with deferred warnings only before proof update
- Finish workflow executed on 2026-06-22.
- Linked backlog/request close verification passed.

# Report
- Implemented `logics-manager obsidian sync|clean` in `logics_manager/obsidian.py`, wired the command into the root CLI help/dispatch, added the disabled-by-default `obsidian.enabled` config default, and documented the projection workflow in `docs/cli.md`.
- `obsidian sync` is disabled unless `obsidian.enabled: true` is configured, writes deterministic managed frontmatter when enabled, supports `--check` and `--dry-run`, and `obsidian clean` removes only managed frontmatter.
- The linter now reports blocking drift when Obsidian frontmatter no longer matches canonical type/ref/status/title metadata.
- Tests cover disabled default behavior, sync/check/clean round-trip, and lint/check drift detection.
- Finished on 2026-06-22.
- Linked backlog item(s): `item_469_add_an_opt_in_obsidian_projection_mode_for_logics_docs`
- Related request(s): `req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs`

# AI Context
- Summary: Implement add an opt-in obsidian projection mode for logics docs.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_265_add_an_opt_in_obsidian_projection_mode_for_logics_docs`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# AC Traceability
- request-AC1 -> Implemented in `logics_manager/config.py` and `logics_manager/obsidian.py`. Proof: `obsidian.enabled` defaults to `False`, `obsidian_payload(..., action="sync")` returns a skipped result without writing, and `test_obsidian_sync_is_disabled_by_default` asserts the doc is unchanged.
- request-AC2 -> Implemented in `logics_manager/obsidian.py` and `docs/cli.md`. Proof: sync writes only when `obsidian.enabled: true` is present in `logics.yaml` or `--force` is used; docs show the activation block and `obsidian sync`, `sync --check`, and `clean` commands.
- request-AC3 -> Implemented in `logics_manager/obsidian.py`. Proof: `_frontmatter_for` and `_render_frontmatter` emit deterministic type/ref/status/understanding/confidence/progress/theme/title/aliases/tags, and `test_obsidian_sync_check_and_clean_round_trip` asserts generated fields and a clean `sync --check`.
- request-AC4 -> Implemented in `logics_manager/obsidian.py`. Proof: sync prepends managed frontmatter to the canonical body and never rewrites canonical blockquote indicators, refs, links, signatures, or paths.
- request-AC5 -> Implemented in `logics_manager/obsidian.py`. Proof: `obsidian clean` removes only the managed `logics_projection: obsidian` block, and `test_obsidian_sync_check_and_clean_round_trip` verifies the original Markdown body is restored byte-for-byte.
- request-AC6 -> Covered by existing parser behavior plus regression validation. Proof: index/audit/lint scan canonical blockquote indicators independently from frontmatter, and the targeted tests plus `rtk logics-manager lint --require-status` / `rtk logics-manager audit` pass after the command and lint integration.
- request-AC7 -> Implemented in `logics_manager/lint.py` and `logics_manager/obsidian.py`. Proof: `validate_frontmatter_file` compares frontmatter type/ref/status/title to canonical metadata, `obsidian sync --check` reports drift, and `test_obsidian_check_and_lint_detect_frontmatter_drift` covers both surfaces.
- request-AC8 -> Implemented by using only Python standard library parsing/rendering and no Obsidian plugin integration. Proof: `logics_manager/obsidian.py` adds no runtime plugin or community plugin dependency; docs state Dataview/frontmatter consumption is optional.
