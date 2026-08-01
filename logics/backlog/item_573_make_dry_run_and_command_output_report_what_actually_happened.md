## item_573_make_dry_run_and_command_output_report_what_actually_happened - Make dry-run and command output report what actually happened
> From version: 2.19.5
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Truthful output
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- `flow companion` and `flow roadmap propose` print an unconditional past-tense summary line after their dry-run preview, so the output states that a document was created when nothing was written.
- `logics-manager index` prints the same success line whether or not it changed the file, `flow start` silently modifies linked backlog items, and `flow progress` never states the resulting value.
- These cost almost nothing to hit and were caught only by double-checking, which makes them the highest latent risk in the lot: an agent that trusts the message skips the real invocation.

# Scope
- In:
  - Make the trailing summary line in `cmd_companion` and `cmd_roadmap_propose` conditional on dry-run, matching the conditional form `flow scaffold` already uses.
  - Make `logics-manager index` distinguish a write from a no-op in its output.
  - Make `flow start` name every document it modified, not only the one passed on the command line.
  - Make `flow progress` state the resulting progress value.
  - Cover each command with a test asserting that dry-run output contains no past-tense completion claim.
- Out:
  - Changing what any of these commands actually write.
  - Reworking the dry-run preview format itself, which is useful as it stands.

# Acceptance criteria
- AC1: `flow companion architecture --dry-run` and `flow roadmap propose --dry-run` produce no line asserting creation, and the filesystem is unchanged after each.
- AC2: `logics-manager index` output distinguishes a run that wrote the index from a run that did not.
- AC3: `flow start` output lists every modified document, verified against the actual change set.
- AC4: `flow progress` output states the resulting progress value.
- AC5: A test asserts that no dry-run path in the flow CLI emits a past-tense completion claim.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `flow companion architecture --dry-run` and `flow roadmap propose --dry-run` produce no line asserting creation, and the filesystem is unchanged after each.
- request-AC16 -> This backlog slice. Proof: AC2: `logics-manager index` output distinguishes a run that wrote the index from a run that did not.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_049_agent_facing_correctness_remediation`
- Architecture decision(s): (none yet)
- Request: `req_300_agent_facing_correctness_of_generated_docs_and_cli_contracts`
- Primary task(s): `task_297_orchestrate_agent_facing_correctness_remediation`

# AI Context
- Summary: Make dry-run and command output report what actually happened
- Keywords: scaffolded-backlog, make dry-run and command output report what actually happened, implementation-ready
- Use when: Implementing the scaffolded slice for Make dry-run and command output report what actually happened.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
