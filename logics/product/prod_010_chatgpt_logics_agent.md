## prod_010_chatgpt_logics_agent - ChatGPT Logics Agent
> Date: 2026-05-27 (dogfooding update)
> Status: Proposed
> Related request: `req_191_build_a_chatgpt_logics_agent`
> Related backlog: `item_352_build_a_chatgpt_logics_agent`
> Related task: `task_153_build_a_chatgpt_logics_agent`
> Related architecture: `adr_022_chatgpt_logics_agent_mcp_contract`
> Reminder: Update status, linked refs, scope, decisions, success signals, and open questions when you edit this doc.

# Overview
The ChatGPT Logics Agent turns everyday product conversation into structured Logics workflow documents.
The user can discuss an idea in ChatGPT, refine the intent naturally, and ask the agent to create the corresponding request, backlog slice, or executable task directly in the local Logics corpus.
Codex remains the execution engine: it picks up prepared Logics tasks, changes the code, validates the result, and closes the work through the canonical workflow.

The product promise is a continuous path from conversation to delivery:
idea, decision, Logics document, Codex execution, verified outcome.

```mermaid
%% logics-kind: product
%% logics-signature: product|chatgpt-logics-agent|req-191-build-a-chatgpt-logics-agent|the-chatgpt-logics-agent-turns-everyd|logics-already-gives-the-project-a-stron
flowchart LR
    ChatGPT[ChatGPT framing] --> Logics[Logics source of truth]
    Logics --> Codex[Codex execution]
    Codex --> Validation[Validation and closure]
    Validation --> Outcome[Verified delivery]
```

This should feel like a product companion for shaping work, not a generic shell bridge.
ChatGPT owns framing and documentation.
Codex owns implementation and verification.
Logics stays the source of truth between both agents.

# Product problem
Logics already gives the project a strong request to backlog to task workflow, but creating and grooming those documents still requires the operator to leave the conversational space where ideas usually emerge.
That creates friction at the exact moment when product intent is freshest.

Without a ChatGPT-facing Logics agent:
- ideas discussed in chat must be manually copied into Logics;
- document quality depends on the operator remembering the expected structure;
- Codex can execute tasks well, but only after a human has translated the conversation into the workflow;
- the handoff from product thinking to implementation remains more manual than the rest of the system deserves.

The opportunity is to make ChatGPT the natural front door for Logics while preserving the discipline of the existing workflow.

# Target users and situations
- Primary user: a product-minded builder who wants to turn chat discussions into scoped Logics work without manual document setup.
- Secondary user: a maintainer who wants Logics requests, backlog items, and tasks to stay consistent even when they are created from conversational input.
- Secondary user: Codex-driven delivery flows that need better prepared tasks before implementation begins.
- Situation: the user has an idea, asks ChatGPT to shape it, and wants a clean Logics artifact created locally for later execution by Codex.

# Goals
- Let ChatGPT create and refine Logics workflow documents from natural product conversation.
- Make the idea to delivery path feel continuous without replacing the existing Logics workflow.
- Keep `logics-manager` as the canonical write path for workflow document creation and transitions.
- Expose only focused, safe Logics actions to ChatGPT instead of general filesystem or shell access.
- Support local-first usage by running the MCP server on the operator machine and exposing it to ChatGPT through a controlled HTTPS tunnel when needed.
- Give the user visible confidence after every write through clear summaries, validation results, and `git diff` style review.
- Preserve Codex as the agent responsible for code changes, tests, validation, and task completion.

# Non-goals
- Giving ChatGPT unrestricted shell access.
- Letting ChatGPT directly implement code changes in the repository as part of this product surface.
- Replacing Codex, the VS Code plugin, or the `logics-manager` CLI.
- Building a public multi-tenant hosted Logics service as the first version.
- Hiding Logics documents behind a black-box chat-only workflow.

# Scope and guardrails
- In: a local MCP server that exposes a small set of Logics actions to ChatGPT.
- In: actions for creating requests, promoting requests, promoting backlog items, creating companion docs, running lint, running audit, listing active work, and showing local diffs.
- In: path restrictions that keep all writes inside the repo-relative `logics/` workflow areas.
- In: explicit confirmation and visible result reporting for write operations.
- In: a tunnel-based development and private usage model for ChatGPT access.
- Out: arbitrary command execution, arbitrary file editing, broad repository mutation, or unattended implementation work.

# Key product decisions
- ChatGPT is the product framing agent; Codex is the delivery agent.
- Logics remains the shared source of truth and audit trail.
- The MCP server should wrap `logics-manager` instead of reimplementing workflow behavior.
- The initial tool surface should be intentionally small and product-specific.
- Write actions should operate on repo-relative paths only and reject absolute paths.
- The MCP server should expose local Logics capability through HTTPS only for ChatGPT compatibility, but the execution stays on the user's machine.
- The first version should optimize for one trusted operator and one local repository, not workspace-wide deployment.
- Every successful write should return the changed artifact path, validation status, and a short review summary.
- Codex should consume prepared tasks from Logics rather than being invoked implicitly by ChatGPT in the first version.

# Success signals
- A user can describe a product idea in ChatGPT and get a well-formed Logics request without leaving the conversation.
- A request can be promoted into backlog and task artifacts through ChatGPT while preserving Logics conventions.
- The generated artifacts pass `logics-manager lint --require-status` and the standard audit flow.
- The user can review exactly what changed after every action.
- Codex can later pick up the generated task and execute it without extra translation.
- Before ChatGPT integration is available end to end, Codex can dogfood the same MCP tools as an agent client and complete the request to backlog to task flow without knowing the underlying CLI commands.
- The workflow feels faster than manual document creation while remaining transparent and controlled.
- The MCP action surface remains small enough to reason about and safe enough for local repo usage.

# MVP workflow
1. The user discusses a need in ChatGPT.
2. ChatGPT asks for only the missing product details.
3. ChatGPT calls the local Logics MCP action to create a request.
4. The MCP server runs the canonical `logics-manager` command locally.
5. The server returns the created path, summary, lint status, and diff.
6. The user can ask ChatGPT to promote the request to backlog or task when ready.
7. Codex later executes the task in the local repository.

# MVP tool surface
- `create_request`
- `promote_request_to_backlog`
- `promote_backlog_to_task`
- `create_product_brief`
- `list_active_work`
- `run_logics_lint`
- `run_logics_audit`
- `show_git_diff`

# Open questions
- Which ChatGPT plan and developer mode permissions should be treated as the target environment for the first usable version?
- Should the first MCP server be packaged inside this repository or generated as a separate local companion service?
- Should write actions require a second confirmation inside the MCP layer, or is ChatGPT's confirmation flow sufficient for the MVP?
- Should Codex task execution remain a separate manual step, or should a later version offer a controlled "prepare for Codex" handoff action?
- Which Codex dogfooding prompt should become the standard smoke scenario for validating the agent-facing MCP contract before ChatGPT is connected?

# References
- `logics/request/req_191_build_a_chatgpt_logics_agent.md`
- `logics/backlog/item_352_build_a_chatgpt_logics_agent.md`
- `logics/tasks/task_153_build_a_chatgpt_logics_agent.md`
- `logics/architecture/adr_022_chatgpt_logics_agent_mcp_contract.md`
- `LOGICS.md`
- `RTK.md`
- `logics/product/prod_004_logics_auto_orchestration_vision.md`
- `logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md`
