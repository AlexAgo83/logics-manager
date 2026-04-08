## task_022_replace_hide_used_requests_with_hide_processed_requests_semantics - Replace hide used requests with hide processed requests semantics
> From version: 1.9.1 (refreshed)
> Status: Done
> Understanding: 100% ((closed); refreshed)
> Confidence: 100% ((validated); refreshed)
> Progress: 100%
> Complexity: Medium
> Theme: VS Code plugin filter semantics and workflow clarity
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from `logics/backlog/item_028_replace_hide_used_requests_with_hide_processed_requests_semantics.md`.
- Derived from backlog item `item_028_replace_hide_used_requests_with_hide_processed_requests_semantics`.
- Source file: `logics/backlog/item_028_replace_hide_used_requests_with_hide_processed_requests_semantics.md`.
- Related request(s): `req_023_replace_hide_used_requests_with_hide_processed_requests_semantics`.

```mermaid
%% logics-kind: task
%% logics-signature: task|replace-hide-used-requests-with-hide-pro|item-028-replace-hide-used-requests-with|1-clarify-scope-and-acceptance-criteria|npm-run-tests
flowchart LR
    Backlog[item_028_replace_hide_used_requests_with_h] --> Step1[1. Clarify scope and acceptance criteria]
    Step1 --> Step2[2. Implement changes]
    Step2 --> Step3[3. Add adjust tests and polish]
    Step3 --> Validation[npm run tests]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Clarify scope and acceptance criteria
- [x] 2. Implement changes
- [x] 3. Add/adjust tests and polish UX
- [x] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Implemented in the steps above. Proof: add test/commit/file links.
- AC2 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC3 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC4 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC5 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC6 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC7 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC8 -> covered by linked delivery scope. Proof: covered by linked task completion.
- AC9 -> covered by linked delivery scope. Proof: covered by linked task completion.

# Decision framing
- Product framing: Consider
- Product signals: navigation and discoverability
- Architecture framing: Consider
- Architecture signals: data model and persistence

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Backlog item: `item_028_replace_hide_used_requests_with_hide_processed_requests_semantics`
- Request(s): `req_023_replace_hide_used_requests_with_hide_processed_requests_semantics`

# Validation
- npm run tests
- npm run lint

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.

# Report
- Delivered:
  - replaced the UI toggle wording with `Hide processed requests`;
  - introduced delivery-centric processed-request semantics instead of relying on the old `used` heuristic;
  - kept `Draft` child items and companion-doc-only links out of the first processed rule.
- Validation:
  - `npm run compile` OK
  - `npm run test` OK

# Notes
