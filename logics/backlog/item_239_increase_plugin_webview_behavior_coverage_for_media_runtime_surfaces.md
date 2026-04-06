## item_239_increase_plugin_webview_behavior_coverage_for_media_runtime_surfaces - Increase plugin webview behavior coverage for media runtime surfaces
> From version: 1.22.0
> Schema version: 1.0
> Status: Done
> Understanding: 98%
> Confidence: 95%
> Progress: 100%
> Complexity: High
> Theme: Testing, coverage, plugin webview, and Logics kit reliability
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
- Raise plugin coverage in a way that validates real user-facing behavior, not only static HTML output and packaging presence.
- Raise Logics kit coverage around the highest-risk delivery paths so workflow mutations, hybrid dispatch, and CLI actions are less likely to regress silently.
- Separate useful coverage from misleading coverage so CI can ratchet quality by surface instead of hiding major gaps behind one blended percentage.
- Create a request broad enough to drive several bounded backlog slices without collapsing plugin and kit coverage work into one oversized implementation item.
- - The plugin coverage report currently includes both `src/**/*.ts` and `media/**/*.js` in `vitest.config.mts`, but most of the `media` webview runtime remains effectively untested by coverage:
- - `media/main.js`

# Scope
- In: one coherent delivery slice from the source request.
- Out: unrelated sibling slices that should stay in separate backlog items instead of widening this doc.

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|increase-plugin-webview-behavior-coverag|req-129-greatly-improve-plugin-and-kit-c|raise-plugin-coverage-in-a-way|ac1-the-request-clearly-separates-plugin
flowchart LR
    A[Start] --> B[Separate plugin and kit coverage]
    B --> C[Focus plugin on behavior tests]
    C --> D[Add plugin coverage governance]
    D --> E[Focus kit on high-risk paths]
    E --> F[Make low-covered kit modules testable]
    F --> G[Define coverage quality metrics]
    G --> H[Add lifecycle and integration tests]
