## item_502_consolidate_duplicated_python_parsing_helpers - Consolidate duplicated Python parsing helpers
> From version: 2.12.12
> Schema version: 1.0
> Status: Done
> Understanding: 90%
> Confidence: 85%
> Progress: 100%
> Complexity: Medium
> Theme: Python deduplication
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- _extract_refs, _indicator_value, _progress_value, _section_lines, _git_changed_paths and document-collection logic are copied across audit.py, lint.py, sync.py, assist_support.py and insights.py with subtly inconsistent return types and behavior; sync.py _section_lines is dead.

# Scope
- In:
  - Create a shared module (e.g. logics_manager/doc_parsing.py) with one definition each, parameterized where callers legitimately differ (e.g. strip_mermaid, timeout)
  - Repoint all callers at the shared definitions
  - Delete the dead sync.py _section_lines and the redundant copies
- Out:
  - Changing the observable behavior of any caller
  - Reconciling the DOC_KINDS/lint.KINDS schema or the spec kind (out of scope)

# Acceptance criteria
- AC1: Each duplicated helper has a single shared definition consumed by all callers.
- AC2: The dead sync.py _section_lines is removed.
- AC3: lint, audit, and the pytest suite pass unchanged.

# AC Traceability
- request-AC7 -> This backlog slice. Proof: AC1: Each duplicated helper has a single shared definition consumed by all callers.
- request-AC11 -> This backlog slice. Proof: AC2: The dead sync.py _section_lines is removed.
- request-AC12 -> This backlog slice. Proof: AC3: lint, audit, and the pytest suite pass unchanged.

# Decision framing
- Product framing: Not needed
- Architecture framing: Not needed

# Links
- Product brief(s): `prod_030_audit_remediation_hardening_and_cleanup`
- Architecture decision(s): (none yet)
- Request: `req_278_act_on_the_multi_agent_audit_hardening_and_cleanup`
- Primary task(s): `task_275_orchestrate_the_audit_remediation`

# AI Context
- Summary: Consolidate duplicated Python parsing helpers
- Keywords: scaffolded-backlog, consolidate duplicated python parsing helpers, implementation-ready
- Use when: Implementing the scaffolded slice for Consolidate duplicated Python parsing helpers.
- Skip when: The change belongs to another backlog slice.

# Priority
- Impact: High
- Urgency: Medium
