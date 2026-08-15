## item_849_fix_the_settings_connector_toggle_and_make_the_connector_screen_reactive - Fix the Settings Connector toggle and make the connector screen reactive
> From version: 2.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 100%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: Viewer MCP connector UX
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-16 00:27:12

# AI Context
- Summary: Root-caused this session -- Settings' toggle reads a `state` field /api/mcp-connector never sends (it sends `running`), so the switch always renders unchecked regardless of real state; the detail screen reads the right fields but only ever fetches once, so an operator has to click Refresh to see a connector that already finished starting.
- Keywords: mcp-connector payload field mismatch, settings toggle, reactive polling, refresh status
- Use when: Touching the Settings screen's connector toggle or the ChatGPT Developer Mode detail screen.
- Skip when: Anything about what the connector itself does once running -- this is only about the viewer's own display of its state.

# Problem
- Settings' Connector toggle reads a `state` field from /api/mcp-connector's response, but that endpoint returns `running`, not `state` -- the toggle's checked attribute is always computed from an undefined value, so it always shows unchecked/"unknown" regardless of whether the connector is actually running, reported directly by an operator as "doesn't seem to do anything".
- The connector detail screen already reads the right fields and renders correctly once fetched, but only ever fetches once per visit -- an operator watching it while the tunnel establishes has to click 'Refresh status' manually to see it finish, confirmed directly this session.
- Both bugs survive `adr_031_one_mcp_transport_per_client_class` untouched: whatever transport the connector runs (localtunnel today, `tunnel-client` after `item_850_run_chatgpt_through_openais_secure_mcp_tunnel`), the payload still reports `running` and the screen still has to reflect it and keep up with it.

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
- Opening the connector detail screen while the connector is starting shows the outcome -- ready, or the specific error -- once it arrives, with no manual refresh click, and stops polling once ready/stopped/errored.

# AC Traceability
- request-The Settings screen's Connector toggle reflects the connector's real running state on load and after every toggle, and toggling it on or off actually starts or stops the connector. -> This backlog slice. Proof: Settings renders the Connector toggle as checked/"On" when the connector is actually running, and unchecked/"Off" when it is not.
- request-The connector screen updates itself without a manual click while it is open and the connector is starting, stopping once it is ready, stopped, or errored. -> This backlog slice. Proof: Opening the connector detail screen while the connector is starting shows the outcome once it arrives, with no manual refresh click, and stops polling once ready/stopped/errored.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_107_a_connector_configured_once_then_just_on_off`
- Architecture decision(s): `adr_031_one_mcp_transport_per_client_class`
- Request: `req_376_make_the_chatgpt_mcp_connector_plug_and_play`
- Primary task(s): `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Validation
- 2026-08-16: `npx vitest run tests/viewer.browser-host.test.ts` -- 237 passed. Two new tests: Settings renders the toggle checked/"On" from a payload reporting `running: true` (AC1), and the connector screen picks up a URL arriving after the initial fetch with no manual click, then stops polling once ready (AC3). The stale `state: "off"` fixture that had agreed with the bug now mirrors viewer.py's real payload. Commit 3a1d171f.

# Tasks
- `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector`

# Notes
- Task `task_387_deliver_a_durable_chatgpt_native_reactive_mcp_connector` was finished via `logics-manager flow finish task` on 2026-08-16.
