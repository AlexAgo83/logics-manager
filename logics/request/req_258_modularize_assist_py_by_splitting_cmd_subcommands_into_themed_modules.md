## req_258_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules - Modularize assist.py by splitting cmd_* subcommands into themed modules
> From version: 2.11.6
> Schema version: 1.0
> Status: Draft
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Operator workflow
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- `logics_manager/assist.py` has grown to ~2,618 lines: 0 classes, ~80 pure functions, including 19 independent `cmd_*` subcommands plus their shared helpers, all in one module.
- Each `cmd_*` is an autonomous feature, so the file can be split by theme with low risk: pure functions move, the dispatcher keeps wiring them.
- Goal: split `assist.py` into themed modules so each assist concern is readable and testable in isolation, with no behavior change.

# Context
- Subcommands cluster into themes:
  - `assist_review.py`: `cmd_diff_risk`, `cmd_commit_plan`, `cmd_changed_surface_summary`, `cmd_review_checklist`, `cmd_validation_checklist`, `cmd_validation_summary`, `cmd_test_impact_summary`.
  - `assist_workflow.py`: `cmd_request_draft`, `cmd_spec_first_pass`, `cmd_backlog_groom`, `cmd_closure_summary`, `cmd_handoff`, `cmd_next_step`.
  - `assist_context.py`: `cmd_context`, `cmd_runtime_status`, `cmd_roi_report`, `cmd_doc_consistency`, `cmd_claude_bridges`, `cmd_claude_instructions`.
  - `assist_support.py`: shared private helpers (`_summarize_*`, `_split_*`, `_stringify_scalar`, `_title_from_request_intent`, `_workflow_docs`, ...).
- The CLI entry point keeps the same dispatch table and command names; only the implementations relocate.
- Behavior-preserving refactor: no command surface, output, or flag changes.

# Acceptance criteria
- AC1: `assist.py` is split into themed modules (review / workflow / context + shared support); the dispatcher imports from them.
- AC2: No observable behavior change — every `assist` subcommand keeps the same name, flags, and output; `pytest tests/python/` passes unchanged.
- AC3: Shared helpers are deduplicated into a single support module, not copied per file.
- AC4: Imports stay backward compatible (re-export from `assist.py` if external code imports these symbols).

# Definition of Ready (DoR)
- [ ] Problem statement is explicit and user impact is clear.
- [ ] Scope boundaries (in/out) are explicit.
- [ ] Acceptance criteria are testable.
- [ ] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# References
- `logics_manager/assist.py` (primary target, ~2,618 lines / 19 cmd_* subcommands)
- `tests/python/test_logics_manager_cli.py` (assist subcommand coverage)

# AI Context
- Summary: Split assist.py's 19 cmd_* subcommands into themed modules (review / workflow / context) with a shared support module, preserving the command surface.
- Keywords: refactor, assist.py, CLI dispatcher, subcommands, modularization
- Use when: Reducing assist.py size and isolating assist concerns.
- Skip when: An assist CLI refactor is already in progress or would conflict.

# Backlog
- none
