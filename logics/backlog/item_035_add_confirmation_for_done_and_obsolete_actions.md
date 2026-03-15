## item_035_add_confirmation_for_done_and_obsolete_actions - Add confirmation before Done and Obsolete lifecycle actions
> From version: 1.9.2
> Status: Proposed
> Understanding: 99%
> Confidence: 98%
> Progress: 0%
> Complexity: Low
> Theme: Lifecycle safety and action confirmation
> Reminder: Update status/understanding/confidence/progress and linked task references when you edit this doc.

# Problem
The plugin detail panel currently lets users trigger `Done` and `Obsolete` immediately on click. These actions mutate persisted lifecycle metadata, but there is no confirmation before the write happens.

That makes accidental clicks too risky for a narrow operational UI. A post-action information message exists, but it does not prevent unintended changes. The missing safeguard is an explicit confirmation step before mutation.

# Scope
- In:
  - Add a confirmation flow for `Done`.
  - Add a confirmation flow for `Obsolete`.
  - Keep the current lifecycle update logic after confirmation.
  - Preserve current success feedback after confirmed updates.
  - Add regression coverage for confirm and cancel paths.
- Out:
  - Redesigning the action bar.
  - Changing lifecycle semantics.
  - Adding confirmations to unrelated actions such as `Edit`, `Read`, or `Promote`.

# Acceptance criteria
- AC1: Clicking `Done` requires explicit confirmation before the lifecycle update is written.
- AC2: Clicking `Obsolete` requires explicit confirmation before the lifecycle update is written.
- AC3: Cancelling the confirmation leaves the item unchanged.
- AC4: Confirming the action preserves the current write and refresh behavior.
- AC5: The confirmation message clearly identifies the target item and the action being confirmed.
- AC6: `Obsolete` confirmation uses more cautious wording than `Done`.
- AC7: Existing post-action information feedback remains available after a confirmed update.
- AC8: Tests cover both confirmed and cancelled paths where practical.

# AC Traceability
- AC1/AC2 -> host-side lifecycle action entry points add confirmation before calling the write path. Proof: TODO.
- AC3 -> cancelled confirmation exits without calling indicator update logic. Proof: TODO.
- AC4/AC7 -> existing lifecycle update and refresh path remains reused after confirmation. Proof: TODO.
- AC5/AC6 -> confirmation copy includes item identity and action-specific wording. Proof: TODO.
- AC8 -> tests validate both confirm and cancel outcomes. Proof: TODO.

# Priority
- Impact:
  - Medium: reduces accidental lifecycle mutations in a high-frequency operational panel.
- Urgency:
  - Medium: focused UX safeguard with low implementation risk.

# Notes
- Derived from `logics/request/req_030_add_confirmation_for_done_and_obsolete_actions.md`.

# Tasks
- `logics/tasks/task_029_add_confirmation_for_done_and_obsolete_actions.md`