```

# Acceptance criteria
- AC1: The request clearly separates plugin coverage and Logics kit coverage as two related but distinct workstreams, with explicit scope for each so backlog grooming can split them into bounded delivery slices.
- AC2: Plugin coverage work is framed around behavior-focused validation of the webview runtime, not just HTML snapshots or package smoke checks. The request explicitly targets critical browser-side flows such as initial render and hydration, board and detail rendering, filtering and selection behavior, layout state, and persistence and restore behavior across the `media/*.js` runtime.
- AC3: Plugin coverage governance is part of scope. The request requires coverage reporting and CI strategy that make plugin core coverage and plugin webview coverage separately visible and ratchetable, so improvement is measurable without masking major gaps in either surface.
- AC4: Logics kit coverage work is framed around scenario-driven tests for the highest-risk workflow paths, especially the flow manager CLI, workflow mutations, hybrid provider transport, dispatcher validation, and release-oriented guarded actions. The request explicitly avoids treating low-risk utility files as the main coverage target.
- AC5: The request requires a strategy to make the lowest-covered kit modules more testable, including extraction or isolation of pure decision logic where current command handlers are too monolithic to validate efficiently. The goal is not refactoring for its own sake; the goal is to unlock durable coverage on business-critical paths.
- AC6: The request defines coverage quality as both metric improvement and regression resistance. Success is not only a higher percentage, but also new tests that would fail on realistic regressions in plugin webview behavior or kit workflow logic.
- AC7: The request includes CI and validation expectations for both ecosystems:
- plugin validation should continue to use the Node and VS Code extension checks already present in the repository;
- kit validation should continue to use the Python coverage and CLI smoke flows already present in the repository;
- any new thresholds or ratchets must be introduced in a way that is incremental and maintainable rather than brittle.
- AC8: The request includes an opt-in strategy for live API integration tests against configured hybrid providers. These tests must run only when provider configuration is present locally and an explicit enable flag is set, must skip cleanly otherwise, and must validate stable contract behavior such as reachability, authentication, model availability, structured response shape, and degraded fallback handling rather than brittle exact model text.
- AC9: The request includes plugin lifecycle integration tests for packaged VSIX installs in a demo or sandbox workspace. These tests must cover at least fresh install and upgrade behavior for the plugin in a realistic local VS Code environment, must verify stable outcomes such as successful installation, activation, basic command or webview availability, and safe update behavior, and must remain opt-in or separately gated until their runtime cost and platform stability are well understood.
- AC10: The request includes Logics kit lifecycle integration tests in sandbox repositories. These tests must cover at least fresh install, idempotent re-run, repair or doctor-assisted convergence, schema or metadata migration where applicable, and update behavior for the canonical kit integration path. They must verify repository convergence and stable operator-facing outcomes rather than only command exit codes.

# AC Traceability
- AC1 -> Scope: The request clearly separates plugin coverage and Logics kit coverage as two related but distinct workstreams, with explicit scope for each so backlog grooming can split them into bounded delivery slices.. Proof: capture validation evidence in this doc.
- AC2 -> Scope: Plugin coverage work is framed around behavior-focused validation of the webview runtime, not just HTML snapshots or package smoke checks. The request explicitly targets critical browser-side flows such as initial render and hydration, board and detail rendering, filtering and selection behavior, layout state, and persistence and restore behavior across the `media/*.js` runtime.. Proof: 72 new behavior tests in 5 files covering hydration, board rendering, chrome/toolbar, selectors, and persistence. Total test count: 307 (was 235).
- AC3 -> Scope: Plugin coverage governance is part of scope. The request requires coverage reporting and CI strategy that make plugin core coverage and plugin webview coverage separately visible and ratchetable, so improvement is measurable without masking major gaps in either surface.. Proof: capture validation evidence in this doc.
- AC4 -> Scope: Logics kit coverage work is framed around scenario-driven tests for the highest-risk workflow paths, especially the flow manager CLI, workflow mutations, hybrid provider transport, dispatcher validation, and release-oriented guarded actions. The request explicitly avoids treating low-risk utility files as the main coverage target.. Proof: capture validation evidence in this doc.
- AC5 -> Scope: The request requires a strategy to make the lowest-covered kit modules more testable, including extraction or isolation of pure decision logic where current command handlers are too monolithic to validate efficiently. The goal is not refactoring for its own sake; the goal is to unlock durable coverage on business-critical paths.. Proof: capture validation evidence in this doc.
- AC6 -> Scope: The request defines coverage quality as both metric improvement and regression resistance. Success is not only a higher percentage, but also new tests that would fail on realistic regressions in plugin webview behavior or kit workflow logic.. Proof: capture validation evidence in this doc.
- AC7 -> Scope: The request includes CI and validation expectations for both ecosystems:. Proof: capture validation evidence in this doc.
- AC8 -> Scope: plugin validation should continue to use the Node and VS Code extension checks already present in the repository;. Proof: capture validation evidence in this doc.
- AC9 -> Scope: kit validation should continue to use the Python coverage and CLI smoke flows already present in the repository;. Proof: capture validation evidence in this doc.
- AC10 -> Scope: any new thresholds or ratchets must be introduced in a way that is incremental and maintainable rather than brittle.. Proof: capture validation evidence in this doc.
- AC8 -> Scope: The request includes an opt-in strategy for live API integration tests against configured hybrid providers. These tests must run only when provider configuration is present locally and an explicit enable flag is set, must skip cleanly otherwise, and must validate stable contract behavior such as reachability, authentication, model availability, structured response shape, and degraded fallback handling rather than brittle exact model text.. Proof: capture validation evidence in this doc.
- AC9 -> Scope: The request includes plugin lifecycle integration tests for packaged VSIX installs in a demo or sandbox workspace. These tests must cover at least fresh install and upgrade behavior for the plugin in a realistic local VS Code environment, must verify stable outcomes such as successful installation, activation, basic command or webview availability, and safe update behavior, and must remain opt-in or separately gated until their runtime cost and platform stability are well understood.. Proof: capture validation evidence in this doc.
- AC10 -> Scope: The request includes Logics kit lifecycle integration tests in sandbox repositories. These tests must cover at least fresh install, idempotent re-run, repair or doctor-assisted convergence, schema or metadata migration where applicable, and update behavior for the canonical kit integration path. They must verify repository convergence and stable operator-facing outcomes rather than only command exit codes.. Proof: capture validation evidence in this doc.

# Decision framing
- Product framing: Consider
- Product signals: conversion journey
- Product follow-up: Review whether a product brief is needed before scope becomes harder to change.
- Architecture framing: Required
- Architecture signals: data model and persistence, contracts and integration, runtime and boundaries, security and identity
- Architecture follow-up: Create or link an architecture decision before irreversible implementation work starts.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `req_129_greatly_improve_plugin_and_kit_coverage_with_behavior_focused_tests`
- Primary task(s): `task_XXX_example`

# AI Context
- Summary: Greatly improve repository coverage by targeting the plugin webview runtime, packaged plugin install and update flows, Logics kit...
- Keywords: plugin coverage, webview coverage, media js, vitest, jsdom, behavior focused tests, plugin install test, plugin update test, vsix integration, sandbox workspace, logics kit coverage, kit install test, kit update test, bootstrap convergence, migrate schema, repair flow, flow manager, dispatcher, hybrid transport, cli scenario tests, live api integration tests, openai, gemini, ollama, coverage ratchet, fail under, reporting split
- Use when: Use when planning or splitting work to improve plugin and kit coverage in a way that materially reduces regression risk instead of only increasing a global percentage, including optional local tests against real configured providers, packaged plugin install or update flows, and sandbox kit lifecycle flows.
- Skip when: Skip when the work is only about one isolated failing test, snapshot updates, or a narrow refactor with no coverage strategy impact.
# References
- `vitest.config.mts`
- `tests/webviewHarnessTestUtils.ts`
- `tests/webview.harness-details-and-filters.test.ts`
- `tests/webview.layout-collapse.test.ts`
- `tests/run_extension_smoke_checks.mjs`
- `media/main.js`
- `media/renderBoard.js`
- `media/renderDetails.js`
- `media/webviewChrome.js`
- `media/webviewPersistence.js`
- `media/webviewSelectors.js`
- `media/layoutController.js`
- `scripts/build/install-vsix.mjs`
- `logics/skills/tests/run_test_coverage.py`
- `logics/skills/tests/run_cli_smoke_checks.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_dispatcher.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_hybrid_transport.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_config.py`
- `logics/skills/logics-flow-manager/scripts/logics_flow_models.py`
- `.env`
- `.env.local`
- `logics.yaml`
- `logics/skills/logics-ui-steering/SKILL.md`

# Priority
- Impact:
- Urgency:

# Notes
- Derived from request `req_129_greatly_improve_plugin_and_kit_coverage_with_behavior_focused_tests`.
- Source file: `logics/request/req_129_greatly_improve_plugin_and_kit_coverage_with_behavior_focused_tests.md`.
- Keep this backlog item as one bounded delivery slice; create sibling backlog items for the remaining request coverage instead of widening this doc.
- Request context seeded into this backlog item from `logics/request/req_129_greatly_improve_plugin_and_kit_coverage_with_behavior_focused_tests.md`.
