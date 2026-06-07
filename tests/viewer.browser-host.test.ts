import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

function loadScript(dom: JSDOM, relPath: string) {
  const source = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
  new vm.Script(source, { filename: relPath }).runInContext(dom.getInternalVMContext());
}

function createViewerDom(options: { editResponse?: { ok: boolean; status?: number; body: unknown } } = {}) {
  const html = `<!doctype html><html><body>
    <div id="viewer-meta"></div>
    <div id="viewer-update" hidden><span id="viewer-update-copy"></span><code id="viewer-update-command"></code></div>
    <button id="viewer-insights" type="button">Insights</button>
    <button id="header-logics-insights" type="button">Open corpus insights</button>
    <button id="viewer-health" type="button">Health</button>
    <button data-action="refresh" type="button">Refresh</button>
    <select data-viewer-filter-group="focus" aria-label="Corpus focus">
      <option value="active">Active work</option>
      <option value="blocked">Blocked</option>
      <option value="needs-promotion">Needs promotion</option>
      <option value="all">All docs</option>
    </select>
    <select data-viewer-filter-group="type" aria-label="Document type">
      <option value="all">All</option>
      <option value="task">Tasks</option>
      <option value="companion">Companions</option>
    </select>
    <select data-viewer-filter-group="status" aria-label="Status">
      <option value="any">Any status</option>
      <option value="blocked">Blocked status</option>
    </select>
    <select data-viewer-filter-group="relation" aria-label="Relationships">
      <option value="any">Any</option>
      <option value="unlinked">Unlinked</option>
      <option value="needs-promotion">Needs promotion relation</option>
    </select>
    <select data-viewer-filter-group="activity" aria-label="Activity">
      <option value="any">Any</option>
      <option value="stale">Stale</option>
    </select>
    <div id="viewer-filter-count"></div>
    <button id="filter-reset" type="button">Clear filters</button>
    <input id="search-input" />
    <input id="hide-complete" type="checkbox" />
    <input id="hide-processed-requests" type="checkbox" />
    <input id="hide-spec" type="checkbox" />
    <input id="show-companion-docs" type="checkbox" />
    <select id="group-by"><option value="stage">Stage</option><option value="status">Status</option></select>
    <select id="sort-by"><option value="updated-desc">Updated</option></select>
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
      if (url === "/api/items" || url === "/api/refresh") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              root: "/workspace/logics-manager",
              items: [
                { id: "req_001_demo", title: "Demo", stage: "request", relPath: "logics/request/req_001_demo.md", references: [], usedBy: [], indicators: { Status: "Ready" }, isPromoted: false, updatedAt: "2026-06-01T10:00:00" },
                { id: "task_001_blocked", title: "Blocked", stage: "task", relPath: "logics/tasks/task_001_blocked.md", references: [], usedBy: [], indicators: { Status: "Blocked" }, isPromoted: false, updatedAt: "2026-06-02T10:00:00" }
              ],
              updateInfo: {
                currentVersion: "2.2.0",
                latestVersion: "2.3.0",
                updateAvailable: true,
                updateCommand: "logics-manager self-update"
              }
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
        if (options.editResponse) {
          return {
            ok: options.editResponse.ok,
            status: options.editResponse.status ?? (options.editResponse.ok ? 200 : 500),
            json: async () => options.editResponse?.body
          };
        }
        return {
          ok: true,
          status: 200,
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
  function setViewerFilter(dom: JSDOM, group: string, value: string) {
    const control = dom.window.document.querySelector(`[data-viewer-filter-group="${group}"]`) as HTMLSelectElement | null;
    if (!control) {
      throw new Error(`Missing viewer filter group: ${group}`);
    }
    control.value = value;
    control.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  }

  it("renders the local corpus filter panel closed by default", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const panel = dom.window.document.getElementById("filter-panel");
    const toggle = dom.window.document.getElementById("filter-toggle");

    expect(panel?.hasAttribute("hidden")).toBe(true);
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("lets the hidden attribute override the viewer filter grid layout", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    const dom = new JSDOM(html, { pretendToBeVisual: true });
    const style = dom.window.document.createElement("style");
    style.textContent = css;
    dom.window.document.head.appendChild(style);

    const panel = dom.window.document.getElementById("filter-panel") as HTMLDivElement | null;

    expect(panel).not.toBeNull();
    expect(dom.window.getComputedStyle(panel as HTMLDivElement).display).toBe("none");
    panel?.removeAttribute("hidden");
    expect(dom.window.getComputedStyle(panel as HTMLDivElement).display).toBe("grid");
  });

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

  it("explains stale viewer servers that do not expose the edit endpoint", async () => {
    const { dom } = createViewerDom({
      editResponse: { ok: false, status: 404, body: { ok: false, error: "Not found" } }
    });
    const api = dom.window.acquireVsCodeApi();

    api.setState({ selectedId: "req_001_demo" });
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const edit = dom.window.document.querySelector('[data-viewer-action="edit-document"]') as HTMLButtonElement | null;
    edit?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Restart the local viewer");
  });

  it("refreshes viewer data from the refresh button", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const refresh = dom.window.document.querySelector('[data-action="refresh"]') as HTMLButtonElement | null;
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/refresh");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("refreshed");
  });

  it("renders update availability from viewer payloads", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const banner = dom.window.document.getElementById("viewer-update");
    expect(banner?.hidden).toBe(false);
    expect(dom.window.document.getElementById("viewer-update-copy")?.textContent).toContain("2.3.0");
    expect(dom.window.document.getElementById("viewer-update-command")?.textContent).toBe("logics-manager self-update");
  });

  it("renders local corpus insights from loaded items", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-insights")?.dispatchEvent(new dom.window.Event("click"));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.textContent).toContain("Corpus families");
    expect(content?.textContent).toContain("Blocked");
    expect(content?.textContent).toContain("Incomplete chains");
  });

  it("opens local corpus insights from the toolbar button", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("header-logics-insights")?.dispatchEvent(new dom.window.Event("click"));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.textContent).toContain("Corpus families");
  });

  it("combines local corpus filter axes through the shared viewer filter hook", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    setViewerFilter(dom, "type", "task");
    setViewerFilter(dom, "status", "blocked");

    expect(typeof dom.window.__CDX_LOGICS_VIEWER_FILTER__).toBe("function");
    expect(dom.window.__CDX_LOGICS_VIEWER_FILTER__({ stage: "task", indicators: { Status: "Blocked" }, references: [], usedBy: [] })).toBe(true);
    expect(dom.window.__CDX_LOGICS_VIEWER_FILTER__({ stage: "request", indicators: { Status: "Blocked" }, references: [], usedBy: [] })).toBe(false);
    expect(dom.window.__CDX_LOGICS_VIEWER_FILTER__({ stage: "task", indicators: { Status: "Ready" }, references: [], usedBy: [] })).toBe(false);
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("1 of 2");
  });

  it("supports corpus-management filters for relationships, companion docs, stale work, and promotion gaps", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const clickFilter = (group: string, value: string) => setViewerFilter(dom, group, value);
    const reset = () => dom.window.document.getElementById("filter-reset")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const matches = (item: Record<string, unknown>) => dom.window.__CDX_LOGICS_VIEWER_FILTER__(item);

    clickFilter("focus", "all");
    clickFilter("type", "companion");
    expect(matches({ stage: "product", indicators: { Status: "Ready" }, references: [], usedBy: [] })).toBe(true);
    expect(matches({ stage: "task", indicators: { Status: "Ready" }, references: [], usedBy: [] })).toBe(false);

    reset();
    clickFilter("relation", "unlinked");
    expect(matches({ stage: "task", indicators: { Status: "Ready" }, references: [], usedBy: [] })).toBe(true);
    expect(matches({ stage: "task", indicators: { Status: "Ready" }, references: ["req_001_demo"], usedBy: [] })).toBe(false);

    reset();
    clickFilter("activity", "stale");
    expect(matches({ stage: "task", indicators: { Status: "Ready" }, references: [], usedBy: [], updatedAt: "2025-01-01T00:00:00Z" })).toBe(true);
    expect(matches({ stage: "task", indicators: { Status: "Done" }, references: [], usedBy: [], updatedAt: "2025-01-01T00:00:00Z" })).toBe(false);

    reset();
    clickFilter("focus", "needs-promotion");
    expect(matches({ stage: "request", indicators: { Status: "Ready" }, references: [], usedBy: [], isPromoted: false })).toBe(true);
    expect(matches({ stage: "request", indicators: { Status: "Ready" }, references: [], usedBy: [], isPromoted: true })).toBe(false);
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
