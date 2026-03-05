## item_018_support_vscode_agent_selection_from_skills_openai_yaml - Support VS Code agent selection from skills openai.yaml
> From version: 1.6.1
> Status: Done
> Understanding: 100%
> Confidence: 99%
> Progress: 100%
> Complexity: Medium
> Theme: Agent discovery and Codex chat integration
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
Agent metadata exists in `logics/skills/*/agents/openai.yaml`, but the extension does not expose a native selection UX and does not route selected context into the Codex chat input. This forces manual `$logics-...` entry and creates inconsistency when agent definitions evolve.

# Scope
- In:
  - Scan `logics/skills/*/agents/openai.yaml` and build an in-memory agent registry.
  - Derive invocation IDs from folder names (`logics-foo` -> `$logics-foo`).
  - Add `Logics: Select Agent` Quick Pick using `display_name` + `short_description` (+ detail with invocation ID).
  - Prefill Codex chat input with selected `default_prompt` without auto-send.
  - Preserve explicit invocation override (`$logics-...`) on a per-message basis.
  - Add schema validation and duplicate ID detection with error reporting.
  - Add `Logics: Refresh Agents` command to rescan without restart.
- Out:
  - Refactor/redesign of current orchestrator webview board UI.
  - Support for non-OpenAI manifest formats.
  - Any auto-submit behavior after prompt injection.

# Acceptance criteria
- AC1: Agent files are discovered from `logics/skills/*/agents/openai.yaml`.
- AC2: Quick Pick lists `display_name` as label and `short_description` as description.
- AC3: Quick Pick detail exposes computed `$logics-...` invocation ID.
- AC4: Selected agent is persisted as active context for chat routing.
- AC5: Prefill into Codex chat input is non-destructive:
  - empty input -> inject `default_prompt`;
  - non-empty input -> `default_prompt`, blank line, then existing text.
- AC6: If input already contains `$logics-...`, selection does not override user intent for that message.
- AC7: Explicit `$logics-...` in a message overrides active selected agent for that message only.
- AC8: Validation catches missing required fields, wrong types, and duplicate computed IDs.
- AC9: `Logics: Refresh Agents` reloads registry and updates selection candidates without extension restart.
- AC10: Validation outputs are available in Output Channel plus summary notification.

# AC Traceability
- AC1/AC8/AC9/AC10 -> Agent registry loader, validator, and refresh command. Proof: TODO.
- AC2/AC3 -> Quick Pick item mapping and rendering. Proof: TODO.
- AC4 -> Active-agent state persistence/update logic. Proof: TODO.
- AC5/AC6 -> Codex chat prefill merge rules and guard clauses. Proof: TODO.
- AC7 -> Per-message routing/override resolution. Proof: TODO.

# Priority
- Impact:
  - High: removes repetitive manual invocation, improves consistency of agent usage in everyday workflows.
- Urgency:
  - Medium-High: needed to align extension behavior with current skill-agent source of truth.

# Notes
- Derived from `logics/request/req_018_support_vscode_agent_selection_from_skills_openai_yaml.md`.

# Tasks
- `logics/tasks/task_019_orchestration_delivery_for_req_018_agent_selection_from_openai_yaml.md`
