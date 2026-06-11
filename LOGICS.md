<!-- logics kit instructions for AI assistants -->
## Logics workflow kit

This project uses a lightweight product flow managed under `logics/`.
**Always use the canonical `logics-manager` CLI** to create or update workflow docs — never edit indicators or links by hand.

### Workflow stages

```
logics/request/   →   logics/backlog/   →   logics/tasks/
  req_NNN_*.md         item_NNN_*.md         task_NNN_*.md
```

- **request** — problem statement + context. Create one when a new need or idea surfaces.
- **backlog** — scoped delivery slice with acceptance criteria. Promoted from a request.
- **task** — executable plan with steps and validation. Promoted from a backlog item.

Companion docs live in `logics/product/` (product briefs) and `logics/architecture/` (ADRs).

### CLI — canonical commands

```bash
# Create a new doc (picks next available ID automatically)
python3 -m logics_manager flow new request  --title "..."
python3 -m logics_manager flow new backlog  --title "..."
python3 -m logics_manager flow new task     --title "..."

# Promote between stages
python3 -m logics_manager flow promote request-to-backlog logics/request/req_NNN_*.md
python3 -m logics_manager flow promote backlog-to-task    logics/backlog/item_NNN_*.md

# Inspect bounded workflow context before reading files directly
python3 -m logics_manager flow show req_NNN_example
python3 -m logics_manager sync read-doc task_NNN_example --max-chars 6000
python3 -m logics_manager sync context-pack req_NNN_example task_NNN_example --format json

# Repair scoped workflow hygiene without touching unrelated docs
python3 -m logics_manager sync refresh-mermaid-signatures task_NNN_example
python3 -m logics_manager sync refresh-mermaid-signatures --changed-only
python3 -m logics_manager flow closeout task_NNN_example --validation-command "pytest tests" --validation-result passed --lint --audit

# Finish a task (propagates closure up the chain)
python3 -m logics_manager flow finish task logics/tasks/task_NNN_*.md

# Lint and audit after any edit
python3 -m logics_manager lint --require-status
python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc
```

### Indicators (keep at the top of every doc)

| Indicator | Values |
|-----------|--------|
| `From version` | semver string, e.g. `1.24.0` |
| `Status` | Workflow: `Draft` · `Ready` · `In progress` · `Blocked` · `Done` · `Obsolete` · `Archived`; product brief: `Draft` · `Proposed` · `Active` · `Accepted` · `Validated` · `Rejected` · `Superseded` · `Settled` · `Archived`; ADR: `Draft` · `Proposed` · `Accepted` · `Validated` · `Rejected` · `Superseded` · `Settled` · `Archived` |
| `Understanding` | `0–100%` — how well the need is understood |
| `Confidence` | `0–100%` — confidence in the solution |
| `Progress` | `0–100%` — mainly for tasks and backlog items |
| `Complexity` | `Low` · `Medium` · `High` |
| `Theme` | e.g. `UI` · `Economy` · `Combat` |

### Mermaid safety rules (mandatory)

- Plain ASCII labels only — no backticks, bold, italics, or inline code inside node labels.
- No raw route syntax or braces: write `users-id route` not `/users/{id}`.
- Keep labels short and business-readable.
- Every diagram must include `%% logics-kind: request|backlog|task` and `%% logics-signature: ...` comments.
  Run `python3 -m logics_manager lint` after edits to detect stale signatures.

### Key conventions

- Never write absolute filesystem paths (`/Users/...`) in Logics docs — use repo-relative paths (`logics/...`, `src/...`).
- Lineage links follow the pattern: `Derived from \`logics/request/req_NNN_*.md\``.
- Keep `# Backlog` and `# References` sections up to date with backticked relative paths.
- Run `lint` + `audit` after every edit to catch broken links, stale signatures, and missing indicators.
- When a task is done, use `flow finish task` — do not manually set `Status: Done`.

### Kit repair and update

If the kit is broken or outdated, follow this diagnosis flow in order.

