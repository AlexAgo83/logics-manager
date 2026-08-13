## item_709_gate_the_demo_board_on_a_signal_release_artifacts_cannot_carry - Gate the demo board on a signal release artifacts cannot carry
> From version: 2.21.9
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Release hygiene
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-13 13:03:35

# AI Context
- Summary: Replace `_is_dev_checkout()`'s probe for `clients/shared-web/media` -- which the npm package and the VSIX both ship -- with a signal a release artifact cannot carry by accident.
- Keywords: demo corpus, dev gate, is_dev_checkout, repo_root probe, npm package, vsix, release stamp
- Use when: Changing how the demo board or any dev-only surface is gated, or touching `ensure_demo_corpus_if_dev`.
- Skip when: Editing the demo corpus content, or adding coverage (that is item_710).

# Problem
- `_is_dev_checkout()` recognises a dev tree by the presence of `clients/shared-web/media`, which the npm package and the VSIX both ship, so the demo board is offered to users on two of three channels.

# Scope
- In:
  - Replace the negative path probe with a signal a release cannot carry by accident: a positive release stamp written at package time, or an explicit opt-in for the demo, whichever proves simpler to make un-invertible.
  - Keep `ensure_demo_corpus_if_dev` as the single decision point, so no caller learns about the new signal.
  - Confirm the four channel behaviours: npm, VSIX, wheel, dev checkout.
- Out:
  - The demo corpus content, the fleet home layout, and what each channel ships beyond the gate's own needs.

# Acceptance criteria
- AC1: The demo is absent from an installed npm package's project registry.
- AC2: It is absent from an installed VS Code extension's registry.
- AC3: It stays absent from a pip wheel install.
- AC4: It stays present in a development checkout.
- AC5: The decision rests on a positive release assertion or explicit opt-in, not on a file's absence.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: The demo is absent from an installed npm package's project registry.
- request-AC2 -> This backlog slice. Proof: AC2: It is absent from an installed VS Code extension's registry.
- request-AC3 -> This backlog slice. Proof: AC3: It stays absent from a pip wheel install.
- request-AC4 -> This backlog slice. Proof: AC4: It stays present in a development checkout.
- request-AC5 -> This backlog slice. Proof: AC5: The decision rests on a positive release assertion or explicit opt-in, not on a file's absence.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_079_a_release_that_contains_only_the_product`
- Architecture decision(s): (none yet)
- Request: `req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact`
- Primary task(s): `task_340_deliver_the_release_safe_demo_gate_and_its_per_artifact_proof`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
