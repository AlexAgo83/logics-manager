## task_027_add_reset_action_for_filter_defaults - Add reset action to restore default filter options
> From version: 1.9.3
> Status: Done
> Understanding: 98%
> Confidence: 98%
> Progress: 100%
> Complexity: Low
> Theme: Filter ergonomics and recoverability
> Reminder: Update status/understanding/confidence/progress and dependencies/references when you edit this doc.

# Context
- Derived from backlog item `item_034_add_reset_action_for_filter_defaults`.
- Source file: `logics/backlog/item_034_add_reset_action_for_filter_defaults.md`.
- Related request(s): `req_028_add_reset_action_for_filter_defaults`.

```mermaid
%% logics-signature: task|add-reset-action-to-restore-default-filt|item-034-add-reset-action-for-filter-def|1-identify-or-centralize-the-canonical|npm-run-compile
flowchart LR
    Backlog[Backlog source] --> Defaults[Identify default filter source]
    Defaults --> UI[Add Reset control to filter panel]
    UI --> State[Restore filter state and persist]
    State --> Render[Re-render board/list immediately]
    Render --> Tests[Add regression coverage]
```

# Plan
- [x] 1. Identify or centralize the canonical default filter values used by the webview.
- [x] 2. Add a `Reset` control in the last position of the filter panel.
- [x] 3. Implement a reset handler that restores only filter state and leaves search/view/collapse state untouched.
- [x] 4. Persist the restored defaults and trigger immediate rerender.
- [x] 5. Add/adjust harness tests for reset state and rendered default view recovery.
- [x] FINAL: Update related Logics docs

# AC Traceability
- AC1 -> Step 2. Proof: TODO.
- AC2 -> Steps 1 and 3. Proof: TODO.
- AC3/AC4 -> Step 4. Proof: TODO.
- AC5 -> Step 3. Proof: TODO.
- AC6 -> Step 5. Proof: TODO.

# Links
- Backlog item: `item_034_add_reset_action_for_filter_defaults`
- Request(s): `req_028_add_reset_action_for_filter_defaults`

# Validation
- `npm run compile`
- `npm test -- tests/webview.harness-a11y.test.ts`
- `npm test -- tests/webview.layout-collapse.test.ts`

# Definition of Done (DoD)
- [x] Scope implemented and acceptance criteria covered.
- [x] Validation commands executed and results captured.
- [x] Linked request/backlog/task docs updated.
- [x] Status is `Done` and progress is `100%`.
