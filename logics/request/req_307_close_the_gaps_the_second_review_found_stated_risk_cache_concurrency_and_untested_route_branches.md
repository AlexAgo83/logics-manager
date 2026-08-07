## req_307_close_the_gaps_the_second_review_found_stated_risk_cache_concurrency_and_untested_route_branches - Close the gaps the second review found: stated risk, cache concurrency, and untested route branches
> From version: 2.19.7
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Complexity: Medium
> Theme: Stated risk, concurrency, and coverage of recently moved code
> Reminder: Update status/understanding/confidence and linked backlog/task references when you edit this doc.

# Needs
- State the real capability a paired network device is granted, so the decision to expose the viewer is made against what it actually does.
- Make the shared document-age lookup safe to call from the viewer's threaded server, which is what it is now wired into.
- Test the request branches that a recent extraction made visible but left unexercised.

# Context
- A second review pass measured three angles the first one did not cover, and confirmed each by reproduction rather than by inspection.
- The workshop terminal endpoint takes its command from the request body: any list of strings becomes the command it runs. Verified by driving the endpoint on a local viewer and observing an arbitrary command execute under the operator's account.
- The mechanism guarding that endpoint is sound: an origin check, a per-launch bearer token, a per-device token issued through a short-lived single-use PIN, tokens persisted only as hashes, and a mode gate that returns 403 for every mutating endpoint unless network writes were explicitly enabled.
- What is missing is the wording. The option's own help and the security document both describe the capability as writing or mutating state. An operator weighing whether to expose the viewer on an untrusted network reads that as document edits, not as running commands under their account.
- The shared document-age lookup caches in a plain module dictionary with no lock, while the viewer that now calls it is a threading server. Six concurrent calls were measured performing six full history walks of about a third of a second each. There is no corruption, only duplicated work -- and a cached component in the same server already guards its own state with a lock.
- The two route modules extracted from the viewer report the lowest coverage in the repository, and the fleet report is not much better. Their read paths were verified against a live viewer, but roughly twenty write branches are exercised by nothing. They were equally untested before the move; the extraction only made that visible.

# Acceptance criteria
- AC1: The option that enables network writes states that a paired device can run commands under the operator's account.
- AC2: The security document describes that capability where it describes the rest of the network model, rather than only as write access.
- AC3: The shared document-age lookup is safe to call concurrently and does not repeat its history walk for callers arriving together.
- AC4: The extracted route modules and the fleet report have tests covering their write and error branches, not only their read paths.
- AC5: No guarding behavior changes: the same requests are refused, and the same ones are allowed.
- AC6: Coverage of the newly tested modules is materially higher, and the repository floor is raised to match.

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): `prod_055_say_what_it_does_and_test_what_was_moved`
- Architecture decision(s): (none yet)

# References
- logics/product/prod_038_post_release_viewer_hardening.md
- logics/product/prod_054_guardrails_proportionate_to_the_codebase.md
- logics/product/prod_053_one_workflow_signal_every_logics_surface.md

# AI Context
- Summary: Close the gaps the second review found: stated risk, cache concurrency, and untested route branches
- Keywords: request-chain-scaffold, close the gaps the second review found: stated risk, cache concurrency, and untested route branches, development-ready
- Use when: You need to implement or review the scaffolded workflow for Close the gaps the second review found: stated risk, cache concurrency, and untested route branches.
- Skip when: The change is unrelated to this scaffolded request chain.

# Backlog
- `item_608_state_that_network_writes_grant_command_execution`
- `item_609_make_the_document_age_lookup_safe_under_concurrency`
- `item_610_cover_the_extracted_route_branches_and_the_fleet_report`
