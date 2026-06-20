## task_243_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules - Modularize assist.py by splitting cmd_* subcommands into themed modules
> From version: 2.11.6
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
- `item_453_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules`

# Acceptance criteria
- AC1: `assist.py` is split into themed modules (review / workflow / context + shared support); the dispatcher imports from them.
- AC2: No observable behavior change — every `assist` subcommand keeps the same name, flags, and output; `pytest tests/python/` passes unchanged.
- AC3: Shared helpers are deduplicated into a single support module, not copied per file.
- AC4: Imports stay backward compatible (re-export from `assist.py` if external code imports these symbols).

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run `python3 -m logics_manager flow finish task task_243_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules.md` after implementation.

# Report
- Implementation complete.

# AI Context
- Summary: Implement modularize assist.py by splitting cmd_* subcommands into themed modules.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_258_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
