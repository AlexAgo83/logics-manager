## task_001_implement_logics_indexer_and_data_model - Implement Logics indexer and data model
> From version: X.X.X
> Understanding: 80%
> Confidence: 75%
> Progress: 0%

# Context
Define how the extension discovers Logics files and extracts metadata (id, title, stage,
status, path, updated time) to power the board and details panel.

# Plan
- [ ] 1. Define discovery rules for `logics/request|backlog|tasks|specs/*.md`.
- [ ] 2. Define parsing rules for headers/indicators and fallback defaults.
- [ ] 3. Implement the indexer + data model (and sample output for UI wiring).
- [ ] FINAL: Document parsing assumptions in the backlog item.

# Validation
- Manual: run the indexer and verify it lists the correct files and stages.

# Report
