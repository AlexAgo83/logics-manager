## item_625_cut_the_flow_entry_module_by_verb - Cut the flow entry module by verb
> From version: 2.20.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Flow verbs
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The flow entry module is 4725 lines and holds every verb: new, promote, split, close, finish, repair, closeout and scaffold. It is already a package, so the module boundary needs no new structure -- only the decision to use it.
- It is also the file this repository edits most often, so its size is paid repeatedly.

# Scope
- In:
  - Move each verb's implementation into its own module inside the existing package.
  - Keep the package's public surface identical, so every caller and test imports what it imports today.
  - Lower the module's entry in the size allowlist to the value the cut reaches.
  - Keep the help screens and their derived flag sections working, since they resolve through the parser.
- Out:
  - Changing any verb's behavior or payload.
  - Renaming any exported function.
  - Reworking the closeout chain, which was just changed.

# Acceptance criteria
- AC1: Each verb lives in its own module inside the package.
- AC2: The package's public surface is unchanged, shown by the existing tests importing exactly as before.
- AC3: Every help screen still resolves its flags from the parser.
- AC4: The module's allowlist entry is lowered to the reached value.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each verb lives in its own module inside the package.
- request-AC2 -> This backlog slice. Proof: AC2: The package's public surface is unchanged, shown by the existing tests importing exactly as before.
- request-AC3 -> This backlog slice. Proof: AC3: Every help screen still resolves its flags from the parser.
- request-AC7 -> This backlog slice. Proof: AC4: The module's allowlist entry is lowered to the reached value.

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
