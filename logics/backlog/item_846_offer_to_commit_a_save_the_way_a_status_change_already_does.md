## item_846_offer_to_commit_a_save_the_way_a_status_change_already_does - Offer to commit a save the way a status change already does
> From version: 2.21.9
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 95%
> Progress: 100%
> Complexity: Low
> Theme: One commit-offer mechanism, not two
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:51:46

# AI Context
- Summary: A save that actually changes the file offers the same commit step item_844 built for status changes; a no-op save writes nothing and offers no commit.
- Keywords: offer, commit, save, way, status, change, already, does
- Use when: Wiring a saved edit to the shared commit-offer mechanism.
- Skip when: The editor screen itself or its write route -- that is item_845.

# Problem
- Saving an edited document and committing it are the same operator intent most of the time, the same shape of problem req_374/item_844 already solved for a status change -- without reuse, this would grow a second confirm-and-commit mechanism doing the same thing.

# Scope
- In:
  - After a save that actually changes the file, offer the same confirm-and-commit step item_844 built, with a proposed default message.
  - A save whose content matches what is already on disk changes nothing and offers no commit.
- Out:
  - Any change to item_844's own mechanism beyond calling it from this second place.
  - Batching this save with any other pending change.

# Acceptance criteria
- AC1: A save that changes the file offers the same commit step item_844 built for status changes.
- AC2: A no-op save (identical content) writes nothing and offers no commit.

# AC Traceability
- request-AC6 -> This backlog slice. Proof: AC1: A save that changes the file offers the same commit step item_844 built for status changes.
- request-AC7 -> This backlog slice. Proof: AC2: A no-op save (identical content) writes nothing and offers no commit.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_106_an_editor_that_stays_in_the_browser_it_is_already_in`
- Architecture decision(s): (none yet)
- Request: `req_375_edit_documents_in_the_browser_viewer`
- Primary task(s): `task_386_orchestrate_the_in_browser_document_editor_work`

# Priority
- Priority: Medium - reuses item_844's mechanism rather than adding a second one
- Rationale: Set by scaffold input or defaulted for grooming.

# Validation
- A save that actually changes the file offers the same commit step item_844 built -- showCommitOfferModal and commitFiles (the fetch/error-handling/recordGitActivity logic extracted out of changeCurrentDocumentStatus so both flows call the same function) -- with a proposed default message (test_saving_the_in_viewer_editor_writes_the_content_and_offers_to_commit_it). A no-op save (identical content) writes nothing extra and shows no commit offer at all (test_a_no_op_save_writes_nothing_extra_and_offers_no_commit), matching save_doc_payload's changed:false response.
