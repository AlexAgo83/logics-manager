## item_317_add_eslint_raise_branch_threshold_and_fix_unsafe_as_any_cast - add eslint raise branch threshold and fix unsafe as-any cast
> From version: 1.25.4
> Schema version: 1.0
> Status: In progress
> Understanding: 96%
> Confidence: 94%
> Progress: 25%
> Complexity: Medium
> Theme: Maintenance
> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.

# Problem
- Deliver the bounded slice for add eslint raise branch threshold and fix unsafe as-any cast without widening scope.

# Scope
- In: one coherent delivery slice from the source request.
- Out: unrelated sibling slices that should stay in separate backlog items instead of widening this doc.

```mermaid
%% logics-kind: backlog
%% logics-signature: backlog|add-eslint-raise-branch-threshold-and-fi|req-172-harden-static-analysis-and-branc|deliver-the-bounded-slice-for-add|ac1-confirm-add-eslint-raise-branch
flowchart TD
    A[Start] --> B[Add eslint raise branch threshold]
    B --> C[Fix unsafe as-any cast]
    C --> D[Confirm one coherent backlog slice]
    D --> E[Deliver bounded slice without widening scope]
    E --> F[End]
```

# Acceptance criteria
- AC1: Confirm add eslint raise branch threshold and fix unsafe as-any cast delivers one coherent backlog slice.

# AC Traceability
- AC1 -> Scope: Deliver the bounded slice for add eslint raise branch threshold and fix unsafe as-any cast. Proof: capture validation evidence in this doc.
- AC2 -> Scope: No separate slice beyond the ESLint and branch-threshold hardening work. Proof: the linked request and task keep the scope bounded and traceable.
- AC3 -> Scope: No separate slice beyond the ESLint and branch-threshold hardening work. Proof: the linked request and task keep the scope bounded and traceable.
- AC4 -> Scope: No separate slice beyond the ESLint and branch-threshold hardening work. Proof: the linked request and task keep the scope bounded and traceable.
- AC5 -> Scope: No separate slice beyond the ESLint and branch-threshold hardening work. Proof: the linked request and task keep the scope bounded and traceable.

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
- Request: `logics/request/req_172_harden_static_analysis_and_branch_coverage_safety_net.md`
- Primary task(s): `logics/tasks/task_134_wave_1_maintenance_hardening_graph_embeddings_coverage_and_static_analysis.md`

# AI Context
- Summary: add eslint raise branch threshold and fix unsafe as-any cast
- Keywords: add, eslint, raise, branch, threshold, and, fix, unsafe
- Use when: Use when implementing or reviewing the delivery slice for add eslint raise branch threshold and fix unsafe as-any cast.
- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.
# Priority
- Impact:
- Urgency:

# Notes
