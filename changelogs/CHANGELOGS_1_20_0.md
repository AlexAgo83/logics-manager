# Changelog (`1.19.1 -> 1.20.0`)

## Major Highlights

- New three-step onboarding webview (Need, Framing, Execution) that appears on first run or after a relevant update and can be reopened via the Getting Started button.
- Check Environment now surfaces migration gaps: missing kit version floor, missing mutations/index blocks, untracked hybrid runtime artifacts, missing `.env.local`, missing Claude bridge files, absent `.cache` directory, and hybrid provider remediation for API keys detected in `.env` files.

## Three-step onboarding webview

- Added `src/logicsOnboardingModel.ts` defining the Need, Framing, and Execution stage model with operator-facing labels, taglines, descriptions, workflow mappings, and highlighted actions.
- Added `src/logicsOnboardingHtml.ts` building the onboarding panel HTML with VS Code CSS variables and nonce-based CSP.
- Onboarding panel is shown automatically on first plugin use or when the installed version advances past the last-seen version (tracked in `globalState`).
- Added Getting Started button in the Workflow tab of the Tools panel (`media/toolsPanelLayout.js`, `src/logicsWebviewHtml.ts`).
- Registered `logics.openOnboarding` command for palette access.
- Added `open-onboarding` and `tool-action` message types to the webview message union.

## Check Environment migration checks

- **Kit version floor**: warns when the local kit version is below the minimum required for the current plugin version.
- **Missing mutations/index blocks**: detects absent `mutations:` or `codex_index:` blocks in `logics.yaml` and offers to add them.
- **Tracked hybrid runtime artifacts**: detects `hybrid_assist_audit.jsonl` / `hybrid_assist_measurements.jsonl` tracked by git and offers to add them to `.gitignore`.
- **Missing `.env.local`**: warns when hybrid providers are configured but no `.env.local` credential file exists.
- **Missing Claude bridge files**: surfaces an actionable repair item when `.claude/` scaffolding is absent.
- **Absent `.cache` dir**: silently creates `logics/.cache` when it is missing so downstream kit commands do not fail.

## Provider remediation

- When API keys for `openai` or `gemini` are found in `.env` / `.env.local` but those providers are not enabled in `logics.yaml`, Check Environment and the hybrid runtime checker offer a one-click fix to enable them.

## Validation

- `npm run compile`
- `npm run test`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py --require-status`
- `python3 logics/skills/logics.py audit --refs req_119_three_step_onboarding_for_need_framing_and_execution`
