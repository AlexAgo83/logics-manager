## task_086_label_platform_specific_helpers_and_shell_specific_command_variants_explicitly - Label platform-specific helpers and shell-specific command variants explicitly
> From version: 1.10.7 (refreshed)
> Status: Done
> Understanding: 96%
> Confidence: 93%
> Progress: 100%
> Complexity: Medium
> Theme: Documentation quality, operator ergonomics, and platform clarity
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from `logics/backlog/item_081_label_platform_specific_helpers_and_shell_specific_command_variants_explicitly.md`.
- Derived from backlog item `item_081_label_platform_specific_helpers_and_shell_specific_command_variants_explicitly`.
- Source file: `logics/backlog/item_081_label_platform_specific_helpers_and_shell_specific_command_variants_explicitly.md`.
- Related request(s): `req_062_harden_windows_compatibility_across_the_vs_code_plugin_and_logics_kit`, `req_063_clarify_windows_operator_guidance_and_platform_specific_helper_boundaries_in_the_logics_docs`.
- Delivery goal:
  - label intentionally OS-bound helpers clearly so they are not mistaken for generic workflow entrypoints;
  - split shell-specific command variants when one quoting form is not realistically portable across Windows and POSIX shells.

```mermaid
%% logics-kind: task
%% logics-signature: task|label-platform-specific-helpers-and-shel|item-081-label-platform-specific-helpers|1-confirm-scope-dependencies-and-linked|run-the-relevant-automated-tests-for
flowchart LR
    Backlog[item_081_label_platform_specific_helpers_a] --> Step1[1. Confirm scope dependencies and linked]
    Step1 --> Step2[2. Audit helper scripts and command]
    Step2 --> Step3[3. Split ambiguous examples into Windows]
    Step3 --> Validation[Run the relevant automated tests for]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Confirm scope, dependencies, and linked acceptance criteria.
- [x] 2. Audit helper scripts and command snippets that are intentionally shell-specific or OS-bound, then label them explicitly instead of implying generic support.
- [x] 3. Split ambiguous examples into Windows, PowerShell, `cmd`, or POSIX variants when one quoting form is not realistically portable.
- [x] 4. Validate the result and update the linked Logics docs.
- [ ] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Scope: The request explicitly covers documentation and examples for both:. Proof: covered by linked task completion.
- AC2 -> Scope: the main VS Code plugin repository;. Proof: covered by linked task completion.
- AC3 -> Scope: the imported or bundled Logics kit documentation surface.. Proof: covered by linked task completion.
- AC2 -> Scope: Installation and operator guidance for Windows users is explicit where the current wording is macOS/Linux-centric or ambiguous.. Proof: covered by linked task completion.
- AC3 -> Scope: General-purpose command examples that are meant to be copy-pasteable by users or maintainers are rewritten to avoid avoidable POSIX-only syntax, or are paired with a Windows-compatible variant.. Proof: covered by linked task completion.
- AC4 -> Scope: Maintainer and release guidance no longer presents Unix-only temp paths or shell idioms as the default generic workflow when a cross-platform alternative is expected.. Proof: covered by linked task completion.
- AC4B -> Scope: Documentation cleanup explicitly covers Windows friction points that are easy to miss in code review, including:. Proof: covered by linked task completion.
- AC5 -> Scope: shell quoting differences for `code` CLI or MCP-related commands;. Proof: covered by linked task completion.
- AC6 -> Scope: `CRLF` versus `LF` expectations where contributors edit repo-managed text files on Windows;. Proof: covered by linked task completion.
- AC7 -> Scope: submodule installation guidance that should prefer the least-friction Windows-compatible operator path when no SSH-specific requirement exists.. Proof: covered by linked task completion.
- AC5 -> Scope: Platform-specific helper scripts remain allowed, but their documentation clearly labels them as platform-scoped instead of implying that they are general workflow entrypoints.. Proof: covered by linked task completion.
- AC6 -> Scope: The resulting docs distinguish clearly between:. Proof: covered by linked task completion.
- AC8 -> Scope: supported cross-platform workflows;. Proof: covered by linked task completion.
- AC9 -> Scope: supported Windows alternatives;. Proof: covered by linked task completion.
- AC10 -> Scope: and intentionally OS-specific helpers.. Proof: covered by linked task completion.
- AC7 -> Scope: The documentation cleanup remains aligned with the actual code and script behavior rather than promising unsupported execution paths.. Proof: covered by linked task completion.
- AC8 -> Scope: The request is specific enough that a future backlog item can split the work into:. Proof: covered by linked task completion.
- AC11 -> Scope: plugin install and usage docs;. Proof: covered by linked task completion.
- AC12 -> Scope: kit README and `SKILL.md` example cleanup;. Proof: covered by linked task completion.
- AC13 -> Scope: contributor and release guidance cleanup;. Proof: covered by linked task completion.
- AC14 -> Scope: helper labeling and platform notes.. Proof: covered by linked task completion.
- AC9 -> Scope: The highest-traffic Windows friction points are addressed explicitly, including:. Proof: covered by linked task completion.
- AC15 -> Scope: `code` CLI expectations for plugin install and dev workflows;. Proof: covered by linked task completion.
- AC16 -> Scope: POSIX-only shell examples such as `mkdir -p` and trailing `\` continuations;. Proof: covered by linked task completion.
- AC17 -> Scope: Unix temp-path examples such as `/tmp` in maintainer flows.. Proof: covered by linked task completion.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Backlog item: `item_081_label_platform_specific_helpers_and_shell_specific_command_variants_explicitly`
- Request(s): `req_062_harden_windows_compatibility_across_the_vs_code_plugin_and_logics_kit`, `req_063_clarify_windows_operator_guidance_and_platform_specific_helper_boundaries_in_the_logics_docs`

# References
- `README.md`
- `logics/skills/README.md`
- `logics/skills/logics-ollama-specialist/scripts/ollama_check.sh`
- `logics/skills/logics-ollama-specialist/scripts/ollama_install_macos.sh`

# Validation
- Run the relevant automated tests for the changed surface.
- Run the relevant lint or quality checks.
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.

# Report
- Split the VS Code MCP registration snippets into shell-aware variants in:
- [`logics/skills/logics-mcp-terminal/references/clients.md`](logics/skills/logics-mcp-terminal/references/clients.md)
- [`logics/skills/logics-mcp-chrome-devtools/references/clients.md`](logics/skills/logics-mcp-chrome-devtools/references/clients.md)
- Each reference now distinguishes POSIX shells, PowerShell, and `cmd.exe`, and recommends using the VS Code MCP UI/settings when CLI quoting is uncertain.
- Labeled the Ollama specialist surface explicitly in [`logics/skills/logics-ollama-specialist/SKILL.md`](logics/skills/logics-ollama-specialist/SKILL.md) so macOS-only and POSIX-shell helpers are not mistaken for generic Windows entrypoints.
- Validation run:
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`

# Notes
