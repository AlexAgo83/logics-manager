## item_737_turn_settings_into_controls_with_state - Turn Settings into controls with state
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 90%
> Confidence: 85%
> Progress: 12%
> Complexity: Medium
> Theme: Viewer experience
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Nine identical primary buttons, of which `Stop viewer` kills the server and looks exactly like `Insights`, a link; three are navigation; the title prints twice; and nothing reports the address, mode, transport, version or connector state.
- Keywords: settings state, destructive action, stop viewer, mcp toggle, navigation in settings, duplicate title
- Use when: Changing what the Settings screen shows or how its controls are presented.
- Skip when: The MCP connector's own behaviour, and what the settings themselves control.

# Problem
- Nine identical primary buttons, of which `Stop viewer` kills the server and looks exactly like `Insights`, which is a link; three are navigation rather than settings; the title is printed twice; and nothing reports the address, mode, transport, version, or whether the MCP connector is on.

# Scope
- In:
  - Report what this viewer is: address, mode, transport, version, project, and the connector's position.
  - Present a binary control as a binary control showing where it sits.
  - Distinguish destructive actions, state what they cost, and confirm them.
  - Move the navigation entries out, and print the title once.
- Out:
  - The MCP connector's own behaviour, and what the settings themselves control.

# Acceptance criteria
- AC1: The screen states what this viewer is.
- AC12: It reports address, mode, transport, version and connector state.
- AC13: Binary controls show their position.
- AC14: Destructive actions are distinct, state their cost, and confirm.
- AC15: Navigation entries are reached from the navigation.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The screen states what this viewer is.
- request-AC12 -> This backlog slice. Proof: AC12: It reports address, mode, transport, version and connector state.
- request-AC13 -> This backlog slice. Proof: AC13: Binary controls show their position.
- request-AC14 -> This backlog slice. Proof: AC14: Destructive actions are distinct, state their cost, and confirm.
- request-AC15 -> This backlog slice. Proof: AC15: Navigation entries are reached from the navigation.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_083_screens_that_state_their_answer`
- Architecture decision(s): (none yet)
- Request: `req_347_make_the_git_ci_release_and_settings_screens_answer_their_own_question`
- Primary task(s): `task_344_deliver_the_git_ci_release_and_settings_redesign`

# Priority
- Priority: High
- Rationale: Set by scaffold input or defaulted for grooming.
