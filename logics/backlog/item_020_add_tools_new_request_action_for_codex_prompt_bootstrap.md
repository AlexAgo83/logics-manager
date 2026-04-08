## item_020_add_tools_new_request_action_for_codex_prompt_bootstrap - Add Tools New Request action for Codex prompt bootstrap
> From version: 1.7.0
> Status: Done
> Understanding: 100%
> Confidence: 98%
> Progress: 100% complete
> Complexity: Medium
> Theme: Agent orchestration and request drafting
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The extension supports agent selection and Codex prompt bootstrapping, but starting a new request-drafting conversation still requires several manual steps. Users who want help formulating a new Logics request must select the right agent themselves, open Codex, and reconstruct a suitable prompt before they can even describe the need.

# Scope
- In:
  - Add a `New Request` entry under `Tools`, near `Select Agent`.
  - Default or activate the request-authoring agent for this flow.
  - Open Codex with a request-drafting scaffold that preserves agent context.
  - Keep existing direct request-file creation flows unchanged.
- Out:
  - Auto-generating the final markdown request file in the same interaction.
  - Reworking all create-item actions in the UI.
  - General redesign of the Tools menu beyond this guided entrypoint.

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|add-tools-new-request-action-for-codex-p|req-020-add-tools-new-request-action-for|the-extension-supports-agent-selection-a|ac1-the-tools-menu-exposes-new
flowchart LR
    Request[req_020_add_tools_new_request_action_for_c] --> Problem[The extension supports agent selection and]
    Problem --> Scope[Add Tools New Request action for]
    Scope --> Acceptance[AC1: The Tools menu exposes New]
    Acceptance --> Tasks[task_020_orchestration_delivery_for_req_01]
```

# Acceptance criteria
- AC1: The `Tools` menu exposes `New Request` under `Select Agent`.
- AC2: Triggering this action activates the expected request-authoring agent and bootstraps Codex with a drafting prompt.
- AC3: The prompt is not auto-sent and leaves a clear place for the user to describe the need.
- AC4: Existing direct create flows (`Logics: New Request`, column create menu) remain unchanged.
- AC5: The UX wording is explicit enough to distinguish guided drafting from immediate file creation.
- AC6: Fallback behavior is clear when Codex prompt injection is unavailable.

# AC Traceability
- AC1 -> [src/extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts), [debug/webview/index.html](/Users/alexandreagostini/Documents/cdx-logics-vscode/debug/webview/index.html), and [media/main.js](/Users/alexandreagostini/Documents/cdx-logics-vscode/media/main.js). Proof: `Tools > New Request` added and wired in host + harness markup.
- AC2 -> [src/extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts). Proof: guided flow resolves `$logics-flow-manager`, activates it, and boots a dedicated request prompt.
- AC3 -> [src/workflowSupport.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/workflowSupport.ts). Proof: explicit guided request prompt scaffold and no-auto-send Codex injection path.
- AC4 -> [src/extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts) and [tests/webview.harness-a11y.test.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/tests/webview.harness-a11y.test.ts). Proof: existing `createRequest` flow kept, new action tested separately.
- AC5 -> [README.md](/Users/alexandreagostini/Documents/cdx-logics-vscode/README.md). Proof: Tools menu and feature docs now distinguish guided request drafting from direct file creation.
- AC6 -> [src/extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts). Proof: clipboard fallback and user-facing warning preserved in generic prompt injection helper.
- AC7 -> [src/extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts) and [README.md](/Users/alexandreagostini/Documents/cdx-logics-vscode/README.md). Proof: fallback messaging explicitly explains the guided drafting path when direct Codex injection is unavailable.

# Links
- Request: `logics/request/req_020_add_tools_new_request_action_for_codex_prompt_bootstrap.md`
- Primary task(s): `logics/tasks/task_020_orchestration_delivery_for_req_019_req_020_and_req_021.md`

# Priority
- Impact:
  - Medium-High: removes friction from one of the most common AI-assisted flows in the extension.
- Urgency:
  - Medium-High: worthwhile now that agent selection and prompt injection are already in place.

# Notes
- Derived from `logics/request/req_020_add_tools_new_request_action_for_codex_prompt_bootstrap.md`.
- Implemented in [src/extension.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/extension.ts), [src/workflowSupport.ts](/Users/alexandreagostini/Documents/cdx-logics-vscode/src/workflowSupport.ts), and [media/main.js](/Users/alexandreagostini/Documents/cdx-logics-vscode/media/main.js).

# Tasks
- `logics/tasks/task_020_orchestration_delivery_for_req_019_req_020_and_req_021.md`
