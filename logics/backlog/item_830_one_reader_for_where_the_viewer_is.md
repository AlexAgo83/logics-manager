## item_830_one_reader_for_where_the_viewer_is - One reader for where the viewer is
> From version: 2.21.9
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Low
> Theme: One answer, read by everything
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.
> Indicators reviewed: 2026-08-15 18:31:49

# AI Context
- Summary: One function answers whether a viewer is running for a repository and at what address; four surfaces read it instead of deriving it four times.
- Keywords: viewer registry, running address, one reader, no default port
- Use when: Anything needs the running viewer's address -- MCP, CLI, or otherwise.
- Skip when: You need to start or claim a viewer; that is `claim_or_reuse`.

# Problem
- `viewer_registry.py` can claim a port and probe a claim, but exposes nothing that answers 'is a viewer running for this repository, and at what address'.
- Four surfaces are about to need that answer. Built per surface, they will drift -- the same shape of defect as the loading threshold req_365 had to collapse into one constant.

# Scope
- In:
  - A reader that returns the running viewer's base URL for a repository, or nothing.
  - Nothing, not a guess: no viewer running means no address, and the default port is not an assumption worth making.
  - Bounded: reading the registry and probing must not delay the caller noticeably, and a stale claim must not hang it.
- Out:
  - Starting a viewer.
  - Changing the registry format or the claim protocol.
  - Caching across processes.

# Acceptance criteria
- AC1: With a viewer running, the reader returns its scheme, host and port.
- AC2: With no viewer, or a claim whose port answers nothing, it returns nothing rather than a default.
- AC3: The call is bounded in time even when the registry names a port that will never answer.

# AC Traceability
- request-AC1 -> This backlog slice. Proof: AC1: With a viewer running, the reader returns its scheme, host and port.
- request-AC4 -> This backlog slice. Proof: AC2: With no viewer, or a claim whose port answers nothing, it returns nothing rather than a default.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_102_the_link_travels_with_the_document`
- Architecture decision(s): (none yet)
- Request: `req_371_put_the_viewer_link_where_every_assistant_already_looks`
- Primary task(s): `task_382_orchestrate_the_link_travels_with_the_document_work`

# Priority
- Priority: High
- Rationale: Four surfaces deriving it separately is how they disagree

# Tasks
- `task_382_orchestrate_the_link_travels_with_the_document_work`

# Notes
- Task `task_382_orchestrate_the_link_travels_with_the_document_work` was finished via `logics-manager flow finish task` on 2026-08-15.
