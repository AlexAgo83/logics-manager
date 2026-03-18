# Changelog (`1.10.5 -> 1.10.6`)

## Major Highlights

- Added double-click `Read` behavior across list, board, and activity items so document preview is faster from the main orchestration surfaces.
- Improved the bundled Logics kit so frontend-oriented flows surface the `logics-ui-steering` skill, workflow linting distinguishes blocking placeholders from softer warnings, and Mermaid diagrams are generated from real document context.
- Kept release preparation aligned with the extension version, curated changelog contract, and VSIX packaging flow for `1.10.6`.

## Version 1.10.6

### Extension interaction flow

- Double-clicking a card or item now triggers the `Read` action from board, list, and activity views.
- Regression coverage was extended so the read interaction stays consistent across the main webview surfaces.

### Bundled Logics kit workflow quality

- Flow-manager generated request, backlog, and task docs now surface the `logics-ui-steering` skill when the source need is clearly frontend-oriented.
- The Logics doc linter now treats critical workflow placeholders such as `X.X.X` and `??%` as blocking errors while downgrading leftover template prose to warnings.
- Workflow Mermaid blocks are now generated from document context and carry a context signature so generic or stale diagrams can be detected during linting.

### Validation

- `python3 -m pytest logics/skills/tests/test_logics_flow.py logics/skills/tests/test_logics_lint.py`
- `python3 logics/skills/logics-doc-linter/scripts/logics_lint.py`
- `npm run release:changelog:validate`
