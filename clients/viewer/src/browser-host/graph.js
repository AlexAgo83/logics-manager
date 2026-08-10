// req_320/item_661: render a request's chain (request -> product brief ->
// backlog items -> tasks) as a Mermaid flowchart, using only the structural
// links `/api/chain-graph` already resolved (never a full-text ref scan -
// see logics_manager/chain_graph.py for why that distinction matters).

function _escapeMermaidLabel(text) {
  return String(text || "").replace(/"/g, "'").replace(/[\r\n]+/g, " ");
}

// Exported standalone so it can be unit tested without a DOM.
export function buildChainFlowchartSource(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload?.edges) ? payload.edges : [];
  if (nodes.length === 0) {
    return null;
  }
  const lines = ["flowchart TD"];
  for (const node of nodes) {
    const label = _escapeMermaidLabel(`${node.title || node.ref}\n${node.kind} · ${node.status || "unknown"}`);
    lines.push(`  ${node.ref}["${label}"]`);
  }
  for (const edge of edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`);
  }
  for (const node of nodes) {
    lines.push(`  click ${node.ref} call __logicsGraphNodeClick("${node.ref}")`);
  }
  lines.push("  classDef request fill:#2d5b97,stroke:#79b8ff,color:#fff,stroke-width:1.5px");
  lines.push("  classDef product fill:#6b4ea0,stroke:#c4b5fd,color:#fff,stroke-width:1.5px");
  lines.push("  classDef backlog fill:#176b63,stroke:#5eead4,color:#fff,stroke-width:1.5px");
  lines.push("  classDef task fill:#8a4b18,stroke:#fbbf24,color:#fff,stroke-width:1.5px");
  for (const node of nodes) {
    lines.push(`  class ${node.ref} ${node.kind === "backlog" ? "backlog" : node.kind === "product" ? "product" : node.kind === "task" ? "task" : "request"}`);
  }
  return lines.join("\n");
}

export function renderChainGraph(payload, { inline = false } = {}) {
  const source = buildChainFlowchartSource(payload);
  const dangling = Array.isArray(payload?.dangling) ? payload.dangling : [];
  const notes = dangling.length
    ? `<p class="viewer-graph__dangling">Not resolved (no doc on disk): ${dangling.map(_escapeMermaidLabel).join(", ")}</p>`
    : "";
  if (!source) {
    return `<section class="viewer-graph${inline ? " viewer-graph--inline" : ""}"><p>No chain resolved.</p>${notes}</section>`;
  }
  return `<section class="viewer-graph${inline ? " viewer-graph--inline" : ""}" aria-label="Linked workflow chain"><div class="viewer-graph__label">Linked workflow</div><pre class="mermaid">${source}</pre>${notes}</section>`;
}

export function createGraphScreen(host) {
  async function showChainGraph(ref, options = {}) {
    host.setMeta("Resolving chain graph...");
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch(`/api/chain-graph?ref=${encodeURIComponent(ref)}`, { signal: view.signal });
      try {
        data = await response.json();
      } catch {
        data = {};
      }
    } catch (error) {
      if (host.isAbortError && host.isAbortError(error)) {
        return;
      }
      throw error;
    }
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      host.setDocument("Graph", `<p>Unable to resolve chain graph: ${_escapeMermaidLabel(data.error || response.statusText)}</p>`);
      host.setMeta("Chain graph failed to load.");
      return;
    }
    // window.__logicsGraphNodeClick is read by Mermaid's `click ... call` syntax
    // at diagram-run time, so it must be in place before renderMermaidDiagrams runs.
    window.__logicsGraphNodeClick = (nodeRef) => host.openDoc(nodeRef);
    host.setDocument("Graph", renderChainGraph(data.payload));
    host.renderMermaidDiagrams();
    host.setMeta("Chain graph loaded.");
  }

  return { showChainGraph };
}
