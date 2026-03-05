## req_012_web_debug_harness_simulate_vs_code_controls_with_browser_native_behavior - Web debug harness: simulate VS Code controls with browser-native behavior
> From version: 1.2.0
> Status: Done
> Understanding: 100%
> Confidence: 98%
> Complexity: Medium
> Theme: Debug Harness UX Parity
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- In web debug/server mode, most toolbar/details controls should be usable without VS Code runtime.
- Replace VS Code-dependent interactions with browser-native equivalents when possible.
- Keep debug ergonomics high so UI behavior can be validated end-to-end from browser only.

# Context
The current harness mocks `acquireVsCodeApi`, but many actions are effectively no-ops because they rely on extension-host handlers.

Observed pain points in debug mode:
- `Change Project Root` currently cannot perform a meaningful file selection workflow.
- `Open` / `Edit` actions do not open target files in a useful browser context.

Desired direction:
- detect harness/web mode and route actions to browser-native fallbacks;
- preserve current VS Code behavior when running inside real webview host.

Examples:
- `Change Project Root` fallback:
  - use browser file system capabilities (File System Access API where available) or explicit local path input fallback.
- `Open` / `Edit` fallback:
  - open target markdown/file path in a new browser tab with readable content/rendering.

# Acceptance criteria
- AC1: In harness mode, control actions no longer fail silently due to missing VS Code host handlers.
- AC2: `Change Project Root` has a browser fallback flow (filesystem picker and/or explicit path prompt fallback).
- AC3: `Open` and `Edit` in harness mode open the targeted file in a new tab (raw or rendered view).
- AC4: Behavior is context-aware:
  - real VS Code webview keeps current message-based behavior,
  - harness mode uses browser-native fallbacks.
- AC5: Unsupported browser capabilities surface clear user-facing guidance instead of no-op behavior.

# Scope
- In:
  - Harness mode detection and action routing.
  - Browser-native fallbacks for root selection and file open/edit.
  - Minimal debug UI feedback for action outcomes/errors.
- Out:
  - Full replacement of VS Code extension host logic.
  - Persistence/repository mutation features beyond debug workflows.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Backlog
- `logics/backlog/item_012_web_debug_harness_simulate_vs_code_controls_with_browser_native_behavior.md`
