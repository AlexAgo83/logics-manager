## req_305_give_the_viewer_surfaces_the_same_workflow_signals_the_cli_reports - Give the viewer surfaces the same workflow signals the CLI reports
> From version: 2.19.7
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Viewer parity with CLI workflow signals
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- Fix a shipped defect where document ages freeze in any long-running process, before any surface starts displaying them.
- Report one document age and one staleness verdict across the CLI, the browser viewer, and the embedded editor panel, instead of three answers that disagree.
- Let the viewer reach the workflow health report, and show per-project state where an operator already chooses a project.

# Context
- A recent change added commit-based document ages and a configurable stale-document signal to the CLI, but only to the CLI.
- The batched age lookup caches its result for the lifetime of the process and never invalidates, which is harmless for a one-shot command and wrong for the long-running MCP server: a document committed after the first lookup is never dated, and existing ages freeze. This was verified by committing a second document inside one process and observing only the first still reported.
- The browser viewer dates documents from filesystem mtime, which is the defect the CLI change replaced: after a fresh clone every document shares one date.
- The embedded editor panel computes its own staleness with a hardcoded thirty-day threshold over that same mtime, while the CLI uses a configurable fourteen-day threshold over commit dates, so one document can be stale in one surface and current in the other.
- The viewer serves lint and audit but has no route to the workflow health report, so its health screen cannot show blocked or stale documents at all.
- The project switcher lists sibling projects without any state, so answering where work is blocked means switching into each project in turn, which the fleet report already answers in one call.
- Corpus detection is implemented in four places: the repository resolver, the fleet report, the viewer's sibling discovery, and the viewer's project picker.

# Acceptance criteria
- AC1: The document-age lookup returns current results in a long-running process, and a document committed after an earlier lookup is dated correctly.
- AC2: Every surface derives a document's age from the same source, with the same fallback for a document that has no commit yet.
- AC3: One configurable threshold decides staleness everywhere; no surface carries its own hardcoded value.
- AC4: The viewer can read the workflow health report, and its health screen shows the blocked and stale signals that report carries.
- AC5: The project switcher shows each project's open-work and issue state without requiring the operator to switch into it.
- AC6: Whether a directory holds a Logics corpus is decided by one shared implementation.
- AC7: The update state the viewer already displays also names the resolved package manager, the executable path, and any duplicate executables on PATH.
- AC8: Surfaces that do not display workflow signals are unchanged, and no existing viewer payload field changes shape.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_053_one_workflow_signal_every_logics_surface`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_020_local_web_viewer_for_cli_driven_logics_work.md
- logics/product/prod_036_vs_code_embedded_viewer_parity.md
- logics/product/prod_051_multi_repository_and_embedder_contract_for_the_logics_cli.md

# AI Context
- Summary: Give the viewer surfaces the same workflow signals the CLI reports
- Keywords: request-chain-scaffold, give the viewer surfaces the same workflow signals the cli reports, development-ready
- Use when: You need to implement or review the scaffolded workflow for Give the viewer surfaces the same workflow signals the CLI reports.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_598_invalidate_the_document_age_cache_when_the_repository_moves`
- `item_599_derive_document_age_and_staleness_from_one_implementation`
- `item_600_serve_the_workflow_health_report_to_the_viewer`
- `item_601_show_per_project_state_in_the_project_switcher`
- `item_602_report_the_resolved_install_in_the_viewer_s_update_state`
