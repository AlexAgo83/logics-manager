## item_695_give_scaffolded_workflow_docs_an_ai_context_worth_reading - Give scaffolded workflow docs an AI Context worth reading
> From version: 2.21.6
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: High
> Theme: Operator workflow and runtime integration
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# AI Context
- Summary: Give scaffolded workflow docs an AI Context worth reading
- Keywords: backlog-groom, request, give scaffolded workflow docs an ai context worth reading, bounded slice
- Use when: Use when implementing or reviewing the delivery slice for Give scaffolded workflow docs an AI Context worth reading.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.

# Problem
`# AI Context` exists so an agent can decide, cheaply, whether to open a document. That only works if its four lines say something the title does not.
As generated, they do not. `flow new request --title "Keep deferred traceability findings out of the default audit report"` produced, verbatim: *Summary: Draft a bounded request for keep deferred traceability findings out of the default audit report* — the title, lowercased, behind a fixed prefix. `Keywords` were `request-draft, logics-manager, python runtime, bundled CLI`, which describe the tool rather than the request. `Use when: You need a new bounded request doc for the Logics workflow` describes the act of scaffolding, not the subject.
Nothing ever asks for it to be replaced. In `cdx-manager`, `req_036` is **delivered** and still carries `Use when: You need to implement or review the scaffolded workflow for Route CDX agent alerts through an active tray companion`; `item_083` and `req_037` are the same. Neither `lint` nor `audit` mentions it.
The cost is paid on every read, by every agent, forever: four lines of context spent to learn the title a second time. `audit` already polices verbosity through `token_hygiene_section_too_long`, which makes the absence of any check on *empty* content the inconsistent part.
This repo's own well-groomed docs show the target. `req_332` reads: *Summary: Fix the webview flipping back to the Activity view instead of staying on Project every time a refresh arrives* — a sentence that lets an agent skip or open the doc without opening it.

# Scope
- In:
  - one coherent delivery slice from the source request
- Out:
  - unrelated sibling slices that should stay in separate backlog items instead of widening this doc

# Acceptance criteria
- AC1: `flow new` no longer emits a `# AI Context` whose `Summary` is the title restated; the generated block is either a genuinely derived summary or an explicit unfilled marker, and never a fixed sentence wrapping the title.
- AC2: The generated `Keywords` describe the subject of the document, not the tool or the act of scaffolding.
- AC3: An ungroomed `# AI Context` is reported by validation as a non-blocking finding naming the document and the line, with a repair command.
- AC4: The finding never blocks `lint`, `audit`, or a closeout gate, and existing documents are not modified by this change.
- AC5: Tests cover a freshly scaffolded doc of each kind (request, backlog, task), a groomed doc that must produce no finding, and the ungroomed finding's severity and exit-code neutrality.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: `flow new` no longer emits a `# AI Context` whose `Summary` is the title restated; the generated block is either a genuinely derived summary or an explicit unfilled marker, and never a fixed sentence wrapping the title.
- request-AC2 -> This backlog slice. Proof: AC2: The generated `Keywords` describe the subject of the document, not the tool or the act of scaffolding.
- request-AC3 -> This backlog slice. Proof: AC3: An ungroomed `# AI Context` is reported by validation as a non-blocking finding naming the document and the line, with a repair command.
- request-AC4 -> This backlog slice. Proof: AC4: The finding never blocks `lint`, `audit`, or a closeout gate, and existing documents are not modified by this change.
- request-AC5 -> This backlog slice. Proof: AC5: Tests cover a freshly scaffolded doc of each kind (request, backlog, task), a groomed doc that must produce no finding, and the ungroomed finding's severity and exit-code neutrality.

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
- Request: `logics/request/req_334_give_scaffolded_workflow_docs_an_ai_context_worth_reading.md`
- Primary task(s): (none yet)

# Priority
- Priority: Medium
- Rationale: Default until groomed.

# Notes
- Hybrid rationale: Derived from request `req_334_give_scaffolded_workflow_docs_an_ai_context_worth_reading` and kept bounded to one coherent delivery slice.
- Source file: `logics/request/req_334_give_scaffolded_workflow_docs_an_ai_context_worth_reading.md`.
- Generated locally by logics-manager.
- Task `task_331_give_scaffolded_workflow_docs_an_ai_context_worth_reading` was finished via `logics-manager flow finish task` on 2026-08-11.

# Tasks
- `task_331_give_scaffolded_workflow_docs_an_ai_context_worth_reading`
