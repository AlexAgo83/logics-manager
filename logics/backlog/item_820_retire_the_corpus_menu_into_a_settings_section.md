## item_820_retire_the_corpus_menu_into_a_settings_section - Retire the Corpus menu into a Settings section
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: The Corpus menu is three entries in the header; the screens it holds are reached from a Settings section that links to them instead, and the menu goes.
- Keywords: corpus menu, settings section, navigation, item_737 reversal
- Use when: Changing where the corpus-reading screens are reached from.
- Skip when: What those screens show, or how long they take -- neither changes here.

# Problem
The Corpus menu is a top-level header entry holding three screens -- Getting Started, Insights and Health -- once this request's sibling slice removes Runbooks from it. That is a whole menu spent on three links.
item_737 deliberately moved those three *out* of Settings and into navigation, recording the reason: they were "navigation dressed as settings". Undoing that silently would leave two opposing decisions in the codebase with nothing to say which is live.

# Scope
- In:
  - A section of Settings that links to Getting Started, Insights and Health, and the removal of the Corpus menu from the header.
  - Links, not embedded screens: they stay screens of their own, which is the half of item_737's reasoning that still holds -- Settings is where something is changed, those are where something is read.
  - Keep the in-screen Corpus switcher, so moving between the three stays one click once inside.
  - State the reversal in the code where item_737's reasoning currently sits, so the next reader finds one live decision rather than two opposed ones.
- Out:
  - Embedding the screens inside Settings, which is what item_737 undid.
  - Changing what any of the three screens shows.
  - The alert badge's existing route to Health.

# Acceptance criteria
- AC1: The header has no Corpus menu, and nothing else routes to one.
- AC2: Getting Started, Insights and Health are reachable from a Settings section, and remain screens of their own rather than panels inside Settings.
- AC3: Once on any of the three, moving to the other two is still one click.
- AC4: item_737's note is updated where it stands rather than left contradicting this, so one decision is readable as the live one.

# Report
- The Corpus menu is removed from the header and a "This corpus" section in Settings launches Getting Started, Corpus insights and Validation health.
- Links, not panels: the three remain screens of their own. That is the half of item_737's reasoning that still holds -- Settings is where something is changed, those are where something is read -- and its note in `showSettings` is rewritten where it stood rather than left contradicting this, so the next reader finds one live decision instead of two opposed ones.
- The in-screen Corpus switcher is untouched, so moving between the three is still one click once inside.
- Measured live: no `data-viewer-nav="corpus"` in the header, the Settings section lists the three in that order, clicking Validation health renders the real screen (its verdict text is present, not the loading panel), and the switcher still offers all of them.
- Three tests followed the route rather than being deleted with the menu. The one that matters is "reachable by clicking": item_737 broke exactly that, and the test exists because of it, so it now opens Settings and clicks the entries there.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: the Corpus menu is gone from the app bar and Getting Started, Corpus insights and Validation health are reached from a Settings section that links to them; they remain full screens, and the corpus mode switcher still carries a reader between them in one click.

# Decision framing
- Product framing: Not needed
- Product signals: (none detected)
- Product follow-up: No product brief follow-up is expected based on current signals.
- Architecture framing: Not needed
- Architecture signals: (none detected)
- Architecture follow-up: No architecture decision follow-up is expected based on current signals.

# Links
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
- Request: `logics/request/req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_367_make_the_project_view_honest_on_arrival_and_let_runbooks_be_documents.md`.
- Generated locally by logics-manager.
- Task `task_378_orchestrate_the_board_arrival_and_runbook_document_work` was finished via `logics-manager flow finish task` on 2026-08-15.
