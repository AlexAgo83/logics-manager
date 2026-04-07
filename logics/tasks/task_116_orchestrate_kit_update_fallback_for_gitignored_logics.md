## task_116_orchestrate_kit_update_fallback_for_gitignored_logics - Orchestrate kit update fallback for gitignored logics
> From version: 1.22.1
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: General
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- This task orchestrates the three backlog items derived from request req_133: detect dangerous gitignore patterns (item_254), implement fallback kit install (item_255), and add adaptive update strategy (item_256).
- The delivery order is sequential: detection first, then fallback install, then adaptive updates. Each wave should leave the repo commit-ready.
- The current kit update in `src/logicsCodexWorkflowController.ts` only supports `git submodule update`. This task adds two parallel code paths (direct clone and global kit copy) and a routing layer to choose the right strategy.

```mermaid
%% logics-kind: task
%% logics-signature: task|orchestrate-kit-update-fallback-for-giti|item-254-detect-dangerous-gitignore-patt|wave-1-detect-dangerous-gitignore|npm-run-compile
flowchart TD
    Start[Start: confirm scope and deps] --> W1[Wave 1: gitignore pattern detection]
    W1 --> W1V[Validate: lint + tests + check environment]
    W1V --> W1C[Commit checkpoint]
    W1C --> W2[Wave 2: fallback install cascade]
    W2 --> W2V[Validate: lint + tests + fallback scenarios]
    W2V --> W2C[Commit checkpoint]
    W2C --> W3[Wave 3: adaptive update routing]
    W3 --> W3V[Validate: lint + tests + update scenarios]
    W3V --> W3C[Commit checkpoint]
    W3C --> Final[Update logics docs and close]
```

# Plan

## Wave 1 - Detect dangerous gitignore patterns (item_254)
- [ ] 1. Add `detectDangerousGitignorePatterns(root)` in `src/logicsProviderUtils.ts` that scans `.gitignore` for broad patterns (`logics/`, `logics/*`, `logics/**`) covering `logics/skills`.
- [ ] 2. Surface the warning in Check Environment (`src/logicsViewProvider.ts`) as a non-blocking informational item explaining the trade-off and that a fallback exists.
- [ ] 3. Add unit tests for pattern detection (positive and negative cases).
- [ ] 4. CHECKPOINT: compile, lint, test. Commit wave 1.

## Wave 2 - Fallback kit install cascade (item_255)
- [ ] 5. Add a `fallbackInstallKit(root)` method in `src/logicsCodexWorkflowController.ts` that tries: (a) copy from global kit (`~/.codex/skills/` or `~/.claude/`, using existing inspection), then (b) `git clone` from the canonical URL into `logics/skills/`.
- [ ] 6. Wire the fallback into `updateLogicsKit`: when submodule update fails or is not functional and a dangerous gitignore pattern is detected, prompt user for confirmation and run the fallback.
- [ ] 7. Call `reconcileRepoBootstrapAfterKitUpdate` after successful fallback install.
- [ ] 8. Add tests: fallback with global kit present, fallback with clone, existing submodule path unchanged.
- [ ] 9. CHECKPOINT: compile, lint, test. Commit wave 2.

## Wave 3 - Adaptive update strategy (item_256)
- [ ] 10. Add `detectKitInstallType(root)` in `src/logicsProviderUtils.ts` returning `"submodule" | "standalone-clone" | "plain-copy"` based on the state of `logics/skills`.
- [ ] 11. Update `updateLogicsKit` to route: submodule -> `git submodule update`, standalone-clone -> `git -C logics/skills pull`, plain-copy -> re-copy from global kit or fresh clone.
- [ ] 12. Guard against submodule operations on a standalone clone if the user later un-ignores `logics/`.
- [ ] 13. Add tests for each routing path and the un-ignore guard.
- [ ] 14. CHECKPOINT: compile, lint, test. Commit wave 3.

## Final
- [ ] 15. Update item_254, item_255, item_256 progress and status.
- [ ] 16. Run full validation: `npm run compile && npm run test && python3 logics/skills/logics.py lint --require-status && python3 logics/skills/logics.py audit --legacy-cutoff-version 1.1.0 --group-by-doc`.

# Delivery checkpoints
- Each completed wave should leave the repository in a coherent, commit-ready state.
- Update the linked Logics docs during the wave that changes the behavior, not only at final closure.
- Prefer a reviewed commit checkpoint at the end of each meaningful wave instead of accumulating several undocumented partial states.
- If the shared AI runtime is active and healthy, use `python logics/skills/logics.py flow assist commit-all` to prepare the commit checkpoint for each meaningful step, item, or wave.
- Do not mark a wave or step complete until the relevant automated tests and quality checks have been run successfully.

# AC Traceability
- Wave 1 -> item_254 AC1-AC3: detect patterns, surface warning, non-blocking.
- Wave 2 -> item_255 AC1-AC5: fallback offered, global kit first, clone second, convergence runs, submodule unchanged.
- Wave 3 -> item_256 AC1-AC5: detect install type, git pull for standalone, re-copy for plain, submodule unchanged, un-ignore guard.

# Decision framing
- Product framing: Not needed
- Architecture framing: Required (new install/update code paths in the workflow controller)
- Architecture signals: state and sync, install-type detection, fallback cascade
- Architecture follow-up: Keep fallback path cleanly separated from submodule path to avoid coupling. Detection function should be reusable.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Backlog item: `item_254_detect_dangerous_gitignore_patterns_covering_logics_skills_and_warn_the_user`
- Backlog item: `item_255_fallback_kit_install_via_global_kit_copy_or_direct_clone_when_submodule_is_unavailable`
- Backlog item: `item_256_adaptive_kit_update_strategy_for_standalone_clone_vs_submodule_installs`
- Request(s): `req_133_add_kit_update_fallback_when_logics_is_gitignored`

# References
- `src/logicsCodexWorkflowController.ts` (updateLogicsKit, reconcileRepoBootstrapAfterKitUpdate)
- `src/logicsProviderUtils.ts` (inspectLogicsKitSubmodule, getMissingBootstrapGitignoreEntries)
- `src/logicsViewProvider.ts` (checkEnvironment flow)
- `src/logicsClaudeGlobalKit.ts` (inspectClaudeGlobalKit)
- `src/logicsCodexWorkspace.ts` (inspectCodexWorkspaceOverlay)
- `src/logicsEnvironment.ts` (inspectLogicsEnvironment)

# AI Context
- Summary: Orchestration task for 3-wave delivery of kit update fallback when logics/ is gitignored: detection, fallback install, adaptive updates
- Keywords: orchestration, kit, update, fallback, gitignore, submodule, detection, clone, global-kit, adaptive, waves
- Use when: Use when executing the implementation of the kit update fallback feature across item_254, item_255, item_256.
- Skip when: Skip when the work belongs to another feature or request.

# Validation
- `npm run compile`
- `npm run test`
- `python3 logics/skills/logics.py lint --require-status`
- `python3 logics/skills/logics.py audit --legacy-cutoff-version 1.1.0 --group-by-doc`

# Definition of Done (DoD)
- [ ] Scope implemented and acceptance criteria covered for all 3 backlog items.
- [ ] Validation commands executed and results captured for each wave.
- [ ] No wave or step was closed before the relevant automated tests and quality checks passed.
- [ ] Linked request/backlog/task docs updated during completed waves and at closure.
- [ ] Each completed wave left a commit-ready checkpoint or an explicit exception is documented.
- [ ] Status is `Done` and progress is `100%`.

# Report
