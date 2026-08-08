## item_625_cut_the_flow_entry_module_by_verb - Cut the flow entry module by verb
> From version: 2.20.0
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Flow verbs
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-08 18:59:10

# Problem
- The flow entry module is 4725 lines and holds every verb: new, promote, split, close, finish, repair, closeout and scaffold. It is already a package, so the module boundary needs no new structure -- only the decision to use it.
- It is also the file this repository edits most often, so its size is paid repeatedly.

# Scope
- In:
  - Lift the document vocabulary the verbs are written in into its own module inside the package.
  - Keep the package's public surface identical, so every caller and test imports what it imports today.
  - Lower the module's entry in the size allowlist to the value the cut reaches.
  - Keep the help screens and their derived flag sections working, since they resolve through the parser.
- Out:
  - Changing any verb's behavior or payload.
  - Renaming any exported function.
  - Reworking the closeout chain, which was just changed.

# Acceptance criteria
- AC1: The vocabulary the verbs share lives in its own module inside the package, with the dependency running one way.
- AC2: The package's public surface is unchanged, shown by the existing tests importing exactly as before.
- AC3: Every help screen still resolves its flags from the parser.
- AC4: The module's allowlist entry is lowered to the reached value.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: `logics_manager/flow/docs.py` (1368 lines); `flow/__init__.py` went from 4725 to 3627. Splitting by verb was attempted first and abandoned: the closeout chain alone borrows 25 shared helpers, so cutting by verb would have moved the coupling rather than removed it. Cutting underneath the verbs instead puts the primitives below them, and any later per-verb split now sits on a module that needs no import proxy.
- request-AC2 -> This backlog slice. Proof: `test_every_lifted_name_is_still_reachable_from_the_package` and `test_the_verbs_stayed_where_their_callers_expect_them` in `tests/python/test_flow_package_surface.py`; the 1102-test suite passes unchanged.
- request-AC3 -> This backlog slice. Proof: `test_every_help_screen_still_resolves_its_flags_from_the_parser` in the same file.
- request-AC7 -> This backlog slice. Proof: `test_the_vocabulary_does_not_reach_back_for_a_verb`, which pins the one-way dependency the cut depends on.
- request-AC4 -> This backlog slice. Evidence needed: The size guard refuses a raised ceiling unless the entry states what was tried and why it was kept.
- request-AC5 -> This backlog slice. Evidence needed: Shared state is not moved by this request; a lift that would require it stops and says so.
- request-AC6 -> This backlog slice. Evidence needed: The assistant adapter is left alone, and its recorded reason stays recorded.
# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_059_sub_systems_beside_the_core_not_inside_it`
- Architecture decision(s): (none yet)
- Request: `req_311_lift_the_viewer_s_sub_systems_out_of_its_core_and_turn_the_size_ledger_into_a_ratchet`
- Primary task(s): `task_308_orchestrate_lifting_the_sub_systems_out_of_the_core`

# AI Context
- Summary: Cut the flow entry module by verb
- Keywords: scaffolded-backlog, cut the flow entry module by verb, implementation-ready
- Use when: Implementing the scaffolded slice for Cut the flow entry module by verb.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - the cheapest structural cut, on an existing package
- Rationale: Set by scaffold input or defaulted for grooming.

# Tasks
- `task_308_orchestrate_lifting_the_sub_systems_out_of_the_core`

# Notes
- Task `task_308_orchestrate_lifting_the_sub_systems_out_of_the_core` was finished via `logics-manager flow finish task` on 2026-08-08.
