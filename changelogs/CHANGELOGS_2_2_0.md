# Changelog (`2.1.2 -> 2.2.0`)

Release `2.2.0` improves the Logics delivery and closeout loop for agent-driven CLI work.

## Why `2.2.0`

- Product briefs could seed implementation work, but creating the linked request, backlog item, and task still required too many manual steps.
- Agent closeout needed a single reliable path for validation evidence, deterministic repairs, task completion, index refresh, lint, audit, and handoff.
- Closeout failures needed actionable preflight output and repair commands instead of ad hoc Markdown edits.
- Fresh assistant sessions needed a compact handoff from recent commits and touched Logics docs.

## Highlights

- Added `flow deliver --from-product` to create a linked request, backlog item, and task from a product brief.
- Added `flow validate-closeout` to preflight whether a task can be safely closed.
- Added deterministic closeout repairs for gates, AC traceability, companion links, and Mermaid signatures.
- Added `flow closeout` orchestration for validation notes, optional index refresh, lint, audit, and final closeout checks.
- Added `assist handoff --since <rev>` for concise commit, surface, Logics doc, validation, and next-action summaries.
- Made `sync append-note` refresh Mermaid signatures when note changes affect signature-relevant sections.
- Cleaned generated delivery docs so known request, backlog, task, and product refs do not leave weak placeholders behind.

## What Changed

### Delivery Flow

- Product briefs can now drive a complete request/backlog/task delivery slice through the CLI.
- Generated docs include explicit lineage and companion links for the delivery chain.
- Delivery output supports structured JSON for agent integrations and concise text for operator use.

### Closeout Preflight and Repair

- `flow validate-closeout` reports unchecked gates, missing validation evidence, missing AC traceability, stale Mermaid signatures, and missing companion links.
- Repair commands support `--dry-run` and return changed paths for deterministic workflow cleanup.
- Suggested repair commands are included where the preflight can identify a deterministic fix.

### Agent Handoff

- `assist handoff --since <rev>` summarizes commits, changed surfaces, touched Logics docs, validation evidence, and next actions.
- Handoff output is available as text or JSON for assistant-to-assistant transfer.

### Documentation and Roadmap

- Added product briefs for delivery-loop ergonomics, agent closeout ergonomics, and the next closeout evidence hardening roadmap.
- Captured the next hardening work around structured validation evidence, honest AC proof, Git-range handoff accuracy, module boundaries, and transaction-like multi-file repairs.

## Upgrade Notes

- Existing `flow finish task`, `sync append-note`, lint, and audit commands remain available.
- Prefer `flow closeout` for agent-driven finalization when validation evidence is ready.
- Use `flow validate-closeout` before closing complex task chains.
- Use default Logics audit for active work; strict audit still reports historical token-hygiene debt in older docs.

## Validation and Regression Evidence

- `PYTHONPATH="$PWD" pytest python_tests -q`
- `npm run compile`
- `npm run lint`
- `npm run test -- --run`
- `npm run test:smoke`
- `npm run test:npm-cli`
- `npm run audit:ci`
- `npm run package:ci`
- `npm run ci:fast`
- `python3 -m logics_manager lint --require-status`
- `python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
