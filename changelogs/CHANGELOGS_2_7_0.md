# Logics Manager 2.7.0

## Highlights

- Adds the local viewer assistant-runs cockpit and CDX run surfaces, including bootstrap state, project capability payloads, and multi-project navigation.
- Preserves focused viewer selection across refreshes so operators do not lose the active request after viewer updates.
- Stops generating generic task Mermaid diagrams while keeping meaningful, explicitly supplied diagrams available.
- Allows functional specs to use `Settled` as a retained, closed status alongside product briefs and ADRs.

## Workflow Corpus

- Adds and closes the Logics and CDX run-observability workflow chains created for this release.
- Aligns ready viewer requests and records the viewer refresh selection fix in the Logics docs.
- Refreshes the workflow index and validates the corpus for release.

## Validation

- `npm run ci:check`
- `npm run release:changelog:validate`
- `logics-manager lint --require-status`
- `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
