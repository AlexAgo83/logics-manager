## item_689_make_the_runbook_library_navigable_in_the_viewer - Make the runbook library navigable in the viewer
> From version: 2.21.4
> Schema version: 1.0
> Status: Ready
> Understanding: 95%
> Confidence: 90%
> Progress: 0%
> Complexity: Medium
> Theme: Runbook book viewer
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-10 23:38:01

# AI Context
- Summary: Make the runbook library navigable in the viewer
- Keywords: scaffolded-backlog, make the runbook library navigable in the viewer, implementation-ready
- Use when: Implementing the scaffolded slice for Make the runbook library navigable in the viewer.
- Skip when: The change belongs to another backlog slice.

# Problem
- The viewer currently distinguishes lifecycle workflow documents from its existing companion kinds only. A new runbook kind would otherwise be searchable only from a terminal and its operational relationships would remain prose links.
- The existing graph answers a different question: one request's delivery chain. A category library needs category-to-runbook-to-linked-document navigation, including standalone runbooks.

# Scope
- In:
  - Add Runbooks as the Workshop tab between Commands and Explorer, rather than as a new top-level destination.
  - Add Runbook to viewer type filtering, search results, document metadata, and accessible labels.
  - Start the tab with relevant/recent Active runbooks and a bounded intent search; open the graph as a secondary book view.
  - Render a runbook-book graph with category nodes, runbook nodes, and optional links to related Logics documents.
  - Keep the existing request-chain graph unchanged and make standalone runbooks visible in the library graph.
  - Add a narrow status control: Draft to Active requires a verification date and proof, archive requires confirmation, and every transition uses the supported Logics mutation path then refreshes results.
  - Make suggestions and capture advisory: show why a runbook matched, make no-match a useful empty state, and leave every suggestion or capture path in one interaction.
  - Add focused viewer tests for filters, graph source, Workshop navigation, status transitions, and empty states.
- Out:
  - A cross-repository viewer database.
  - A general Markdown editor or arbitrary document mutation from the viewer.
  - Replacing Mermaid or the existing chain graph.

# Acceptance criteria
- AC1: Workshop presents Runbooks between Commands and Explorer; a user can select it and see relevant/recent Active runbooks, category and verification metadata, and an accessible no-match state.
- AC2: Intent search returns at most three relevant Active runbooks with trigger, action, verification, and freshness; category browsing and explicit search retain bounded, navigable behavior.
- AC2a: Each suggested runbook states why it matched; no-match and ignore are normal one-interaction exits without a blocking modal.
- AC3: The runbook-book graph shows category to runbook edges and optional structural links to Logics documents.
- AC4: A runbook with no structural link still appears in its category and opens from the graph.
- AC5: The request-chain graph remains unchanged and tests cover the two graph contracts separately.
- AC6: The document detail changes only runbook state: Draft to Active requires verification date and proof, archive requires confirmation, and the refreshed result set reflects the transition.
- AC7: Capture is offered once after verified reusable work and includes `Skip — not reusable`; skipping leaves the task and the viewer unchanged.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Workshop presents Runbooks between Commands and Explorer; a user can select it and see relevant/recent Active runbooks, category and verification metadata, and an accessible no-match state.
- request-AC6 -> This backlog slice. Proof: AC4: A runbook with no structural link still appears in its category and opens from the graph.
- request-AC8 -> This backlog slice. Proof: AC5: The request-chain graph remains unchanged and tests cover the two graph contracts separately.
- request-AC9 -> This backlog slice. Proof: AC2a: Each suggested runbook states why it matched; no-match and ignore are normal one-interaction exits without a blocking modal.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_074_a_discoverable_library_of_operational_runbooks`
- Architecture decision(s): (none yet)
- Request: `req_330_make_operational_runbooks_a_discoverable_logics_companion_document`
- Primary task(s): `task_327_orchestrate_the_discoverable_runbook_library_delivery`

# Priority
- Priority: Medium - command discovery lands first, then the visual book improves browsing
- Rationale: Set by scaffold input or defaulted for grooming.
