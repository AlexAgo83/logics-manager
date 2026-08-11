# Logics Manager 2.21.5

Operational runbooks are now a first-class Logics companion document, the VS
Code extension resolves one installed CLI instead of a bundled Python copy and
refreshes existing projects silently, and a webview state bug that kept
flipping the Board back to Activity is fixed.

## Discoverable operational runbooks

Runbooks (`run_` refs, `logics/runbook/`, Draft/Active/Archived) join product
briefs, roadmaps, and architecture decisions as a companion document kind, wired
through the same read/list/search/context-pack/lint/audit/MCP surfaces every
other kind already uses. `logics-manager sync match-runbooks` finds at most
three relevant Active runbooks from an intent, symptom, path, or task context,
ranked by category/path/trigger before plain text, each with its matching
reason. `logics-manager flow companion runbook` creates one the same way every
other companion doc is created.

Workshop gets a Runbooks tab between Commands and Explorer: search, a recent
list, and a library graph (category to runbook to linked document) that reuses
the existing chain-graph Mermaid renderer instead of a new one. Draft, Active,
and Archived transitions use the viewer's existing generic status-update path.

Cross-repository import and automatic capture-from-task tooling were
deliberately scoped out: runbooks are created the same deliberate way as any
other companion document.

## One resolved CLI runtime, silent bootstrap refresh

The VS Code extension now resolves exactly one installed `logics-manager` CLI
from PATH per project, requiring an exact version match with the extension
before routing any normal CLI-backed operation through it. A missing or
mismatched CLI leaves the extension read-only with one clear action in Check
Environment; there is no hidden fallback to a bundled Python copy.

`logics-manager bootstrap --refresh-managed` refreshes only generated files and
marked managed regions for an existing corpus, and refuses to create a new one.
Opening an already-initialized project after the resolved CLI changes now
applies that refresh silently, with the result logged to the existing
Environment output channel instead of a popup.

The startup notification chain (runtime-version popup into bootstrap repair
into global Codex/Claude publication offers) is gone. Opening a healthy project
shows no popup; a project that needs attention gets one passive status path to
Check Environment. Explicit Tools-menu commands for global publication and
launch are unchanged.

## Webview Activity view no longer resets itself

Fixed a bug where the Board webview (VS Code extension and standalone browser
viewer) flipped back to the Activity view on its own, discarding filters and
the current selection, even though the user had switched to Project. A stale
one-time workspace-root comparison was re-triggering the reset on every
file-watcher-driven refresh instead of only on a genuine workspace switch.

## Validation

- `python3 -m pytest tests/python -q`
- `npx vitest run`
- `npm run lint`
- `logics-manager lint --require-status`
- `logics-manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`