**1. Check whether the CLI is reachable**

```bash
python3 -m logics_manager --help
```

If this fails with `No such file or directory` or `ModuleNotFoundError`, the submodule is not initialised — go to step 2.
If it works but commands behave unexpectedly, go to step 3.

**2. Initialise or restore the submodule**

```bash
git submodule update --init logics/skills
```

Then verify the CLI works again (step 1) before continuing.

**3. Check whether the folder structure needs repair**

```bash
python3 -m logics_manager bootstrap --check
```

If actions are reported, apply them:

```bash
python3 -m logics_manager bootstrap
```

This recreates any missing `logics/` subdirectories, `.gitkeep` files, and a default `logics/instructions.md` if absent.
It is safe to re-run — it only adds what is missing, never overwrites existing content.

**4. Update the kit to the latest version**

```bash
git submodule update --remote logics/skills
```

After updating, re-run lint and audit to catch any breaking changes in doc format:

```bash
python3 -m logics_manager lint --require-status
python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc
```

**Quick reference — when to use which command**

| Symptom | Command |
|---------|---------|
| `logics-manager` not found / CLI unavailable | `python3 -m logics_manager --help` |
| Missing `logics/` folders or `.gitkeep` files | `python3 -m logics_manager bootstrap` |
| Toolkit present but stale / new features missing | `git submodule update --remote logics/skills` |
| Unsure what is broken | `python3 -m logics_manager bootstrap --check` |

### UI/UX work — UI steering skill

**Always activate the UI steering skill when generating or refining frontend UI code.**
Skill: `logics/skills/logics-ui-steering/SKILL.md`

The skill is a narrow implementation-time guardrail — not a broad UX strategy. Its job is to keep generated UI grounded, product-native, and free of generic AI-looking layouts.

**Activate with:** `$logics-ui-steering` or select the paired agent from the Logics agent picker.

Rules that always apply when touching UI:
- Reuse existing tokens, CSS variables, theme files, and components **first**.
- Follow the project design system if one exists — do not introduce new visual primitives without reason.
- Reject decorative flair, fake metrics, fake charts, and landing-page theatrics in internal tools.
- Apply grounded defaults from `logics/skills/logics-ui-steering/references/primitives.md`.
- Avoid the anti-patterns listed in `logics/skills/logics-ui-steering/references/banned_patterns.md`.
- If no project palette exists, pick from `logics/skills/logics-ui-steering/references/palettes.md`.

### Companion tools (use if available)

These tools are independent of the Logics kit but complement it. Check whether they are installed before starting any session.

**RTK — token-optimized CLI proxy**

```bash
rtk --version   # installed if this works
rtk gain        # show token savings so far
```

If RTK is installed, all shell commands (git, npm, etc.) are automatically proxied through it — no change to your workflow needed.
If it is missing, commands still work normally but you will consume more tokens on file-heavy operations.

**code-review-graph MCP — structural knowledge graph**

Check availability: the MCP tools appear in the tool list as `mcp__code-review-graph__*`.

If the graph is available:
- Use `semantic_search_nodes` or `query_graph` **instead of** Grep/Glob to explore the codebase.
- Use `get_impact_radius` to understand blast radius before touching shared code.
- Use `detect_changes` + `get_review_context` for code review instead of reading entire files.
- Fall back to Grep/Glob/Read only when the graph does not cover what you need.

If neither tool is available, proceed with standard file tools — Grep, Glob, Read.

### When to use the kit vs. interactive session

| Situation | Approach |
|-----------|----------|
| New idea or user feedback | `flow new request` |
| Scoping a request for delivery | `flow promote request-to-backlog` |
| Planning implementation | `flow promote backlog-to-task` |
| Completing work | `flow finish task` |
| Grooming / triage | Read existing docs, update indicators, run audit |
| Generating or refining UI code | Activate `$logics-ui-steering` before writing any frontend code |
| Multi-turn reasoning or codebase exploration | Interactive Claude / Codex session |
