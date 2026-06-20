## item_453_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules - Modularize assist.py by splitting cmd_* subcommands into themed modules
> From version: 2.11.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
`logics_manager/assist.py` has grown to ~2,618 lines: 0 classes, ~80 pure functions, including 19 independent `cmd_*` subcommands plus their shared helpers, all in one module.
Each `cmd_*` is an autonomous feature, so the file can be split by theme with low risk: pure functions move, the dispatcher keeps wiring them.
Goal: split `assist.py` into themed modules so each assist concern is readable and testable in isolation, with no behavior change.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: `assist.py` is split into themed modules (review / workflow / context + shared support); the dispatcher imports from them.
- AC2: No observable behavior change — every `assist` subcommand keeps the same name, flags, and output; `pytest tests/python/` passes unchanged.
- AC3: Shared helpers are deduplicated into a single support module, not copied per file.
- AC4: Imports stay backward compatible (re-export from `assist.py` if external code imports these symbols).

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `assist.py` is split into themed modules (review / workflow / context + shared support); the dispatcher imports from them.
- request-AC2 -> This backlog slice. Proof: AC2: No observable behavior change — every `assist` subcommand keeps the same name, flags, and output; `pytest tests/python/` passes unchanged.
- request-AC3 -> This backlog slice. Proof: AC3: Shared helpers are deduplicated into a single support module, not copied per file.
- request-AC4 -> This backlog slice. Proof: AC4: Imports stay backward compatible (re-export from `assist.py` if external code imports these symbols).

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
- Request: `logics/request/req_258_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules.md`
- Primary task(s): (none yet)

# AI Context
- Summary: Modularize assist.py by splitting cmd_* subcommands into themed modules
- Keywords: backlog-groom, request, modularize assist.py by splitting cmd_* subcommands into themed modules, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Modularize assist.py by splitting cmd_* subcommands into themed modules.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Priority
- Impact:
- Urgency:

# Notes
- Hybrid rationale: Derived from request `req_258_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_258_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules.md`.
- Generated locally by logics-manager.

# Tasks
- `task_243_modularize_assist_py_by_splitting_cmd_subcommands_into_themed_modules`
