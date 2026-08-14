## item_778_retake_the_readme_captures_against_the_delivered_screens - Retake the README captures against the delivered screens
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: Documentation
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-14 17:26:34

# AI Context
- Summary: (unfilled: replace before this doc is used)
- Keywords: retake, readme, captures, against, delivered, screens
- Use when: (unfilled: replace before this doc is used)
- Skip when: (unfilled: replace before this doc is used)

# Problem
- The four captures date from 2026-08-09 and 2026-08-10, before the board, the card, the details panel and the fleet home were redrawn. Two of them are captioned as showing the demo corpus, which `logics/request/req_343_keep_the_synthetic_demo_board_out_of_every_released_artifact.md` removed from released artifacts.

# Scope
- In:
  - Retake each capture from a live viewer once the screens it documents are delivered.
  - Use a real corpus rather than the synthetic demo board.
  - State which redesigns the retake waited on.
- Out:
  - Changing which screens the README shows.

# Delivery notes
- All four retaken from a live viewer against **this repository's own corpus at 1621 documents**, never the synthetic demo board -- `req_343` removed that from released artifacts, so a capture of it would document a screen a reader cannot reach. The two captions that said "from the demo corpus" are gone with the images.
- Taken **after** the redesigns they document, which is what this request waited on: `item_717` (three flow columns and a reference index), `item_718` (folded done work), `item_719` (the card face, and the stage tint removed), `item_720`/`item_721`/`item_722` (the details panel), `item_752`/`item_753` (Getting Started), `item_761`/`item_762` (the reader's identity and reading layout), `item_764`/`item_765` (the filter panel), and `req_350`'s Workshop and CDX work.
- Each one now shows something the old capture could not: the board shows `5 live / 350 done` column headers and the reference index; the reader shows prose at a measure with its contents list; health leads with `Nothing blocks`; insights leads with how many signals need attention.
- Produced by the script from `item_780`, so retaking them is one command and the framing is recorded rather than remembered.

# Acceptance criteria
- AC1: Each capture shows the shipped design.
- AC2: No capture shows the demo corpus.
- AC5: The retake happened after the redesigns, and says which ones.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: Each capture shows the shipped design.
- request-AC2 -> This backlog slice. Proof: AC2: No capture shows the demo corpus.
- request-AC5 -> This backlog slice. Proof: AC5: The retake happened after the redesigns, and says which ones.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_091_a_readme_that_shows_the_product_a_reader_will_get`
- Architecture decision(s): (none yet)
- Request: `req_355_refresh_the_readme_captures_and_the_prose_beside_them_once_the_redesigns_land`
- Primary task(s): `task_352_refresh_the_published_captures_once_the_screens_are_final`

# Priority
- Priority: Medium
- Rationale: Set by scaffold input or defaulted for grooming.
