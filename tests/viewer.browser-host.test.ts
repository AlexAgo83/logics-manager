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
  capabilities?: Record<string, { state: string; available: boolean; message: string; detail?: Record<string, unknown> }>;
  cdxResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  cdxResponseFactory?: () => { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  cdxResponses?: Array<{ ok: boolean; status?: number; body?: unknown; rawBody?: string }>;
  editResponse?: { ok: boolean; status?: number; body: unknown };
  gitDiffResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitPreviewResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponseFactory?: () => { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponses?: Array<{ ok: boolean; status?: number; body?: unknown; rawBody?: string }>;
  githubUrl?: string;
  hidden?: boolean;
  initialState?: unknown;
  refreshGate?: Promise<void>;
  refreshResponse?: { ok: boolean; status?: number; body?: unknown };
  refreshItemUpdatedAt?: string;
  url?: string;
} = {}) {
  const html = `<!doctype html><html><body>
    <div id="viewer-meta"></div>
    <button id="viewer-repo-pill" type="button" aria-expanded="false" aria-controls="viewer-project-menu"><span data-viewer-project-label>repository</span><span>v</span></button>
    <div id="viewer-project-menu" hidden></div>
    <a id="viewer-repo-github" href="#" hidden>GitHub</a>
    <button id="viewer-repo-folder" type="button" hidden>Folder</button>
    <div id="viewer-update" hidden><span id="viewer-update-copy"></span><code id="viewer-update-command"></code></div>
    <button id="viewer-git" type="button">Git</button>
    <button id="viewer-ci" type="button" hidden>CI</button>
    <button id="viewer-cdx" type="button">CDX</button>
    <button id="viewer-insights" type="button">Insights</button>
    <button id="viewer-health" type="button">Health</button>
    <button id="activity-clear" type="button">Clear activity</button>
    <div class="viewer-refresh-menu">
      <button id="viewer-refresh-menu-button" type="button" aria-expanded="false" aria-controls="viewer-refresh-menu">Refresh</button>
      <div id="viewer-refresh-menu" hidden>
        <label><input id="viewer-auto-refresh" type="checkbox" checked />Auto</label>
        <button data-action="refresh" type="button">Now</button>
        <select id="viewer-refresh-interval">
          <option value="5">5 sec</option>
          <option value="10">10 sec</option>
          <option value="15" selected>15 sec</option>
          <option value="30">30 sec</option>
          <option value="60">60 sec</option>
        </select>
      </div>
    </div>
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
  const fetchCalls: Array<{ url: string; options?: RequestInit }> = [];
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
    value: async (url: string, fetchOptions?: RequestInit) => {
      calls.push(String(url));
      fetchCalls.push({ url: String(url), options: fetchOptions });
      if (url === "/api/items" || url === "/api/refresh") {
        if (url === "/api/refresh" && options.refreshGate) {
          await options.refreshGate;
        }
        if (url === "/api/refresh" && options.refreshResponse) {
          return {
            ok: options.refreshResponse.ok,
            status: options.refreshResponse.status ?? (options.refreshResponse.ok ? 200 : 500),
            json: async () => options.refreshResponse?.body || {}
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              root: "/workspace/logics-manager",
              repoName: "logics-manager",
              repository: {
                root: "/workspace/logics-manager",
                githubUrl: options.githubUrl ?? "https://github.com/AlexAgo83/logics-manager"
              },
              capabilities: options.capabilities ?? {
                logics: { state: "ready", available: true, message: "Logics corpus found." },
                git: { state: "ready", available: true, message: "Git repository detected." },
                ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
                cdx: { state: "ready", available: true, message: "CDX executable detected." },
                cdxRuns: { state: "unsupported", available: false, message: "CDX assistant run registry is not available yet." }
              },
              projects: [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." },
                { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: false, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: 15,
              items: [
                { id: "req_001_demo", title: "Demo", stage: "request", relPath: "logics/request/req_001_demo.md", references: [], usedBy: [], indicators: { Status: "Ready" }, isPromoted: false, updatedAt: url === "/api/refresh" && options.refreshItemUpdatedAt ? options.refreshItemUpdatedAt : "2026-06-01T10:00:00" },
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
      if (url === "/api/switch-project") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              root: "/workspace/cdx-manager",
              repoName: "cdx-manager",
              repository: {
                root: "/workspace/cdx-manager",
                githubUrl: ""
              },
              capabilities: {
                logics: { state: "ready", available: true, message: "Logics corpus found." },
                git: { state: "missing", available: false, message: "Project is not a Git repository." },
                ci: { state: "hidden", available: false, message: "No GitHub remote detected for this project." },
                cdx: { state: "missing", available: false, message: "CDX executable is not available." },
                cdxRuns: { state: "missing", available: false, message: "CDX is required before assistant runs can be tracked." }
              },
              projects: [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: false, available: true, hasLogics: true, message: "Logics corpus found." },
                { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: 15,
              items: [
                { id: "req_002_cdx", title: "CDX", stage: "request", relPath: "logics/request/req_002_cdx.md", references: [], usedBy: [], indicators: { Status: "Ready" }, isPromoted: false, updatedAt: "2026-06-03T10:00:00" }
              ],
              updateInfo: {}
            }
          })
        };
      }
      if (url === "/api/bootstrap-logics") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            bootstrap: { created_paths: ["logics/", "logics/instructions.md"] },
            payload: {
              root: "/workspace/new-project",
              repoName: "new-project",
              repository: {
                root: "/workspace/new-project",
                githubUrl: ""
              },
              capabilities: {
                logics: { state: "ready", available: true, message: "Logics corpus found." },
                git: { state: "missing", available: false, message: "Project is not a Git repository." },
                ci: { state: "hidden", available: false, message: "No GitHub remote detected for this project." },
                cdx: { state: "missing", available: false, message: "CDX executable is not available." },
                cdxRuns: { state: "missing", available: false, message: "CDX is required before assistant runs can be tracked." }
              },
              projects: [
                { id: "project-new", name: "new-project", root: "/workspace/new-project", active: true, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              canBootstrapLogics: false,
              bootstrapLogicsTitle: "Logics is already bootstrapped.",
              autoRefreshIntervalSeconds: 15,
              items: [],
              updateInfo: {}
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
      if (url === "/api/open-repo-folder") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { path: "/workspace/logics-manager", command: "open" }
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
                staged: [{ path: "logics/request/req_001_demo.md", logicsType: "request", additions: 3, deletions: 1 }],
                modified: [{ path: "clients/viewer/browser-host.js", additions: 8, deletions: 2 }],
                deleted: [],
                renamed: [],
                untracked: [{ path: "new-file.md" }]
              }
            }
          })
        };
      }
      if (url === "/api/cdx-status") {
        const queuedCdxResponse = options.cdxResponses?.shift();
        const cdxResponse = queuedCdxResponse || options.cdxResponseFactory?.() || options.cdxResponse;
        if (cdxResponse) {
          return {
            ok: cdxResponse.ok,
            status: cdxResponse.status ?? (cdxResponse.ok ? 200 : 500),
            json: async () => {
              if (cdxResponse.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return cdxResponse.body || {};
            }
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              status: {
                availability: "ready",
                providers: [{ name: "openai", state: "ready", model: "gpt-5" }],
                sessions: [{ id: "session-1", status: "active", title: "Logics work" }],
                readiness: { auth: "ready", quota: "ok" },
                nextCommands: ["cdx status", "cdx session list"]
              }
            }
          })
        };
      }
      if (url === "/api/cdx-runs") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              runs: [
                { run_id: "run-1", kind: "code-review", status: "running", session: "work", cwd: "/workspace/logics-manager" },
                { run_id: "run-2", kind: "assistant", status: "succeeded", session: "auto", cwd: "/workspace/cdx-manager" }
              ]
            }
          })
        };
      }
      if (String(url).startsWith("/api/cdx-run-report")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              report: {
                run: { run_id: "run-1", status: "succeeded", kind: "code-review" },
                artifacts: { transcript_path: "/tmp/run.log", stdout_path: "/tmp/run.out" },
                task_report: {
                  kind: "code-review",
                  run_id: "run-1",
                  summary: "One issue found.",
                  findings: [{ severity: "high", path: "src/app.py", line: 12, message: "Missing validation." }]
                }
              }
            }
          })
        };
      }
      if (url === "/api/cdx-report-request") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            created: { id: "req_999_address_cdx_code_review_findings", path: "logics/request/req_999_address_cdx_code_review_findings.md" },
            payload: {
              root: "/workspace/logics-manager",
              repoName: "logics-manager",
              repository: { root: "/workspace/logics-manager", githubUrl: "https://github.com/AlexAgo83/logics-manager" },
              capabilities: options.capabilities ?? {
                logics: { state: "ready", available: true, message: "Logics corpus found." },
                git: { state: "ready", available: true, message: "Git repository detected." },
                ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
                cdx: { state: "ready", available: true, message: "CDX executable detected." },
                cdxRuns: { state: "unsupported", available: false, message: "CDX assistant run registry is not available yet." }
              },
              projects: [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: 15,
              selectedId: "req_999_address_cdx_code_review_findings",
              items: [
                { id: "req_999_address_cdx_code_review_findings", title: "Address CDX code review findings", stage: "request", relPath: "logics/request/req_999_address_cdx_code_review_findings.md", references: [], usedBy: [], indicators: { Status: "Draft" }, isPromoted: false, updatedAt: "2026-06-04T10:00:00" }
              ],
              updateInfo: {}
            }
          })
        };
      }
      if (String(url).startsWith("/api/git-diff")) {
        if (options.gitDiffResponse) {
          return {
            ok: options.gitDiffResponse.ok,
            status: options.gitDiffResponse.status ?? (options.gitDiffResponse.ok ? 200 : 500),
            json: async () => {
              if (options.gitDiffResponse?.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return options.gitDiffResponse?.body || {};
            }
          };
        }
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
      if (String(url).startsWith("/api/git-file-preview")) {
        if (options.gitPreviewResponse) {
          return {
            ok: options.gitPreviewResponse.ok,
            status: options.gitPreviewResponse.status ?? (options.gitPreviewResponse.ok ? 200 : 500),
            json: async () => {
              if (options.gitPreviewResponse?.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return options.gitPreviewResponse?.body || {};
            }
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              path: "new-file.md",
              mode: "file-preview",
              content: "# New file\nPreview body",
              truncated: false
            }
          })
        };
      }
      if (url === "/api/cdx-mission-plan") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              catalog: {
                missions: [
                  { id: "full-audit", title: "Full audit", description: "Inspect the repository.", scope: "repository", requiresPlanConfirmation: false },
                  { id: "release-review", title: "Review since latest release", description: "Compare with the latest tag.", scope: "latest-release", requiresPlanConfirmation: false },
                  { id: "corpus-ready", title: "Prepare dev-ready corpus", description: "Produce a corpus plan.", scope: "open-logics-workflow", requiresPlanConfirmation: true },
                  { id: "wish-to-request", title: "Wish to request", description: "Draft a request.", scope: "request-draft", requiresPlanConfirmation: false, inputFields: [{ id: "wishText", label: "Wish or intent", type: "textarea", required: true }] },
                  { id: "pre-release", title: "Guarded pre-release", description: "Prepare a release report.", scope: "pre-release-report", requiresPlanConfirmation: false, inputFields: [{ id: "releaseVersion", label: "Version", type: "text", placeholder: "vX.X.X", required: true }, { id: "runFullValidation", label: "Run full validation and fix before pre-release", type: "checkbox" }] }
                ],
                strengths: [
                  { id: "standard", label: "Standard" },
                  { id: "deep", label: "Deep" },
                  { id: "max", label: "Max" }
                ],
                defaultMissionId: "full-audit",
                defaultStrengthId: "standard"
              },
              status: {
                state: "ok",
                status: {
                  sessions: [{ id: "session-1", status: "active" }]
                }
              },
              plan: {
                missionId: "corpus-ready",
                mission: { id: "corpus-ready", title: "Prepare dev-ready corpus" },
                sessionId: "session-1",
                strengthId: "deep",
                strength: { id: "deep", label: "Deep" },
                scope: "open-logics-workflow",
                command: ["cdx", "run", "session-1", "--cwd", "/workspace/logics-manager", "--prompt", "Prepare the open Logics workflow corpus for development.\nReturn JSON only with allowed actions.", "--kind", "assistant", "--reasoning-effort", "high", "--power", "high", "--permission", "read-only", "--timeout-seconds", "300", "--json"],
                warnings: [],
                requiresConfirmation: true,
                canRun: true
              }
            }
          })
        };
      }
      if (url === "/api/cdx-mission-run") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              plan: {
                missionId: "corpus-ready",
                sessionId: "session-1",
                strength: { id: "deep", label: "Deep" },
                command: ["cdx", "run", "session-1", "--cwd", "/workspace/logics-manager", "--prompt", "Prepare the open Logics workflow corpus for development.\nReturn JSON only with allowed actions.", "--kind", "assistant", "--reasoning-effort", "high", "--power", "high", "--permission", "read-only", "--timeout-seconds", "300", "--json"],
                canRun: true
              },
              run: {
                returnCode: 0,
                runId: "run-42",
                stdout: "{\"ok\":true}",
                stderr: "",
                usage: { available: true, inputTokens: 100, outputTokens: 40, totalTokens: 140 },
                parsed: { actions: [{ type: "refresh-corpus-context", target: "task_213" }] }
              }
            }
          })
        };
      }
      if (url === "/api/cdx-mission-apply-plan") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              results: [{ type: "refresh-corpus-context", target: "task_213", returnCode: 0 }]
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
  return { dom, calls, fetchCalls };
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

  it("orders local viewer topbar actions with Settings on the right", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const labels = Array.from(dom.window.document.querySelectorAll(".viewer-topbar__actions > button, .viewer-topbar__actions > .viewer-refresh-menu > button"))
      .map((node) => node.textContent?.trim().replace(/\s+/g, " "));

    expect(labels).toEqual(["Git", "CI", "CDX", "Settings"]);
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

  it("keeps the focused item selected when viewer data refreshes", async () => {
    const { dom, calls } = createViewerDom({
      url: "http://127.0.0.1:8765/?focus=req_001_demo",
      refreshItemUpdatedAt: "2026-06-01T10:05:00"
    });
    const api = dom.window.acquireVsCodeApi();
    const payloads: Array<{ selectedId?: string }> = [];
    dom.window.addEventListener("message", (event) => {
      if (event.data?.type === "data") {
        payloads.push(event.data.payload);
      }
    });

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/refresh");
    expect(payloads.map((payload) => payload.selectedId)).toEqual(["req_001_demo", "req_001_demo"]);
  });

  it("skips replacing viewer data and shows feedback when refresh state is unchanged", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const payloads: unknown[] = [];
    dom.window.addEventListener("message", (event) => {
      if (event.data?.type === "data") {
        payloads.push(event.data.payload);
      }
    });

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/refresh");
    expect(payloads).toHaveLength(1);
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Checked just now");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("no viewer changes");
  });

  it("force refresh bypasses unchanged-state preservation", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const payloads: unknown[] = [];
    dom.window.addEventListener("message", (event) => {
      if (event.data?.type === "data") {
        payloads.push(event.data.payload);
      }
    });

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    api.postMessage({ type: "refresh", force: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(payloads).toHaveLength(2);
  });

  it("preserves active Git detail content when refresh signatures are unchanged", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    const firstDiffCalls = calls.filter((call) => call.startsWith("/api/git-diff?")).length;
    const stagedDomain = content?.querySelector('[data-viewer-git-domain="staged"]') as HTMLElement | null;
    stagedDomain?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const activeBefore = content?.querySelector(".viewer-git__domain.is-active")?.getAttribute("data-viewer-git-domain");

    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(activeBefore).toBe("staged");
    expect(content?.querySelector(".viewer-git__domain.is-active")?.getAttribute("data-viewer-git-domain")).toBe("staged");
    expect(calls.filter((call) => call.startsWith("/api/git-diff?")).length).toBe(firstDiffCalls);
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("no viewer changes");
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
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Checked just now");
  });

  it("switches the active project from the topbar project menu", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });

    const switcher = dom.window.document.getElementById("viewer-repo-pill") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("cdx-manager"); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    switcher?.click();
    expect(menu?.hidden).toBe(false);
    expect(menu?.textContent).toContain("cdx-manager");

    const cdxProject = menu?.querySelector('[data-viewer-project-id="project-cdx"]') as HTMLButtonElement | null;
    cdxProject?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/switch-project");
    expect(dom.window.document.querySelector("[data-viewer-project-label]")?.textContent).toBe("cdx-manager");
    expect(dom.window.document.getElementById("viewer-git")?.hidden).toBe(true);
    expect((dom.window.document.getElementById("viewer-cdx") as HTMLButtonElement | null)?.disabled).toBe(true);
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("1 docs");
  });

  it("bootstraps Logics through the local viewer host action", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "bootstrap-logics" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/bootstrap-logics");
    expect(dom.window.document.querySelector("[data-viewer-project-label]")?.textContent).toBe("new-project");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Logics bootstrapped");
  });

  it("opens refresh options and configures the interval from the payload", async () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://127.0.0.1:8765/" });
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          payload: {
            root: "/workspace/logics-manager",
            repoName: "logics-manager",
            autoRefreshIntervalSeconds: 15,
            items: [],
            updateInfo: {}
          }
        })
      })
    });
    loadScript(dom, "clients/viewer/browser-host.js");
    dom.window.dispatchEvent(new dom.window.Event("load"));
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const menuButton = dom.window.document.getElementById("viewer-refresh-menu-button") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-refresh-menu") as HTMLElement | null;
    const interval = dom.window.document.getElementById("viewer-refresh-interval") as HTMLSelectElement | null;
    expect(menu?.hidden).toBe(true);

    menuButton?.click();

    expect(menu?.hidden).toBe(false);
    expect(menuButton?.getAttribute("aria-expanded")).toBe("true");
    expect(interval?.value).toBe("15");
  });

  it("lets users change automatic refresh interval within the supported bounds", async () => {
    vi.useFakeTimers();
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);

    const interval = dom.window.document.getElementById("viewer-refresh-interval") as HTMLSelectElement | null;
    interval!.value = "5";
    interval?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(4_999);
    expect(calls.filter((call) => call === "/api/refresh").length).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);
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

  it("blocks duplicate primary refresh clicks and shows busy feedback", async () => {
    let resolveRefresh: () => void = () => {};
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const { dom, calls } = createViewerDom({ refreshGate });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refresh = dom.window.document.querySelector('[data-action="refresh"]') as HTMLButtonElement | null;
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.filter((call) => call === "/api/refresh")).toHaveLength(1);
    expect(refresh?.disabled).toBe(true);
    expect(dom.window.document.body.hasAttribute("data-viewer-busy")).toBe(true);
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Refreshing");

    resolveRefresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(refresh?.disabled).toBe(false);
    expect(dom.window.document.body.hasAttribute("data-viewer-busy")).toBe(false);
  });

  it("blocks competing primary actions while one action is loading", async () => {
    let resolveRefresh: () => void = () => {};
    const refreshGate = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    const { dom, calls } = createViewerDom({ refreshGate });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const gitCallsBefore = calls.filter((call) => call === "/api/git-status").length;
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.filter((call) => call === "/api/refresh")).toHaveLength(1);
    expect(calls.filter((call) => call === "/api/git-status")).toHaveLength(gitCallsBefore);
    expect((dom.window.document.getElementById("viewer-git") as HTMLButtonElement | null)?.disabled).toBe(true);
    expect(dom.window.document.body.getAttribute("data-viewer-busy-action")).toBe("refresh");

    resolveRefresh();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("clears busy state after a failed primary action", async () => {
    const { dom } = createViewerDom({
      refreshResponse: { ok: false, status: 500, body: { ok: false, error: "Refresh failed" } }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refresh = dom.window.document.querySelector('[data-action="refresh"]') as HTMLButtonElement | null;
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Refresh failed");
    expect(refresh?.disabled).toBe(false);
    expect(dom.window.document.body.hasAttribute("data-viewer-busy")).toBe(false);
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

  it("renders repository shortcuts and opens the local folder action", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const github = dom.window.document.getElementById("viewer-repo-github") as HTMLAnchorElement | null;
    const folder = dom.window.document.getElementById("viewer-repo-folder") as HTMLButtonElement | null;

    expect(github?.hidden).toBe(false);
    expect(github?.href).toBe("https://github.com/AlexAgo83/logics-manager");
    expect(folder?.hidden).toBe(false);

    folder?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/open-repo-folder");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Repository folder opened.");
  });

  it("hides the GitHub shortcut when the repository has no GitHub remote", async () => {
    const { dom } = createViewerDom({ githubUrl: "" });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const github = dom.window.document.getElementById("viewer-repo-github") as HTMLAnchorElement | null;
    const folder = dom.window.document.getElementById("viewer-repo-folder") as HTMLButtonElement | null;

    expect(github?.hidden).toBe(true);
    expect(github?.hasAttribute("href")).toBe(false);
    expect(folder?.hidden).toBe(false);
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
    expect(content?.textContent).toContain("Needs attention");
    expect(content?.textContent).toContain("Operator actions");
    expect(content?.textContent).toContain("Corpus shape");
    expect(content?.textContent).toContain("Flow health");
    expect(content?.textContent).toContain("Activity");
    expect(content?.textContent).toContain("Traceability");
    expect(content?.textContent).toContain("Quality signals");
    expect(content?.textContent).toContain("Blocked");
    expect(content?.textContent).toContain("Incomplete workflow chains");
    expect(content?.querySelector(".viewer-insights__hero")).not.toBeNull();
    expect(content?.querySelector(".viewer-insights__workspace")).not.toBeNull();
    expect(content?.querySelector(".viewer-insights__bar-track")).not.toBeNull();
    expect(content?.querySelector("[data-viewer-open-health]")).not.toBeNull();
    expect((content?.textContent || "").indexOf("Operator actions")).toBeLessThan((content?.textContent || "").indexOf("Corpus shape"));
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
    expect(content?.textContent).toContain("Ahead / Behind");
    expect(content?.textContent).toContain("Files");
    const summarySegments = Array.from(content?.querySelectorAll(".viewer-git__summary-segment") || []).map((node) => node.textContent || "");
    expect(summarySegments).toEqual(expect.arrayContaining([
      expect.stringContaining("Ahead"),
      expect.stringContaining("Behind"),
      expect.stringContaining("Staged"),
      expect.stringContaining("Worktree"),
      expect.stringContaining("Untracked")
    ]));
    expect(content?.textContent).toContain("Staged");
    expect(content?.textContent).toContain("logics/request/req_001_demo.md");
    expect(content?.textContent).toContain("+3-1");
    expect(content?.textContent).toContain("request");
    expect(content?.textContent).toContain("diff --git");
    expect(content?.querySelector(".viewer-git__diff-line--meta")?.textContent).toContain("diff --git");
    expect(content?.querySelector(".viewer-git__diff-line--add")?.textContent).toContain("+Demo");
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
    expect((content?.querySelector("[data-viewer-git-detail]") as HTMLElement | null)?.hidden).toBe(true);
    expect(content?.querySelector(".viewer-git__workspace")?.classList.contains("has-diff-detail")).toBe(false);
    expect(content?.textContent).toContain("Demo commit");
    expect(content?.textContent).toContain("HEAD -> main");
  });

  it("falls back to a file preview when a selected Git file has no useful diff", async () => {
    const { dom, calls } = createViewerDom({
      gitDiffResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            path: "new-file.md",
            mode: "worktree",
            diff: "",
            truncated: false,
            message: "No diff is available for this file in the selected mode."
          }
        }
      },
      gitPreviewResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            path: "new-file.md",
            mode: "file-preview",
            content: "# New file\nPreview body",
            truncated: false
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls.some((call) => call.startsWith("/api/git-diff?"))).toBe(true);
    expect(calls.some((call) => call.startsWith("/api/git-file-preview?"))).toBe(true);
    expect(content?.querySelector(".viewer-git__detail-title")?.textContent).toBe("File preview");
    expect(content?.textContent).toContain("# New file");
    expect(content?.textContent).toContain("Preview body");
    expect(content?.textContent).toContain("file preview");
  });

  it("shows a bounded file-preview fallback message for unsupported Git files", async () => {
    const { dom } = createViewerDom({
      gitDiffResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            path: "binary.dat",
            mode: "worktree",
            diff: "",
            truncated: false
          }
        }
      },
      gitPreviewResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "unsupported",
            path: "binary.dat",
            message: "Binary or unsupported file content cannot be previewed."
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.querySelector(".viewer-git__detail-title")?.textContent).toBe("File preview");
    expect(content?.textContent).toContain("file preview unavailable");
    expect(content?.textContent).toContain("Binary or unsupported file content cannot be previewed.");
  });

  it("reveals Git history commits ten rows at a time", async () => {
    const commits = Array.from({ length: 23 }, (_, index) => ({
      hash: `c${String(index + 1).padStart(2, "0")}`,
      subject: `Commit ${index + 1}`,
      author: "Alex",
      date: "2026-06-09",
      refs: index === 0 ? "HEAD -> main" : ""
    }));
    const { dom } = createViewerDom({
      gitResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 0,
            behind: 0,
            clean: true,
            dirty: false,
            latestCommit: "c01 Commit 1",
            recentCommits: commits,
            counts: { staged: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
            groups: { staged: [], modified: [], deleted: [], renamed: [], untracked: [] }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const visibleCommitRows = () => Array.from(dom.window.document.querySelectorAll(".viewer-git__commit-row"))
      .filter((row) => row instanceof dom.window.HTMLElement && !row.hidden && !row.classList.contains("viewer-git__commit-row--reveal"));
    const revealButton = () => dom.window.document.querySelector("[data-viewer-git-history-reveal]") as HTMLButtonElement | null;

    expect(visibleCommitRows()).toHaveLength(10);
    expect(revealButton()?.textContent).toBe("Show 10 more");

    revealButton()?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(visibleCommitRows()).toHaveLength(20);
    expect(revealButton()?.textContent).toBe("Show 3 more");

    revealButton()?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(visibleCommitRows()).toHaveLength(23);
    expect(revealButton()).toBeNull();
  });

  it("marks Git history count as open-ended when more commits are available", async () => {
    const commits = Array.from({ length: 50 }, (_, index) => ({
      hash: `c${String(index + 1).padStart(2, "0")}`,
      subject: `Commit ${index + 1}`,
      author: "Alex",
      date: "2026-06-09",
      refs: index === 0 ? "HEAD -> main" : ""
    }));
    const { dom } = createViewerDom({
      gitResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 0,
            behind: 0,
            clean: true,
            dirty: false,
            latestCommit: "c01 Commit 1",
            recentCommits: commits,
            recentCommitsHasMore: true,
            counts: { staged: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
            groups: { staged: [], modified: [], deleted: [], renamed: [], untracked: [] }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const historyDomain = dom.window.document.querySelector('[data-viewer-git-domain="history"]') as HTMLElement | null;
    expect(historyDomain?.textContent).toContain("50+");
    historyDomain?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(dom.window.document.querySelector('[data-viewer-git-panel="history"] .viewer-git__panel-header')?.textContent).toContain("50+ commits");
  });

  it("renders the local CDX status screen from the read-only endpoint", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls).toContain("/api/cdx-status");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");
    expect(content?.textContent).toContain("Providers");
    expect(content?.textContent).toContain("openai");
    expect(content?.textContent).toContain("Sessions");
    expect(content?.textContent).toContain("session-1");
    expect(content?.textContent).toContain("Readiness and quota");
    expect(content?.textContent).toContain("cdx status");
    expect(content?.querySelector("button[data-cdx-command]")).toBeNull();
  });

  it("switches the CDX document between status and runs", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const runsButton = dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]') as HTMLButtonElement | null;
    runsButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-runs");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX runs");
    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Assistant runs");
    expect(text).toContain("run-1");
    expect(text).toContain("code-review");
  });

  it("opens a CDX run report and creates a Logics request from findings", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.some((call) => call.startsWith("/api/cdx-run-report"))).toBe(true);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX run report");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Missing validation.");

    dom.window.document.querySelector('[data-viewer-cdx-create-request="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-report-request");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Created req_999_address_cdx_code_review_findings");
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("1 docs");
  });

  it("previews launches and applies guided CDX missions", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX missions");
    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Full audit");
    expect(text).toContain("Prepare dev-ready corpus");
    expect(text).toContain("Wish to request");
    expect(text).toContain("Guarded pre-release");

    dom.window.document.querySelector('[data-viewer-cdx-mission="corpus-ready"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-strength="deep"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-mission-plan");
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("cdx run session-1 --cwd /workspace/logics-manager");
    expect(text).toContain("--permission read-only");
    expect(text).toContain("Plan-first mission");

    dom.window.document.querySelector('[data-viewer-cdx-run]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-mission-run");
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("run-42");
    expect(text).toContain("140 total");
    expect(text).toContain("Refresh Corpus Context");

    dom.window.document.querySelector('[data-viewer-cdx-apply-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-mission-apply-plan");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Corpus actions applied.");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("applied");
  });

  it("passes wish-to-request mission input into the plan payload", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-cdx-mission="wish-to-request"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const input = dom.window.document.querySelector('[data-viewer-cdx-input="wishText"]') as HTMLTextAreaElement | null;
    expect(input).toBeTruthy();
    input!.value = "Capture a safer release checklist";
    input!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      missionId: "wish-to-request",
      wishText: "Capture a safer release checklist"
    });
  });

  it("passes guarded pre-release inputs into the plan payload", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-cdx-mission="pre-release"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const version = dom.window.document.querySelector('[data-viewer-cdx-input="releaseVersion"]') as HTMLInputElement | null;
    const validation = dom.window.document.querySelector('[data-viewer-cdx-input="runFullValidation"]') as HTMLInputElement | null;
    expect(version).toBeTruthy();
    expect(validation).toBeTruthy();
    version!.value = "v2.8.0";
    version!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    validation!.checked = true;
    validation!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      missionId: "pre-release",
      releaseVersion: "v2.8.0",
      runFullValidation: "true"
    });
  });

  it("disables CDX status without calling the endpoint when CDX is unavailable", async () => {
    const { dom, calls } = createViewerDom({
      capabilities: {
        logics: { state: "ready", available: true, message: "Logics corpus found." },
        git: { state: "ready", available: true, message: "Git repository detected." },
        ci: { state: "hidden", available: false, message: "No GitHub Actions workflows detected for this project." },
        cdx: { state: "missing", available: false, message: "CDX executable is not available." },
        cdxRuns: { state: "missing", available: false, message: "CDX is required before assistant runs can be tracked." }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    const button = dom.window.document.getElementById("viewer-cdx") as HTMLButtonElement | null;
    for (let attempt = 0; attempt < 10 && !button?.disabled; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(calls).toContain("/api/items");
    expect(button?.disabled).toBe(true);
    button?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.filter((call) => call === "/api/cdx-status")).toHaveLength(0);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("CDX executable is not available.");
  });

  it("maps CDX status rows into providers sessions and readiness", async () => {
    const { dom } = createViewerDom({
      cdxResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            message: "",
            status: {
              ok: true,
              message: "Collected session status rows",
              rows: [
                {
                  session_name: "work2",
                  provider: "codex",
                  enabled: true,
                  active: true,
                  status: "enabled",
                  auth_status: "authenticated",
                  available_pct: 7,
                  remaining_5h_pct: 0,
                  remaining_week_pct: 3,
                  credits: "9.6752125000",
                  reset_5h_at: "Jun 10 03:03",
                  reset_week_at: "Jun 11 15:04",
                  updated_at: new Date(Date.now() - 90_000).toISOString()
                },
                {
                  session_name: "corvus",
                  provider: "claude",
                  enabled: true,
                  active: false,
                  status: "enabled",
                  auth_status: "authenticated",
                  available_pct: 100,
                  remaining_5h_pct: 100,
                  remaining_week_pct: 100,
                  reset_5h_at: "Jun 10 04:50",
                  reset_week_at: "Jun 15 18:00",
                  updated_at: new Date(Date.now() - 8 * 60_000).toISOString()
                }
              ]
            }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Providers");
    expect(text).toContain("codex");
    expect(text).toContain("claude");
    expect(text).toContain("Sessions");
    expect(text).toContain("SESSION");
    expect(text).toContain("PROV.");
    expect(text).toContain("RESET WEEK");
    expect(text).toContain("work2");
    expect(text).toContain("corvus");
    expect(text).toContain("Lowest Remaining");
    expect(text).toContain("Remaining");
    expect(text).toContain("7%");
    expect(text).toContain("100%");
    expect(text).toContain("5H");
    expect(text).toContain("9.68");
    expect(text).toMatch(/in \d+[dhm]/);
    expect(text).toMatch(/\d+m ago/);
    expect(text).toContain("cdx status --json");
    expect(text).not.toContain("No provider status reported.");
    expect(text).not.toContain("No sessions reported.");
    expect(text.indexOf("corvus")).toBeLessThan(text.indexOf("work2"));
    const stacks = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__stack"));
    const leftStackText = stacks[0]?.textContent || "";
    const rightStackText = stacks[1]?.textContent || "";
    expect(leftStackText).toContain("Sessions");
    expect(leftStackText).not.toContain("Providers");
    expect(rightStackText.indexOf("Safe next commands")).toBeLessThan(rightStackText.indexOf("Providers"));
  });

  it("renders unavailable CDX states without breaking the viewer", async () => {
    const { dom } = createViewerDom({
      cdxResponse: {
        ok: true,
        body: { ok: true, payload: { state: "unavailable", message: "CDX is not available on PATH.", status: {} } }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("CDX is not available on PATH.");
  });

  it("refreshes the open CDX screen when the viewer refresh button is used", async () => {
    let refreshed = false;
    const { dom, calls } = createViewerDom({
      cdxResponseFactory: () => ({
        ok: true,
        body: refreshed
          ? { ok: true, payload: { state: "ok", message: "", status: { availability: "ready", providers: [{ name: "anthropic", state: "ready" }], sessions: [], readiness: {}, nextCommands: ["cdx status"] } } }
          : { ok: true, payload: { state: "ok", message: "", status: { availability: "starting", providers: [], sessions: [], readiness: {}, nextCommands: [] } } }
      })
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Starting");

    const cdxCallsBeforeRefresh = calls.filter((call) => call === "/api/cdx-status").length;
    refreshed = true;
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.filter((call) => call === "/api/cdx-status").length).toBeGreaterThan(cdxCallsBeforeRefresh);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("anthropic");
  });

  it("shows Git badge counters on initial viewer load", async () => {
    const { dom, calls } = createViewerDom({
      gitResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 2,
            behind: 0,
            clean: false,
            dirty: true,
            latestCommit: "abc1234 Demo commit",
            recentCommits: [{ hash: "abc1234", subject: "Demo commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" }],
            badgeCounts: { unpushedCommits: 2, uncommittedFiles: 3 },
            counts: { staged: 1, modified: 2, deleted: 0, renamed: 0, untracked: 0 },
            groups: {
              staged: [{ path: "logics/request/req_001_demo.md", logicsType: "request" }],
              modified: [{ path: "a.md" }, { path: "b.md" }],
              deleted: [],
              renamed: [],
              untracked: []
            }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const gitButton = dom.window.document.getElementById("viewer-git");
    expect(calls).toContain("/api/git-status");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("2");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("3");
  });

  it("keeps Git badge counters visible while counts stay positive", async () => {
    const { dom } = createViewerDom({
      gitResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 2,
            behind: 0,
            clean: false,
            dirty: true,
            latestCommit: "abc1234 Demo commit",
            recentCommits: [{ hash: "abc1234", subject: "Demo commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" }],
            badgeCounts: { unpushedCommits: 2, uncommittedFiles: 3 },
            counts: { staged: 1, modified: 2, deleted: 0, renamed: 0, untracked: 0 },
            groups: {
              staged: [{ path: "logics/request/req_001_demo.md", logicsType: "request" }],
              modified: [{ path: "a.md" }, { path: "b.md" }],
              deleted: [],
              renamed: [],
              untracked: []
            }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const gitButton = dom.window.document.getElementById("viewer-git");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("2");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("3");

    gitButton?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("2");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("3");
    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.querySelector('[data-viewer-git-domain="changes"] [data-viewer-git-badges="changes"]')?.textContent).toContain("3");
    expect(content?.querySelector('[data-viewer-git-domain="history"] [data-viewer-git-badges="history"]')?.textContent).toContain("2");
  });

  it("keeps the History Git badge visible after the History subview is opened", async () => {
    const { dom } = createViewerDom({
      gitResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 4,
            behind: 0,
            clean: true,
            dirty: false,
            latestCommit: "abc1234 Demo commit",
            recentCommits: [{ hash: "abc1234", subject: "Demo commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" }],
            badgeCounts: { unpushedCommits: 4, uncommittedFiles: 0 },
            counts: { staged: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
            groups: { staged: [], modified: [], deleted: [], renamed: [], untracked: [] }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-git")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    const historyBadge = content?.querySelector('[data-viewer-git-domain="history"] [data-viewer-git-badges="history"] .viewer-git-badge');
    expect(historyBadge?.textContent).toContain("4");
    expect(historyBadge?.getAttribute("title")).toContain("commits locaux non pushés");

    const historyDomain = content?.querySelector('[data-viewer-git-domain="history"]') as HTMLElement | null;
    historyDomain?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(content?.querySelector('[data-viewer-git-domain="history"] [data-viewer-git-badges="history"]')?.textContent).toContain("4");
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

  it("keeps settled companion docs out of active work", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const matches = (item: Record<string, unknown>) => dom.window.__CDX_LOGICS_VIEWER_FILTER__(item);

    expect(matches({ stage: "product", indicators: { Status: "Settled" }, references: [], usedBy: [] })).toBe(false);
    expect(matches({ stage: "architecture", indicators: { Status: "Settled" }, references: [], usedBy: [] })).toBe(false);
    expect(matches({ stage: "spec", indicators: { Status: "Settled" }, references: [], usedBy: [] })).toBe(false);
    expect(matches({ stage: "architecture", indicators: { Status: "Superseded" }, references: [], usedBy: [] })).toBe(false);
    expect(matches({ stage: "product", indicators: { Status: "Accepted" }, references: [], usedBy: [] })).toBe(true);
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
