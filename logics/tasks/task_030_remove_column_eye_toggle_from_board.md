## task_030_remove_column_eye_toggle_from_board - Remove the eye toggle from board columns
> From version: 1.9.3 (refreshed)
> Status: Done
> Understanding: 100%
> Confidence: 100%
> Progress: 100%
> Complexity: Low
> Theme: Board UI simplification and control hygiene
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
Derived from `logics/backlog/item_036_remove_column_eye_toggle_from_board.md`.
- Derived from backlog item `item_036_remove_column_eye_toggle_from_board`.
- Source file: `logics/backlog/item_036_remove_column_eye_toggle_from_board.md`.
- Related request(s): `req_031_remove_column_eye_toggle_from_board`.

```mermaid
%% logics-kind: task
%% logics-signature: task|remove-the-eye-toggle-from-board-columns|item-036-remove-column-eye-toggle-from-b|1-identify-where-the-eye-toggle|npm-run-compile
flowchart LR
    Backlog[item_036_remove_column_eye_toggle_from_boa] --> Step1[1. Identify where the eye toggle]
    Step1 --> Step2[2. Remove the eye toggle from]
    Step2 --> Step3[3. Remove or neutralize the corresponding]
    Step3 --> Validation[npm run compile]
    Validation --> Report[Done report]
```

# Plan
- [x] 1. Identify where the eye toggle is rendered and where its interaction path is handled.
- [x] 2. Remove the eye toggle from board column headers.
- [x] 3. Remove or neutralize the corresponding per-column hide/show behavior.
- [x] 4. Ensure header alignment and remaining actions stay stable after removal.
- [x] 5. Handle any persisted collapsed-column state safely.
- [x] 6. Add/adjust tests for the new board-header behavior.
- [x] FINAL: Update related Logics docs

# AC Traceability
- AC1/AC2 -> Steps 2 and 3. Proof: covered by linked task completion.
- AC3/AC4 -> Step 4. Proof: covered by linked task completion.
- AC5 -> Step 4. Proof: covered by linked task completion.
- AC6 -> Step 5. Proof: covered by linked task completion.
- AC7 -> Step 6. Proof: covered by linked task completion.

# Links
- Backlog item: `item_036_remove_column_eye_toggle_from_board`
- Request(s): `req_031_remove_column_eye_toggle_from_board`

# Validation
- `npm run compile`
- `npm test -- tests/webview.harness-a11y.test.ts`
- `npm test -- tests/webview.layout-collapse.test.ts`

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.

# Report
- 

# Notes
