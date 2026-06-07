import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

function loadScript(dom: JSDOM, relPath: string) {
  const source = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
  new vm.Script(source, { filename: relPath }).runInContext(dom.getInternalVMContext());
}

function createViewerDom() {
  const html = `<!doctype html><html><body>
    <div id="viewer-meta"></div>
    <button id="viewer-health" type="button">Health</button>
    <button id="viewer-document-close" type="button">Close</button>
    <button data-action="open" type="button">Open</button>
    <button data-action="read" type="button">Read</button>
    <button data-action="promote" type="button">Promote</button>
    <button data-action="mark-done" type="button">Done</button>
    <button data-action="mark-obsolete" type="button">Obsolete</button>
    <button data-action="change-status" type="button">Status</button>
    <button data-viewer-action="edit-document" type="button" disabled>Edit document</button>
    <section id="viewer-document" hidden>
      <div id="viewer-document-title"></div>
      <div id="viewer-document-content"></div>
    </section>
  </body></html>`;
  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://127.0.0.1:8765/" });
  const calls: string[] = [];
  const markdown = [
    "## req_001_demo - Demo",
    "> Status: Draft",
    "",
    "# Needs",
    "- Render **markdown**.",
    "",
    "```mermaid",
    "flowchart TD",
    "  A --> B",
    "```",
    "",
    "| A | B |",
    "| --- | --- |",
    "| `x` | y |"
  ].join("\n");

  Object.defineProperty(dom.window, "fetch", {
    value: async (url: string) => {
      calls.push(String(url));
      if (url === "/api/items") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              root: "/workspace/logics-manager",
              items: [{ id: "req_001_demo", title: "Demo", relPath: "logics/request/req_001_demo.md" }]
            }
          })
        };
      }
      if (String(url).startsWith("/api/doc")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            document: { path: "logics/request/req_001_demo.md", content: markdown }
          })
        };
      }
      if (String(url).startsWith("/api/edit")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            document: { path: "logics/request/req_001_demo.md", command: "open" }
          })
        };
      }
      if (url === "/api/lint") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: { ok: false, issue_count: 1, warning_count: 0, issues: [{ path: "logics/request/req_001_demo.md", message: "Missing backlog link", severity: "blocking" }] }
          })
        };
      }
      if (url === "/api/audit") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: { release_ready: true, issue_count: 0, warning_count: 1, warnings: [{ path: "logics/request/req_001_demo.md", message: "Review wording", severity: "warning" }] }
          })
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }
  });

  loadScript(dom, "clients/shared-web/media/renderMarkdown.js");
  new vm.Script(`
    window.__mermaidRuns = [];
    window.mermaid = {
      initialize: () => undefined,
      run: ({ nodes }) => {
        window.__mermaidRuns.push(nodes.length);
        return Promise.resolve();
      }
    };
  `).runInContext(dom.getInternalVMContext());
  loadScript(dom, "clients/viewer/browser-host.js");
  dom.window.dispatchEvent(new dom.window.Event("load"));
  return { dom, calls };
}

describe("local viewer browser host", () => {
  it("keeps the local surface read-only and renders markdown documents", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const promote = dom.window.document.querySelector('[data-action="promote"]') as HTMLButtonElement | null;
    const open = dom.window.document.querySelector('[data-action="open"]') as HTMLButtonElement | null;
    const read = dom.window.document.querySelector('[data-action="read"]') as HTMLButtonElement | null;
    const edit = dom.window.document.querySelector('[data-viewer-action="edit-document"]') as HTMLButtonElement | null;
    expect(promote?.hidden).toBe(true);
    expect(open?.hidden).toBe(true);
    expect(read?.textContent).toBe("Read document");
    expect(read?.title).toBe("Read selected document");
    expect(edit?.disabled).toBe(true);

    api.postMessage({ type: "read", id: "req_001_demo" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 10));

    const panel = dom.window.document.getElementById("viewer-document");
    const content = dom.window.document.getElementById("viewer-document-content");
    expect(panel?.hidden).toBe(false);
    expect(content?.querySelector("h1")?.textContent).toBe("Needs");
    expect(content?.querySelector("strong")?.textContent).toBe("markdown");
    expect(content?.querySelector("table")).not.toBeNull();
    expect(content?.querySelector("pre.mermaid")?.textContent).toContain("flowchart TD");
    expect(dom.window.__mermaidRuns).toEqual([1]);
  });

  it("opens the selected document through the local edit endpoint", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.setState({ selectedId: "req_001_demo" });
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const edit = dom.window.document.querySelector('[data-viewer-action="edit-document"]') as HTMLButtonElement | null;
    expect(edit?.disabled).toBe(false);
    edit?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/edit?path=logics%2Frequest%2Freq_001_demo.md");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Opened logics/request/req_001_demo.md");
  });

  it("renders health as a summary with document links", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.getElementById("viewer-health")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.textContent).toContain("Blocking");
    expect(content?.textContent).toContain("Warnings");
    expect(content?.textContent).toContain("Missing backlog link");
    expect(content?.querySelector("[data-viewer-doc-path]")?.textContent).toBe("logics/request/req_001_demo.md");

    (content?.querySelector("[data-viewer-doc-path]") as HTMLButtonElement | null)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.some((call) => call.startsWith("/api/doc"))).toBe(true);
  });
});
