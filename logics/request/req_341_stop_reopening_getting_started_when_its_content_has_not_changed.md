## req_341_stop_reopening_getting_started_when_its_content_has_not_changed - Stop reopening Getting Started when its content has not changed
> From version: 2.21.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Low
> Theme: VS Code ergonomics
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# AI Context
- Summary: The onboarding guard stores the extension version, so four releases in two days reopened an identical page four times; key it on the page's content instead.
- Keywords: onboarding, vscode, workspace-state, content-signature, interruption
- Use when: Changing when the Getting Started panel opens by itself, or how its content is fingerprinted.
- Skip when: The work concerns what the page says, or the on-demand buttons that open it deliberately.

# Needs
- Reported by the operator, 2026-08-11: the Getting Started panel reopens in VS Code over and over, and having to dismiss it on every plugin open is a nuisance.
- A first read is welcome. The second identical read is an interruption, and it lands at the worst moment -- the panel opens `Beside` the editor, taking a column, right as the workspace is being opened.
- The cost falls hardest on the people who update most often, which for this extension is everyone: it ships frequently, and the panel treats every release as new material.
- The page should earn a reopen. When it genuinely changes, showing it again is the point; when it has not, it should stay closed.

# Context
- **A guard already exists and watches the wrong thing.** `maybeShowOnboarding` in `clients/vscode/src/logicsViewProviderSupport.ts` stores the extension version per workspace root under `ONBOARDING_LAST_VERSION_KEY` and returns early when it matches. So the panel reopens on every version change, whether or not a word of the page moved.
- That is why the guard has been invisible in practice: 2.21.4, 2.21.5, 2.21.6 and 2.21.7 shipped within two days and the onboarding content was identical across all four. The mechanism worked exactly as written and still produced four reopens.
- **The obvious implementation would not work.** `buildOnboardingHtml` calls `getNonce()` and embeds the result in the CSP, so the rendered HTML differs on every single call. Hashing it would produce a fresh signature every time and reopen the panel always -- a strictly worse version of today. The signature has to be taken over the stable content sources (`ONBOARDING_STAGES`, `renderDocGuide`, `renderFooterActions`) and exclude the nonce and CSP.
- Deriving the signature inside `logicsOnboardingHtml.ts`, beside the builder, is what keeps it honest: a section added to the page is then covered without anyone remembering to update a second list. A signature maintained elsewhere would drift from the page the same way the audit's placeholder tuple drifted from the scaffold templates in req_334.
- Migration is one-way and cannot be avoided: what is stored today is a version string, and there is no way to know retroactively whether a user has seen the current content. A new state key means every existing user sees the page once more, then never again until it changes. That is the correct trade, and it should be stated rather than discovered.
- Out of scope: the on-demand entry points, which must keep working unconditionally -- the Tools menu button and the Insights footer button both call `openOnboardingPanel` directly and are not affected. Also out of scope: what the page says, and any setting to disable it permanently.
- Known risk: keying on content alone would suppress the page for a brand-new workspace that happens to share a signature with an old one. The per-workspace-root scoping the current guard already applies must be kept.

# Acceptance criteria
- AC1: Opening a workspace whose Getting Started content is unchanged does not reopen the panel, however many extension versions have shipped since it was last seen.
- AC2: A change to the onboarding content reopens the panel once, in each workspace, the next time it is opened.
- AC3: The signature is derived from the page's content sources and excludes the nonce and CSP, so two builds of identical content produce the same signature.
- AC4: The signature is computed beside the content it describes, so a section added to the page changes it without a second list being maintained.
- AC5: The guard stays scoped per workspace root: seeing the page in one workspace does not suppress it in another.
- AC6: The on-demand entry points still open the panel unconditionally, whatever the stored signature.
- AC7: Tests cover unchanged content across a version bump, changed content, nonce-independence of the signature, per-workspace isolation, and an on-demand open while the signature matches.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_077_a_plugin_that_interrupts_only_when_it_has_something_new_to_say`
- Architecture decision(s): (none yet)

# References
- clients/vscode/src/logicsViewProviderSupport.ts
- clients/vscode/src/logicsOnboardingHtml.ts
- clients/vscode/src/logicsViewProviderConstants.ts
- tests/logicsOnboardingHtml.test.ts

# Backlog
- `item_704_key_the_onboarding_guard_on_page_content_instead_of_extension_version`
