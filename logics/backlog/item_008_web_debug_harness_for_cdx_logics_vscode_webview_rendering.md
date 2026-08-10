## item_008_web_debug_harness_for_cdx_logics_vscode_webview_rendering - Web Debug Harness for cdx-logics-vscode Webview Rendering
> From version: 1.9.1
> Status: Done
> Schema version: 1.0
> Understanding: 97% (audit-aligned)
> Confidence: 93% (validated)
> Progress: 100% (audit-aligned)
> Complexity: Medium
> Theme: Front-End Debugging Workflow
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.
> Indicators reviewed: 2026-08-10 09:06:10

# Problem
UI debugging for the webview currently requires launching the VS Code extension host. This slows iteration and makes it harder to isolate rendering/state issues that could be reproduced in a browser with a mocked VS Code bridge.

# Scope
- In:
  - Add a local web debug harness that loads `media/main.js` and `media/main.css`.
  - Provide a mock `acquireVsCodeApi` (`getState`, `setState`, `postMessage`).
  - Support scenario-driven payload injection for `type: data` webview messages.
  - Document what is simulated vs what still requires VS Code runtime.
- Out:
  - Full emulation of native VS Code features (open editor, quick pick, markdown preview).
  - Packaging/release pipeline changes unrelated to debugging.

# Acceptance criteria
- A browser-accessible debug entrypoint renders the current webview UI assets.
- The bridge mock supports all API methods used by `main.js`.
- At least three scenarios are available: empty, error, populated.
- Scenario payload injection reproduces board/details behavior deterministically.
- Documentation explains setup, commands, and known limitations vs real extension host.

# AC Traceability
- AC1 -> Debug shell files and run command added to project scripts/docs. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC2 -> Mock bridge implementation exercised by `main.js` without runtime errors. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC3 -> Scenario fixtures and usage notes available for local UI checks. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC4 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.
- AC5 -> Scope mapping not recorded. Proof: not recorded; this slice closed before the closeout proof requirement landed in the 2.19 line.

# Priority
- Impact:
  - Medium-High: faster UI feedback loop and lower debugging friction.
- Urgency:
  - Medium: can be delivered after reference-contract alignment starts.

# Notes
- Derived from `logics/request/req_008_web_debug_harness_for_cdx_logics_vscode_webview_rendering.md`.
- Suggested validation:
  - `npm run compile`
  - Manual: run debug harness and verify empty/error/populated scenarios.

# Tasks
- `logics/tasks/task_011_orchestration_delivery_for_req_007_and_req_008.md`
