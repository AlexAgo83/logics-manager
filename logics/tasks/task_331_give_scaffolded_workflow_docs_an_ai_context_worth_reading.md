## task_331_give_scaffolded_workflow_docs_an_ai_context_worth_reading - Give scaffolded workflow docs an AI Context worth reading
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.
> Indicators reviewed: 2026-08-11 05:47:21

# AI Context
- Summary: Replace the nine generator templates that restate the title in `# AI Context` with one shared builder that asks to be filled, and derive the audit's placeholder set from it so the check cannot go blind again.
- Keywords: ai-context, scaffold-templates, placeholder-drift, token-hygiene, grooming
- Use when: Changing what a generator writes into `# AI Context`, or the check that it was groomed.
- Skip when: The work concerns another scaffolded section, or the corpus schema itself.

# Definition of Done (DoD)
- [x] The backlog scope is implemented.
- [x] Acceptance criteria are covered.
- [x] Validation passes.
- [x] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

# Backlog
- `item_695_give_scaffolded_workflow_docs_an_ai_context_worth_reading`

# Acceptance criteria
- AC1: `flow new` no longer emits a `# AI Context` whose `Summary` is the title restated; the generated block is either a genuinely derived summary or an explicit unfilled marker, and never a fixed sentence wrapping the title.
- AC2: The generated `Keywords` describe the subject of the document, not the tool or the act of scaffolding.
- AC3: An ungroomed `# AI Context` is reported by validation as a non-blocking finding naming the document and the line, with a repair command.
- AC4: The finding never blocks `lint`, `audit`, or a closeout gate, and existing documents are not modified by this change.
- AC5: Tests cover a freshly scaffolded doc of each kind (request, backlog, task), a groomed doc that must produce no finding, and the ungroomed finding's severity and exit-code neutrality.

# Plan
- [ ] Use `python3 -m logics_manager flow progress task task_331_give_scaffolded_workflow_docs_an_ai_context_worth_reading.md --progress <n>%` during multi-wave work.
- [ ] Run `python3 -m logics_manager flow finish task task_331_give_scaffolded_workflow_docs_an_ai_context_worth_reading.md` after implementation.

# Validation
- (no validation recorded yet)
- Finish workflow executed on 2026-08-11.
- Linked backlog/request close verification passed.

# Report
- Not started.
- Finished on 2026-08-11.
- Linked backlog item(s): `item_695_give_scaffolded_workflow_docs_an_ai_context_worth_reading`
- Related request(s): `req_334_give_scaffolded_workflow_docs_an_ai_context_worth_reading`

# Links
- Request: `req_334_give_scaffolded_workflow_docs_an_ai_context_worth_reading`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)

# Evidence
- AC1 | date: 2026-08-11 | command: `pytest -k asks_to_be_filled` | result: passed | all nine templates now emit the UNFILLED marker for Summary; the test asserts the title does not appear in the generated summary at all
- AC2 | date: 2026-08-11 | command: `pytest -k asks_to_be_filled` | result: passed | keywords_for derives subject words from the title and drops stopwords; the test asserts subject words present and every tool word absent
- AC3 | date: 2026-08-11 | command: `pytest -k follows_every_generator_template` | result: passed | TOKEN_HYGIENE_PLACEHOLDERS is now ai_context.PLACEHOLDERS, owned by the module the generators call; test_the_ungroomed_check_follows_every_generator_template fails if a template's wording changes without the set following
- AC4 | date: 2026-08-11 | command: `pytest -k 'reports_an_ungroomed or grooming_the_ai_context'` | result: passed | ai_context_ungroomed names the doc, lists which fields are still generated, and carries a repair command; a groomed doc produces nothing
- AC5 | date: 2026-08-11 | command: `python3 -m logics_manager audit` | result: 0 blocking, 1 ai_context_ungroomed | severity=warning and scoped to open docs; run on this corpus it reported exactly one doc (task_331 itself) and modified nothing
- AC6 | date: 2026-08-11 | command: `python3 -m pytest tests/python/ -q` | result: 1330 passed | four tests: generated block per kind, the drift guard, the finding and its severity, and a groomed doc producing nothing

# AC Traceability
- request-AC1 -> This task. Proof: date: 2026-08-11 | command: `pytest -k asks_to_be_filled` | result: passed | all nine templates now emit the UNFILLED marker for Summary; the test asserts the title does not appear in the generated summary at all Source: `c8af0b4c`
- request-AC2 -> This task. Proof: date: 2026-08-11 | command: `pytest -k asks_to_be_filled` | result: passed | keywords_for derives subject words from the title and drops stopwords; the test asserts subject words present and every tool word absent Source: `c8af0b4c`
- request-AC3 -> This task. Proof: date: 2026-08-11 | command: `pytest -k follows_every_generator_template` | result: passed | TOKEN_HYGIENE_PLACEHOLDERS is now ai_context.PLACEHOLDERS, owned by the module the generators call; test_the_ungroomed_check_follows_every_generator_template fails if a template's wording changes without the set following Source: `c8af0b4c`
- request-AC4 -> This task. Proof: date: 2026-08-11 | command: `pytest -k 'reports_an_ungroomed or grooming_the_ai_context'` | result: passed | ai_context_ungroomed names the doc, lists which fields are still generated, and carries a repair command; a groomed doc produces nothing Source: `c8af0b4c`
- request-AC5 -> This task. Proof: date: 2026-08-11 | command: `python3 -m logics_manager audit` | result: 0 blocking, 1 ai_context_ungroomed | severity=warning and scoped to open docs; run on this corpus it reported exactly one doc (task_331 itself) and modified nothing Source: `c8af0b4c`
- request-AC6 -> This task. Proof: date: 2026-08-11 | command: `python3 -m pytest tests/python/ -q` | result: 1330 passed | four tests: generated block per kind, the drift guard, the finding and its severity, and a groomed doc producing nothing Source: `c8af0b4c`
