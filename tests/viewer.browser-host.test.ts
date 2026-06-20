import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

async function flushViewerAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function chooseCdxMission(dom: JSDOM, label: string) {
  dom.window.document.querySelector("[data-viewer-cdx-mission-select]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
  await flushViewerAsync();
  const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
  const select = modal?.querySelector(".viewer-themed-modal__select") as HTMLSelectElement | null;
  expect(select).toBeTruthy();
  expect(Array.from(select!.options).map((option) => option.value)).toContain(label);
  select!.value = label;
  (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
  await flushViewerAsync();
}

function loadScript(dom: JSDOM, relPath: string) {
  const source = fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
  new vm.Script(source, { filename: relPath }).runInContext(dom.getInternalVMContext());
}

function createViewerDom(options: {
  capabilities?: Record<string, { state: string; available: boolean; message: string; detail?: Record<string, unknown> }>;
  cdxReportResponse?: { state: string; message: string; report: Record<string, unknown> };
  cdxRemoveResponse?: { ok: boolean; status?: number; body?: unknown };
  cdxRunsResponse?: { state: string; message: string; runs: Array<Record<string, unknown>> };
  cdxHistoryResponse?: { state: string; message: string; history: Array<Record<string, unknown>> };
  cdxResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  cdxResponseFactory?: () => { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  cdxStatusGate?: Promise<void>;
  cdxResponses?: Array<{ ok: boolean; status?: number; body?: unknown; rawBody?: string }>;
  ciResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  cdxMissionRunGate?: Promise<void>;
  filePreviewResponse?: { path: string; name: string; content: string; truncated?: boolean };
  editResponse?: { ok: boolean; status?: number; body: unknown };
  gitDiffResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitPreviewResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponseFactory?: () => { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponses?: Array<{ ok: boolean; status?: number; body?: unknown; rawBody?: string }>;
  githubUrl?: string;
  hidden?: boolean;
  initialState?: unknown;
  initialPreferences?: unknown;
  lanMode?: boolean;
  lanRwMode?: boolean;
  initialUrlToken?: string;
  pairStartResponse?: { ok: boolean; status?: number; body?: unknown };
  pairCompleteResponse?: { ok: boolean; status?: number; body?: unknown };
  refreshGate?: Promise<void>;
  refreshResponse?: { ok: boolean; status?: number; body?: unknown };
  refreshItemUpdatedAt?: string;
  releaseResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  updateStatusResponse?: { ok: boolean; status?: number; body?: unknown };
  terminalCommands?: Array<{ command: string[]; label: string }>;
  autoRefreshIntervalSeconds?: number;
  autoRefreshIntervalForced?: boolean;
  url?: string;
} = {}) {
  const html = `<!doctype html><html><body>
    <div id="viewer-meta"></div>
    <button id="viewer-repo-pill" type="button" aria-expanded="false" aria-controls="viewer-project-menu"><span data-viewer-project-label>repository</span><span>v</span></button>
    <div id="viewer-project-menu" hidden></div>
    <a id="viewer-repo-github" href="#" hidden>GitHub</a>
    <button id="viewer-repo-folder" type="button" hidden>Folder</button>
    <div id="viewer-update" hidden><span id="viewer-update-copy"></span><code id="viewer-update-command"></code></div>
    <div id="viewer-lan-banner" hidden>
      <span id="viewer-lan-banner-url" hidden></span>
      <button id="viewer-lan-banner-copy" type="button" hidden>Copy URL</button>
      <button id="viewer-lan-banner-pair" type="button" hidden>Pair this device</button>
      <span id="viewer-lan-banner-paired" hidden></span>
    </div>
    <div class="viewer-nav-menu" data-viewer-nav="workshop">
      <button id="viewer-workshop" type="button" hidden>Workshop</button>
      <div class="viewer-nav-menu__panel" role="menu">
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="workshop:terminals">Terminals</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="workshop:commands">Commands</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="workshop:explorer">Explorer</button>
      </div>
    </div>
    <div class="viewer-nav-menu" data-viewer-nav="remote">
      <button id="viewer-ci" type="button">Remote</button>
      <div class="viewer-nav-menu__panel" role="menu">
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="remote:git">Git</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="remote:runs">CI</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="remote:release">Release</button>
      </div>
    </div>
    <div class="viewer-nav-menu" data-viewer-nav="cdx">
      <button id="viewer-cdx" type="button">CDX</button>
      <div class="viewer-nav-menu__panel" role="menu">
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="cdx:status">Sessions</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="cdx:missions">Missions</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="cdx:runs">Reports</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="cdx:history">History</button>
      </div>
    </div>
    <button id="viewer-insights" type="button">Insights</button>
    <button id="viewer-health" type="button">Health</button>
    <a id="viewer-version-link" href="https://github.com/AlexAgo83/logics-manager">v0.0.0</a>
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
    <button id="viewer-release-reset" type="button" hidden>Reset</button>
    <button id="viewer-document-refresh" type="button">Refresh</button>
    <button id="viewer-document-status" type="button" hidden>Status</button>
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
  if (options.initialPreferences) {
    dom.window.localStorage.setItem("logics.localViewer.preferences.v1", JSON.stringify(options.initialPreferences));
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

  // Resolves a single endpoint without recording the call, so the consolidated
  // /api/status handler can compose its components without polluting the
  // tracked `calls` array that assertions count against.
  const respond = async (url: string, fetchOptions?: RequestInit): Promise<any> => {
      if (url === "/api/status") {
        const pick = async (componentUrl: string) => {
          const res = await respond(componentUrl);
          const data = await res.json();
          return data?.payload;
        };
        const [git, ci, cdx, cdxRuns, cdxHistory] = await Promise.all([
          pick("/api/git-status"),
          pick("/api/ci-status"),
          pick("/api/cdx-status"),
          pick("/api/cdx-runs"),
          pick("/api/cdx-history")
        ]);
        return { ok: true, status: 200, json: async () => ({ ok: true, payload: { git, ci, cdx, cdxRuns, cdxHistory } }) };
      }
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
                workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
                workshop: { state: "ready", available: true, message: "Workshop ready.", detail: { commandsAvailable: true, terminalsAvailable: false } },
                git: { state: "ready", available: true, message: "Git repository detected." },
                ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
                cdx: { state: "ready", available: true, message: "CDX executable detected." },
                cdxRuns: { state: "unsupported", available: false, message: "CDX assistant run registry is not available yet." }
              },
              projects: [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." },
                { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: false, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
              lanMode: Boolean(options.lanMode),
              lanRwMode: Boolean(options.lanRwMode),
              lanShareUrl: options.lanMode ? "http://192.168.1.42:8765/?t=secret-lan-token" : "",
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
                workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
                git: { state: "missing", available: false, message: "Project is not a Git repository." },
                ci: { state: "hidden", available: false, message: "No GitHub remote detected for this project." },
                cdx: { state: "missing", available: false, message: "CDX executable is not available." },
                cdxRuns: { state: "missing", available: false, message: "CDX is required before assistant runs can be tracked." }
              },
              projects: [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: false, available: true, hasLogics: true, message: "Logics corpus found." },
                { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
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
                workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
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
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
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
      if (url === "/api/update-status") {
        if (options.updateStatusResponse) {
          return {
            ok: options.updateStatusResponse.ok,
            status: options.updateStatusResponse.status ?? (options.updateStatusResponse.ok ? 200 : 500),
            json: async () => options.updateStatusResponse?.body || {}
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { path: "logics/request/req_001_demo.md", ref: "req_001_demo", kind: "request", updated_indicators: { Status: "Done" }, changed: true }
          })
        };
      }
      if (url === "/api/lan/pair/start") {
        if (options.pairStartResponse) {
          return {
            ok: options.pairStartResponse.ok,
            status: options.pairStartResponse.status ?? (options.pairStartResponse.ok ? 200 : 500),
            json: async () => options.pairStartResponse?.body || {}
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { pairingId: "pair-123" }
          })
        };
      }
      if (url === "/api/lan/pair/complete") {
        if (options.pairCompleteResponse) {
          return {
            ok: options.pairCompleteResponse.ok,
            status: options.pairCompleteResponse.status ?? (options.pairCompleteResponse.ok ? 200 : 500),
            json: async () => options.pairCompleteResponse?.body || {}
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { deviceToken: "device-token", deviceId: "device-123", label: "Windows test" }
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
      if (url === "/api/file-preview" || url === "/api/cdx-artifact-preview") {
        const payload = options.filePreviewResponse ?? { path: "/tmp/run.log", name: "run.log", content: '{"level":"info","message":"first log line","nested":{"count":2}}', truncated: false };
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload
          })
        };
      }
      if (url === "/api/workshop-terminal-start") {
        const body = fetchOptions?.body ? JSON.parse(String(fetchOptions.body)) : {};
        options.terminalCommands?.push({
          command: Array.isArray(body.command) ? body.command : [],
          label: String(body.label || "")
        });
        const id = `terminal-${(options.terminalCommands?.length || 1)}`;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { id, label: body.label || "shell", state: "running" }
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
        if (options.cdxStatusGate) {
          await options.cdxStatusGate;
        }
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
                sessions: [{ id: "session-1", status: "active", title: "Logics work", model: "gpt-5-codex" }],
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
            payload: options.cdxRunsResponse ?? {
              state: "ok",
              message: "",
              runs: [
                { run_id: "run-1", kind: "code-review", status: "running", session: "work", cwd: "/workspace/logics-manager", usage: { input_tokens: 1000, output_tokens: 250 } },
                { run_id: "run-2", kind: "assistant", status: "succeeded", session: "auto", cwd: "/workspace/cdx-manager" }
              ]
            }
          })
        };
      }
      if (url === "/api/cdx-history") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: options.cdxHistoryResponse ?? {
              state: "ok",
              message: "",
              history: [
                {
                  session_name: "work",
                  provider: "codex",
                  status: "success",
                  action: "launch",
                  label: "codex",
                  started_at: "2026-06-20T02:14:27.763605Z",
                  duration_ms: 1332000,
                  transcript_path: "/tmp/cdx-session.log",
                  usage: { input_tokens: 300, output_tokens: 80 }
                },
                {
                  session_name: "auto",
                  provider: "claude",
                  status: "failed",
                  action: "run",
                  label: "claude",
                  started_at: "2026-06-20T01:14:27.763605Z",
                  duration_ms: 32000,
                  stdout_path: "/tmp/cdx-run.stdout.log"
                }
              ]
            }
          })
        };
      }
      if (url === "/api/cdx-remove") {
        return {
          ok: options.cdxRemoveResponse?.ok ?? true,
          status: options.cdxRemoveResponse?.status ?? (options.cdxRemoveResponse?.ok === false ? 500 : 200),
          json: async () => options.cdxRemoveResponse?.body ?? { ok: true, payload: { message: "Remove complete." } }
        };
      }
      if (url === "/api/ci-status") {
        const ciResponse = options.ciResponse;
        if (ciResponse) {
          return {
            ok: ciResponse.ok,
            status: ciResponse.status ?? (ciResponse.ok ? 200 : 500),
            json: async () => {
              if (ciResponse.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return ciResponse.body || {};
            }
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              visible: true,
              message: "",
              badgeState: "passing",
              branch: "main",
              headSha: "abc123",
              run: { id: 1, workflowName: "CI", status: "completed", conclusion: "success", badgeState: "passing", branch: "main", headSha: "abc123", matchSource: "head" },
              jobs: []
            }
          })
        };
      }
      if (url === "/api/release-status") {
        const releaseResponse = options.releaseResponse;
        if (releaseResponse) {
          return {
            ok: releaseResponse.ok,
            status: releaseResponse.status ?? (releaseResponse.ok ? 200 : 500),
            json: async () => {
              if (releaseResponse.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return releaseResponse.body || {};
            }
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              configured: false,
              state: "not_configured",
              target_version: null,
              next_action: "Add logics/release/contract.json using logics/release/release-contract.v1.schema.json.",
              gates: [],
              evidence: []
            }
          })
        };
      }
      if (url === "/api/release-reset") {
        return {
          ok: true,
          json: async () => ({ ok: true, payload: { ok: true, configured: true, command: "release-evidence-reset", reset: true, cleared: 2, state: "preparing", next_action: "Record gate evidence." } })
        };
      }
      if (String(url).startsWith("/api/cdx-run-report")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: options.cdxReportResponse ?? {
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
                workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
                workshop: { state: "ready", available: true, message: "Workshop ready.", detail: { commandsAvailable: true, terminalsAvailable: false } },
                git: { state: "ready", available: true, message: "Git repository detected." },
                ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
                cdx: { state: "ready", available: true, message: "CDX executable detected." },
                cdxRuns: { state: "unsupported", available: false, message: "CDX assistant run registry is not available yet." }
              },
              projects: [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
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
      if (url === "/api/workshop-commands") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              commands: [
                { id: "npm-test", source: "package.json", group: "npm scripts", name: "test", command: "vitest run", runner: ["npm", "run", "test"] },
                { id: "poetry-bar", source: "pyproject.toml [tool.poetry.scripts]", group: "Poetry scripts", name: "bar", command: "demo:bar", runner: ["poetry", "run", "bar"] }
              ]
            }
          })
        };
      }
      if (url === "/api/workshop-command-start") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              id: "ws-000001",
              commandId: "npm-test",
              runner: ["npm", "run", "test"],
              state: "running",
              exitCode: null,
              startedAt: "2026-06-15T00:00:00Z",
              finishedAt: "",
              lastSeq: 0,
              error: ""
            }
          })
        };
      }
      if (url === "/api/workshop-command-stop") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              id: "ws-000001",
              commandId: "npm-test",
              runner: ["npm", "run", "test"],
              state: "stopped",
              exitCode: -15,
              startedAt: "2026-06-15T00:00:00Z",
              finishedAt: "2026-06-15T00:00:05Z",
              lastSeq: 1,
              error: ""
            }
          })
        };
      }
      if (String(url).startsWith("/api/workspace-tree")) {
        const requestUrl = new URL(String(url), "http://127.0.0.1:8765");
        const treePath = requestUrl.searchParams.get("path") || "";
        const entries = treePath === "src"
          ? [
              { name: "app.py", path: "src/app.py", kind: "file", size: 12, ignored: false, childrenAvailable: false },
              { name: "binary.dat", path: "src/binary.dat", kind: "file", size: 7, ignored: false, childrenAvailable: false }
            ]
          : [
              { name: "src", path: "src", kind: "directory", size: 0, ignored: false, childrenAvailable: true },
              { name: "README.md", path: "README.md", kind: "file", size: 18, ignored: false, childrenAvailable: false },
              { name: "node_modules", path: "node_modules", kind: "directory", size: 0, ignored: true, childrenAvailable: false }
            ];
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: { state: "ok", root: "/workspace/logics-manager", path: treePath, entries, truncated: false }
          })
        };
      }
      if (String(url).startsWith("/api/workspace-preview")) {
        const requestUrl = new URL(String(url), "http://127.0.0.1:8765");
        const previewPath = requestUrl.searchParams.get("path") || "";
        const payload = previewPath === "src/app.py"
          ? { state: "ok", path: "src/app.py", name: "app.py", kind: "file", size: 12, contentType: "text/x-python", content: "print('ok')\n", truncated: false }
          : previewPath === "src/binary.dat"
          ? { state: "unsupported", path: "src/binary.dat", name: "binary.dat", size: 7, message: "Binary or unsupported file content cannot be previewed." }
          : previewPath === "README.md"
          ? { state: "ok", path: "README.md", name: "README.md", kind: "file", size: 18, contentType: "text/markdown", content: "# Demo\nRead me\n", truncated: false }
          : { state: "directory", path: previewPath, name: previewPath || "logics-manager", kind: "directory", message: "3 item(s)", childrenAvailable: true };
        return {
          ok: true,
          json: async () => ({ ok: true, payload })
        };
      }
      if (url === "/api/cdx-mission-plan") {
        const requestBody = JSON.parse(String(fetchOptions?.body || "{}"));
        const command = ["cdx", "run", "session-1", "--cwd", "/workspace/logics-manager", "--prompt", "Prepare the open Logics workflow corpus for development.\nReturn JSON only with allowed actions.", "--kind", "assistant"];
        if (requestBody.model) {
          command.push("--model", String(requestBody.model));
        }
        command.push("--reasoning-effort", String(requestBody.reasoningEffort || "high"), "--power", String(requestBody.power || "high"), "--permission", "read-only", "--timeout-seconds", "300", "--json");
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "",
              catalog: {
                missions: [
                  { id: "full-audit", title: "Full audit", description: "Inspect the repository.", scope: "repository", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
                  { id: "release-review", title: "Review since latest release", description: "Compare with the latest tag.", scope: "latest-release", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
                  { id: "corpus-ready", title: "Prepare dev-ready corpus", description: "Produce a corpus plan.", scope: "open-logics-workflow", requiresPlanConfirmation: true, supportsFileWrites: false },
                  { id: "wish-to-request", title: "Wish to request", description: "Draft a request.", scope: "request-draft", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "wishText", label: "Wish or intent", type: "textarea", required: true }] },
                  { id: "pre-release", title: "Guarded pre-release", description: "Prepare release metadata and changelog.", scope: "pre-release-report", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "releaseVersion", label: "Version", type: "text", placeholder: "vX.X.X", required: true }, { id: "runFullValidation", label: "Run full validation and report fixes before pre-release", type: "checkbox" }] }
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
                  sessions: [{ id: "session-1", status: "active", model: "gpt-5-codex" }]
                }
              },
              plan: {
                missionId: "corpus-ready",
                mission: { id: "corpus-ready", title: "Prepare dev-ready corpus" },
                sessionId: "session-1",
                strengthId: "deep",
                strength: { id: "deep", label: "Deep" },
                scope: "open-logics-workflow",
                allowFileWrites: false,
                requestedFileWrites: true,
                supportsFileWrites: false,
                permission: "read-only",
                model: requestBody.model || "",
                reasoningEffort: requestBody.reasoningEffort || "high",
                power: requestBody.power || "high",
                command,
                warnings: [],
                requiresConfirmation: true,
                canRun: true
              }
            }
          })
        };
      }
      if (url === "/api/cdx-mission-run") {
        if (options.cdxMissionRunGate) {
          await options.cdxMissionRunGate;
        }
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
                allowFileWrites: false,
                requestedFileWrites: true,
                supportsFileWrites: false,
                permission: "read-only",
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
  };

  Object.defineProperty(dom.window, "fetch", {
    configurable: true,
    value: async (url: string, fetchOptions?: RequestInit) => {
      calls.push(String(url));
      fetchCalls.push({ url: String(url), options: fetchOptions });
      return respond(url, fetchOptions);
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

  function cdxRowsStatusPayload() {
    const soonReset = new Date(Date.now() + 3 * 60 * 60_000).toISOString();
    const weekReset = new Date(Date.now() + 4 * 24 * 60 * 60_000).toISOString();
    return {
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
                reset_5h_at: soonReset,
                reset_week_at: weekReset,
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
                reset_5h_at: soonReset,
                reset_week_at: weekReset,
                updated_at: new Date(Date.now() - 8 * 60_000).toISOString()
              }
            ]
          }
        }
      }
    };
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

  it("declares the responsive viewer breakpoints and their collapse rules", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    expect(css).toMatch(/req_246 item_426/);
    expect(css).toMatch(/req_246 item_427/);
    expect(css).toMatch(/req_246 item_428/);
    // Phone breakpoint (=420px) carries the Git diff wrap and the topbar wrap.
    expect(css).toMatch(/@media \(max-width: 420px\)/);
    // Tablet breakpoint (=600px) collapses the Git workspace, the filter panel,
    // the CDX/CI/Explorer grids, and the summary strips.
    const tabletBlocks = css.match(/@media \(max-width: 600px\)\s*\{[\s\S]*?\n\}/g) || [];
    const joined = tabletBlocks.join("\n");
    expect(joined).toContain(".viewer-git__workspace");
    expect(joined).toContain(".viewer-filter-panel");
    expect(joined).toContain(".viewer-cdx__workspace");
    expect(joined).toContain(".viewer-ci__workspace");
    expect(joined).toContain(".viewer-workspace");
    expect(joined).toContain(".viewer-insights__summary");
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
    const labels = Array.from(dom.window.document.querySelectorAll(".viewer-topbar__actions > button, .viewer-topbar__actions > .viewer-nav-menu > button, .viewer-topbar__actions > .viewer-refresh-menu > button"))
      .map((node) => node.textContent?.trim().replace(/\s+/g, " "));

    expect(labels).toEqual(["Workshop", "Remote", "CDX", "Settings"]);
  });

  it("keeps the Workshop commands panel scrollable inside the document viewport", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");

    expect(css).toContain('.viewer-workshop__panel[data-viewer-workshop-panel="commands"]');
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain(".viewer-workshop__command-header");
    expect(css).toContain("flex-wrap: wrap");
  });

  it("shows the current Logics Manager version in Settings as a GitHub link", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const version = dom.window.document.getElementById("viewer-version-link") as HTMLAnchorElement | null;
    expect(version?.textContent).toBe("v2.2.0");
    expect(version?.getAttribute("href")).toBe("https://github.com/AlexAgo83/logics-manager");
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

  it("changes status from the opened document header and refreshes the preview", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const promptSpy = vi.spyOn(dom.window, "prompt").mockImplementation(() => {
      throw new Error("browser prompt should not be used");
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    api.postMessage({ type: "read", id: "req_001_demo" });
    await flushViewerAsync();
    await flushViewerAsync();

    const statusButton = dom.window.document.getElementById("viewer-document-status") as HTMLButtonElement | null;
    expect(statusButton?.hidden).toBe(false);
    expect(statusButton?.title).toContain("Ready");

    statusButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Change status");
    const select = modal?.querySelector(".viewer-themed-modal__select") as HTMLSelectElement | null;
    expect(select).not.toBeNull();
    if (select) select.value = "Done";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    const updateCall = fetchCalls.find((call) => call.url === "/api/update-status");
    expect(updateCall).toBeTruthy();
    expect(JSON.parse(String(updateCall?.options?.body || "{}"))).toMatchObject({
      path: "logics/request/req_001_demo.md",
      status: "Done"
    });
    expect(fetchCalls.filter((call) => String(call.url).startsWith("/api/doc")).length).toBeGreaterThanOrEqual(2);
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Updated req_001_demo to Done");

    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("uses the paired device token when changing status from a LAN RW viewer", async () => {
    const { dom, fetchCalls } = createViewerDom({
      lanMode: true,
      lanRwMode: true,
      url: "https://192.168.1.42:8765/?t=share-token"
    });
    dom.window.localStorage.setItem("logics.lan.deviceToken", "device-token");
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    api.postMessage({ type: "read", id: "req_001_demo" });
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-document-status")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    const select = modal?.querySelector(".viewer-themed-modal__select") as HTMLSelectElement | null;
    if (select) select.value = "Done";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    const updateCall = fetchCalls.find((call) => call.url === "/api/update-status");
    const headers = updateCall?.options?.headers as Headers | undefined;
    expect(headers?.get("Authorization")).toBe("Bearer device-token");
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    expect(dom.window.document.getElementById("viewer-ci")?.hidden).toBe(true);
    expect((dom.window.document.getElementById("viewer-cdx") as HTMLButtonElement | null)?.disabled).toBe(true);
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("1 docs");
  });

  it("opens the workspace tree as a Workshop sub-tab and previews selected files", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const workshop = dom.window.document.getElementById("viewer-workshop") as HTMLButtonElement | null;
    expect(workshop?.hidden).toBe(false);
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-workshop-tab="explorer"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/workspace-tree?path=");
    expect(calls).toContain("/api/workspace-preview?path=");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Workshop");
    let content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    expect(content?.textContent).toContain("src");
    expect(content?.textContent).toContain("README.md");
    expect(content?.textContent).toContain("node_modules");
    expect(content?.textContent).toContain("3 item(s)");

    content?.querySelector('[data-viewer-workspace-tree="src"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    expect(calls).toContain("/api/workspace-tree?path=src");
    expect(content?.textContent).toContain("app.py");

    content?.querySelector('[data-viewer-workspace-preview="src/app.py"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    expect(calls).toContain("/api/workspace-preview?path=src%2Fapp.py");
    expect(content?.textContent).toContain("print('ok')");
  });

  it("renders an explorer breadcrumb that lets the operator jump to any ancestor", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-workshop-tab="explorer"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    content?.querySelector('[data-viewer-workspace-tree="src"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    content = dom.window.document.getElementById("viewer-document-content");
    const breadcrumb = content?.querySelector(".viewer-workspace__breadcrumb");
    expect(breadcrumb).toBeTruthy();
    const crumbs = Array.from(breadcrumb?.querySelectorAll(".viewer-workspace__crumb") || []) as HTMLElement[];
    expect(crumbs.length).toBeGreaterThanOrEqual(2);
    expect(crumbs[0].getAttribute("data-viewer-workspace-tree")).toBe("");
    expect(crumbs[crumbs.length - 1].classList.contains("is-current")).toBe(true);
    expect(crumbs[crumbs.length - 1].getAttribute("aria-current")).toBe("location");
  });

  it("opens sub-sections from the topbar click menus", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Clicking the button opens its menu (and does not navigate on its own).
    const remoteWrapper = dom.window.document.querySelector('[data-viewer-nav="remote"]');
    expect(remoteWrapper?.classList.contains("is-open")).toBe(false);
    dom.window.document.getElementById("viewer-ci")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(remoteWrapper?.classList.contains("is-open")).toBe(true);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).not.toBe("Remote");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="remote:git"] [data-viewer-menu-badges]')?.textContent).toContain("1");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="remote:runs"] [data-viewer-menu-badges]')?.textContent).toContain("pass");

    const cdxWrapper = dom.window.document.querySelector('[data-viewer-nav="cdx"]');
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cdxWrapper?.classList.contains("is-open")).toBe(true);
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"] [data-viewer-menu-badges]')?.textContent).toContain("1");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"] [data-viewer-menu-badges]')?.textContent).toContain("1");

    // Workshop → Explorer jumps straight to the Explorer sub-tab.
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:explorer"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Workshop");
    expect(dom.window.document.querySelector('[data-viewer-workshop-tab="explorer"]')?.classList.contains("is-active")).toBe(true);

    // Remote → Release jumps straight to the release sub-screen.
    dom.window.document.querySelector('[data-viewer-nav-target="remote:release"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
    expect(dom.window.document.querySelector('[data-viewer-ci-mode="release"]')?.classList.contains("is-active")).toBe(true);

    // CDX -> Reports jumps straight to the reports sub-screen.
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX reports");
  });

  it("shows the Workshop topbar entry, persists the active sub-tab, and runs commands", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const workshop = dom.window.document.getElementById("viewer-workshop") as HTMLButtonElement | null;
    expect(workshop?.hidden).toBe(false);
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Workshop");
    const terminalsTab = dom.window.document.querySelector('[data-viewer-workshop-tab="terminals"]') as HTMLElement | null;
    expect(terminalsTab?.classList.contains("is-active")).toBe(true);

    dom.window.document.querySelector('[data-viewer-workshop-tab="commands"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/workshop-commands");
    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(stored.workshopActiveTab).toBe("commands");

    const commandsPanel = dom.window.document.querySelector("[data-viewer-workshop-commands]");
    expect(commandsPanel?.textContent).toContain("test");
    expect(commandsPanel?.textContent).toContain("bar");
    expect(commandsPanel?.textContent).toContain("Poetry scripts");

    (dom.window as unknown as { EventSource: typeof EventSource }).EventSource = class FakeEventSource {
      url: string;
      readyState = 0;
      onerror: ((event: Event) => void) | null = null;
      listeners = new Map<string, Array<(event: MessageEvent) => void>>();
      constructor(url: string) { this.url = url; }
      addEventListener(name: string, handler: (event: MessageEvent) => void) {
        const list = this.listeners.get(name) || [];
        list.push(handler);
        this.listeners.set(name, list);
      }
      close() { this.readyState = 2; }
    } as unknown as typeof EventSource;

    const runButton = dom.window.document.querySelector('[data-viewer-workshop-command-run="npm-test"]') as HTMLElement | null;
    runButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/workshop-command-start");
    expect(dom.window.document.querySelector('[data-viewer-workshop-command="npm-test"] .viewer-workshop__state')?.textContent).toBe("running");

    dom.window.document.querySelector('[data-viewer-workshop-command-stop="npm-test"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("/api/workshop-command-stop");
  });

  it("captures a LAN token from the URL, scrubs it, and attaches it to outbound fetches", async () => {
    const { dom, calls } = createViewerDom({
      url: "http://192.168.1.42:8765/?t=secret-lan-token",
      lanMode: true,
    });
    const api = dom.window.acquireVsCodeApi();

    // The token should have been moved out of the URL into sessionStorage on construction.
    expect(dom.window.sessionStorage.getItem("logics.lan.token")).toBe("secret-lan-token");
    expect(dom.window.location.href).not.toContain("t=secret-lan-token");

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const banner = dom.window.document.getElementById("viewer-lan-banner");
    expect(banner?.hidden).toBe(false);
    const bannerUrl = dom.window.document.getElementById("viewer-lan-banner-url");
    expect(bannerUrl?.textContent).toContain("t=secret-lan-token");
    const copy = dom.window.document.getElementById("viewer-lan-banner-copy") as HTMLButtonElement | null;
    expect(copy?.hidden).toBe(false);

    expect(calls.length).toBeGreaterThan(0);
  });

  it("pairs a LAN RW device through themed modals without browser prompts", async () => {
    const { dom, calls, fetchCalls } = createViewerDom({
      url: "http://192.168.1.42:8765/?t=secret-lan-token",
      lanMode: true,
      lanRwMode: true,
    });
    const promptSpy = vi.spyOn(dom.window, "prompt").mockImplementation(() => {
      throw new Error("browser prompt should not be used");
    });
    const alertSpy = vi.spyOn(dom.window, "alert").mockImplementation(() => {
      throw new Error("browser alert should not be used");
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    const pairButton = dom.window.document.getElementById("viewer-lan-banner-pair") as HTMLButtonElement | null;
    expect(pairButton?.hidden).toBe(false);
    pairButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    let modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Pair device");
    const labelInput = modal?.querySelector(".viewer-themed-modal__input") as HTMLInputElement | null;
    expect(labelInput).not.toBeNull();
    if (labelInput) labelInput.value = "Windows test";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Enter pairing PIN");
    const pinInput = modal?.querySelector(".viewer-themed-modal__input") as HTMLInputElement | null;
    expect(pinInput?.inputMode).toBe("numeric");
    if (pinInput) pinInput.value = "286940";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/lan/pair/start");
    expect(calls).toContain("/api/lan/pair/complete");
    const pairComplete = fetchCalls.find((call) => call.url === "/api/lan/pair/complete");
    expect(JSON.parse(String(pairComplete?.options?.body || "{}"))).toEqual({
      pairingId: "pair-123",
      pin: "286940",
      label: "Windows test"
    });
    expect(dom.window.localStorage.getItem("logics.lan.deviceToken")).toBe("device-token");
    expect(dom.window.document.getElementById("viewer-lan-banner")?.hidden).toBe(true);
    expect(dom.window.document.querySelector(".viewer-themed-modal")?.textContent).toContain("Device paired");
    expect(promptSpy).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("runs a custom Workshop terminal command through the themed modal", async () => {
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const { dom } = createViewerDom({
      terminalCommands,
      capabilities: {
        logics: { state: "ready", available: true, message: "Logics corpus found." },
        workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
        workshop: { state: "ready", available: true, message: "Workshop ready.", detail: { commandsAvailable: true, terminalsAvailable: true } },
        git: { state: "ready", available: true, message: "Git repository detected." },
        ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
        cdx: { state: "ready", available: true, message: "CDX executable detected." },
        cdxRuns: { state: "unsupported", available: false, message: "CDX assistant run registry is not available yet." }
      }
    });
    const promptSpy = vi.spyOn(dom.window, "prompt").mockImplementation(() => {
      throw new Error("browser prompt should not be used");
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const customButton = dom.window.document.querySelector("[data-viewer-workshop-terminal-custom]") as HTMLButtonElement | null;
    expect(customButton).not.toBeNull();
    customButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Custom terminal");
    const input = modal?.querySelector(".viewer-themed-modal__input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (input) input.value = "node --version";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(terminalCommands).toContainEqual({ command: ["node", "--version"], label: "node --version" });
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("hides the LAN banner when lanMode is false", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const banner = dom.window.document.getElementById("viewer-lan-banner");
    expect(banner?.hidden).toBe(true);
  });

  it("renders workspace preview fallbacks for unsupported files", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-workshop-tab="explorer"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    content?.querySelector('[data-viewer-workspace-tree="src"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    content?.querySelector('[data-viewer-workspace-preview="src/binary.dat"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Binary or unsupported file content cannot be previewed.");
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
            autoRefreshIntervalForced: false,
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

  it("restores the persisted automatic refresh interval when launch does not force one", async () => {
    vi.useFakeTimers();
    const { dom, calls } = createViewerDom({
      autoRefreshIntervalSeconds: 15,
      autoRefreshIntervalForced: false,
      initialPreferences: { version: 1, autoRefreshIntervalSeconds: 30 }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);

    const interval = dom.window.document.getElementById("viewer-refresh-interval") as HTMLSelectElement | null;
    expect(interval?.value).toBe("30");

    await vi.advanceTimersByTimeAsync(29_999);
    expect(calls.filter((call) => call === "/api/refresh").length).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);
  });

  it("uses a forced launch refresh interval without overwriting stored preferences", async () => {
    vi.useFakeTimers();
    const { dom, calls } = createViewerDom({
      autoRefreshIntervalSeconds: 10,
      autoRefreshIntervalForced: true,
      initialPreferences: { version: 1, autoRefreshIntervalSeconds: 30 }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);

    const interval = dom.window.document.getElementById("viewer-refresh-interval") as HTMLSelectElement | null;
    expect(interval?.value).toBe("10");
    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")?.autoRefreshIntervalSeconds).toBe(30);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls.filter((call) => call === "/api/refresh").length).toBe(1);
  });

  it("persists user changes to the automatic refresh interval", async () => {
    vi.useFakeTimers();
    const { dom } = createViewerDom({
      autoRefreshIntervalSeconds: 10,
      autoRefreshIntervalForced: true,
      initialPreferences: { version: 1, autoRefreshIntervalSeconds: 30 }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await vi.advanceTimersByTimeAsync(0);

    const interval = dom.window.document.getElementById("viewer-refresh-interval") as HTMLSelectElement | null;
    interval!.value = "5";
    interval?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")).toMatchObject({
      version: 1,
      autoRefreshIntervalSeconds: 5
    });
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

  it("does not let a delayed silent CDX refresh reopen CDX over another screen", async () => {
    let releaseCdxStatus: () => void = () => {};
    const cdxStatusGate = new Promise<void>((resolve) => {
      releaseCdxStatus = resolve;
    });
    const { dom } = createViewerDom({ cdxStatusGate });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    api.postMessage({ type: "read", id: "req_001_demo" });
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("logics/request/req_001_demo.md");

    releaseCdxStatus();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("logics/request/req_001_demo.md");
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
    await flushViewerAsync();
    await flushViewerAsync();
    const refresh = dom.window.document.querySelector('[data-action="refresh"]') as HTMLButtonElement | null;
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

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
    await flushViewerAsync();
    await flushViewerAsync();
    const gitCallsBefore = calls.filter((call) => call === "/api/git-status").length;
    dom.window.document.querySelector('[data-action="refresh"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls.filter((call) => call === "/api/refresh")).toHaveLength(1);
    expect(calls.filter((call) => call === "/api/git-status")).toHaveLength(gitCallsBefore);
    expect((dom.window.document.getElementById("viewer-ci") as HTMLButtonElement | null)?.disabled).toBe(true);
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
    await flushViewerAsync();
    await flushViewerAsync();
    const refresh = dom.window.document.querySelector('[data-action="refresh"]') as HTMLButtonElement | null;
    refresh?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls).toContain("/api/git-status");
    expect(calls.some((call) => call.startsWith("/api/git-diff?"))).toBe(true);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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

  it("renders the release workflow screen from the read-only endpoint", async () => {
    const { dom, calls } = createViewerDom({
      releaseResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            configured: true,
            state: "blocked",
            target_version: "1.2.3",
            commit: "abcdef1234567890",
            contract_path: "logics/release/contract.json",
            next_action: "local_validation: evidence targets a different commit",
            gates: [
              {
                id: "version_metadata",
                state: "preparing",
                required: true,
                status: "passed",
                evidence: {
                  kind: "file",
                  status: "passed",
                  observed_at: "2026-06-18T10:00:00Z",
                  target_version: "1.2.3",
                  commit: "abcdef1234567890",
                  summary: "version files updated"
                }
              },
              {
                id: "local_validation",
                state: "local_validation",
                required: true,
                status: "stale",
                blocking_reason: "evidence targets a different commit",
                evidence: {
                  kind: "command",
                  status: "passed",
                  observed_at: "2026-06-18T10:01:00Z",
                  target_version: "1.2.3",
                  commit: "deadbeef",
                  summary: "tests passed",
                  url: "https://github.com/example/repo/actions/runs/1"
                }
              }
            ],
            evidence: []
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const releaseTab = dom.window.document.querySelector('[data-viewer-ci-mode="release"]') as HTMLElement | null;
    expect(releaseTab).toBeTruthy();
    releaseTab?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls).toContain("/api/release-status");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
    expect(content?.querySelector('[data-viewer-ci-mode="release"]')?.classList.contains("is-active")).toBe(true);
    expect(content?.textContent).toContain("blocked");
    expect(content?.textContent).toContain("1.2.3");
    expect(content?.textContent).toContain("local_validation");
    expect(content?.textContent).toContain("evidence targets a different commit");
    expect(content?.querySelectorAll(".viewer-release__gate")).toHaveLength(2);
    expect(content?.querySelector(".viewer-release__inline-link")?.textContent).toContain("github.com/example/repo");
  });

  it("exposes a release reset action that clears evidence from the Release sub-screen", async () => {
    const { dom, calls } = createViewerDom({
      releaseResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            configured: true,
            state: "blocked",
            target_version: "1.2.3",
            contract_path: "logics/release/contract.json",
            next_action: "Record gate evidence.",
            gates: [{ id: "version_metadata", state: "preparing", required: true, status: "pending" }],
            evidence: []
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const resetButton = dom.window.document.getElementById("viewer-release-reset") as HTMLButtonElement | null;
    // Hidden until the Release sub-screen is active.
    expect(resetButton?.hidden).toBe(true);

    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));
    // Git is the default sub-screen, so the reset action stays hidden there.
    expect(resetButton?.hidden).toBe(true);

    dom.window.document.querySelector('[data-viewer-ci-mode="release"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(resetButton?.hidden).toBe(false);

    resetButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(calls).toContain("/api/release-reset");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("cleared 2");
  });

  it("shows running CI badge and active HEAD match details", async () => {
    const { dom, calls } = createViewerDom({
      ciResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            visible: true,
            message: "GitHub Actions run is in progress.",
            badgeState: "running",
            branch: "main",
            headSha: "abc123",
            run: {
              id: 42,
              workflowName: "CI",
              status: "in_progress",
              conclusion: "",
              badgeState: "running",
              branch: "main",
              headSha: "abc123",
              matchSource: "head-active",
              commitMessage: "Update release notes"
            },
            jobs: [{ name: "test", status: "in_progress", conclusion: "", htmlUrl: "" }]
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const ciButton = dom.window.document.getElementById("viewer-ci");
    expect(ciButton?.querySelector("[data-viewer-ci-badge]")?.textContent).toBe("run");
    expect(ciButton?.title).toContain("GitHub Actions run is in progress.");

    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-ci-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(calls).toContain("/api/ci-status");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
    expect(content).toContain("Current HEAD running");
    expect(content).toContain("in_progress");
    expect(content).toContain("Update release notes");
  });

  it("shows failing CI badge when the current HEAD has a failed workflow", async () => {
    const { dom } = createViewerDom({
      ciResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            visible: true,
            message: "Current HEAD CI failed.",
            badgeState: "failing",
            branch: "main",
            headSha: "abc123",
            run: {
              id: 42,
              workflowName: "CI",
              status: "completed",
              conclusion: "failure",
              badgeState: "failing",
              branch: "main",
              headSha: "abc123",
              matchSource: "head-failing",
              commitMessage: "Update release notes"
            },
            jobs: [{ name: "validate", status: "completed", conclusion: "failure", htmlUrl: "" }]
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const ciButton = dom.window.document.getElementById("viewer-ci");
    expect(ciButton?.querySelector("[data-viewer-ci-badge]")?.textContent).toBe("fail");

    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-ci-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(content).toContain("Current HEAD failing");
    expect(content).toContain("completed / failure");
  });

  it("switches the CDX document between status and runs", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const runsButton = dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]') as HTMLButtonElement | null;
    runsButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-runs");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX reports");
    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Reports");
    expect(text).toContain("run-1");
    expect(text).toContain("Running");
    expect(text).toContain("Attention");
    expect(text).toContain("1250 total");
    expect(text).toContain("1000 in");
    expect(text).toContain("250 out");
    expect(text).toContain("Open report");
    expect(text).not.toContain("code-review");
  });

  it("filters CDX reports by session", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("run-1");
    expect(text).toContain("run-2");

    const auto = dom.window.document.querySelector('[data-viewer-cdx-run-session="auto"]') as HTMLInputElement | null;
    expect(auto).toBeTruthy();
    auto!.checked = false;
    auto?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("1 shown");
    expect(text).toContain("run-1");
    expect(text).not.toContain("run-2");

    dom.window.document.querySelector("[data-viewer-cdx-run-session-all]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("run-2");
  });

  it("opens CDX history with launch details, artifacts, and token usage", async () => {
    const { dom, calls } = createViewerDom({
      capabilities: {
        logics: { state: "ready", available: true, message: "Logics corpus found." },
        workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
        workshop: { state: "ready", available: true, message: "Workshop ready.", detail: { commandsAvailable: true, terminalsAvailable: false } },
        git: { state: "ready", available: true, message: "Git repository detected." },
        ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
        cdx: { state: "ready", available: true, message: "CDX executable detected." },
        cdxRuns: { state: "ready", available: true, message: "CDX reports available." }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls).toContain("/api/cdx-history");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX history");
    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("History");
    expect(text).toContain("Entries");
    expect(text).toContain("Sessions");
    expect(text).toContain("Attention");
    expect(text).toContain("2 entries");
    expect(text).toContain("work");
    expect(text).toContain("auto");
    expect(text).toContain("codex");
    expect(text).toContain("380 total");
    expect(text).toContain("300 in");
    expect(text).toContain("80 out");
    expect(text).toContain("Transcript");
    expect(text).toContain("Stdout");
    expect(dom.window.document.querySelector('[data-viewer-cdx-history-column="duration"]')).toBeTruthy();
    expect(dom.window.document.querySelector('[data-viewer-cdx-history-session="auto"]')).toBeTruthy();
    expect(dom.window.document.querySelector('[data-viewer-cdx-artifact-path="/tmp/cdx-session.log"]')).toBeTruthy();

    const auto = dom.window.document.querySelector('[data-viewer-cdx-history-session="auto"]') as HTMLInputElement | null;
    auto!.checked = false;
    auto?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("1 shown");
    expect(text).toContain("work");
    expect(text).not.toContain("claude");

    const duration = dom.window.document.querySelector('[data-viewer-cdx-history-column="duration"]') as HTMLInputElement | null;
    duration!.checked = false;
    duration?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("DURATION");
  });

  it("persists CDX run column visibility with Kind and CWD hidden by default", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("KIND");
    expect(headers).not.toContain("CWD");
    expect(headers).toContain("TOKENS");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).not.toContain("/workspace/logics-manager");

    const cwd = dom.window.document.querySelector('[data-viewer-cdx-run-column="cwd"]') as HTMLInputElement | null;
    const kind = dom.window.document.querySelector('[data-viewer-cdx-run-column="kind"]') as HTMLInputElement | null;
    expect(cwd?.checked).toBe(false);
    expect(kind?.checked).toBe(false);
    expect(cwd?.closest(".viewer-cdx__section")).toBeNull();
    expect(cwd?.closest(".viewer-cdx")?.firstElementChild?.classList.contains("viewer-cdx__modes")).toBe(true);
    cwd!.checked = true;
    cwd?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).toContain("CWD");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("/workspace/logics-manager");
    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")?.cdxRunColumns?.visibility).toMatchObject({
      cwd: true
    });
  });

  it("closes the CDX run column menu when focus or clicks move outside it", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const menu = dom.window.document.querySelector(".viewer-cdx__controls .viewer-cdx__menu") as HTMLDetailsElement | null;
    expect(menu).toBeTruthy();
    menu!.open = true;
    dom.window.document.body.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(menu?.open).toBe(false);

    menu!.open = true;
    dom.window.document.body.dispatchEvent(new dom.window.FocusEvent("focusin", { bubbles: true }));
    expect(menu?.open).toBe(false);
  });

  it("restores persisted CDX run column visibility", async () => {
    const { dom } = createViewerDom({
      initialPreferences: {
        version: 1,
        cdxRunColumns: { visibility: { cwd: false, report: false } }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("CWD");
    expect(headers).not.toContain("REPORT");
    expect(dom.window.document.querySelector('[data-viewer-cdx-run-column="cwd"]')).toBeTruthy();
    expect(dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')).toBeNull();
  });

  it("adds active runs to the CDX topbar badge", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const badge = dom.window.document.querySelector("[data-viewer-cdx-badge]");
    expect(badge?.textContent).toBe("2");
    expect(badge?.className).toContain("viewer-cdx-button-badge--runs");
    expect((dom.window.document.getElementById("viewer-cdx") as HTMLButtonElement | null)?.title).toContain("1 running run");
  });

  it("tracks unread CDX Missions, Reports, and History changes independently", async () => {
    let cdxVersion = 1;
    const runsResponse = {
      state: "ok",
      message: "",
      runs: [
        { run_id: "run-1", kind: "code-review", status: "running", session: "work", cwd: "/workspace/logics-manager" },
        { run_id: "run-2", kind: "assistant", status: "succeeded", session: "auto", cwd: "/workspace/cdx-manager" }
      ]
    };
    const historyResponse = {
      state: "ok",
      message: "",
      history: [
        { session_name: "work", provider: "codex", status: "success", action: "launch", label: "codex", started_at: "2026-06-20T02:14:27Z" }
      ]
    };
    const { dom } = createViewerDom({
      cdxRunsResponse: runsResponse,
      cdxHistoryResponse: historyResponse,
      cdxResponseFactory: () => ({
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            message: "",
            status: {
              availability: "ready",
              providers: [{ name: "openai", state: "ready", model: "gpt-5" }],
              sessions: [{ id: "session-1", status: "active", title: `Logics work ${cdxVersion}`, model: "gpt-5-codex" }],
              readiness: { auth: "ready", quota: "ok" }
            }
          }
        }
      })
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")).toBeNull();

    cdxVersion = 2;
    runsResponse.runs = [...runsResponse.runs, { run_id: "run-3", kind: "assistant", status: "succeeded", session: "work", cwd: "/workspace/logics-manager" }];
    historyResponse.history = [...historyResponse.history, { session_name: "auto", provider: "codex", status: "success", action: "run", label: "cdx run", started_at: "2026-06-20T03:14:27Z" }];
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();

    expect(dom.window.document.querySelector("[data-viewer-cdx-badge]")?.textContent).toBe("2");
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")?.textContent).toBe("3");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"] [data-viewer-menu-badges]')?.textContent).toContain("1");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")?.textContent).toBe("2");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"] [data-viewer-cdx-unread-menu-badge]')).toBeNull();
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")?.textContent).toBe("!");
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"] [data-viewer-cdx-unread-menu-badge]')).toBeNull();
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")).toBeNull();
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"] [data-viewer-cdx-unread-menu-badge]')).toBeNull();
  });

  it("explains stale CDX runs without blocking report access", async () => {
    const { dom } = createViewerDom({
      cdxRunsResponse: {
        state: "ok",
        message: "",
        runs: [
          { run_id: "d6f7f11bb7cd4739abc713b80fbea07b", kind: "assistant", status: "stale", session: "work3", cwd: "/Users/alexandreagostini/Documents/logics-manager" }
        ]
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    const text = content?.textContent || "";
    expect(text).toContain("d6f7f11bb7cd4739abc713b80fbea07b");
    expect(text).toContain("Stale");
    expect(text).toContain("1 reported · 1 incomplete");
    expect(text).not.toContain("Run ended without a final live update.");
    expect(text).not.toContain("Open the report for the last captured output");
    expect(content?.querySelector(".viewer-cdx__state--warn")).toBeNull();
    expect(content?.querySelector('[data-viewer-cdx-report="d6f7f11bb7cd4739abc713b80fbea07b"]')).toBeTruthy();
  });

  it("shows running CDX runs separately from incomplete stale runs", async () => {
    const { dom } = createViewerDom({
      cdxRunsResponse: {
        state: "ok",
        message: "",
        runs: [
          { run_id: "run-active", kind: "assistant", status: "running", status_detail: "CDX still marks this run active; no end timestamp has been reported yet.", session: "work", cwd: "/workspace/logics-manager" },
          { run_id: "run-ended", kind: "assistant", status: "stale", ended_at: "2026-06-12T07:20:28Z", session: "work", cwd: "/workspace/logics-manager" }
        ]
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("2 reported · 1 incomplete · 1 running");
    expect(text).toContain("run-active");
    expect(text).not.toContain("CDX still marks this run active");
    expect(text).toContain("run-ended");
    expect(text).not.toContain("Run ended without a final live update.");
  });

  it("opens a CDX run report without a redundant request creation action", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.some((call) => call.startsWith("/api/cdx-run-report"))).toBe(true);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX run report");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Missing validation.");
    expect(dom.window.document.querySelector("[data-viewer-cdx-back-runs]")).toBeTruthy();
    expect(dom.window.document.querySelector(".viewer-ci__heading [data-viewer-cdx-back-runs]")).toBeTruthy();

    dom.window.document.querySelector("[data-viewer-cdx-back-runs]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX reports");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Reports");

    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.querySelector('[data-viewer-cdx-create-request="run-1"]')).toBeFalsy();
    expect(calls).not.toContain("/api/cdx-report-request");
  });

  it("returns from a closed CDX run report to runs", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX run report");

    dom.window.document.getElementById("viewer-document-close")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX reports");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Reports");
  });

  it("renders structured mission output in CDX run reports", async () => {
    const { dom, calls } = createViewerDom({
      cdxReportResponse: {
        state: "ok",
        message: "",
        report: {
          run: { run_id: "run-42", status: "succeeded", kind: "assistant", usage: { input_tokens: 200, output_tokens: 75 } },
          artifacts: { stdout_path: "/tmp/run.out" },
          task_report: { kind: "assistant", run_id: "run-42", summary: "Mission completed.", findings: [] },
          missionOutput: {
            summary: "Prepared release metadata.",
            version: "v2.8.0",
            recommendations: ["Create a Logics request for release follow-up."],
            validationEvidence: ["npm test"],
            generatedFiles: [{ path: "changelogs/CHANGELOGS_2_8_0.md" }]
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Details");
    expect(text).toContain("Prepared release metadata.");
    expect(text).toContain("v2.8.0");
    expect(text).toContain("Recommendations");
    expect(text).toContain("Create a Logics request for release follow-up.");
    expect(text).toContain("Generated Files");
    expect(text).toContain("changelogs/CHANGELOGS_2_8_0.md");
    expect(text).toContain("275 total");
    expect(text).toContain("200 in");
    expect(text).toContain("75 out");
    expect(dom.window.document.querySelector(".viewer-cdx__row--block .viewer-cdx__detail-value")).toBeTruthy();
    expect(dom.window.document.querySelector(".viewer-cdx__detail-list")).toBeTruthy();
    expect(dom.window.document.querySelector(".viewer-cdx__detail-code")).toBeTruthy();
    expect(dom.window.document.querySelector('[data-viewer-cdx-create-request="run-42"]')).toBeFalsy();
    expect(calls).not.toContain("/api/cdx-report-request");
  });

  it("renders CDX permission denials in run reports", async () => {
    const { dom } = createViewerDom({
      cdxReportResponse: {
        state: "ok",
        message: "",
        report: {
          run: { run_id: "run-42", status: "blocked", kind: "assistant" },
          task_report: { kind: "assistant", run_id: "run-42", summary: "Mission stopped on permissions.", findings: [] },
          permissionDenials: [
            { tool_name: "Bash", tool_input: { command: "logics-manager audit" } },
            { tool_name: "Write", tool_input: { file_path: "logics/request/req_251.md" } }
          ]
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Permission denials");
    expect(text).toContain("Bash");
    expect(text).toContain("logics-manager audit");
    expect(text).toContain("Write");
    expect(text).toContain("logics/request/req_251.md");
  });

  it("renders stale CDX report signals and artifact paths", async () => {
    const { dom } = createViewerDom({
      cdxRunsResponse: {
        state: "ok",
        message: "",
        runs: [
          { run_id: "d6f7f11bb7cd4739abc713b80fbea07b", kind: "assistant", status: "stale", session: "work3", cwd: "/Users/alexandreagostini/Documents/logics-manager" }
        ]
      },
      cdxReportResponse: {
        state: "ok",
        message: "",
        report: {
          run: { run_id: "d6f7f11bb7cd4739abc713b80fbea07b", status: "succeeded", kind: "assistant" },
          error: { code: "stale_process", message: "Run was marked running but no live provider process was found." },
          artifacts: {
            stdout_path: "/Users/alexandreagostini/.cdx/profiles/work3/log/cdx-run.stdout.log",
            transcript_path: "/Users/alexandreagostini/.cdx/profiles/work3/log/cdx-run.log"
          },
          task_report: null
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="d6f7f11bb7cd4739abc713b80fbea07b"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Signal");
    expect(text).toContain("stale_process");
    expect(text).toContain("Run was marked running but no live provider process was found.");
    expect(text).toContain("Artifacts");
    expect(text).toContain("Stdout Path");
    expect(text).toContain("cdx-run.log");
    expect(dom.window.document.querySelector('[data-viewer-cdx-artifact-path="/Users/alexandreagostini/.cdx/profiles/work3/log/cdx-run.log"]')).toBeTruthy();
  });

  it("opens CDX run report artifact paths from clickable log rows", async () => {
    const { dom, calls } = createViewerDom({
      cdxReportResponse: {
        state: "ok",
        message: "",
        report: {
          run: { run_id: "run-1", status: "succeeded", kind: "code-review" },
          artifacts: { transcript_path: "/tmp/run.log", stdout_path: "/tmp/run.out" },
          task_report: {
            kind: "code-review",
            run_id: "run-1",
            summary: "One issue found.",
            findings: []
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const transcript = dom.window.document.querySelector('[data-viewer-cdx-artifact-path="/tmp/run.log"]') as HTMLButtonElement | null;
    expect(transcript).toBeTruthy();
    transcript?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-artifact-preview");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX log · run.log");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Log preview");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("first log line");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Structured preview");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("JSON document");
    expect(dom.window.document.querySelector(".viewer-cdx__log-structured")).toBeTruthy();
    expect(dom.window.document.querySelector(".viewer-cdx__log-content")).toBeTruthy();
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Loaded /tmp/run.log");

    dom.window.document.getElementById("viewer-document-close")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX run report");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("One issue found.");
  });

  it("labels truncated CDX log previews as latest output", async () => {
    const { dom } = createViewerDom({
      filePreviewResponse: {
        path: "/tmp/run.log",
        name: "run.log",
        content: "recent progress\nlatest line",
        truncated: true
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-artifact-path="/tmp/run.log"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("latest output");
    expect(text).toContain("Preview truncated to the end of the file.");
    expect(text).toContain("latest line");
  });

  it("renders JSONL CDX log previews as structured events", async () => {
    const { dom } = createViewerDom({
      filePreviewResponse: {
        path: "/tmp/run.jsonl",
        name: "run.jsonl",
        content: '{"event":"started","index":1}\n{"event":"finished","index":2}',
        truncated: false
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-report="run-1"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-artifact-path="/tmp/run.log"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Structured preview");
    expect(text).toContain("2 JSONL event(s)");
    expect(text).toContain("started");
    expect(text).toContain("finished");
  });

  it("previews launches and applies guided CDX missions", async () => {
    const { dom, calls, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX missions");
    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Full audit");
    expect(text).toContain("Choose mission");
    expect(text).not.toContain("Guarded pre-release");
    expect(text).toContain("Missions");
    expect(text).toContain("5");
    expect(text).toContain("Sessions");
    expect(text).toContain("1");
    expect(text).toContain("Not previewed");
    const missionConfigButton = dom.window.document.querySelector(".viewer-cdx__mission-config > summary") as HTMLElement | null;
    expect(missionConfigButton?.textContent?.trim()).toBe("");
    expect(missionConfigButton?.querySelector("svg")).toBeTruthy();
    expect(missionConfigButton?.closest(".viewer-cdx__field-row")?.querySelector("[data-viewer-cdx-session]")).toBeTruthy();

    await chooseCdxMission(dom, "Prepare dev-ready corpus");
    const allowWrites = dom.window.document.querySelector('[data-viewer-cdx-input="allowFileWrites"]') as HTMLInputElement | null;
    expect(allowWrites).toBeNull();
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Corpus updates are applied after CDX returns allowed actions.");
    const modelInput = dom.window.document.querySelector('[data-viewer-cdx-input="model"]') as HTMLInputElement | null;
    expect(modelInput?.value).toBe("gpt-5-codex");
    if (modelInput) {
      modelInput.value = "gpt-5.1-codex";
      modelInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    const reasoningSelect = dom.window.document.querySelector('[data-viewer-cdx-input="reasoningEffort"]') as HTMLSelectElement | null;
    const powerSelect = dom.window.document.querySelector('[data-viewer-cdx-input="power"]') as HTMLSelectElement | null;
    if (reasoningSelect) {
      reasoningSelect.value = "xhigh";
      reasoningSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    if (powerSelect) {
      powerSelect.value = "high";
      powerSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-mission-plan");
    const corpusPlanCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(corpusPlanCall?.options?.body))).toMatchObject({
      missionId: "corpus-ready",
      allowFileWrites: "false",
      model: "gpt-5.1-codex",
      reasoningEffort: "xhigh",
      power: "high"
    });
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("cdx run session-1 --cwd /workspace/logics-manager");
    expect(text).toContain("--model gpt-5.1-codex");
    expect(text).toContain("--reasoning-effort xhigh");
    expect(text).toContain("--permission read-only");
    expect(text).toContain("Plan-first mission");
    expect(text).toContain("Ready");
    let outputPanel = dom.window.document.querySelector(".viewer-cdx__output-panel");
    expect(outputPanel?.textContent).toContain("cdx run session-1 --cwd /workspace/logics-manager");
    expect(dom.window.document.querySelector('[data-viewer-cdx-mission-output="plan"]')?.classList.contains("is-active")).toBe(true);

    // Run defaults to terminal mode now; select the background runner explicitly.
    const corpusRunMode = dom.window.document.querySelector('[data-viewer-cdx-run-mode]') as HTMLSelectElement | null;
    expect(Array.from(corpusRunMode?.options || []).find((option) => option.value === "background")?.textContent).toBe("Background runner (Experimental)");
    if (corpusRunMode) {
      corpusRunMode.value = "background";
      corpusRunMode.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    dom.window.document.querySelector('[data-viewer-cdx-run]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/cdx-mission-run");
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("run-42");
    expect(text).toContain("Succeeded");
    expect(text).toContain("140 total");
    expect(text).toContain("Refresh Corpus Context");
    outputPanel = dom.window.document.querySelector(".viewer-cdx__output-panel");
    expect(outputPanel?.textContent).toContain("run-42");
    expect(outputPanel?.textContent).not.toContain("cdx run session-1 --cwd /workspace/logics-manager");
    expect(dom.window.document.querySelector('[data-viewer-cdx-mission-output="run"]')?.classList.contains("is-active")).toBe(true);

    dom.window.document.querySelector('[data-viewer-cdx-mission-output="plan"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    outputPanel = dom.window.document.querySelector(".viewer-cdx__output-panel");
    expect(outputPanel?.textContent).toContain("cdx run session-1 --cwd /workspace/logics-manager");
    expect(outputPanel?.textContent).not.toContain("run-42");
    expect(dom.window.document.querySelector('[data-viewer-cdx-mission-output="plan"]')?.classList.contains("is-active")).toBe(true);

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
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    await chooseCdxMission(dom, "Wish to request");
    const input = dom.window.document.querySelector('[data-viewer-cdx-input="wishText"]') as HTMLTextAreaElement | null;
    expect(input).toBeTruthy();
    input!.value = "Capture a safer release checklist";
    input!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      missionId: "wish-to-request",
      allowFileWrites: "true",
      wishText: "Capture a safer release checklist"
    });
  });

  it("lets CDX missions opt out of file writes", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // full-audit / release-review now require file writes; pick a mission that still supports opt-out.
    await chooseCdxMission(dom, "Wish to request");
    const wish = dom.window.document.querySelector('[data-viewer-cdx-input="wishText"]') as HTMLTextAreaElement | null;
    wish!.value = "Capture a safer release checklist";
    wish!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    const allowWrites = dom.window.document.querySelector('[data-viewer-cdx-input="allowFileWrites"]') as HTMLInputElement | null;
    expect(allowWrites?.checked).toBe(true);
    allowWrites!.checked = false;
    allowWrites!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      allowFileWrites: "false"
    });
  });

  it("passes commit-at-end preference for writable CDX missions", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const commitAtEnd = dom.window.document.querySelector('[data-viewer-cdx-input="commitAtEnd"]') as HTMLInputElement | null;
    expect(commitAtEnd).toBeTruthy();
    expect(commitAtEnd?.checked).toBe(false);
    commitAtEnd!.checked = true;
    commitAtEnd!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      allowFileWrites: "true",
      commitAtEnd: "true"
    });
  });

  it("hides the file-write opt-out for missions that always write", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Default mission (full-audit) always requires file writes: no opt-out checkbox, explanatory note instead.
    expect(dom.window.document.querySelector('[data-viewer-cdx-input="allowFileWrites"]')).toBeNull();
    const cdxText = dom.window.document.body.textContent || "";
    expect(cdxText).toContain("This mission always drafts a Logics request");
    expect(dom.window.document.querySelector('[data-viewer-cdx-input="commitAtEnd"]')).toBeTruthy();

    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      missionId: "full-audit"
    });
  });

  it("passes direct-fix mode separately from corpus writes", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const directFixes = dom.window.document.querySelector('[data-viewer-cdx-input="directFixes"]') as HTMLInputElement | null;
    expect(directFixes).toBeTruthy();
    directFixes!.checked = true;
    directFixes!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const planCall = fetchCalls.find((call) => call.url === "/api/cdx-mission-plan" && call.options?.body);
    expect(JSON.parse(String(planCall?.options?.body))).toMatchObject({
      missionId: "full-audit",
      allowFileWrites: "true",
      directFixes: "true"
    });
  });

  it("passes guarded pre-release inputs into the plan payload", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    await chooseCdxMission(dom, "Guarded pre-release");
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
      allowFileWrites: "true",
      releaseVersion: "v2.8.0",
      runFullValidation: "true"
    });
  });

  it("launches terminal CDX missions with live progress feedback", async () => {
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const { dom, calls } = createViewerDom({ terminalCommands });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    dom.window.document.querySelector('[data-viewer-cdx-run]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls).toContain("/api/cdx-mission-plan");
    expect(calls).not.toContain("/api/cdx-mission-run");
    expect(terminalCommands).toHaveLength(1);
    expect(terminalCommands[0].label).toBe("cdx mission corpus-ready");
    const command = terminalCommands[0].command;
    expect(command.slice(0, 4)).toEqual(["/bin/sh", "-c", command[2], "cdx-mission"]);
    expect(command[2]).toContain("CDX_MISSION_PROGRESS_MODE");
    expect(command[2]).toContain("heartbeat elapsed=");
    expect(command[2]).toContain("waiting on command output");
    expect(command[2]).toContain("mode\" = \"verbose");
    expect(command[2]).toContain("mode\" = \"watch");
    expect(command[2]).toContain("final status=");
    expect(command[2]).toContain("next action: inspect the terminal output");
    expect(command.slice(7, 10)).toEqual(["cdx", "run", "session-1"]);
    expect(command).toContain("--json");
  });

  it("keeps navigation available while a CDX mission run is pending", async () => {
    let releaseRun: () => void = () => {};
    const cdxMissionRunGate = new Promise<void>((resolve) => {
      releaseRun = resolve;
    });
    const { dom, calls } = createViewerDom({ cdxMissionRunGate });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-cdx-mode="missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await chooseCdxMission(dom, "Prepare dev-ready corpus");
    dom.window.document.querySelector('[data-viewer-cdx-plan]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Run defaults to terminal mode now; select the background runner explicitly.
    const corpusRunMode = dom.window.document.querySelector('[data-viewer-cdx-run-mode]') as HTMLSelectElement | null;
    if (corpusRunMode) {
      corpusRunMode.value = "background";
      corpusRunMode.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    const missionRun = dom.window.document.querySelector('[data-viewer-cdx-run]') as HTMLButtonElement | null;
    missionRun?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    missionRun?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("CDX mission is running");
    expect(text).toContain("Still running");
    expect(text).toContain("pending");
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.filter((call) => call === "/api/cdx-mission-run")).toHaveLength(1);
    expect(missionRun?.disabled).toBe(true);
    expect((dom.window.document.getElementById("viewer-ci") as HTMLButtonElement | null)?.disabled).toBe(false);
    expect(calls).toContain("/api/git-status");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");

    releaseRun();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
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
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls.filter((call) => call === "/api/cdx-status")).toHaveLength(0);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("CDX executable is not available.");
  });

  it("maps CDX status rows into providers sessions and readiness", async () => {
    const { dom } = createViewerDom({
      cdxResponse: cdxRowsStatusPayload()
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    expect(text).toContain("Remaining 5h");
    expect(text).toContain("Remaining Week");
    expect(text).toContain("7%");
    expect(text).toContain("100%");
    expect(text).toContain("5H");
    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("BLOCK");
    expect(headers).not.toContain("CR");
    expect(text).not.toContain("9.68");
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

  it("opens CDX session action menus with resume and handoff choices", async () => {
    const payload = cdxRowsStatusPayload();
    const rows = payload.body.payload.status.rows;
    rows[0].resume_available = true;
    rows[0].last_launched_at = "2026-06-19T10:00:00.000Z";
    rows[1].resume_available = true;
    rows[1].last_launched_at = "2026-06-19T09:00:00.000Z";
    rows.push({
      session_name: "retired",
      provider: "codex",
      enabled: false,
      active: false,
      status: "disabled",
      auth_status: "authenticated",
      available_pct: null,
      remaining_5h_pct: null,
      remaining_week_pct: null,
      reset_5h_at: null,
      reset_week_at: null,
      updated_at: null
    });
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const { dom, calls, fetchCalls } = createViewerDom({
      cdxResponse: payload,
      terminalCommands,
      capabilities: {
        logics: { state: "ready", available: true, message: "Logics corpus found." },
        workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
        workshop: { state: "ready", available: true, message: "Workshop ready.", detail: { commandsAvailable: true, terminalsAvailable: true } },
        git: { state: "ready", available: true, message: "Git repository detected." },
        ci: { state: "ready", available: true, message: "GitHub Actions can be inspected." },
        cdx: { state: "ready", available: true, message: "CDX executable detected." },
        cdxRuns: { state: "unsupported", available: false, message: "CDX assistant run registry is not available yet." }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const work2Menu = dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="resume"]') as HTMLElement | null;
    const corvusHandoff = dom.window.document.querySelector('[data-viewer-cdx-session="corvus"][data-viewer-cdx-session-action="handoff"]') as HTMLElement | null;
    const work2Remove = dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="remove"]') as HTMLElement | null;
    const disabledRemove = dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="remove"]') as HTMLElement | null;
    expect(work2Menu?.textContent).toBe("Resume");
    expect(corvusHandoff?.textContent).toBe("Handoff (work2)");
    expect(work2Remove?.textContent).toBe("Remove");
    expect(work2Remove?.classList.contains("viewer-cdx__menu-action--danger")).toBe(true);
    expect(disabledRemove?.textContent).toBe("Remove");
    expect(dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="new"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="resume"]')).toBeNull();
    const sessionMenu = work2Menu?.closest("details") as HTMLDetailsElement | null;
    if (sessionMenu) {
      sessionMenu.open = true;
    }
    dom.window.document.getElementById("viewer-meta")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(sessionMenu?.open).toBe(false);
    if (sessionMenu) {
      sessionMenu.open = true;
    }
    dom.window.document.getElementById("viewer-cdx")?.dispatchEvent(new dom.window.FocusEvent("focusin", { bubbles: true }));
    expect(sessionMenu?.open).toBe(false);

    work2Menu?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Workshop");
    expect(dom.window.document.querySelector('[data-viewer-workshop-terminal-host="terminal-1"]')).toBeTruthy();
    expect(terminalCommands[0]).toEqual({ command: ["cdx", "resume", "work2"], label: "cdx resume work2" });

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    (dom.window.document.querySelector('[data-viewer-cdx-session="corvus"][data-viewer-cdx-session-action="handoff"]') as HTMLElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.querySelector('[data-viewer-workshop-terminal-host="terminal-2"]')).toBeTruthy();
    expect(terminalCommands).toContainEqual({ command: ["cdx", "handoff", "work2", "corvus"], label: "cdx handoff work2 corvus" });

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    (dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="remove"]') as HTMLElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("/api/cdx-remove");
    const removeCall = fetchCalls.find((call) => call.url === "/api/cdx-remove");
    expect(removeCall?.options?.body).toBe(JSON.stringify({ session: "work2" }));
    expect(terminalCommands).not.toContainEqual({ command: ["cdx", "remove", "work2"], label: "cdx remove work2" });
  });

  it("persists CDX status column visibility with Block and CR hidden by default", async () => {
    const { dom } = createViewerDom({ cdxResponse: cdxRowsStatusPayload() });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    let headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("BLOCK");
    expect(headers).not.toContain("CR");
    expect(text).not.toContain("9.68");

    const block = dom.window.document.querySelector('[data-viewer-cdx-column="block"]') as HTMLInputElement | null;
    expect(block?.checked).toBe(false);
    block!.checked = true;
    block?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const credits = dom.window.document.querySelector('[data-viewer-cdx-column="credits"]') as HTMLInputElement | null;
    expect(credits?.checked).toBe(false);
    credits!.checked = true;
    credits?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).toContain("BLOCK");
    expect(headers).toContain("CR");
    expect(text).toContain("9.68");
    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")?.cdxStatusColumns?.visibility).toMatchObject({
      block: true,
      credits: true
    });
  });

  it("restores persisted CDX status column visibility", async () => {
    const { dom } = createViewerDom({
      cdxResponse: cdxRowsStatusPayload(),
      initialPreferences: {
        version: 1,
        cdxStatusColumns: { visibility: { block: true, credits: true } }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("BLOCK");
    expect(text).toContain("CR");
    expect(text).toContain("9.68");
  });

  it("persists CDX provider filters while defaulting to all providers", async () => {
    const { dom } = createViewerDom({ cdxResponse: cdxRowsStatusPayload() });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("codex");
    expect(text).toContain("claude");

    const claude = dom.window.document.querySelector('[data-viewer-cdx-provider="claude"]') as HTMLInputElement | null;
    expect(claude?.checked).toBe(true);
    claude!.checked = false;
    claude?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await flushViewerAsync();

    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("codex");
    expect(text).not.toContain("corvus");
    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")?.cdxStatusProviders).toMatchObject({
      mode: "subset",
      selected: ["codex"]
    });

    dom.window.document.querySelector("[data-viewer-cdx-provider-all]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("corvus");
    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")?.cdxStatusProviders).toMatchObject({
      mode: "all",
      selected: []
    });
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
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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

    const gitButton = dom.window.document.getElementById("viewer-ci");
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

    const gitButton = dom.window.document.getElementById("viewer-ci");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("2");
    expect(gitButton?.querySelector('[data-viewer-git-badges="main"]')?.textContent).toContain("3");

    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
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
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
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
                autoRefreshIntervalForced: false,
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
