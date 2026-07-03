---
name: corpus
description: Scaffold a ready-to-dev Logics corpus (request → product brief → backlog → orchestration task → context pack) from a feature need, validate it, and commit. Use when the user asks to "scaffold a corpus", "create a request chain", or turn a feature idea into Logics workflow docs.
---

# Scaffold Logics Corpus

Turn a feature need into a full ready-to-dev Logics corpus in one pass with
`logics-manager flow scaffold request-chain`.

## Hard rules

- Write all docs in **English**, regardless of the language the need was described in, unless the user explicitly asks otherwise.
- **Never leak real company, supplier, or client names** into docs or mockups — use anonymized placeholders.
- Never hand-edit indicator lines, owner assignments, or workflow links.

## Recipe

1. Explore the codebase enough to write grounded acceptance criteria, then write a scaffold input JSON at `logics/scaffold/<slug>.json` with keys:
   `title`, `references[]`,
   `request{complexity, theme, needs[], context[], acceptance_criteria[]}`,
   `product{title, overview, goals[], non_goals[]}`,
   `backlog_items[]{title, complexity, theme, request_acs[], problem[], scope_in[], scope_out[], acceptance_criteria[]}`,
   `orchestration_task{title, plan[]}`,
   `context_pack{out, mode, profile}`.
   Mirror an existing file in `logics/scaffold/` if one exists.
2. Dry-run, then apply:
   ```bash
   logics-manager flow scaffold request-chain --input logics/scaffold/<slug>.json \
     --context-pack logics/context-packs/<slug>.json --dry-run
   # review, then re-run without --dry-run
   ```
3. Validate: `logics-manager flow validate <full_req_ref>` — findings like "task-level traceability proof is deferred — expected at task closeout" are NORMAL for a fresh unimplemented request, not blockers. `--apply-fixes` applies deterministic repairs.
4. Refresh the index: `logics-manager index`.
5. `git add logics/` and commit (no Co-Authored-By lines).

## Gotchas

- `context_pack.profile` must be `tiny`, `normal`, or `deep`. An invalid value passes `--dry-run` but throws mid-apply after the md files are written; clean up the partial files before re-running, else fresh ids get allocated.
- `flow validate` and `audit` want the FULL ref (`req_285_full_slug`), not the short `req_285`.
- Editing a doc after scaffold trips a blocking "modified without updating indicators" gate — fix with `logics-manager sync update-indicators`.
- Reuse one product brief across requests in the same product area via `--source-ref`/companion instead of auto-creating a new brief per request.
