## task_019_orchestration_delivery_for_req_018_agent_selection_from_openai_yaml - Orchestration delivery for req_018 agent selection from openai.yaml
> From version: 1.6.1
> Status: Draft
> Understanding: 100%
> Confidence: 97%
> Progress: 0%
> Complexity: Medium
> Theme: Agent orchestration execution
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from:
- `logics/backlog/item_018_support_vscode_agent_selection_from_skills_openai_yaml.md`

Goal:
- deliver agent discovery + selection UX wired to Codex chat prefill, while preserving explicit `$logics-...` override semantics and adding robust YAML validation/refresh workflows.

# Plan
- [ ] 1. Add agent registry indexing for `logics/skills/*/agents/openai.yaml`.
- [ ] 2. Implement YAML schema/type validation + duplicate computed-ID detection.
- [ ] 3. Add `Logics: Select Agent` command with Quick Pick (`display_name`, `short_description`, `detail` as `$logics-...`).
- [ ] 4. Implement active-agent state handling and persistence.
- [ ] 5. Integrate Codex chat prefill (`default_prompt`) with non-destructive merge behavior.
- [ ] 6. Implement explicit invocation guard/override rules for `$logics-...`.
- [ ] 7. Add `Logics: Refresh Agents` command and output-channel reporting.
- [ ] 8. Add/adjust tests for registry parsing, validation, and command behavior.
- [ ] 9. Run compile/test/logics lint validations.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Step 1.
- AC2/AC3 -> Step 3.
- AC4 -> Step 4.
- AC5/AC6 -> Step 5.
- AC7 -> Step 6.
- AC8 -> Step 2.
- AC9/AC10 -> Step 7.
- Regression safety -> Step 8.

# Validation
- `npm run compile`
- `npm run test`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered.
- [ ] Validation commands executed and results captured.
- [ ] Linked request/backlog/task docs updated.
- [ ] Status is `Done` and progress is `100%`.

# Report
- Pending implementation.
