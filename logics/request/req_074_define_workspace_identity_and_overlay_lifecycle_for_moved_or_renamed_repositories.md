## req_074_define_workspace_identity_and_overlay_lifecycle_for_moved_or_renamed_repositories - Define workspace identity and overlay lifecycle for moved or renamed repositories
> From version: 1.10.8
> Status: Done
> Understanding: 95%
> Confidence: 91%
> Complexity: Medium
> Theme: Workspace identity, overlay lifecycle, and repository movement
> Reminder: Update status/understanding/confidence and references when you edit this doc.

# Needs
- Define how workspace overlays are identified and how they should behave when repositories move, are renamed, are recloned, or become obsolete.
- Prevent overlay state from becoming orphaned, duplicated, or silently rebound to the wrong repository over time.
- Give the overlay system a durable lifecycle model instead of assuming repository paths never change.

# Context
Workspace overlays are expected to live outside the repository, likely under a path such as `~/.codex-workspaces/<repo-id>/`. That immediately raises lifecycle questions:
- How is `<repo-id>` derived?
- Is it path-based, git-based, or content-based?
- What happens if the same repository is cloned twice?
- What happens if a repository folder is renamed or moved?
- When is an old overlay considered obsolete and safe to clean?

Without an identity and lifecycle contract, several classes of bugs are likely:
- overlays can be duplicated for the same logical repo without intent;
- moved repos can leave behind stale overlays that still look valid;
- diagnostics will not know whether a broken binding is drift, duplication, or expected coexistence;
- operators may be afraid to clean old overlays because ownership is unclear.

This request is therefore about the persistent identity model and lifecycle boundaries for workspace overlays, not the low-level publication mechanics.

```mermaid
%% logics-kind: request
%% logics-signature: request|define-workspace-identity-and-overlay-li|define-how-workspace-overlays-are-identi|ac1-the-request-defines-a-stable
flowchart LR
    Workspace[Workspace overlay exists outside repo] --> Identity[Stable workspace identity model]
    Identity --> Move[Moves clones and renames are handled]
    Move --> Lifecycle[Cleanup and rebinding are explicit]
    Lifecycle --> Outcome[Overlay state stays durable]
```

# Acceptance criteria
- AC1: The request defines a stable workspace identity model for overlays that is explicit enough to support creation, lookup, and cleanup.
- AC2: The request explicitly covers at least these lifecycle situations:
  - repository moved or renamed;
  - same repository cloned more than once;
  - overlay no longer used and eligible for cleanup;
  - stale binding between overlay and source repository.
- AC3: The request defines how identity and lifecycle policy should interact with diagnostics and operator tooling instead of leaving those integrations implicit.
- AC4: The request is concrete enough that a future implementation can decide whether the identity key should be path-based, git-based, or hybrid, while still meeting the lifecycle requirements.
- AC5: The request keeps identity and lifecycle concerns separate from precedence policy and cross-platform publication mechanics.
- AC6: The request makes clear that overlay cleanup and rebinding must be conservative enough to avoid data loss or accidental reassignment.

# Scope
- In:
  - Define overlay identity requirements.
  - Define lifecycle events and cleanup boundaries.
  - Cover moved, renamed, duplicated, and obsolete repository scenarios.
- Out:
  - Designing every operator command in detail.
  - Solving link mechanics per platform.
  - Replacing repository-local ownership of Logics skills.

# Dependencies and risks
- Dependency: overlays exist as persistent state outside repositories.
- Dependency: operators need to manage more than one workspace over time, not just a single disposable demo overlay.
- Risk: if identity is based only on current path, moved repos may look like new workspaces and strand old state.
- Risk: if identity is too abstract, separate clones may be merged when users actually expect isolation.
- Risk: aggressive cleanup semantics could remove overlays that are still in use or still diagnostically useful.

# Clarifications
- This request is about the durable identity of workspace overlays, not about which skills they contain.
- It is acceptable for the first implementation to prefer a pragmatic identity scheme, as long as the lifecycle implications are explicit.
- The goal is predictable ownership and cleanup, not perfect deduplication at all costs.

# References
- Related request(s): `logics/request/req_067_add_multi_project_codex_workspace_overlays_for_logics_skills.md`
- Related request(s): `logics/request/req_071_add_diagnostics_and_self_healing_for_codex_workspace_overlays.md`

# Definition of Ready (DoR)
- [x] Problem statement is explicit and user impact is clear.
- [x] Scope boundaries (in/out) are explicit.
- [x] Acceptance criteria are testable.
- [x] Dependencies and known risks are listed.

# Companion docs
- Product brief(s): (none yet)
- Architecture decision(s): `adr_008_keep_codex_workspace_overlays_repo_local_isolated_and_composable`



# Backlog
- `item_097_define_workspace_identity_and_overlay_lifecycle_for_moved_or_renamed_repositories`
