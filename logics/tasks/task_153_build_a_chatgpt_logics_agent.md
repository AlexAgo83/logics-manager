## task_153_build_a_chatgpt_logics_agent - Build a ChatGPT Logics Agent
> From version: 2.0.5
> Schema version: 1.0
> Status: Done
> Understanding: 99%
> Confidence: 92%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] A Codex dogfooding run can exercise the MCP tools for request to backlog to task without direct CLI usage.
- [x] Validation passes.

# Backlog
- `item_352_build_a_chatgpt_logics_agent`

# Acceptance criteria
- AC1: The agent can create a Logics request from a ChatGPT conversation through a bounded MCP action.
- AC2: The agent can promote existing workflow docs only through canonical `logics-manager` commands.
- AC3: The MCP surface rejects arbitrary shell execution and absolute path writes.
- AC4: Each write returns the changed artifact path, validation status, and a human-readable diff summary.
- AC5: Codex remains the execution agent and can later consume generated tasks without extra translation.

# AC Traceability
- AC1 -> Scope: Build the bounded MCP action for creating a Logics request from ChatGPT conversation. Proof: request creation is part of the task acceptance criteria.
- AC2 -> Scope: Build promotion actions that delegate to canonical `logics-manager` commands. Proof: request and backlog promotion are part of the task acceptance criteria.
- AC3 -> Scope: Add command and path restrictions around the MCP action surface. Proof: the task explicitly rejects arbitrary shell execution and absolute path writes.
- AC4 -> Scope: Return changed paths, validation status, and diff summaries after write actions. Proof: write result reporting is part of the task acceptance criteria.
- AC5 -> Scope: Preserve the Codex handoff boundary. Proof: the task keeps implementation work out of ChatGPT's direct action surface.

# Validation
- Run `python3 -m logics_manager lint --require-status`.
- Run an automated smoke test for create request, promote request, promote backlog, lint, audit, and diff reporting.
- Run a Codex dogfooding scenario against the MCP surface before treating the ChatGPT connector path as product-ready.
- Verify HTTP transport through a local smoke test and then through an HTTPS tunnel before attempting ChatGPT developer-mode registration.
- Run `python3 -m logics_manager flow finish task task_153_build_a_chatgpt_logics_agent.md` after implementation.

```mermaid
%% logics-kind: task
%% logics-signature: task|build-a-chatgpt-logics-agent|item-352-build-a-chatgpt-logics-agent|1-confirm-scope|run-python3-m-logics-manager-lint-requi
stateDiagram-v2
    state "item 352 build a chatgpt logics agent" as Backlog
    state "1. Confirm scope" as Scope
    state "2. Implement change" as Build
    state "3. Validate result" as Verify
    state "Run python3 -m logics_manager lint" as Validation
    state "Report outcome" as Report
    [*] --> Backlog
    Backlog --> Scope
    Scope --> Build
    Build --> Verify
    Verify --> Validation
    Validation --> Report
    Report --> [*]
```

# Report
- First implementation slice complete: added the local MCP handler module, JSON-RPC stdio surface, direct testing command, path guardrails, tool definitions, and Python smoke coverage for request to backlog to task flow.
- Second implementation slice complete: added stricter MCP argument validation, dirty tracked-source conflict detection, untracked-file diff summaries, and a JSON-RPC dogfooding script for the request to backlog to task flow.
- Local dogfood proof: `scripts/dogfood-mcp-flow.py --repo-root <temp repo>` creates request, backlog, and task through MCP JSON-RPC handlers, then runs lint, audit, and diff.
- Third implementation slice in progress: added local HTTP transport for tunnel testing and documented the ChatGPT connector constraint that local MCP needs a remote or tunnel path.
- HTTP smoke proof: a temporary local server returned `200` for `/health` and `200` for `POST /mcp` `tools/list`, exposing 9 tools.
- Scripted Codex-style dogfood proof: `scripts/dogfood-mcp-flow.py --repo-root <temp repo> --title "Codex MCP dogfood flow"` completed request, backlog, task, lint, audit, and diff through MCP JSON-RPC handlers.
- Real sub-agent dogfooding found the MCP usable by an agent and identified ergonomics fixes: audit top-level `ok`, precise argument error codes, document previews for untracked files, and `next_suggested_tool` hints.
- Agent ergonomics fixes applied: `run_logics_audit.ok` now mirrors audit status, argument validation uses precise error codes, write actions return `document_preview`, write actions return `next_suggested_tool`, and the dogfood script is executable.
- HTTPS tunnel proof: an SSH reverse tunnel through `localhost.run` exposed the local `serve-http` endpoint at `https://e1cf6a48918c18.lhr.life`; `/health` returned `200` with `{"ok":true,"server":"logics-manager-mcp","version":"2.0.5"}`, and `POST /mcp` `tools/list` returned the 9-tool MCP surface.
- ChatGPT developer-mode proof: ChatGPT connected through a temporary HTTPS tunnel, called the Logics MCP tools, created a temporary smoke-test request, promoted it to a backlog item, promoted that to a task, then ran lint, audit, and `show_git_diff`.
- Follow-up from real ChatGPT run: lint passed with missing-Mermaid warnings on the generated smoke docs; audit correctly reported request AC traceability gaps on the generated smoke request, proving error reporting reaches ChatGPT without a transport failure.
- Cleanup complete: the temporary ChatGPT smoke request, backlog item, and task were removed after the connector test.
- HTTP auth hardening complete: `serve-http` can require an OAuth-style bearer token via `LOGICS_MCP_BEARER_TOKEN` or `--bearer-token`; `POST /mcp` rejects missing or invalid bearer tokens while `/health` remains available for tunnel checks.
- Final validation: `python3 -m pytest python_tests/test_logics_manager_mcp.py` passed with sandbox-only socket skips; `python3 -m logics_manager lint --require-status` passed; `python3 -m logics_manager audit --format json` passed.

# AI Context
- Summary: Implement build a chatgpt logics agent.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Links
- Request: `req_191_build_a_chatgpt_logics_agent`
- Product brief(s): `logics/product/prod_010_chatgpt_logics_agent.md`
- Architecture decision(s): `logics/architecture/adr_022_chatgpt_logics_agent_mcp_contract.md`
