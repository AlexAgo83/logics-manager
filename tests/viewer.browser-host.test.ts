import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

function loadScript(dom: JSDOM, relPath: string) {
  const source = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
  new vm.Script(source, { filename: relPath }).runInContext(dom.getInternalVMContext());
}

function createViewerDom(options: {
  editResponse?: { ok: boolean; status?: number; body: unknown };
  gitResponseFactory?: () => { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponses?: Array<{ ok: boolean; status?: number; body?: unknown; rawBody?: string }>;
  hidden?: boolean;
  initialState?: unknown;
  refreshGate?: Promise<void>;
  url?: string;
} = {}) {
  const html = `<!doctype html><html><body>
    <div id="viewer-meta"></div>
    <span id="viewer-repo-pill"></span>
    <div id="viewer-update" hidden><span id="viewer-update-copy"></span><code id="viewer-update-command"></code></div>
    <label><input id="viewer-auto-refresh" type="checkbox" checked />Auto</label>
    <button id="viewer-git" type="button">Git</button>
    <button id="viewer-insights" type="button">Insights</button>
    <button id="viewer-health" type="button">Health</button>
    <button id="activity-clear" type="button">Clear activity</button>
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
  const dom = new JSDOM(html, { runScripts: "outside-only", url: options.url || "http://127.0.0.1:8765/" });
  Object.defineProperty(dom.window.document, "hidden", { configurable: true, value: Boolean(options.hidden) });
  Object.defineProperty(dom.window.document, "visibilityState", {
    configurable: true,
    value: options.hidden ? "hidden" : "visible"
  });
  if (options.initialState) {
    dom.window.localStorage.setItem("logics.localViewer.state", JSON.stringify(options.initialState));
  }
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
    configurable: true,
    value: async (url: string) => {
      calls.push(String(url));
      if (url === "/api/items" || url === "/api/refresh") {
        if (url === "/api/refresh" && options.refreshGate) {
          await options.refreshGate;
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              root: "/workspace/logics-manager",
              repoName: "logics-manager",
              autoRefreshIntervalSeconds: 15,
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
      if (url === "/api/git-status") {
        const queuedGitResponse = options.gitResponses?.shift();
        const gitResponse = queuedGitResponse || options.gitResponseFactory?.() || options.gitResponse;
        if (gitResponse) {
          return {
            ok: gitResponse.ok,
            status: gitResponse.status ?? (gitResponse.ok ? 200 : 500),
            json: async () => {
              if (gitResponse.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return gitResponse.body || {};
            }
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              branch: "main",
              tracking: "origin/main",
              ahead: 1,
              behind: 0,
              clean: false,
              dirty: true,
              latestCommit: "abc1234 Demo commit",
              recentCommits: [
                { hash: "abc1234", subject: "Demo commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" },
                { hash: "def5678", subject: "Previous commit", author: "Sam", date: "2026-06-08", refs: "origin/main" }
              ],
              counts: { staged: 1, modified: 1, deleted: 0, renamed: 0, untracked: 1 },
              groups: {
                staged: [{ path: "logics/request/req_001_demo.md", logicsType: "request" }],
                modified: [{ path: "clients/viewer/browser-host.js" }],
                deleted: [],
                renamed: [],
                untracked: [{ path: "new-file.md" }]
              }
            }
          })
        };
      }
      if (String(url).startsWith("/api/git-diff")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              path: "logics/request/req_001_demo.md",
              mode: "staged",
              diff: "diff --git a/logics/request/req_001_demo.md b/logics/request/req_001_demo.md\n+Demo",
              truncated: false,
              logicsType: "request"
            }
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
  afterEach(() => {
    vi.useRealTimers();
  });

  function setDocumentHidden(dom: JSDOM, hidden: boolean) {
    Object.defineProperty(dom.window.document, "hidden", { configurable: true, value: hidden });
    Object.defineProperty(dom.window.document, "visibilityState", {
      configurable: true,
      value: hidden ? "hidden" : "visible"
    });
    dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  }

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

  it("declares the local viewer favicon from packaged app assets", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const pngIcon = dom.window.document.querySelector('link[rel="icon"][type="image/png"]') as HTMLLinkElement | null;
    const svgIcon = dom.window.document.querySelector('link[rel="alternate icon"][type="image/svg+xml"]') as HTMLLinkElement | null;

    expect(pngIcon?.getAttribute("href")).toBe("/media/icon.png");
    expect(svgIcon?.getAttribute("href")).toBe("/media/logics.svg");
  });

  it("orders local viewer topbar actions as Auto Refresh Git Insights Health", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const labels = Array.from(dom.window.document.querySelectorAll(".viewer-topbar__actions label, .viewer-topbar__actions button"))
      .map((node) => node.textContent?.trim().replace(/\s+/g, " "));

    expect(labels).toEqual(["Auto", "Refresh", "Git", "Insights", "Health"]);
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

  it("focuses a corpus item from the viewer URL query", async () => {
    const { dom } = createViewerDom({ url: "http://127.0.0.1:8765/?focus=task_001_blocked" });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const persistedState = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(persistedState?.selectedId).toBe("task_001_blocked");
    expect(persistedState?.viewerFilterState).toMatchObject({ focus: "all", type: "all" });
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Focused logics/tasks/task_001_blocked.md");
  });

  it("opens read preview when a focused URL requests read mode", async () => {
    const { dom, calls } = createViewerDom({
      url: "http://127.0.0.1:8765/?focus=logics%2Frequest%2Freq_001_demo.md&read=1"
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(calls).toContain("/api/doc?path=logics%2Frequest%2Freq_001_demo.md");
    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("logics/request/req_001_demo.md");
  });

  it("reports invalid or missing viewer focus targets without blocking corpus load", async () => {
    const invalid = createViewerDom({ url: "http://127.0.0.1:8765/?focus=..%2Foutside.md" });
    invalid.dom.window.acquireVsCodeApi().postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(invalid.dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Invalid focus target");

    const missing = createViewerDom({ url: "http://127.0.0.1:8765/?focus=req_999_missing" });
    missing.dom.window.acquireVsCodeApi().postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(missing.dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Focus target not found: req_999_missing");
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

  it("auto-refreshes visible viewer data without page navigation or closing the document preview", async () => {
    vi.useFakeTimers();
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);
    api.postMessage({ type: "read", id: "req_001_demo" });
    await vi.advanceTimersByTimeAsync(20);
    setViewerFilter(dom, "type", "task");

    const locationBefore = dom.window.location.href;
    const metaBefore = dom.window.document.getElementById("viewer-meta")?.textContent;
    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(false);

    await vi.advanceTimersByTimeAsync(15_000);

    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);
    expect(dom.window.location.href).toBe(locationBefore);
    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(false);
    expect((dom.window.document.querySelector('[data-viewer-filter-group="type"]') as HTMLSelectElement | null)?.value).toBe("task");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain(metaBefore?.split(" · next auto refresh")[0] || "");
  });

  it("lets users disable automatic refresh without disabling manual refresh", async () => {
    vi.useFakeTimers();
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);

    const auto = dom.window.document.getElementById("viewer-auto-refresh") as HTMLInputElement | null;
    auto!.checked = false;
    auto?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(15_000);

    expect(calls.filter((call) => call === "/api/refresh").length).toBe(0);

    const refresh = dom.window.document.querySelector('[data-action="refresh"]') as HTMLButtonElement | null;
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(0);

    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);
  });

  it("does not overlap automatic refreshes while a refresh is already in flight", async () => {
    vi.useFakeTimers();
    let releaseRefresh = () => undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const { dom, calls } = createViewerDom({ refreshGate });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(15_000);
    await vi.advanceTimersByTimeAsync(15_000);

    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);

    releaseRefresh();
    await vi.advanceTimersByTimeAsync(0);
  });

  it("defers automatic refresh while hidden and refreshes when visible again", async () => {
    vi.useFakeTimers();
    const { dom, calls } = createViewerDom({ hidden: true });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(15_000);

    expect(calls.filter((call) => call === "/api/refresh").length).toBe(0);

    setDocumentHidden(dom, false);
    await vi.advanceTimersByTimeAsync(0);

    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);
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
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.textContent).toContain("Overview");
    expect(content?.textContent).toContain("Flow health");
    expect(content?.textContent).toContain("Activity");
    expect(content?.textContent).toContain("Traceability");
    expect(content?.textContent).toContain("Quality signals");
    expect(content?.textContent).toContain("Operator actions");
    expect(content?.textContent).toContain("Blocked");
    expect(content?.textContent).toContain("Incomplete workflow chains");
    expect(content?.querySelector("[data-viewer-filter-group]")).not.toBeNull();
    expect(content?.querySelector("[data-viewer-doc-path]")).not.toBeNull();
  });

  it("applies and clears insight-derived filters through normal viewer controls", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-insights")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const action = dom.window.document.querySelector('[data-viewer-filter-group="focus"][data-viewer-filter-value="blocked"]') as HTMLButtonElement | null;
    action?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect((dom.window.document.querySelector('[data-viewer-filter-group="focus"]') as HTMLSelectElement | null)?.value).toBe("blocked");
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("focus: blocked");

    dom.window.document.getElementById("filter-reset")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect((dom.window.document.querySelector('[data-viewer-filter-group="focus"]') as HTMLSelectElement | null)?.value).toBe("active");
  });

  it("renders the local Git status screen from the read-only endpoint", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls).toContain("/api/git-status");
    expect(calls.some((call) => call.startsWith("/api/git-diff?"))).toBe(true);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Git status");
    expect(content?.textContent).toContain("Branch");
    expect(content?.textContent).toContain("main");
    expect(content?.textContent).toContain("Staged");
    expect(content?.textContent).toContain("logics/request/req_001_demo.md");
    expect(content?.textContent).toContain("request");
    expect(content?.textContent).toContain("diff --git");
    const stagedDomain = content?.querySelector('[data-viewer-git-domain="staged"]') as HTMLElement | null;
    stagedDomain?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(stagedDomain?.getAttribute("aria-pressed")).toBe("true");
    expect((content?.querySelector('[data-viewer-git-panel="staged"]') as HTMLElement | null)?.hidden).toBe(false);
    expect((content?.querySelector('[data-viewer-git-panel="changes"]') as HTMLElement | null)?.hidden).toBe(true);
    const historyDomain = content?.querySelector('.viewer-git__domain[data-viewer-git-domain="history"]') as HTMLElement | null;
    historyDomain?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(historyDomain?.textContent).toContain("2");
    expect((content?.querySelector('[data-viewer-git-panel="history"]') as HTMLElement | null)?.hidden).toBe(false);
    expect((content?.querySelector('[data-viewer-git-panel="staged"]') as HTMLElement | null)?.hidden).toBe(true);
    expect(content?.textContent).toContain("Demo commit");
    expect(content?.textContent).toContain("HEAD -> main");
  });

  it("refreshes the open Git screen when the viewer refresh button is used", async () => {
    const firstGitPayload = {
      ok: true,
      payload: {
        state: "ok",
        branch: "main",
        tracking: "origin/main",
        ahead: 0,
        behind: 0,
        clean: false,
        dirty: true,
        latestCommit: "abc1234 First commit",
        recentCommits: [{ hash: "abc1234", subject: "First commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" }],
        counts: { staged: 1, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
        groups: { staged: [{ path: "logics/request/req_001_demo.md", logicsType: "request" }], modified: [], deleted: [], renamed: [], untracked: [] }
      }
    };
    const secondGitPayload = {
      ok: true,
      payload: {
        ...firstGitPayload.payload,
        branch: "feature/git-refresh",
        latestCommit: "def5678 Refreshed commit",
        recentCommits: [{ hash: "def5678", subject: "Refreshed commit", author: "Alex", date: "2026-06-10", refs: "HEAD -> feature/git-refresh" }]
      }
    };
    let refreshed = false;
    const { dom, calls } = createViewerDom({
      gitResponseFactory: () => ({ ok: true, body: refreshed ? secondGitPayload : firstGitPayload })
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const gitCallsBeforeRefresh = calls.filter((call) => call === "/api/git-status").length;

    refreshed = true;
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls.filter((call) => call === "/api/git-status").length).toBeGreaterThan(gitCallsBeforeRefresh);
    expect(calls).toContain("/api/refresh");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Git status");
    expect(content?.textContent).toContain("feature/git-refresh");
    expect(content?.textContent).toContain("Refreshed commit");
  });

  it("explains stale viewer servers that do not expose the Git status endpoint", async () => {
    const { dom } = createViewerDom({
      gitResponse: { ok: false, status: 404, body: { ok: false, error: "Not found" } }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Git status");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Restart the local viewer");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Restart the local viewer");
  });

  it("does not render the redundant toolbar corpus insights button in the local viewer shell", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");

    expect(html).not.toContain("header-logics-insights");
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

  it("persists local corpus filter axes across viewer reloads", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    setViewerFilter(dom, "focus", "all");
    setViewerFilter(dom, "type", "task");
    setViewerFilter(dom, "status", "blocked");

    const persistedState = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(persistedState?.viewerFilterState).toMatchObject({
      focus: "all",
      type: "task",
      status: "blocked"
    });

    const reloaded = createViewerDom({ initialState: persistedState });
    const reloadedApi = reloaded.dom.window.acquireVsCodeApi();
    reloadedApi.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((reloaded.dom.window.document.querySelector('[data-viewer-filter-group="focus"]') as HTMLSelectElement | null)?.value).toBe("all");
    expect((reloaded.dom.window.document.querySelector('[data-viewer-filter-group="type"]') as HTMLSelectElement | null)?.value).toBe("task");
    expect((reloaded.dom.window.document.querySelector('[data-viewer-filter-group="status"]') as HTMLSelectElement | null)?.value).toBe("blocked");
    expect(reloaded.dom.window.__CDX_LOGICS_VIEWER_FILTER__({ stage: "task", indicators: { Status: "Blocked" }, references: [], usedBy: [] })).toBe(true);
    expect(reloaded.dom.window.__CDX_LOGICS_VIEWER_FILTER__({ stage: "request", indicators: { Status: "Blocked" }, references: [], usedBy: [] })).toBe(false);
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

  it("renders unsafe health paths without a clickable document control", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    Object.defineProperty(dom.window, "fetch", {
      value: async (url: string) => {
        if (url === "/api/lint") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              payload: { ok: false, issues: [{ path: "../outside.md", message: "Unsafe path", severity: "blocking" }] }
            })
          };
        }
        return originalFetch(url);
      }
    });

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-health")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.textContent).toContain("Repository-level or unsafe path: ../outside.md");
    expect(content?.querySelector('[data-viewer-doc-path="../outside.md"]')).toBeNull();
  });

  it("stores bounded local activity snapshots and marks real status changes only after a known previous status", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const firstState = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(firstState?.activitySnapshot?.["logics/request/req_001_demo.md"]?.status).toBe("Ready");
    expect(firstState?.activityHistory?.[0]?.type).toBe("updated");

    const originalFetch = dom.window.fetch;
    Object.defineProperty(dom.window, "fetch", {
      value: async (url: string) => {
        if (url === "/api/refresh") {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              payload: {
                root: "/workspace/logics-manager",
                repoName: "logics-manager",
                autoRefreshIntervalSeconds: 15,
                items: [
                  { id: "req_001_demo", title: "Demo", stage: "request", relPath: "logics/request/req_001_demo.md", references: [], usedBy: [], indicators: { Status: "Blocked" }, isPromoted: false, updatedAt: "2026-06-03T10:00:00" }
                ],
                updateInfo: {}
              }
            })
          };
        }
        return originalFetch(url);
      }
    });

    api.postMessage({ type: "refresh" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const secondState = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(secondState?.activityHistory?.[0]?.type).toBe("status-change");
    expect(secondState?.activityHistory?.length).toBeLessThanOrEqual(80);

    dom.window.document.getElementById("activity-clear")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const cleared = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(cleared?.activityHistory).toBeUndefined();
    expect(cleared?.viewerFilterState).toBeDefined();
  });
});
