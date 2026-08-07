## item_608_state_that_network_writes_grant_command_execution - State that network writes grant command execution
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Low
> Theme: Stated risk
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- The workshop terminal endpoint runs the command supplied in the request body, so any client authorized to write over the network can run commands under the operator's account. Confirmed by reproduction.
- Both the option's help text and the security document describe that authorization as writing or mutating state, so an operator deciding whether to expose the viewer on an untrusted network evaluates document edits rather than command execution.

# Scope
- In:
  - Say, in the option's own help, that a paired device can run commands under the operator's account.
  - Describe the same capability in the security document, alongside the mechanism that guards it.
  - Keep the existing guidance about preferring a private tunnel over public exposure, and make it clearly follow from the capability.
- Out:
  - Restricting what the terminal can run.
  - Changing the pairing, token, or origin checks.
  - Adding a separate opt-in for the terminal.
  - Any behavior change at all.

# Acceptance criteria
- AC1: The option's help states the command-execution capability in plain terms.
- AC2: The security document describes it where it describes the network model.
- AC3: No authorization behavior changes; the same requests are refused and allowed as before.
- AC4: A test asserts the wording is present, so it cannot be dropped silently.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The option's help states the command-execution capability in plain terms.
- request-AC2 -> This backlog slice. Proof: AC2: The security document describes it where it describes the network model.
- request-AC5 -> This backlog slice. Proof: AC3: No authorization behavior changes; the same requests are refused and allowed as before.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_055_say_what_it_does_and_test_what_was_moved`
- Architecture decision(s): (none yet)
- Request: `req_307_close_the_gaps_the_second_review_found_stated_risk_cache_concurrency_and_untested_route_branches`
- Primary task(s): `task_304_orchestrate_the_second_review_remediation`

# AI Context
- Summary: State that network writes grant command execution
- Keywords: scaffolded-backlog, state that network writes grant command execution, implementation-ready
- Use when: Implementing the scaffolded slice for State that network writes grant command execution.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: High - an exposure decision is currently made against the wrong risk
- Rationale: Set by scaffold input or defaulted for grooming.
