## item_592_expose_document_age_and_a_stale_document_health_signal - Expose document age and a stale-document health signal
> From version: 2.19.7
> Schema version: 1.0
> Status: In progress
> Understanding: 95%
> Confidence: 90%
> Progress: 100%
> Complexity: Medium
> Theme: Workflow signals
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Document listings carry kind, refs, path, status, and title, but no timestamp of any kind.
- An external watchdog therefore runs one version-control history lookup per document to date it, and applies its own hardcoded staleness threshold, duplicating logic that belongs to the corpus.

# Scope
- In:
  - Add a last-change timestamp and a derived age in days to document listing and document read output, sourced from version-control history with a filesystem fallback.
  - Add a stale-document signal to health output, listing documents whose status has not changed within a configured threshold.
  - Make the threshold configurable through the project configuration file with a documented default.
  - Keep the added fields additive so existing consumers are unaffected.
- Out:
  - Storing history or diffing snapshots between invocations.
  - Notifying anyone about a stale document.
  - Deriving age from anything other than version control and filesystem metadata.

# Acceptance criteria
- AC1: Document listing and document read output include a last-change timestamp and an age in days.
- AC2: A document with no version-control history falls back to filesystem metadata rather than failing.
- AC3: Health output reports stale documents against the configured threshold, and the threshold is configurable with a documented default.
- AC4: Existing consumers reading the previous fields are unaffected by the additions.
- AC5: Tests cover version-controlled documents, untracked documents, threshold boundaries, and an empty stale set.

# AC Traceability
- request-AC5 -> This backlog slice. Proof: AC1: Document listing and document read output include a last-change timestamp and an age in days.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_051_multi_repository_and_embedder_contract_for_the_logics_cli`
- Architecture decision(s): (none yet)
- Request: `req_303_make_logics_manager_embeddable_by_external_orchestrators_across_multiple_repositories`
- Primary task(s): `task_300_orchestrate_the_multi_repository_and_embedder_contract_delivery`

# AI Context
- Summary: Expose document age and a stale-document health signal
- Keywords: scaffolded-backlog, expose document age and a stale-document health signal, implementation-ready
- Use when: Implementing the scaffolded slice for Expose document age and a stale-document health signal.
- Skip when: The change belongs to another backlog slice.

# Priority
- Priority: Medium - removes per-document version-control lookups from callers
- Rationale: Set by scaffold input or defaulted for grooming.
