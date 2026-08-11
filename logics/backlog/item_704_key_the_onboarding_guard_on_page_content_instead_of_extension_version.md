## item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version - Key the onboarding guard on page content instead of extension version
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: VS Code ergonomics
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Replace the version key in `maybeShowOnboarding` with a signature of the page's content sources, excluding the nonce that makes every rendered build differ.
- Keywords: onboarding, content-signature, nonce, workspace-state, vscode
- Use when: Implementing the content-keyed guard or its signature.
- Skip when: The change concerns the page's wording or the on-demand entry points.

# Problem
- `maybeShowOnboarding` stores the extension version, so four releases in two days reopened an unchanged page four times.

# Scope
- In:
  - Export a content signature from `logicsOnboardingHtml.ts`, derived from the page's content sources and excluding the nonce and CSP.
  - Store and compare that signature per workspace root, under a new state key.
  - Keep the on-demand entry points unconditional.
- Out:
  - Changing the page's content, adding a permanent opt-out, or altering `openOnboardingPanel`.

# Acceptance criteria
- AC1: Unchanged content does not reopen the panel across version bumps.
- AC2: Changed content reopens it once per workspace.
- AC3: The signature is nonce-independent and stable across builds.
- AC4: It is derived beside the content, so a new section is covered automatically.
- AC5: The per-workspace-root scoping is preserved.
- AC6: The Tools and Insights buttons still open the panel unconditionally.
- AC7: Tests cover all five behaviours above.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Unchanged content does not reopen the panel across version bumps.
- request-AC2 -> This backlog slice. Proof: AC2: Changed content reopens it once per workspace.
- request-AC3 -> This backlog slice. Proof: AC3: The signature is nonce-independent and stable across builds.
- request-AC4 -> This backlog slice. Proof: AC4: It is derived beside the content, so a new section is covered automatically.
- request-AC5 -> This backlog slice. Proof: AC5: The per-workspace-root scoping is preserved.
- request-AC6 -> This backlog slice. Proof: AC6: The Tools and Insights buttons still open the panel unconditionally.
- request-AC7 -> This backlog slice. Proof: AC7: Tests cover all five behaviours above.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_077_a_plugin_that_interrupts_only_when_it_has_something_new_to_say`
- Architecture decision(s): (none yet)
- Request: `req_341_stop_reopening_getting_started_when_its_content_has_not_changed`
- Primary task(s): `task_338_deliver_the_content_keyed_onboarding_guard`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.

# Notes
- Task `task_338_deliver_the_content_keyed_onboarding_guard` was finished via `logics-manager flow finish task` on 2026-08-11.
