## item_588_accept_an_explicit_repository_root_on_every_command - Accept an explicit repository root on every command
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Medium
> Theme: Repository targeting
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Only the MCP subcommands accept an explicit repository root; every other command resolves the repository from the current working directory.
- An embedder must therefore spawn each invocation with a changed working directory, which also forces path interpolation into remote shell command strings and breaks on paths containing spaces.

# Scope
- In:
  - Parse a repository-root option once, before command dispatch, and thread the resolved root through every command's repository resolution.
  - Validate that the supplied path exists and contains a Logics corpus, with a clear error otherwise.
  - Keep working-directory discovery as the behavior when the option is absent.
  - Document the option in the top-level help and in the generated instructions bridge.
- Out:
  - Targeting several repositories in one invocation, which is covered by the fleet command.
  - Remote or network repository locations.
  - Changing how the corpus root is discovered when the option is absent.

# Acceptance criteria
- AC1: Every command accepts the repository-root option and operates on that repository regardless of the current working directory.
- AC2: A path that is missing or contains no Logics corpus produces a clear, non-zero-exit error naming the path.
- AC3: A path containing spaces or other shell-significant characters is handled correctly.
- AC4: Invocations that omit the option resolve the repository exactly as before.
- AC5: Tests cover explicit targeting, absent-option fallback, invalid paths, and awkward path characters.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Every command accepts the repository-root option and operates on that repository regardless of the current working directory.
- request-AC9 -> This backlog slice. Proof: AC2: A path that is missing or contains no Logics corpus produces a clear, non-zero-exit error naming the path.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Accept an explicit repository root on every command
- Keywords: scaffolded-backlog, accept an explicit repository root on every command, implementation-ready
- Use when: Implementing the scaffolded slice for Accept an explicit repository root on every command.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - unblocks every other embedder concern
- Rationale: Set by scaffold input or defaulted for grooming.
