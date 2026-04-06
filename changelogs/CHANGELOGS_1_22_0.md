# Changelog (`1.21.1 -> 1.22.0`)

## Major Highlights

- The plugin now converges cleanly on empty repositories: bootstrap can initialize Git, install the canonical Logics kit submodule, avoid stale global-publish races, and offer a direct commit action once setup completes.
- Onboarding and tools-panel actions were rewired so first-use guidance, `Getting Started`, `New Request`, `Triage Item`, `Companion Doc`, and agent selection all trigger the intended workflow again.
- Claude and Codex global-kit publication now share a common lifecycle, stale warning-state overlays are republished automatically, and the bundled kit is updated to `v1.10.0`.
- Mermaid hybrid generation now routes through the dedicated kit skill end to end, with the plugin and runtime correctly selecting remote backends and surfacing stable telemetry.
- CI is now stable again after making the hybrid-insights HTML snapshot deterministic across runner timezones.

## Bootstrap and First-Run Recovery

- Restored empty-project bootstrap convergence when the selected folder is not yet a Git repository.
- Bootstrap now proposes Git initialization before submodule operations instead of surfacing raw `git` errors.
- Added a direct `Commit Bootstrap Changes` action when the bootstrap diff is safely isolable.
- Avoided follow-up global-kit publication attempts while the repo-local kit is still in a transient bootstrap state.
- Tightened onboarding so the first project use reopens `Getting Started` even when the repo is not fully initialized yet.

## Tools Panel and Onboarding Fixes

- Reconnected the `Getting Started` action from the tools menu to the onboarding panel.
- Routed onboarding panel tool actions back through the shared webview host bridge.
- Corrected tool wiring for `New Request`, `Triage Item`, and `Companion Doc`.
- Adjusted `Select Agent` so it copies the chosen prompt and informs the operator instead of suggesting a meaningless terminal launch.

## Runtime and Kit Lifecycle

- Fixed Codex global-kit publication so stale warning-state overlays from another repository are republished from the current repo.
- Refactored Codex and Claude publication through a shared lifecycle abstraction to keep readiness, repair, and publication logic aligned.
- Updated the bundled `logics/skills` submodule to the released kit version `v1.10.0`, including hybrid assist authoring flows, explicit remote `next-step` dispatch, Mermaid skill wiring, and release-prep improvements.

## Hybrid Mermaid and Provider Reliability

- Fixed Mermaid generation so OpenAI and Gemini selection comes from the real repo config instead of being accidentally treated as disabled.
- Mermaid-generation telemetry now reports the backend that actually produced the final block after fallback.
- The bundled kit now canonicalizes provider Mermaid output and refreshes signatures through the dedicated Mermaid skill path.

## Test and CI Stability

- Refreshed the new-request tools snapshot after the tool wiring fixes.
- Stabilized the hybrid-insights HTML snapshot by pinning its formatted timestamp timezone inside the test harness so GitHub Actions no longer fails on UTC-localtime drift.

## Validation

- `npm run lint`
- `npm run test`
- `npm run test:smoke`
- `npm run lint:logics`
- `npm run package:ci`
- `npm run release:changelog:validate`
