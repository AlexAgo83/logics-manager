## task_331_give_scaffolded_workflow_docs_an_ai_context_worth_reading - Give scaffolded workflow docs an AI Context worth reading
> From version: 2.21.6
> Schema version: 1.0
> Status: Ready
> Understanding: 90%
> Confidence: 85%
> Progress: 0%
> Complexity: Medium
> Theme: Implementation delivery
> Reminder: Update status/understanding/confidence/progress and linked request/backlog references when you edit this doc.

# AI Context
- Summary: Implement give scaffolded workflow docs an ai context worth reading.
- Keywords: task, implementation, backlog, runtime, python
- Use when: You need a bounded implementation task for a backlog item.
- Skip when: The work is still at the request or backlog shaping stage.

# Definition of Done (DoD)
- [ ] The backlog scope is implemented.
- [ ] Acceptance criteria are covered.
- [ ] Validation passes.
- [ ] Meaningful waves followed ADR 009: affected docs updated and the repo left commit-ready without automatic commits.

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

# Report
- Not started.

# Links
- Request: `req_334_give_scaffolded_workflow_docs_an_ai_context_worth_reading`
- Product brief(s): (none yet)
- Architecture decision(s): (none yet)
