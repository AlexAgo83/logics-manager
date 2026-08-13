## item_729_validate_the_fleet_root_path_the_way_its_sibling_handler_already_does - Validate the fleet root path the way its sibling handler already does
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Security
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: CodeQL #54 flags user input reaching a path expression before validation; the guard that saves it is a membership test no analyser recognises, while the sibling handler in the same block normalises and asserts containment first.
- Keywords: codeql 54, path injection, remove_fleet_root, expanduser resolve, containment check, mutating routes, lan gate
- Use when: Changing how the fleet root endpoints handle a caller-supplied path.
- Skip when: Reworking the LAN pairing gate or the mutating-route set.

# Problem
- CodeQL #54 flags the fleet root handler because user input reaches a path expression before validation. It is guarded in practice by a membership test and by the mutating-route gate, but the sibling handler in the same block normalises and asserts containment first -- so two neighbouring handlers treat the same class of input differently.

# Scope
- In:
  - Validate before use, in the shape the sibling handler already establishes.
  - Confirm the alert closes as fixed rather than dismissed.
  - Cover the rejection path.
- Out:
  - Reworking the LAN pairing gate or the mutating-route set.

# Acceptance criteria
- AC7: The handler validates before use and alert #54 closes as fixed.
- AC8: The rejection path is covered by a test.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC7: The handler validates before use and alert #54 closes as fixed.
- request-AC8 -> This backlog slice. Proof: AC8: The rejection path is covered by a test.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_082_a_viewer_that_recovers_and_says_what_happened`
- Architecture decision(s): (none yet)
- Request: `req_346_close_the_gaps_behind_a_fleet_root_click_that_does_nothing`
- Primary task(s): `task_343_deliver_the_fleet_root_recovery_visible_failures_and_an_honest_fleet_flag`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
