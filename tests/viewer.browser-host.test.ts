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
    expect(promote?.hidden).toBe(true);
    expect(open?.hidden).toBe(true);
    expect(read?.textContent).toBe("Read document");
    expect(read?.title).toBe("Read selected document");

    api.postMessage({ type: "read", id: "req_001_demo" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = dom.window.document.getElementById("viewer-document");
    const content = dom.window.document.getElementById("viewer-document-content");
    expect(panel?.hidden).toBe(false);
    expect(content?.querySelector("h1")?.textContent).toBe("Needs");
    expect(content?.querySelector("strong")?.textContent).toBe("markdown");
    expect(content?.querySelector("table")).not.toBeNull();
    expect(content?.querySelector("pre")).toBeNull();
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
