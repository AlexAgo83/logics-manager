# Logics Manager 2.8.0

## Highlights

- Adds guided CDX mission launch support in the viewer, including the wish-to-request and guarded pre-release mission flows.
- Makes CDX mission execution safer and clearer with explicit write modes, safe command providers, JSONL parsing, artifact previews, and report navigation.
- Improves Git-facing viewer workflows with file preview fallback, clearer summary cards, hidden diff panels outside file views, and truncated history markers.
- Tightens viewer interaction behavior by preserving navigation during CDX missions, skipping unchanged refresh work, blocking concurrent actions, and adding return navigation from report previews.

## Workflow Corpus

- Adds and closes the workflow chains for guided CDX missions, Git file preview fallback, viewer workflow development, and agent-friendly Logics CLI ergonomics.
- Updates the Logics index and records the completed viewer workflow requests for this release.
- Documents the guided CDX mission delivery path and clarifies corpus-ready mission write behavior.

## Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
- `logics-manager lint --require-status`
- `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
