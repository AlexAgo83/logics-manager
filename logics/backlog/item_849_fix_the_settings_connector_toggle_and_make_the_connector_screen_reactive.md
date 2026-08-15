## item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive - Fix the Settings Connector toggle and make the connector screen reactive
> From version: 2.22.0
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Low
> Theme: Viewer MCP connector UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 23:04:49

# AI Context
- Summary: Root-caused this session -- Settings' toggle reads a `state` field /api/mcp-connector never sends (it sends `running`), so the switch always renders unchecked regardless of real state; the detail screen reads the right fields but only ever fetches once, so an operator has to click Refresh to see a connector that already finished starting.
- Keywords: mcp-connector payload field mismatch, settings toggle, reactive polling, refresh status
- Use when: Touching the Settings screen's connector toggle or the ChatGPT Developer Mode detail screen.
- Skip when: Anything about what the connector itself does once running -- this is only about the viewer's own display of its state.

# Problem
- Settings' Connector toggle reads a `state` field from /api/mcp-connector's response, but that endpoint returns `running`, not `state` -- the toggle's checked attribute is always computed from an undefined value, so it always shows unchecked/"unknown" regardless of whether the connector is actually running, reported directly by an operator as "doesn't seem to do anything".
- The connector detail screen already reads the right fields and renders correctly once fetched, but only ever fetches once per visit -- an operator watching it while the tunnel establishes has to click 'Refresh status' manually to see it finish, confirmed directly this session.

# Scope
- In:
  - Fix Settings' mcpState computation to read the connector payload's actual field.
  - Add polling to the connector detail screen while it is open and the connector is running-but-not-ready, stopping once ready, stopped, or errored, or once the operator navigates away.
  - Tests covering: the toggle reflecting a real running connector on render, and the detail screen picking up a URL/token that arrives after the initial fetch without a manual action.
- Out:
  - Polling any other Settings sub-screen.
  - Changing the toggle's or the detail screen's visual design beyond making the state correct and reactive.

# Acceptance criteria
- Settings renders the Connector toggle as checked/"On" when the connector is actually running, and unchecked/"Off" when it is not.
- Toggling the Connector switch starts or stops the connector and the switch reflects the outcome without a page reload.
- Opening the connector detail screen while the connector is running but not yet ready shows the URL and token once they become available, with no manual refresh click, and stops polling once ready/stopped/errored.

# AC Traceability
- request-The Settings screen's Connector toggle reflects the connector's real running state on load and after every toggle, and toggling it on or off actually starts or stops the connector. -> This backlog slice. Proof: Settings renders the Connector toggle as checked/"On" when the connector is actually running, and unchecked/"Off" when it is not.
- request-The connector detail screen (Settings / ChatGPT Developer Mode) updates itself without a manual click while it is open and the connector is running but not yet ready, stopping once the URL/token appear or the connector reports an error. -> This backlog slice. Proof: Toggling the Connector switch starts or stops the connector and the switch reflects the outcome without a page reload.
- request-An operator's first visit to the connector screen is enough to get everything ChatGPT needs in one place; every visit after that is a one-click ON/OFF with nothing left to re-copy. -> This backlog slice. Proof: Opening the connector detail screen while the connector is running but not yet ready shows the URL and token once they become available, with no manual refresh click, and stops polling once ready/stopped/errored.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): (none yet)
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Primary task(s): `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
