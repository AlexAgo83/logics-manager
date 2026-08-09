// req_320/item_661: the Mermaid flowchart string built from a chain-graph
// payload must use each node's ref as its node id (refs are already valid
// unquoted Mermaid identifiers) and wire a click callback per node so the
// viewer can jump to that document.
import { describe, expect, it } from "vitest";
import { buildChainFlowchartSource } from "../clients/viewer/src/browser-host/graph.js";

describe("buildChainFlowchartSource", () => {
  it("returns null for an empty node list", () => {
    expect(buildChainFlowchartSource({ nodes: [], edges: [] })).toBeNull();
    expect(buildChainFlowchartSource(null)).toBeNull();
  });

  it("renders a single node with no edges", () => {
    const source = buildChainFlowchartSource({
      nodes: [{ ref: "req_001_demo", kind: "request", title: "Demo", status: "Doing" }],
      edges: []
    });
    expect(source).toContain("flowchart TD");
    expect(source).toContain('req_001_demo["Demo');
    expect(source).not.toMatch(/-->/);
  });

  it("renders every edge and a click callback per node", () => {
    const source = buildChainFlowchartSource({
      nodes: [
        { ref: "req_001_demo", kind: "request", title: "Demo", status: "Doing" },
        { ref: "item_001_slice", kind: "backlog", title: "Slice", status: "Ready" }
      ],
      edges: [{ from: "req_001_demo", to: "item_001_slice" }]
    });
    expect(source).toContain("req_001_demo --> item_001_slice");
    expect(source).toContain('click req_001_demo call __logicsGraphNodeClick("req_001_demo")');
    expect(source).toContain('click item_001_slice call __logicsGraphNodeClick("item_001_slice")');
  });

  it("escapes double quotes in titles so they cannot break the label syntax", () => {
    const source = buildChainFlowchartSource({
      nodes: [{ ref: "req_001_demo", kind: "request", title: 'Has "quotes"', status: "Doing" }],
      edges: []
    });
    expect(source).not.toContain('"quotes"');
    expect(source).toContain("'quotes'");
  });
});
