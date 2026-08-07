## item_593_provide_quoting_free_tool_arguments_and_a_consistent_output_envelope - Provide quoting-free tool arguments and a consistent output envelope
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Automation contract
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Direct tool invocation accepts its arguments only as a single command-line string, so an embedder passing them through a remote shell has to escape structured data through several quoting layers.
- One external integration abandoned that path entirely and restricted all mutating calls to local execution as a result.
- Machine-readable responses vary enough that callers write defensive parsing for empty output, missing success flags, and exit codes that do not follow the success flag.

# Scope
- In:
  - Accept tool arguments from standard input and from a file path, in addition to the current inline string.
  - Accept repeated key-and-value arguments for simple scalar inputs.
  - Normalize machine-readable responses onto one envelope carrying a success flag and a structured error with a stable code and message.
  - Make the process exit code follow the envelope's success flag consistently.
  - Document the envelope and the exit-code contract.
- Out:
  - Adding a dedicated command for every tool.
  - Changing human-readable output formatting.
  - A network protocol beyond the transports already supported.

# Acceptance criteria
- AC1: Tool arguments can be supplied from standard input, from a file, or as repeated key-and-value pairs, with the inline string still accepted.
- AC2: Structured argument data containing quotes, spaces, and newlines round-trips intact through the non-inline paths.
- AC3: Every machine-readable response carries a success flag and, on failure, a structured error with a stable code.
- AC4: The exit code is zero exactly when the success flag is true, verified across a representative set of commands.
- AC5: Tests cover each argument source, awkward payload content, and exit-code agreement on success and failure.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: Tool arguments can be supplied from standard input, from a file, or as repeated key-and-value pairs, with the inline string still accepted.
- request-AC9 -> This backlog slice. Proof: AC2: Structured argument data containing quotes, spaces, and newlines round-trips intact through the non-inline paths.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Provide quoting-free tool arguments and a consistent output envelope
- Keywords: scaffolded-backlog, provide quoting-free tool arguments and a consistent output envelope, implementation-ready
- Use when: Implementing the scaffolded slice for Provide quoting-free tool arguments and a consistent output envelope.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - closes the last transport-shaped gap
- Rationale: Set by scaffold input or defaulted for grooming.
