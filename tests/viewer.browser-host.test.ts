import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it, vi } from "vitest";

// Browser-host JSDOMs left open keep their diagnostics heartbeat/blank-ui
// intervals firing for the rest of the file; a console.error landing during
// worker teardown flakes the run with "Closing rpc while onUserConsoleLog was
// pending". Track them so afterEach can close them (which stops the timers).
const openBrowserHostDoms: JSDOM[] = [];

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
  cdxToggleGate?: Promise<void>;
  cdxToggleResponse?: { ok: boolean; status?: number; body?: unknown };
  cdxImportBodies?: Array<Record<string, unknown>>;
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
  gitCommitDiffResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitCommitResponse?: { ok: boolean; status?: number; body?: unknown };
  gitPreviewResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponseFactory?: () => { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  gitResponses?: Array<{ ok: boolean; status?: number; body?: unknown; rawBody?: string }>;
  githubUrl?: string;
  gitlabUrl?: string;
  repositoryProvider?: string;
  hidden?: boolean;
  // item_747: lets a test supply the corpus it means to reason about, instead of asserting
  // about signal classification against whatever the demo fixture happens to contain.
  items?: Array<Record<string, unknown>>;
  initialState?: unknown;
  initialPreferences?: unknown;
  projects?: Array<Record<string, unknown>>;
  lanMode?: boolean;
  lanRwMode?: boolean;
  canBootstrapLogics?: boolean;
  shouldPromptBootstrapLogics?: boolean;
  bootstrapWarning?: unknown;
  initialUrlToken?: string;
  pairStartResponse?: { ok: boolean; status?: number; body?: unknown };
  pairCompleteResponse?: { ok: boolean; status?: number; body?: unknown };
  openRepoFolderResponse?: { ok: boolean; status?: number; body?: unknown };
  selectProjectRootResponse?: { ok: boolean; status?: number; body?: unknown };
  refreshGate?: Promise<void>;
  refreshResponse?: { ok: boolean; status?: number; body?: unknown };
  refreshItemUpdatedAt?: string;
  releaseResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  shadowingExecutables?: string[];
  releaseRunsResponse?: { ok: boolean; status?: number; body?: unknown; rawBody?: string };
  updateStatusResponse?: { ok: boolean; status?: number; body?: unknown };
  terminalCommands?: Array<{ command: string[]; label: string }>;
  externalTerminalCommands?: Array<{ command: string[]; label: string }>;
  embeddedInVsCode?: boolean;
  terminalRenames?: Array<{ sessionId: string; label: string }>;
  autoRefreshIntervalSeconds?: number;
  autoRefreshIntervalForced?: boolean;
  fleet?: boolean;
  fleetHome?: boolean;
  fleetRoots?: string[];
  url?: string;
} = {}) {
  const parentMessages: unknown[] = [];
  const html = `<!doctype html><html><body>
    <div id="viewer-meta"></div>
    <button id="viewer-repo-pill" type="button" aria-expanded="false" aria-controls="viewer-project-menu"><span data-viewer-project-label>repository</span><span>v</span></button>
    <div id="viewer-project-menu" hidden></div>
    <a id="viewer-repo-github" href="#" hidden>GitHub</a>
    <button id="viewer-repo-folder" type="button" hidden>Folder</button>
    <div id="viewer-update" hidden><span id="viewer-update-copy"></span><code id="viewer-update-command"></code><button type="button" id="viewer-update-dismiss">Dismiss</button></div>
    <div id="viewer-environment-warning" hidden>
      <strong id="viewer-environment-warning-title"></strong>
      <span id="viewer-environment-warning-copy"></span>
    </div>
    <div id="viewer-lan-banner" hidden>
      <span id="viewer-lan-banner-url" hidden></span>
      <button id="viewer-lan-banner-copy" type="button" hidden>Copy URL</button>
      <button id="viewer-lan-banner-pair" type="button" hidden>Pair this device</button>
      <span id="viewer-lan-banner-paired" hidden></span>
    </div>
    <div class="viewer-nav-menu" data-viewer-nav="workshop">
      <button id="viewer-workshop" type="button" hidden>Workshop</button>
      <div class="viewer-nav-menu__panel" role="menu">
        <div class="viewer-nav-menu__separator" data-project-tools-separator role="separator" hidden></div>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="project:translations" hidden>Translations</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="project:theme" hidden>Theme</button>
      </div>
    </div>
    <!-- item_737: mirrors clients/viewer/index.html. The harness fixture omitting a nav menu
         is how a screen can lose its only route without a test noticing. -->
    <div class="viewer-nav-menu" data-viewer-nav="corpus">
      <button id="viewer-corpus" type="button">Corpus</button>
      <div class="viewer-nav-menu__panel" role="menu">
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="corpus:insights">Insights</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="corpus:health">Health</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="corpus:getting-started">Getting Started</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="corpus:runbooks">Runbooks</button>
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
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="cdx:memory">Memory</button>
        <button class="viewer-nav-menu__item" type="button" data-viewer-nav-target="cdx:disk">Disk</button>
      </div>
    </div>
    <button id="viewer-insights" type="button">Insights</button>
    <button id="viewer-health" type="button">Health</button>
    <button id="viewer-getting-started" type="button">Getting Started</button>
    <button id="viewer-bootstrap-logics" type="button" hidden>Bootstrap Logics</button>
    <button id="viewer-restart-server" type="button">Restart server</button>
    <button id="viewer-copy-diagnostics" type="button">Copy diagnostics</button>
    <a id="viewer-version-link" href="https://github.com/AlexAgo83/logics-manager">v0.0.0</a>
    <button id="activity-clear" type="button">Clear activity</button>
    <button id="filter-toggle" type="button">Filters</button>
    <button id="activity-toggle" type="button" aria-pressed="false">Activity</button>
    <div id="focus-menu">
      <button id="focus-menu-toggle" type="button" aria-expanded="false" aria-controls="focus-menu-options"><span id="focus-menu-label">Active work</span></button>
      <div id="focus-menu-options" hidden>
        <button type="button" data-viewer-focus-value="active">Active work</button>
        <button type="button" data-viewer-focus-value="all">All docs</button>
        <button type="button" data-viewer-focus-value="blocked">Blocked</button>
      </div>
    </div>
    <div class="viewer-refresh-menu">
      <button id="viewer-refresh-menu-button" type="button" aria-expanded="false" aria-controls="viewer-refresh-menu">Refresh</button>
      <div id="viewer-refresh-menu" hidden>
        <label><input id="viewer-auto-refresh" type="checkbox" checked />Auto</label>
        <label><input type="checkbox" data-viewer-workshop-system-terminal />System terminal</label>
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
    <div id="viewer-git-actions" hidden>
      <button id="viewer-git-actions-button" type="button" aria-expanded="false">Actions</button>
      <div id="viewer-git-actions-menu" hidden>
        <button id="viewer-git-commit" type="button">Commit</button>
        <button id="viewer-git-pull" type="button">Pull</button>
        <button id="viewer-git-push" type="button">Push</button>
        <button id="viewer-git-fetch" type="button">Fetch</button>
      </div>
    </div>
    <button id="viewer-release-reset" type="button" hidden>Reset</button>
    <button id="viewer-document-refresh" type="button">Refresh</button>
    <button id="viewer-document-status" type="button" hidden>Status</button>
    <button id="viewer-document-minimize" type="button">Minimize</button>
    <button data-action="open" type="button">Open</button>
    <button data-action="read" type="button">Read</button>
    <button data-action="promote" type="button">Promote</button>
    <button data-action="mark-done" type="button">Done</button>
    <button data-action="mark-obsolete" type="button">Obsolete</button>
    <button data-action="change-status" type="button">Status</button>
    <button data-viewer-action="edit-document" type="button" disabled>Edit document</button>
    <main id="board"></main>
    <section id="viewer-document" hidden>
      <div id="viewer-document-eyebrow" hidden></div>
      <span id="viewer-document-badge" hidden></span>
      <span id="viewer-document-priority" hidden></span>
      <div id="viewer-document-title"></div>
      <!-- item_761: mirrors clients/viewer/index.html, where the file path moved off the
           eyebrow and onto this control. Omitting it here would leave the assertion that
           the path is still reachable passing against a fixture that cannot show it. -->
      <button id="viewer-document-path-copy" type="button" hidden></button>
      <div id="viewer-document-nav" hidden></div>
      <div id="viewer-document-content"></div>
    </section>
    <!-- item_730: mirrors clients/viewer/index.html, which marks this an alert. The harness
         fixture omitted the role, so a test could assert the banner appears and still not
         notice that a screen reader is never told about it. -->
    <div id="viewer-action-error" role="alert" hidden>
      <span id="viewer-action-error-label"></span>
      <span id="viewer-action-error-message"></span>
      <button id="viewer-action-error-dismiss" type="button"></button>
    </div>
    <div id="viewer-minimized-dock" hidden></div>
    <aside id="activity-panel" hidden></aside>
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
    "> Priority: High",
    "> Progress: 40",
    "> Confidence: 0.8",
    "> Related request: `req_001_demo`",
    "> Related task: `task_001_blocked`",
    "> Reminder: Update status/understanding/confidence when you edit this doc.",
    "",
    "# Needs",
    "- AC1: Render related workflow references as compact controls.",
    "- request-AC1 -> `task_001_blocked`. Proof: Covered by focused viewer preview.",
    "- AC2/AC3 -> Task `task_001_blocked`. Proof: Grouped trace evidence.",
    "- Run `npm test`.",
    "- Related request: `req_001_demo`",
    "- Related task: [task doc](logics/tasks/task_001_blocked.md)",
    "- Render **markdown**.",
    "",
    "# Scope",
    "- In:",
    "  - Render `Scope` groups.",
    "- Out:",
    "  - Change non-Scope lists.",
    "",
    "# Validation",
    "- [x] Preview renders.",
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
        const [git, ci, releaseRuns, cdx, cdxRuns, cdxHistory] = await Promise.all([
          pick("/api/git-status"),
          pick("/api/ci-status"),
          pick("/api/release-runs"),
          pick("/api/cdx-status"),
          pick("/api/cdx-runs"),
          pick("/api/cdx-history")
        ]);
        return { ok: true, status: 200, json: async () => ({ ok: true, payload: { git, ci, releaseRuns, cdx, cdxRuns, cdxHistory } }) };
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
                provider: options.repositoryProvider ?? (options.gitlabUrl ? "gitlab" : "github"),
                webUrl: options.gitlabUrl || (options.githubUrl ?? "https://github.com/AlexAgo83/logics-manager"),
                githubUrl: options.githubUrl ?? (options.gitlabUrl ? "" : "https://github.com/AlexAgo83/logics-manager"),
                gitlabUrl: options.gitlabUrl || ""
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
              projects: options.projects ?? [
                { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: true, available: true, hasLogics: true, message: "Logics corpus found." },
                { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: false, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
              fleet: Boolean(options.fleet),
              fleetHome: Boolean(options.fleetHome),
              fleetRoots: options.fleetRoots ?? [],
              lanMode: Boolean(options.lanMode),
              lanRwMode: Boolean(options.lanRwMode),
              lanShareUrl: options.lanMode ? "http://192.168.1.42:8765/?t=secret-lan-token" : "",
              canBootstrapLogics: options.canBootstrapLogics ?? true,
              shouldPromptBootstrapLogics: Boolean(options.shouldPromptBootstrapLogics),
              bootstrapLogicsTitle: options.canBootstrapLogics === false ? "Bootstrap unavailable." : "Refresh Logics bootstrap files.",
              bootstrapWarning: options.bootstrapWarning ?? null,
              items: options.items ?? [
                {
                  id: "req_001_demo",
                  title: "Demo",
                  stage: "request",
                  relPath: "logics/request/req_001_demo.md",
                  references: [
                    { kind: "manual", label: "Reference", path: "README.md" },
                    { kind: "manual", label: "Reference", path: "clients/viewer/browser-host.js" },
                    { kind: "manual", label: "Reference", path: "logics/request/req_missing.md" }
                  ],
                  usedBy: [],
                  indicators: { Status: "Ready", Priority: "High", Progress: "40", Confidence: "0.8" },
                  isPromoted: false,
                  updatedAt: url === "/api/refresh" && options.refreshItemUpdatedAt ? options.refreshItemUpdatedAt : "2026-06-01T10:00:00"
                },
                { id: "task_001_blocked", title: "Blocked", stage: "task", relPath: "logics/tasks/task_001_blocked.md", references: [], usedBy: [], indicators: { Status: "Blocked" }, isPromoted: false, updatedAt: "2026-06-02T10:00:00" }
              ],
              updateInfo: options.shadowingExecutables
                ? { shadowingExecutables: options.shadowingExecutables, executablePath: "/usr/local/bin/logics-manager", manager: "npm" }
                : {
                  currentVersion: "2.2.0",
                  latestVersion: "2.3.0",
                  updateAvailable: true,
                  updateCommand: "logics-manager self-update"
                },
              cdxUpdateInfo: options.shadowingExecutables ? {} : {
                currentVersion: "0.9.13",
                latestVersion: "0.9.14",
                updateAvailable: true,
                updateCommand: "cdx update"
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
              // Mirrors the real server's switch_project(), which always re-sends "fleet"
              // via viewer_payload() -- omitting it here made Fleet mode look like it
              // vanished across a project switch, which the real server never does.
              fleet: Boolean(options.fleet),
              items: [
                { id: "req_002_cdx", title: "CDX", stage: "request", relPath: "logics/request/req_002_cdx.md", references: [], usedBy: [], indicators: { Status: "Ready" }, isPromoted: false, updatedAt: "2026-06-03T10:00:00" }
              ],
              updateInfo: {}
            }
          })
        };
      }
      if (url === "/api/select-project-root") {
        if (options.selectProjectRootResponse) {
          return {
            ok: options.selectProjectRootResponse.ok,
            status: options.selectProjectRootResponse.status ?? (options.selectProjectRootResponse.ok ? 200 : 500),
            json: async () => options.selectProjectRootResponse?.body || {}
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              root: "/workspace/selected-project",
              repoName: "selected-project",
              repository: {
                root: "/workspace/selected-project",
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
                { id: "project-selected", name: "selected-project", root: "/workspace/selected-project", active: true, available: true, hasLogics: true, message: "Logics corpus found." }
              ],
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
              items: [
                { id: "req_003_selected", title: "Selected", stage: "request", relPath: "logics/request/req_003_selected.md", references: [], usedBy: [], indicators: { Status: "Ready" }, isPromoted: false, updatedAt: "2026-06-04T10:00:00" }
              ],
              updateInfo: {}
            }
          })
        };
      }
      if (String(url).startsWith("/api/project-picker-tree")) {
        const query = new URL(`http://viewer.test${url}`).searchParams;
        const relPath = query.get("path") || "";
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: relPath === "workspace"
              ? {
                  state: "ok",
                  root: "/",
                  path: "workspace",
                  selectedPath: "/workspace",
                  parentPath: "",
                  entries: [
                    { name: "selected-project", path: "workspace/selected-project", hasLogics: true },
                    { name: "plain-folder", path: "workspace/plain-folder", hasLogics: false }
                  ],
                  truncated: false
                }
              : relPath === "workspace/selected-project"
                ? {
                    state: "ok",
                    root: "/",
                    path: "workspace/selected-project",
                    selectedPath: "/workspace/selected-project",
                    parentPath: "workspace",
                    entries: [],
                    truncated: false
                  }
              : relPath === "workspace/plain-folder"
                ? {
                    state: "ok",
                    root: "/",
                    path: "workspace/plain-folder",
                    selectedPath: "/workspace/plain-folder",
                    parentPath: "workspace",
                    entries: [],
                    truncated: false
                  }
              : {
                  state: "ok",
                  root: "/",
                  path: "",
                  selectedPath: "/",
                  parentPath: "",
                  entries: [
                    { name: "workspace", path: "workspace", hasLogics: false }
                  ],
                  truncated: false
                }
          })
        };
      }
      if (url === "/api/select-project-root-path") {
        const body = typeof fetchOptions?.body === "string" ? JSON.parse(fetchOptions.body || "{}") : {};
        const selectedPath = String(body.path || "workspace/selected-project");
        const selectedName = selectedPath.endsWith("plain-folder") ? "plain-folder" : "selected-project";
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: {
              root: `/workspace/${selectedName}`,
              repoName: selectedName,
              repository: { root: `/workspace/${selectedName}`, githubUrl: "" },
              capabilities: {
                logics: selectedName === "plain-folder"
                  ? { state: "missing", available: false, message: "No Logics corpus found." }
                  : { state: "ready", available: true, message: "Logics corpus found." },
                workspace: { state: "ready", available: true, message: "Workspace root can be inspected." },
                git: { state: "missing", available: false, message: "Project is not a Git repository." },
                ci: { state: "hidden", available: false, message: "No GitHub remote detected for this project." },
                cdx: { state: "missing", available: false, message: "CDX executable is not available." },
                cdxRuns: { state: "missing", available: false, message: "CDX is required before assistant runs can be tracked." }
              },
              projects: [{ id: `project-${selectedName}`, name: selectedName, root: `/workspace/${selectedName}`, active: true, available: true, hasLogics: selectedName !== "plain-folder", message: selectedName === "plain-folder" ? "No Logics corpus found." : "Logics corpus found." }],
              canBootstrapLogics: true,
              shouldPromptBootstrapLogics: selectedName === "plain-folder",
              bootstrapLogicsTitle: selectedName === "plain-folder" ? "Bootstrap Logics in this project." : "Refresh Logics bootstrap files.",
              autoRefreshIntervalSeconds: 15,
              autoRefreshIntervalForced: false,
              items: [],
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
              canBootstrapLogics: true,
              shouldPromptBootstrapLogics: false,
              bootstrapLogicsTitle: "Refresh Logics bootstrap files.",
              autoRefreshIntervalSeconds: options.autoRefreshIntervalSeconds ?? 15,
              autoRefreshIntervalForced: Boolean(options.autoRefreshIntervalForced),
              items: [],
              updateInfo: {}
            }
          })
        };
      }
      if (url === "/api/restart-viewer") {
        return {
          ok: true,
          json: async () => ({ ok: true, message: "Viewer server restarting." })
        };
      }
      if (url === "/api/viewer-diagnostics" || url === "/api/viewer-diagnostics/session" || url === "/api/viewer-diagnostics?limit=50") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: url.endsWith("/session")
              ? { interrupted: [] }
              : { entries: [{ kind: "blank-screen", message: "screen disappeared" }], path: "/tmp/viewer-diagnostics.jsonl", limit: 50 }
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
        if (options.openRepoFolderResponse) {
          return {
            ok: options.openRepoFolderResponse.ok,
            status: options.openRepoFolderResponse.status ?? (options.openRepoFolderResponse.ok ? 200 : 500),
            json: async () => options.openRepoFolderResponse?.body || {}
          };
        }
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
            payload: { id, label: body.label || "shell", command: Array.isArray(body.command) ? body.command : ["/bin/sh", "-i"], state: "running" }
          })
        };
      }
      if (url === "/api/workshop-terminal-external-start") {
        const body = fetchOptions?.body ? JSON.parse(String(fetchOptions.body)) : {};
        options.externalTerminalCommands?.push({
          command: Array.isArray(body.command) ? body.command : [],
          label: String(body.label || "")
        });
        const externalId = `external-backend-${options.externalTerminalCommands?.length || 1}`;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { label: body.label || "shell", command: Array.isArray(body.command) ? body.command : ["/bin/sh", "-i"], terminal: "iTerm", terminalRef: externalId, nativeRef: `iterm-native-${options.externalTerminalCommands?.length || 1}` }
          })
        };
      }
      if (url === "/api/workshop-terminal-rename") {
        const body = fetchOptions?.body ? JSON.parse(String(fetchOptions.body)) : {};
        const sessionId = String(body.sessionId || "");
        const label = String(body.label || "");
        options.terminalRenames?.push({ sessionId, label });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { id: sessionId, label, command: ["/bin/sh", "-i"], state: "running" }
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
      if (url === "/api/git-commit") {
        if (options.gitCommitResponse) {
          return {
            ok: options.gitCommitResponse.ok,
            status: options.gitCommitResponse.status ?? (options.gitCommitResponse.ok ? 200 : 400),
            json: async () => options.gitCommitResponse?.body || {}
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: { state: "ok", shortHash: "fedcba9", files: ["clients/viewer/browser-host.js"] }
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
      if (url === "/api/cdx-import") {
        options.cdxImportBodies?.push(JSON.parse(String(fetchOptions?.body || "{}")));
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, payload: { message: "Import complete." } })
        };
      }
      if (url === "/api/cdx-disk") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              message: "Measured CDX profiles disk usage: 3 GB",
              disk: {
                target: "profiles",
                path: "/home/user/.cdx/profiles",
                bytes: 3_000_000_000,
                size: "3 GB",
                children: [
                  { name: "work2", path: "/home/user/.cdx/profiles/work2", bytes: 2_000_000_000, size: "2 GB" },
                  { name: "corvus", path: "/home/user/.cdx/profiles/corvus", bytes: 1_000_000_000, size: "1 GB" }
                ],
                candidates: [
                  { profile: "work2", kind: "old-logs", path: "/home/user/.cdx/profiles/work2/logs", bytes: 500_000_000, size: "500 MB", reason: "log files older than 30 days", risk: "safe" }
                ],
                reclaimable_bytes: 500_000_000,
                reclaimable_size: "500 MB"
              },
              measured_at: new Date(Date.now() - 2 * 60_000).toISOString()
            }
          })
        };
      }
      if (String(url).startsWith("/api/cdx-memory")) {
        const scope = new URL(`http://viewer.test${url}`).searchParams.get("scope") || "current";
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            payload: {
              state: "ready",
              scope,
              source_path: `/home/user/.cdx/memory/${scope}.md`,
              exists: true,
              detected_repo: "/workspace/logics-manager",
              bytes_before: 42,
              bytes_after: 24,
              noise_ratio: 0.1,
              warnings: scope === "global" ? ["high-noise-memory"] : [],
              raw_excerpt: `${scope} raw /usage`,
              cleaned_excerpt: `${scope} cleaned handoff`,
              latest_useful_handoff: "2026-07-28"
            }
          })
        };
      }
      if (url === "/api/cdx-reset") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, payload: { message: "Activated banked Codex reset for work2" } })
        };
      }
      if (url === "/api/cdx-toggle") {
        if (options.cdxToggleGate) {
          await options.cdxToggleGate;
        }
        return {
          ok: options.cdxToggleResponse?.ok ?? true,
          status: options.cdxToggleResponse?.status ?? (options.cdxToggleResponse?.ok === false ? 500 : 200),
          json: async () => options.cdxToggleResponse?.body ?? { ok: true, payload: { message: "Toggle complete." } }
        };
      }
      if (url === "/api/cdx-permission") {
        const body = JSON.parse(String(fetchOptions?.body || "{}"));
        const rows = options.cdxResponse?.body?.payload?.status?.rows;
        if (Array.isArray(rows)) {
          rows.forEach((row: Record<string, unknown>) => {
            if (row.session_name === body.session || row.name === body.session || row.id === body.session) {
              row.permission = body.permission;
            }
          });
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, payload: { message: "Permission update complete." } })
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
              jobs: [],
              recentRuns: [
                { id: 1, workflowName: "CI", badgeState: "passing", updatedAt: "2024-06-01T00:05:00.000Z", url: "https://example/run/1", headSha: "abc123", title: "CI passing" }
              ]
            }
          })
        };
      }
      if (url === "/api/release-runs") {
        const releaseRunsResponse = options.releaseRunsResponse;
        if (releaseRunsResponse) {
          return {
            ok: releaseRunsResponse.ok,
            status: releaseRunsResponse.status ?? (releaseRunsResponse.ok ? 200 : 500),
            json: async () => {
              if (releaseRunsResponse.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return releaseRunsResponse.body || {};
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
              version: "v2.12.3",
              run: { id: 99, workflowName: "Release", status: "completed", conclusion: "success", badgeState: "passing", branch: "v2.12.3", version: "v2.12.3", matchSource: "release-latest" },
              jobs: [],
              activeCount: 0
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
      if (String(url).startsWith("/api/git-commit-diff")) {
        if (options.gitCommitDiffResponse) {
          return {
            ok: options.gitCommitDiffResponse.ok,
            status: options.gitCommitDiffResponse.status ?? (options.gitCommitDiffResponse.ok ? 200 : 500),
            json: async () => {
              if (options.gitCommitDiffResponse?.rawBody !== undefined) {
                throw new Error("Invalid JSON");
              }
              return options.gitCommitDiffResponse?.body || {};
            }
          };
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              state: "ok",
              ref: "abc1234",
              mode: "commit",
              diff: "commit abc1234\n\ndiff --git a/a.md b/a.md\n+Commit",
              truncated: false
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
      if (url.startsWith("/api/runbooks")) {
        const isSearch = url.includes("?q=");
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: isSearch
              ? { query: "release", matches: [], returned_count: 0, no_match: true, limit: 3 }
              : {
                  query: "",
                  matches: [
                    {
                      ref: "run_001_probe",
                      kind: "runbook",
                      path: "logics/runbook/run_001_probe.md",
                      title: "Restart the ingest worker",
                      category: "infrastructure",
                      verified: "2026-08-11, verified",
                      reason: "recent"
                    }
                  ],
                  returned_count: 1,
                  no_match: false,
                  limit: 10
                }
          })
        };
      }
      if (url === "/api/runbook-graph") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              nodes: [
                { ref: "category_infrastructure", kind: "category", title: "Infrastructure", status: "" },
                { ref: "run_001_probe", kind: "runbook", title: "Restart the ingest worker", status: "Active" }
              ],
              edges: [{ from: "category_infrastructure", to: "run_001_probe" }],
              dangling: []
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
        const wantsFull = requestUrl.searchParams.get("full") === "1";
        const payload = previewPath === "src/app.py"
          ? { state: "ok", path: "src/app.py", name: "app.py", kind: "file", size: 12, contentType: "text/x-python", content: "print('ok')\nprint('two')\n", truncated: false, lineCount: 2 }
          : previewPath === "src/big.py"
          ? (wantsFull
            ? { state: "ok", path: "src/big.py", name: "big.py", kind: "file", size: 999999, content: "a = 1\nb = 2\nc = 3\n", truncated: false, canForce: false, lineCount: 3 }
            : { state: "ok", path: "src/big.py", name: "big.py", kind: "file", size: 999999, content: "a = 1\nb = 2\n", truncated: true, canForce: true, lineCount: 3 })
          : previewPath === "src/huge.py"
          ? { state: "oversized", path: "src/huge.py", name: "huge.py", kind: "file", size: 336843, message: "File preview is limited to 30000 bytes; this file is 336843 bytes.", canForce: true }
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
            payload: {
              ok: false,
              issue_count: 1,
              warning_count: 0,
              issues: [{ path: "logics/request/req_001_demo.md", message: "Missing backlog link", severity: "blocking" }],
              findings: [{ path: "logics/request/req_001_demo.md", message: "Missing backlog link", severity: "blocking" }]
            }
          })
        };
      }
      if (url === "/api/audit") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            payload: {
              release_ready: true,
              issue_count: 0,
              warning_count: 1,
              warnings: [{ path: "logics/request/req_001_demo.md", message: "Review wording", severity: "warning" }],
              findings: [{ path: "logics/request/req_001_demo.md", message: "Review wording", severity: "warning" }]
            }
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
  if (options.embeddedInVsCode) {
    Object.defineProperty(dom.window, "parent", {
      configurable: true,
      value: { postMessage: (message: unknown) => parentMessages.push(message) }
    });
  }

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
  openBrowserHostDoms.push(dom);
  return { dom, calls, fetchCalls, parentMessages };
}

describe("local viewer browser host", () => {
  afterEach(() => {
    vi.useRealTimers();
    for (const dom of openBrowserHostDoms.splice(0)) {
      dom.window.close();
    }
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
                permission: "review",
                available_pct: 7,
                remaining_5h_pct: 0,
                remaining_week_pct: 3,
                credits: "9.6752125000",
                reset_credits_available: 2,
                reset_credits: [
                  { id: "rc-1", label: "weekly", expires_at: weekReset },
                  { id: "rc-2", label: "weekly", expires_at: weekReset }
                ],
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
    const focusMenu = dom.window.document.getElementById("focus-menu");

    expect(panel?.hasAttribute("hidden")).toBe(true);
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    expect(focusMenu).toBeTruthy();
    expect(panel?.querySelector('[data-viewer-filter-group="focus"]')).toBeNull();
  });

  it("places the Activity/Project slider to the right of the search docs bar", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const newRequest = dom.window.document.querySelector('.toolbar__filters .toolbar__new-request[data-action="new-request"]');
    const filters = dom.window.document.querySelector(".toolbar__filters");
    const search = dom.window.document.querySelector(".toolbar__search");
    const view = dom.window.document.querySelector(".toolbar__view");
    const slider = dom.window.document.querySelector(".toolbar__view-slider#activity-toggle");
    const projectMode = dom.window.document.querySelector('.toolbar__filters [data-action="toggle-view-mode"]');
    expect(newRequest).toBeTruthy();
    expect(filters).toBeTruthy();
    expect(search).toBeTruthy();
    expect(view).toBeTruthy();
    expect(slider).toBeTruthy();
    expect(newRequest?.textContent).toBe("+New");
    expect(view?.textContent).toContain("Activity");
    expect(view?.textContent).toContain("Project");
    expect(projectMode).toBeTruthy();
    expect(filters?.firstElementChild).toBe(newRequest);
    expect(filters?.compareDocumentPosition(search as Node) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search?.compareDocumentPosition(view as Node) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(projectMode?.classList.contains("toolbar__view-slider")).toBe(false);
  });

  it("styles the view slider and the mobile search/slider reflow", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    expect(css).toMatch(/\.toolbar__view-slider\[data-current-mode="project"\]::after/);
    expect(css).toMatch(/\.viewer-screen-activity #filter-toggle,\s*\.viewer-screen-activity #focus-menu,\s*\.viewer-screen-activity #attention-toggle,\s*\.viewer-screen-activity \.toolbar__mode-button,\s*\.viewer-screen-project #activity-clear\s*\{[^}]*display: none;/s);
    expect(css).toMatch(/\.viewer-screen-document #filter-toggle/);
    expect(css).not.toMatch(/\.viewer-code__gutter/);
    expect(css).not.toMatch(/\.viewer-code__body/);
    expect(css).toMatch(/\.viewer-code__row\s*\{[^}]*grid-template-columns: calc\(var\(--viewer-code-line-number-width, 3ch\) \+ 20px\) minmax\(max-content, 1fr\);/s);
    expect(css).toMatch(/\.viewer-code__line-number\s*\{[^}]*position: sticky;/s);
    expect(css).toMatch(/\.viewer-code__line-number\s*\{[^}]*width: calc\(var\(--viewer-code-line-number-width, 3ch\) \+ 20px\);/s);
    expect(css).toMatch(/\.viewer-code__line-number\s*\{[^}]*text-align: right;/s);
    expect(css).toMatch(/\.viewer-code__line\s*\{[^}]*white-space: pre;/s);
    expect(css).toMatch(/\.viewer-code__line code\s*\{[^}]*padding: 0;/s);
    expect(css).toMatch(/\.viewer-workspace__preview \.viewer-code__scroll\s*\{[^}]*overflow-x: auto;/s);
    expect(css).toMatch(/\.viewer-workspace__preview \.viewer-code__scroll\s*\{[^}]*overflow-y: visible;/s);
    expect(css).toMatch(/@media \(max-width: 640px\)/);
  });

  it("falls back to the folder browser when the native fleet-root picker cannot run", async () => {
    // item_726/item_730. Reported by the operator: "Add fleet root" in the fleet selector
    // did nothing when clicked. The server refuses when no native dialog is available, and
    // the browser dropped the refusal on the floor -- while the project picker beside it had
    // had a fallback folder browser all along. Nothing in the suite reported that a picker
    // could not run, which is how it shipped.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async (url: string, init?: unknown) => {
        if (String(url).startsWith("/api/select-fleet-root")) {
          return { ok: false, status: 501, json: async () => ({ ok: false, error: "No native folder dialog on this host." }) };
        }
        if (String(url).startsWith("/api/browse-directories") || String(url).startsWith("/api/list-directories")) {
          return { ok: true, status: 200, json: async () => ({ ok: true, payload: { path: "/workspace", entries: [] } }) };
        }
        return originalFetch(String(url), init as never);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const trigger = dom.window.document.createElement("button");
    trigger.setAttribute("data-viewer-fleet-root-pick", "");
    dom.window.document.body.appendChild(trigger);
    trigger.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    // The click reaches the fallback the project picker already had, and the modal repeats
    // the server's own reason rather than inventing one.
    const modal = dom.window.document.querySelector(".viewer-themed-modal");
    expect(modal).not.toBeNull();
    expect(modal?.textContent).toContain("No native folder dialog on this host.");
    expect(modal?.textContent).toContain("fallback folder browser");
  });

  it("shows a failed action's reason to the operator, and lets the next attempt supersede it", async () => {
    // item_727/item_730. Failures used to go through setMeta, into the small grey subtitle
    // beside the document count -- and scheduleNextAutoRefresh calls renderMeta on every
    // tick, so a clear server refusal was overwritten within the refresh interval and read
    // as nothing happening.
    //
    // item_730: this was covered by slicing withPrimaryAction out of the source and matching
    // a regex against it. That is the weakness that let all three of this request's defects
    // ship -- a test asserting the implementation agrees with itself cannot notice that the
    // operator sees nothing. It drives the screen now, through the connector action, which
    // is the path item_742 routed into withPrimaryAction for exactly this reason.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    let refuse = true;
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async (url: string, init?: { method?: string }) => {
        if (String(url).startsWith("/api/mcp-connector")) {
          if (init?.method === "POST") {
            return refuse
              ? { ok: false, status: 409, json: async () => ({ ok: false, error: "Another connector is already bound to this port." }) }
              : { ok: true, status: 200, json: async () => ({ ok: true }) };
          }
          return { ok: true, status: 200, json: async () => ({ ok: true, payload: { state: "off", message: "" } }) };
        }
        return originalFetch(String(url), init as never);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const trigger = dom.window.document.createElement("button");
    trigger.setAttribute("data-viewer-mcp-action", "start");
    dom.window.document.body.appendChild(trigger);

    const banner = () => dom.window.document.getElementById("viewer-action-error");
    expect(banner()?.hidden).toBe(true);

    trigger.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    // The reason is visible, in its own alert, and names the action that failed rather than
    // leaving the operator to guess which one it was.
    expect(banner()?.hidden).toBe(false);
    expect(banner()?.getAttribute("role")).toBe("alert");
    expect(dom.window.document.getElementById("viewer-action-error-label")?.textContent).toContain("Starting connector");
    expect(dom.window.document.getElementById("viewer-action-error-message")?.textContent).toContain(
      "Another connector is already bound to this port."
    );

    // A new attempt supersedes the previous reason rather than leaving a stale one up to be
    // read as the outcome of what the operator just did.
    refuse = false;
    trigger.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    expect(banner()?.hidden).toBe(true);

    // The banner's own markup and styling cannot be driven from this harness, which builds
    // its own DOM: the product's index.html and stylesheet are checked directly, and the
    // fixture above mirrors them so the behaviour above is not proved against a shape the
    // product does not have.
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    expect(html).toMatch(/id="viewer-action-error"[^>]*role="alert"/);
    expect(html).toMatch(/id="viewer-action-error-dismiss"/);
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    expect(css).toMatch(/\.viewer-action-error\s*\{/);
  });

  it("checks the connector POST response instead of rendering a refusal as done", () => {
    // item_742/item_745. This was `.then(() => showChatgptMcp())`, checking neither the
    // HTTP status nor the body's ok, so a refusal re-rendered unchanged state.
    const source = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/src/browser-host/index.js"), "utf8");
    const handler = source.slice(source.indexOf('data-viewer-mcp-action]'), source.indexOf('document.addEventListener("toggle"'));
    expect(handler).toMatch(/withPrimaryAction\(/);
    expect(handler).toMatch(/if \(!response\.ok \|\| !data\.ok\) throw new Error/);
    // The comment above the handler quotes the old shape on purpose, so assert against
    // code lines only rather than the whole slice.
    const handlerCode = handler.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
    expect(handlerCode).not.toMatch(/\.then\(\(\) => showChatgptMcp\(\)\)/);
  });

  it("names the connector action after what it does, not after the state", () => {
    // item_744. The heading said "Connector ON" while the button beneath said
    // "OFF — stop connector": one names the state, the other the action, and together
    // they read as a contradiction.
    const source = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/src/browser-host/index.js"), "utf8");
    expect(source).toMatch(/Stop the connector/);
    expect(source).toMatch(/Start the connector/);
    expect(source).not.toMatch(/OFF — stop connector/);
    expect(source).not.toMatch(/ON — start connector/);
  });

  it("syncs Activity/Project slider state from the shared chrome", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "clients/shared-web/media/webviewChrome.js"), "utf8");
    const host = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/browser-host.js"), "utf8");
    expect(source).toContain('activityToggle.dataset.currentMode = activityOpen ? "activity" : "project"');
    expect(source).toContain('document.body?.classList.toggle("viewer-screen-activity", activityOpen)');
    expect(source).toContain('document.body?.classList.toggle("viewer-screen-project", !activityOpen)');
    expect(host).toContain('document.body?.classList.toggle("viewer-screen-document", Boolean(open))');
    expect(source).toContain("Hide recent activity");
    expect(source).toContain("Show recent activity");
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

  it("pins both reading-grid children to row 1 so the contents nav cannot fall below the prose", () => {
    // item_793 swapped the reader's two tracks but left the rows implicit. The contents nav
    // is appended after the prose, and grid auto-placement never moves backwards, so the
    // prose took row 1 / column 2 and the nav could only land on row 2 -- correct column,
    // correct width, 2500px below the document. Measuring `x` alone reads that as fixed.
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    const prose = css.match(/\.markdown-preview--reading \.markdown-preview__prose\s*\{[^}]+\}/)?.[0] || "";
    const contents = css.match(/\.markdown-preview__contents\s*\{[^}]+\}/)?.[0] || "";

    expect(prose).toMatch(/grid-column:\s*2/);
    expect(prose).toMatch(/grid-row:\s*1/);
    expect(contents).toMatch(/grid-column:\s*1/);
    expect(contents).toMatch(/grid-row:\s*1/);
  });

  it("declares the local viewer favicon from packaged app assets", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const pngIcon = dom.window.document.querySelector('link[rel="icon"][type="image/png"]') as HTMLLinkElement | null;
    const svgIcon = dom.window.document.querySelector('link[rel="alternate icon"][type="image/svg+xml"]') as HTMLLinkElement | null;

    expect(pngIcon?.getAttribute("href")).toBe("/media/viewer-icon.png");
    expect(svgIcon).toBeNull();
  });

  it("styles CDX unread badges as informational instead of error toned", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    const match = css.match(/\.viewer-cdx-button-badge--unread\s*\{[^}]+\}/);
    const rule = match?.[0] || "";

    expect(rule).toContain("rgba(167, 139, 250, 0.18)");
    expect(rule).toContain("#c4b5fd");
    expect(rule).not.toContain("#ef4444");
    expect(rule).not.toContain("rgba(239, 68, 68");
  });

  it("orders local viewer topbar actions with Settings on the right", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);
    const labels = Array.from(dom.window.document.querySelectorAll(".viewer-topbar__actions > button, .viewer-topbar__actions > .viewer-nav-menu > button, .viewer-topbar__actions > .viewer-refresh-menu > button"))
      .map((node) => node.textContent?.trim().replace(/\s+/g, " "));

    // item_737: Corpus joins the row. It is where Insights, Health and Getting Started live
    // now -- they were only in the settings dropdown, which the gear stopped opening, so
    // removing them from the Settings screen left them unreachable.
    expect(labels).toEqual(["Workshop", "Corpus", "Remote", "CDX", "Settings"]);
    expect(dom.window.document.getElementById("viewer-getting-started")?.textContent).toContain("Getting Started");
    const settingsHeadings = Array.from(dom.window.document.querySelectorAll("#viewer-refresh-menu .viewer-settings-menu__heading"))
      .map((node) => node.textContent?.trim());
    expect(settingsHeadings).toEqual(["Refresh", "Guides", "Terminals", "Server", "Corpus", "VS Code panel", "About"]);
    expect(dom.window.document.querySelectorAll("#viewer-refresh-menu details.viewer-settings-menu__section")).toHaveLength(6);
    expect(dom.window.document.querySelector("#viewer-refresh-menu details[open]")).toBeNull();
    expect(Array.from(dom.window.document.querySelectorAll("#viewer-refresh-menu details")).every((node) => node.getAttribute("name") === "viewer-settings")).toBe(true);
    expect(dom.window.document.querySelector('[aria-label="About Logics Manager"]')).not.toHaveProperty("open");
    expect(dom.window.document.querySelector('[aria-label="About Logics Manager"] [data-action="getting-started"]')?.textContent).toContain("Getting Started");
  });

  it("declares conditional project translation and theme screens", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const source = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/src/browser-host/projectTools.js"), "utf8");
    const dom = new JSDOM(html);

    const workshop = dom.window.document.querySelector('[data-viewer-nav="workshop"]');
    expect(workshop?.querySelector('[data-project-tools-separator]')).not.toBeNull();
    expect(workshop?.querySelector('[data-viewer-nav-target="project:translations"]')).not.toBeNull();
    expect(workshop?.querySelector('[data-viewer-nav-target="project:theme"]')).not.toBeNull();
    expect(source).toContain('"/api/project-i18n"');
    expect(source).toContain('"/api/project-theme"');
    expect(source).toContain('"/api/project-i18n-value"');
    expect(source).toContain('"/api/project-theme-value"');
    expect(source).toContain("viewer-project-tool__placeholder");
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    expect(css).toMatch(/\.viewer-nav-menu\[hidden\][\s\S]*?display: none;/);
    expect(css).toMatch(/\.viewer-nav-menu__item\[hidden\][\s\S]*?display: none;/);
    expect(css).toContain(".viewer-project-tool__placeholder");
  });

  it("preserves project capabilities and reveals only their supported menu entries", async () => {
    const { dom } = createViewerDom({
      capabilities: {
        i18n: { state: "ready", available: true, message: "JSON locale catalog detected." },
        theme: { state: "hidden", available: false, message: "No supported theme convention detected." }
      }
    });
    dom.window.acquireVsCodeApi().postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    expect((dom.window.document.querySelector("[data-project-tools-separator]") as HTMLElement).hidden).toBe(false);
    expect((dom.window.document.querySelector('[data-viewer-nav-target="project:translations"]') as HTMLButtonElement).hidden).toBe(false);
    expect((dom.window.document.querySelector('[data-viewer-nav-target="project:theme"]') as HTMLButtonElement).hidden).toBe(true);
    dom.window.document.getElementById("viewer-workshop")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(dom.window.document.querySelector('[data-viewer-nav="workshop"]')?.classList.contains("is-open")).toBe(true);
  });

  it("keeps topbar menus intact and reserves document header navigation for screen segments", () => {
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    const dom = new JSDOM(html);

    expect(dom.window.document.querySelector('[data-viewer-nav="cdx"] .viewer-nav-menu__panel [data-viewer-nav-target="cdx:status"]')).not.toBeNull();
    // Workshop entries are generated from the registry, so the static markup holds
    // only the anchor they are inserted before.
    expect(dom.window.document.querySelector('[data-viewer-nav="workshop"] .viewer-nav-menu__panel [data-project-tools-separator]')).not.toBeNull();
    expect(dom.window.document.querySelector(".viewer-document__header #viewer-document-nav")).not.toBeNull();
  });

  // item_697: the Workshop menu was hand-written markup that drifted from the
  // `workshopTabs` registry — Runbooks shipped with no entry and was reachable only
  // by opening another section first and finding it in the tab strip.
  it("derives every Workshop menu entry from the workshopTabs registry", async () => {
    const constants = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/src/browser-host/constants.js"), "utf8");
    const registry = [...(/export const workshopTabs = \[([\s\S]*?)\n  \];/.exec(constants)![1]).matchAll(/id: "([^"]+)"/g)].map((match) => match[1]);
    // item_792: Runbooks moved to the Corpus nav group -- it is deliberately absent here now.
    expect(registry).not.toContain("runbooks");

    const { dom } = createViewerDom();
    dom.window.acquireVsCodeApi().postMessage({ type: "ready" });
    await flushViewerAsync();

    const panel = dom.window.document.querySelector('[data-viewer-nav="workshop"] .viewer-nav-menu__panel')!;
    const entries = Array.from(panel.querySelectorAll('[data-viewer-nav-target^="workshop:"]'))
      .map((item) => item.getAttribute("data-viewer-nav-target")!.split(":")[1]);
    // Same sections, same order, and no entry the registry does not declare.
    expect(entries).toEqual(registry);
    // The static markup must not carry them, or the drift is simply reintroduced.
    expect(fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8")).not.toContain('data-viewer-nav-target="workshop:');
    // AC4: the project tools stay below the separator, in their own markup.
    const separator = panel.querySelector("[data-project-tools-separator]")!;
    entries.forEach((_, index) => {
      expect(panel.children[index].getAttribute("data-viewer-nav-target")).toBe(`workshop:${entries[index]}`);
    });
    expect(Array.from(panel.children).indexOf(separator)).toBe(entries.length);
    // AC4: generated entries keep the menu semantics the hand-written ones had.
    panel.querySelectorAll('[data-viewer-nav-target^="workshop:"]').forEach((item) => {
      expect(item.getAttribute("role")).toBe("menuitem");
    });
  });

  it("opens Runbooks from the Corpus menu as its own screen (task_363)", async () => {
    // item_792: Runbooks moved out of Workshop's tab bar into the Corpus nav group.
    const { dom, calls } = createViewerDom();
    dom.window.acquireVsCodeApi().postMessage({ type: "ready" });
    await flushViewerAsync();

    expect(dom.window.document.querySelector('[data-viewer-nav-target="workshop:runbooks"]')).toBeNull();
    const runbooks = dom.window.document.querySelector('[data-viewer-nav-target="corpus:runbooks"]') as HTMLButtonElement | null;
    expect(runbooks).not.toBeNull();
    runbooks!.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Runbooks");
    expect(dom.window.document.querySelector("[data-viewer-workshop-runbooks]")).not.toBeNull();
    expect(calls).toContain("/api/runbooks?includeHidden=1");
    // Choosing an entry collapses the menu, as it did for every other nav group.
    expect(dom.window.document.querySelector('[data-viewer-nav="corpus"]')?.classList.contains("is-open")).toBe(false);
  });

  it("keeps the Workshop commands panel scrollable inside the document viewport", () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");

    expect(css).toContain('.viewer-workshop__panel[data-viewer-workshop-panel="commands"]');
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain(".viewer-workshop__command-header");
    expect(css).toContain("flex-wrap: wrap");
  });

  it("shows the current Logics Manager version in Settings as a GitHub link", async () => {
    const { dom } = createViewerDom({ githubUrl: "https://github.com/example/another-project" });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const version = dom.window.document.getElementById("viewer-version-link") as HTMLAnchorElement | null;
    expect(version?.textContent).toBe("v2.2.0");
    expect(version?.getAttribute("href")).toBe("https://github.com/AlexAgo83/logics-manager");
  });

  it("opens the getting started guide from Settings inside the local viewer", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Getting Started");
    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.querySelector(".viewer-onboarding")).not.toBeNull();
    expect(content?.textContent).toContain("Logics workflow map");
    expect(content?.textContent).toContain("Workflow Intake");
    expect(content?.textContent).toContain("roadmap");
    expect(content?.textContent).toContain("i18n contract");
    expect(content?.textContent).toContain("What each document is for");
  });

  it("minimizes and restores a desktop screen from the dock", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-document-minimize")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const panel = dom.window.document.getElementById("viewer-document");
    const dock = dom.window.document.getElementById("viewer-minimized-dock");
    expect(panel?.hidden).toBe(true);
    expect(dock?.hidden).toBe(false);
    expect(dock?.querySelectorAll("[data-viewer-minimized-restore]")).toHaveLength(1);
    expect(dock?.textContent).toContain("Getting Started");

    (dock?.querySelector("[data-viewer-minimized-restore]") as HTMLButtonElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(panel?.hidden).toBe(false);
    expect(dock?.hidden).toBe(true);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Getting Started");
  });

  it("keeps minimized screens unique and lets dock close kill the minimized screen", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-document-minimize")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-document-minimize")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const dock = dom.window.document.getElementById("viewer-minimized-dock");
    expect(dock?.querySelectorAll("[data-viewer-minimized-restore]")).toHaveLength(1);

    (dock?.querySelector("[data-viewer-minimized-close]") as HTMLButtonElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(dock?.hidden).toBe(true);
    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(true);
  });

  it("offers a restart server action from Settings", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-restart-server")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Restart viewer server");
    expect(calls).not.toContain("/api/restart-viewer");

    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/restart-viewer");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Viewer server restarting");
  });

  it("copies durable viewer diagnostics from Settings", async () => {
    const { dom, calls } = createViewerDom();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(dom.window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(dom.window.navigator, "clipboard", { configurable: true, value: { writeText } });

    dom.window.document.getElementById("viewer-copy-diagnostics")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/viewer-diagnostics?limit=50");
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toContain("screen disappeared");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Copied 1 viewer diagnostic entries");
  });

  it("records uncaught viewer errors for crash diagnosis", async () => {
    const { dom, fetchCalls } = createViewerDom();
    const error = new dom.window.Error("render stopped");

    dom.window.dispatchEvent(new dom.window.ErrorEvent("error", { error, message: error.message }));
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Viewer error: render stopped");
    const errors = (dom.window as any).logicsViewer.lastErrors();
    expect(errors.at(-1)?.message).toBe("render stopped");
    const persisted = fetchCalls.findLast((call) => call.url === "/api/viewer-diagnostics");
    expect(JSON.parse(String(persisted?.options?.body))).toMatchObject({
      entry: { kind: "runtime-error", message: "render stopped" }
    });
    expect(fetchCalls.some((call) => call.url === "/api/viewer-diagnostics/session")).toBe(true);
  });

  it("records and recovers an unexpectedly blank document screen", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const content = dom.window.document.getElementById("viewer-document-content") as HTMLElement | null;
    const healthyHtml = content?.innerHTML;
    content?.replaceChildren();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(content?.innerHTML).toBe(healthyHtml);
    const diagnostics = (dom.window as any).logicsViewer.diagnostics();
    expect(diagnostics.errors.at(-1)).toMatchObject({
      kind: "blank-screen",
      message: "Viewer document became empty unexpectedly",
      screen: "Getting Started"
    });
  });

  it("records an unexpectedly blank project board and leaves a recovery action", async () => {
    const { dom } = createViewerDom();
    const board = dom.window.document.getElementById("board") as HTMLElement | null;
    const card = dom.window.document.createElement("article");
    card.textContent = "Active request";
    board?.appendChild(card);
    await flushViewerAsync();

    board?.replaceChildren();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(board?.textContent).toContain("The project view became empty unexpectedly");
    expect((dom.window as any).logicsViewer.lastErrors().at(-1)).toMatchObject({
      kind: "blank-board",
      message: "Viewer board became empty unexpectedly",
      screen: "Project"
    });
  });

  it("does not report a blank board while a document screen covers it", async () => {
    const { dom } = createViewerDom();
    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    const errorsBefore = (dom.window as any).logicsViewer.lastErrors().length;

    const board = dom.window.document.getElementById("board") as HTMLElement | null;
    const card = dom.window.document.createElement("article");
    board?.appendChild(card);
    await flushViewerAsync();
    board?.replaceChildren();
    await flushViewerAsync();
    await flushViewerAsync();

    // A resize can empty the board behind whatever screen is actually open; that is not
    // a defect the operator is looking at, and should not stomp its status line.
    expect((dom.window as any).logicsViewer.lastErrors().length).toBe(errorsBefore);
  });

  it("forwards contained board render failures to viewer diagnostics", () => {
    const dom = new JSDOM("<!doctype html><html><body><main id=\"board\"></main></body></html>", { runScripts: "outside-only" });
    const recordError = vi.fn();
    (dom.window as any).logicsViewer = { recordError };
    loadScript(dom, "clients/shared-web/media/mainCore.js");
    const error = new Error("card renderer failed");
    const core = (dom.window as any).createCdxLogicsMainCore({
      state: { items: [], selectedId: null, activityPanelOpen: false, uiState: { detailsCollapsed: false } },
      board: dom.window.document.getElementById("board"),
      boardRenderer: { renderBoard: () => { throw error; } },
      isListMode: () => false,
      updateViewModeToggle: () => {}
    });

    core.render();

    expect(recordError).toHaveBeenCalledWith(error, { kind: "board-render-error", screen: "Project" });
    expect(dom.window.document.getElementById("board")?.textContent).toContain("The board could not be rendered");
  });

  it("pauses auto-refresh after three identical failures and groups them", async () => {
    const { dom } = createViewerDom();
    const error = new dom.window.Error("repeatable render failure");

    for (let index = 0; index < 3; index += 1) {
      dom.window.dispatchEvent(new dom.window.ErrorEvent("error", { error, message: error.message }));
    }
    await flushViewerAsync();

    expect((dom.window.document.getElementById("viewer-auto-refresh") as HTMLInputElement | null)?.checked).toBe(false);
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Stability guard paused auto-refresh");
    expect((dom.window as any).logicsViewer.lastErrors().at(-1)).toMatchObject({
      message: "repeatable render failure",
      count: 3
    });
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
    const bodyStrongText = Array.from(content?.querySelectorAll("li strong") || []).map((node) => node.textContent);
    expect(bodyStrongText).toContain("markdown");
    expect(content?.querySelector("table")).not.toBeNull();
    expect(content?.querySelector("pre.mermaid")?.textContent).toContain("flowchart TD");
    expect(dom.window.__mermaidRuns).toEqual([1]);
    // Every other screen says "<X> loaded." once it renders; opening a document from
    // the board was the one path that left an unrelated, stale status message in place.
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("Document loaded.");
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
    // The header shows the object name with a corpus-type pill; the file path
    // moves to the eyebrow subtitle.
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Demo");
    const badge = dom.window.document.getElementById("viewer-document-badge");
    expect(badge?.hidden).toBe(false);
    expect(badge?.textContent).toBe("Request");
    expect(badge?.getAttribute("data-stage")).toBe("request");
    const priority = dom.window.document.getElementById("viewer-document-priority");
    expect(priority?.hidden).toBe(false);
    expect(priority?.querySelector(".card__priority-meter--high")).toBeTruthy();
    expect(priority?.compareDocumentPosition(dom.window.document.getElementById("viewer-document-title") as Node)).toBe(dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
    // item_761: the eyebrow used to be the file path, uppercased by the stylesheet. It
    // identifies the document the way the details panel does now -- reference and status
    // -- and the path moved to the control asserted below, which is where this test has
    // to follow it: dropping the assertion would leave the path uncovered entirely.
    expect(dom.window.document.getElementById("viewer-document-eyebrow")?.textContent).toBe("req_001_demo • Ready");
    const pathCopy = dom.window.document.getElementById("viewer-document-path-copy");
    expect(pathCopy?.hidden).toBe(false);
    expect(pathCopy?.getAttribute("title")).toContain("logics/request/req_001_demo.md");
    expect(dom.window.document.getElementById("viewer-document-meta")).toBeNull();
    const meta = dom.window.document.querySelector("#viewer-document-content .viewer-document-meta");
    expect(meta).toBeTruthy();
    expect(meta?.textContent).toContain("Status");
    expect(meta?.textContent || "").toMatch(/Draft|Ready/);
    expect(meta?.textContent).not.toContain("Priority");
    expect(meta?.textContent).toContain("Progress");
    expect(meta?.textContent).toContain("40");
    expect(meta?.textContent).not.toContain("Reminder");
    expect(dom.window.document.querySelector("#viewer-document-content .markdown-preview__section-heading--acceptance")?.textContent).toBe("Needs");
    expect(dom.window.document.querySelector("#viewer-document-content .markdown-preview__section-heading--validation")?.textContent).toBe("Validation");
    const scope = dom.window.document.querySelector("#viewer-document-content .markdown-preview__scope");
    expect(scope).toBeTruthy();
    expect(scope?.querySelector(".markdown-preview__scope-group--in .markdown-preview__scope-label")?.textContent).toBe("In");
    expect(scope?.querySelector(".markdown-preview__scope-group--out .markdown-preview__scope-label")?.textContent).toBe("Out");
    expect(scope?.querySelector(".markdown-preview__scope-group--in code")?.textContent).toBe("Scope");
    expect(dom.window.document.querySelector("#viewer-document-content .markdown-preview__ac-id")?.textContent).toBe("AC1");
    const trace = dom.window.document.querySelector("#viewer-document-content .markdown-preview__trace");
    expect(trace?.querySelector(".markdown-preview__trace-ac")?.textContent).toBe("AC1");
    expect(trace?.querySelector(".markdown-preview__doc-ref--task")?.textContent).toBe("T001");
    expect(trace?.textContent).toContain("Covered by focused viewer preview.");
    const groupedTrace = Array.from(dom.window.document.querySelectorAll("#viewer-document-content .markdown-preview__trace")).at(1);
    expect(groupedTrace?.querySelector(".markdown-preview__trace-ac")?.textContent).toBe("AC2/AC3");
    expect(groupedTrace?.querySelector(".markdown-preview__doc-ref--task")?.textContent).toBe("T001");
    const validationCommand = dom.window.document.querySelector("#viewer-document-content .markdown-preview__validation-command");
    expect(validationCommand?.querySelector(".markdown-preview__validation-label")?.textContent).toBe("Run");
    expect(validationCommand?.querySelector("code")?.textContent).toBe("npm test");
    const metaRefs = Array.from(meta?.querySelectorAll("[data-viewer-doc-path]") || []);
    expect(metaRefs.map((node) => node.textContent)).toEqual(expect.arrayContaining(["R001", "T001"]));
    expect(metaRefs.map((node) => node.getAttribute("data-viewer-doc-path"))).toEqual(expect.arrayContaining(["req_001_demo", "task_001_blocked"]));
    expect(meta?.querySelector(".markdown-preview__doc-ref--request")).toBeTruthy();
    expect(meta?.querySelector(".markdown-preview__doc-ref--task")).toBeTruthy();
    const refs = Array.from(dom.window.document.querySelectorAll("#viewer-document-content [data-viewer-doc-path]"));
    expect(refs.map((node) => node.textContent)).toEqual(expect.arrayContaining(["R001", "T001"]));
    expect(refs.map((node) => node.getAttribute("data-viewer-doc-path"))).toEqual(expect.arrayContaining(["req_001_demo", "logics/tasks/task_001_blocked.md"]));
    (refs.find((node) => node.textContent === "T001") as HTMLElement | undefined)?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("/api/doc?path=logics%2Ftasks%2Ftask_001_blocked.md");
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

    // item_727: this reason used to land in the meta line, where the next auto-refresh
    // tick overwrote it. It now holds in the failure banner until dismissed.
    expect(dom.window.document.getElementById("viewer-action-error")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("viewer-action-error-message")?.textContent).toContain("Restart the local viewer");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).not.toContain("Restart the local viewer");
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

  it("subscribes to viewer events and falls back cleanly when SSE errors", async () => {
    const ciResponse = {
      ok: true,
      body: {
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
      }
    };
    const { dom, calls } = createViewerDom({ ciResponse });
    const sources: Array<{
      url: string;
      closed: boolean;
      onerror: ((event: Event) => void) | null;
      listeners: Map<string, Array<(event: MessageEvent) => void>>;
      emit: (name: string, payload: unknown) => void;
      close: () => void;
    }> = [];
    class FakeEventSource {
      url: string;
      closed = false;
      onerror: ((event: Event) => void) | null = null;
      listeners = new Map<string, Array<(event: MessageEvent) => void>>();
      constructor(url: string) {
        this.url = url;
        sources.push(this);
      }
      addEventListener(name: string, handler: (event: MessageEvent) => void) {
        const list = this.listeners.get(name) || [];
        list.push(handler);
        this.listeners.set(name, list);
      }
      emit(name: string, payload: unknown) {
        const event = new dom.window.MessageEvent(name, { data: JSON.stringify(payload) });
        for (const handler of this.listeners.get(name) || []) handler(event);
      }
      close() {
        this.closed = true;
      }
    }
    (dom.window as unknown as { EventSource: typeof EventSource }).EventSource = FakeEventSource as unknown as typeof EventSource;
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    expect(sources[0]?.url).toBe("/api/events");
    const before = calls.filter((call) => call === "/api/status").length;
    ciResponse.body.payload.badgeState = "failing";
    ciResponse.body.payload.run.badgeState = "failing";
    sources[0]?.emit("changed", { components: ["ci"] });
    await flushViewerAsync();

    expect(calls.filter((call) => call === "/api/status").length).toBeGreaterThan(before);
    sources[0]?.onerror?.(new dom.window.Event("error"));
    expect(sources[0]?.closed).toBe(true);
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
    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(Date.parse(stored.projectLastUsedAt["project-cdx"])).not.toBeNaN();
    expect(dom.window.document.querySelector("[data-viewer-project-label]")?.textContent).toBe("cdx-manager");
    expect(dom.window.document.getElementById("viewer-ci")?.hidden).toBe(true);
    expect((dom.window.document.getElementById("viewer-cdx") as HTMLButtonElement | null)?.disabled).toBe(true);
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("1 docs");
    expect(dom.window.document.getElementById("activity-panel")?.hidden).toBe(true);
    expect(dom.window.document.body.classList.contains("viewer-screen-project")).toBe(true);
    expect(dom.window.document.body.classList.contains("viewer-screen-activity")).toBe(false);
  });

  it("keeps the active project first and persists project menu star toggles without switching", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const switcher = dom.window.document.getElementById("viewer-repo-pill") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("cdx-manager"); attempt += 1) {
      await flushViewerAsync();
    }

    switcher?.click();
    const favorite = menu?.querySelector('[data-viewer-project-favorite="project-cdx"]') as HTMLButtonElement | null;
    favorite?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls.filter((call) => call === "/api/switch-project")).toHaveLength(0);
    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(stored.favoriteProjects).toEqual(["project-cdx"]);
    const rows = Array.from(menu?.querySelectorAll(".viewer-project-switcher__item-name") || []).map((node) => node.textContent);
    expect(rows.slice(0, 2)).toEqual(["logics-manager", "cdx-manager"]);
    expect(menu?.hidden).toBe(false);
    expect(menu?.querySelector('[data-viewer-project-favorite="project-cdx"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles favorites in the Fleet home without opening the topbar menu", async () => {
    const { dom, calls } = createViewerDom({
      fleet: true,
      fleetHome: true,
      projects: [
        { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: true, available: true, hasLogics: true },
        { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: false, available: true, hasLogics: true }
      ]
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    const favorite = dom.window.document.querySelector('.viewer-fleet [data-viewer-project-favorite="project-cdx"]') as HTMLButtonElement | null;
    favorite?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls.filter((call) => call === "/api/switch-project")).toHaveLength(0);
    expect(menu?.hidden).toBe(true);
    expect(dom.window.document.querySelector('.viewer-fleet [data-viewer-project-favorite="project-cdx"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("restores Close/Minimize when Fleet home is reopened after a project is active (task_371)", async () => {
    // item_800/task_371: rootScreenTitle used to be set to "Fleet" on the true
    // first-boot case and never cleared, so every later reopening of Fleet home
    // (via the switcher's Fleet entry) kept Close/Minimize hidden even with a
    // real project active behind it -- a genuine dead end.
    const { dom, calls } = createViewerDom({
      fleet: true,
      fleetHome: true,
      projects: [
        { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: false, available: true, hasLogics: true },
        { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: false, available: true, hasLogics: true }
      ]
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const document = dom.window.document;
    // True first boot: Fleet is the root screen, Close/Minimize are withheld.
    expect((document.getElementById("viewer-document-close") as HTMLButtonElement | null)?.hidden).toBe(true);

    const open = document.querySelector('.viewer-fleet [data-viewer-project-id="project-cdx"]') as HTMLButtonElement | null;
    open?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    for (let turn = 0; turn < 6; turn += 1) await flushViewerAsync();
    expect(calls).toContain("/api/switch-project");

    document.getElementById("viewer-repo-pill")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    document.querySelector("[data-viewer-fleet-home]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect((document.getElementById("viewer-document-close") as HTMLButtonElement | null)?.hidden).toBe(false);
    expect((document.getElementById("viewer-document-close") as HTMLButtonElement | null)?.disabled).toBe(false);
  });

  it("groups Fleet home rows under Favorites/All projects section labels (task_362)", async () => {
    const { dom } = createViewerDom({
      fleet: true,
      fleetHome: true,
      initialPreferences: { version: 1, favoriteProjects: ["project-cdx"] },
      projects: [
        { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: false, available: true, hasLogics: true },
        { id: "project-cdx", name: "cdx-manager", root: "/workspace/cdx-manager", active: false, available: true, hasLogics: true }
      ]
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const document = dom.window.document;
    const labels = Array.from(document.querySelectorAll(".viewer-fleet .viewer-fleet__section-label")).map((node) => node.textContent);
    expect(labels).toEqual(["Favorites", "All projects"]);
    // The favorite (cdx-manager) is under the first section, the rest under the second.
    const sections = document.querySelectorAll(".viewer-fleet .viewer-fleet__rows");
    expect(sections[0].textContent).toContain("cdx-manager");
    expect(sections[0].textContent).not.toContain("logics-manager");
    expect(sections[1].textContent).toContain("logics-manager");
  });

  it("omits an empty Fleet home section label (no favorites yet)", async () => {
    const { dom } = createViewerDom({
      fleet: true,
      fleetHome: true,
      projects: [
        { id: "project-logics", name: "logics-manager", root: "/workspace/logics-manager", active: false, available: true, hasLogics: true }
      ]
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const document = dom.window.document;
    const labels = Array.from(document.querySelectorAll(".viewer-fleet .viewer-fleet__section-label")).map((node) => node.textContent);
    expect(labels).toEqual(["All projects"]);
  });

  it("sorts favorite projects by last-used while keeping the active project first", async () => {
    const { dom } = createViewerDom({
      initialPreferences: {
        version: 1,
        favoriteProjects: ["project-active", "project-missing", "project-new", "project-old"],
        projectLastUsedAt: {
          "project-new": "2026-06-04T10:00:00.000Z",
          "project-old": "2026-06-01T10:00:00.000Z"
        }
      },
      projects: [
        { id: "project-new", name: "new-used", root: "/workspace/new-used", active: false, available: true, hasLogics: true },
        { id: "project-missing", name: "missing-used", root: "/workspace/missing-used", active: false, available: true, hasLogics: true },
        { id: "project-active", name: "active-project", root: "/workspace/active-project", active: true, available: true, hasLogics: true },
        { id: "project-old", name: "old-used", root: "/workspace/old-used", active: false, available: true, hasLogics: true }
      ]
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const rows = Array.from(dom.window.document.querySelectorAll(".viewer-project-switcher__item-name")).map((node) => node.textContent);
    expect(rows.slice(0, 4)).toEqual(["active-project", "new-used", "old-used", "missing-used"]);
  });

  it("restores project last-used ordering from the VS Code host", async () => {
    const { dom } = createViewerDom({
      initialPreferences: { version: 1, favoriteProjects: ["project-active", "project-cdx"] }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.dispatchEvent(new dom.window.MessageEvent("message", {
      data: { type: "viewer-project-last-used", projectLastUsedAt: { "project-cdx": "2026-07-05T10:00:00.000Z" } },
      source: dom.window.parent
    }));

    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(stored.projectLastUsedAt).toEqual({ "project-cdx": "2026-07-05T10:00:00.000Z" });
  });

  it("restores favorite projects from the VS Code host", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.dispatchEvent(new dom.window.MessageEvent("message", {
      data: { type: "viewer-favorite-projects", favoriteProjects: ["project-cdx"] },
      source: dom.window.parent
    }));

    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(stored.favoriteProjects).toEqual(["project-cdx"]);
    expect(dom.window.document.querySelector('[data-viewer-project-favorite="project-cdx"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("restores favorite projects from viewer preferences", async () => {
    const { dom } = createViewerDom({
      initialPreferences: { version: 1, favoriteProjects: ["project-cdx"] }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("cdx-manager"); attempt += 1) {
      await flushViewerAsync();
    }

    const rows = Array.from(menu?.querySelectorAll(".viewer-project-switcher__item-name") || []).map((node) => node.textContent);
    expect(rows.slice(0, 2)).toEqual(["logics-manager", "cdx-manager"]);
    expect(menu?.querySelector('[data-viewer-project-favorite="project-cdx"]')?.getAttribute("aria-pressed")).toBe("true");
  });

  it("opens a folder picker from the topbar project menu", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });

    const switcher = dom.window.document.getElementById("viewer-repo-pill") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("Choose folder..."); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    switcher?.click();
    expect(menu?.hidden).toBe(false);
    expect(menu?.textContent).toContain("Choose folder...");

    const picker = menu?.querySelector("[data-viewer-project-pick]") as HTMLButtonElement | null;
    picker?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/select-project-root");
    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(Date.parse(stored.projectLastUsedAt["project-selected"])).not.toBeNaN();
    expect(dom.window.document.querySelector("[data-viewer-project-label]")?.textContent).toBe("selected-project");
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("1 docs");
  });

  it("falls back to the embedded folder picker when the native picker is unavailable", async () => {
    const { dom, calls } = createViewerDom({
      selectProjectRootResponse: { ok: false, status: 500, body: { ok: false, error: "Native picker unavailable." } }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });

    const switcher = dom.window.document.getElementById("viewer-repo-pill") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("Choose folder..."); attempt += 1) {
      await flushViewerAsync();
    }
    switcher?.click();
    const picker = menu?.querySelector("[data-viewer-project-pick]") as HTMLButtonElement | null;
    picker?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/select-project-root");
    expect(dom.window.document.querySelector(".viewer-themed-modal")?.textContent).toContain("Native picker unavailable.");
    const workspace = dom.window.document.querySelector('[data-viewer-project-picker-open="workspace"]') as HTMLButtonElement | null;
    workspace?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const selected = dom.window.document.querySelector('[data-viewer-project-picker-open="workspace/plain-folder"]') as HTMLButtonElement | null;
    selected?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const selectCurrent = dom.window.document.querySelector('[data-viewer-project-picker-select="workspace/plain-folder"]') as HTMLButtonElement | null;
    selectCurrent?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/select-project-root-path");
    expect(dom.window.document.querySelector("[data-viewer-project-label]")?.textContent).toBe("plain-folder");
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Bootstrap Logics");
    expect(modal?.textContent).toContain("Not now");

    (modal?.querySelector(".viewer-themed-modal__cancel") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();

    expect(dom.window.document.querySelector(".viewer-themed-modal")).toBeNull();
    expect(calls.filter((call) => call === "/api/bootstrap-logics")).toHaveLength(0);
  });

  it("closes the project menu when clicking outside it or pressing Escape", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });

    const switcher = dom.window.document.getElementById("viewer-repo-pill") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("cdx-manager"); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    switcher?.click();
    expect(menu?.hidden).toBe(false);

    // Clicking somewhere outside the menu and its pill closes it.
    dom.window.document.body.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(menu?.hidden).toBe(true);
    expect(switcher?.getAttribute("aria-expanded")).toBe("false");

    // Escape also closes an open menu.
    switcher?.click();
    expect(menu?.hidden).toBe(false);
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(menu?.hidden).toBe(true);
    expect(switcher?.getAttribute("aria-expanded")).toBe("false");
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
    // item_758: the explorer used to preview the root, whose payload is a directory, so
    // three quarters of the screen arrived empty. It opens on the README the root
    // declares -- the file a repository puts there to be read first.
    expect(calls).toContain("/api/workspace-preview?path=README.md");
    expect(calls).not.toContain("/api/workspace-preview?path=");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Workshop");
    let content = dom.window.document.querySelector("[data-viewer-workshop-explorer]");
    expect(content?.textContent).toContain("src");
    expect(content?.textContent).toContain("README.md");
    expect(content?.textContent).toContain("node_modules");
    // item_758: the explorer now arrives on the README rather than on the root, so the
    // pane holds a file. The directory listing that replaced "3 item(s)" is asserted
    // below, from a directory the operator actually navigates to.
    expect(content?.textContent).toContain("Read me");
    // The pane holds a file now, so there is no notice at all -- which is the stronger
    // form of what this line was asserting: that the notice is not a placeholder.
    expect(content?.querySelector(".viewer-workspace__preview-notice")).toBeNull();

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

  it("renders the shared code viewer with inline line numbers, line count, and force-load", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-workshop-tab="explorer"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    let explorer = dom.window.document.querySelector("[data-viewer-workshop-explorer]") as HTMLElement;

    // Non-truncated file: inline line numbers + accurate line count, no force button.
    explorer.querySelector('[data-viewer-workspace-tree="src"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    explorer = dom.window.document.querySelector("[data-viewer-workshop-explorer]") as HTMLElement;
    explorer.querySelector('[data-viewer-workspace-preview="src/app.py"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    explorer = dom.window.document.querySelector("[data-viewer-workshop-explorer]") as HTMLElement;
    const rows = Array.from(explorer.querySelectorAll(".viewer-code__row"));
    expect(rows).toHaveLength(2);
    expect((explorer.querySelector(".viewer-code") as HTMLElement | null)?.getAttribute("style")).toContain("--viewer-code-line-number-width: 2ch");
    expect(rows[0]?.querySelector(".viewer-code__line-number")?.textContent).toBe("1");
    expect(rows[0]?.querySelector(".viewer-code__line")?.textContent).toContain("print('ok')");
    expect(rows[1]?.querySelector(".viewer-code__line-number")?.textContent).toBe("2");
    expect(rows[1]?.querySelector(".viewer-code__line")?.textContent).toContain("print('two')");
    expect(explorer.querySelector(".viewer-code__gutter")).toBeNull();
    expect(explorer.querySelector("pre.viewer-code__scroll")).toBeNull();
    expect(explorer.querySelector("code.hljs")).toBeNull();
    expect(explorer.querySelector(".viewer-code__lines")?.textContent).toBe("2 lines");
    expect(explorer.querySelector("[data-viewer-workspace-preview-full]")).toBeNull();

    // Truncated file: a "Load anyway" control appears and re-fetches with full=1.
    const trigger = dom.window.document.createElement("button");
    trigger.setAttribute("data-viewer-workspace-preview", "src/big.py");
    explorer.appendChild(trigger);
    trigger.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    explorer = dom.window.document.querySelector("[data-viewer-workshop-explorer]") as HTMLElement;
    const force = explorer.querySelector("[data-viewer-workspace-preview-full]");
    expect(force?.textContent).toContain("Load anyway");
    expect(explorer.querySelector(".viewer-code__flag")?.textContent).toContain("truncated");

    force?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("/api/workspace-preview?path=src%2Fbig.py&full=1");
    explorer = dom.window.document.querySelector("[data-viewer-workshop-explorer]") as HTMLElement;
    expect(explorer.querySelector("[data-viewer-workspace-preview-full]")).toBeNull();
    expect(explorer.querySelector(".viewer-code__lines")?.textContent).toBe("3 lines");

    const hugeTrigger = dom.window.document.createElement("button");
    hugeTrigger.setAttribute("data-viewer-workspace-preview", "src/huge.py");
    explorer.appendChild(hugeTrigger);
    hugeTrigger.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    explorer = dom.window.document.querySelector("[data-viewer-workshop-explorer]") as HTMLElement;
    const hugeNotice = explorer.querySelector(".viewer-workspace__preview-notice");
    expect(hugeNotice?.textContent).toContain("File preview is limited to 30000 bytes; this file is 336843 bytes.");
    expect(hugeNotice?.querySelector("[data-viewer-workspace-preview-full]")?.textContent).toContain("Load anyway");
    expect(hugeNotice?.closest(".viewer-workspace__placeholder")).toBeNull();
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
    // The running run now surfaces on the Missions sub-item, not on Reports.
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"] [data-viewer-menu-badges]')?.textContent).toContain("!");

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
    expect(dom.window.document.getElementById("viewer-document-nav")?.firstElementChild?.classList.contains("viewer-workshop__tabs")).toBe(true);
    expect(dom.window.document.querySelector(".viewer-workshop")?.classList.contains("viewer-screen-tabs-external")).toBe(true);
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
    // item_756: the state carries its duration now -- the row could not answer "how long
    // has this been going" at all before, which is the first thing asked of a running script.
    expect(dom.window.document.querySelector('[data-viewer-workshop-command="npm-test"] .viewer-workshop__state')?.textContent)
      .toMatch(/^running · \d+s$/);

    dom.window.document.querySelector('[data-viewer-workshop-command-stop="npm-test"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("/api/workshop-command-stop");
  });

  it("no longer shows Runbooks in the Workshop tab bar (task_363)", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tabIds = [...dom.window.document.querySelectorAll("[data-viewer-workshop-tab]")].map((node) => node.getAttribute("data-viewer-workshop-tab"));
    expect(tabIds).toEqual(["terminals", "commands", "explorer"]);
  });

  it("moves between Corpus screens via their shared header switch (task_363)", async () => {
    // item_792: mirrors the Git/CI/Release and CDX screens' own mode switcher -- Corpus
    // screens previously had no way to move between each other short of closing the panel.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.querySelector('[data-viewer-nav-target="corpus:insights"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Corpus insights");
    let modes = Array.from(dom.window.document.querySelectorAll("[data-viewer-corpus-mode]"));
    expect(modes.map((node) => node.getAttribute("data-viewer-corpus-mode"))).toEqual(["insights", "health", "getting-started", "runbooks"]);
    expect(dom.window.document.querySelector('[data-viewer-corpus-mode="insights"]')?.getAttribute("aria-selected")).toBe("true");

    dom.window.document.querySelector('[data-viewer-corpus-mode="runbooks"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Runbooks");
    expect(dom.window.document.querySelector('[data-viewer-corpus-mode="runbooks"]')?.getAttribute("aria-selected")).toBe("true");

    dom.window.document.querySelector('[data-viewer-corpus-mode="getting-started"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Getting Started");

    dom.window.document.querySelector('[data-viewer-corpus-mode="health"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Validation health");
  });

  it("opens Runbooks from Corpus and searches", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-nav-target="corpus:runbooks"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // item_801/task_372: "Show hidden" now defaults to on, so the initial load already
    // requests hidden runbooks too.
    expect(calls).toContain("/api/runbooks?includeHidden=1");
    const runbooksPanel = dom.window.document.querySelector("[data-viewer-workshop-runbooks]");
    expect(runbooksPanel?.textContent).toContain("Restart the ingest worker");
    expect(runbooksPanel?.textContent).toContain("infrastructure");
    expect(runbooksPanel?.textContent).toContain("recent");

    // Search with a query that matches nothing renders the empty state, not an error.
    // item_757: the Search button that duplicated this field is gone, so the search has
    // to be driven the way an operator now drives it -- by typing. The 250ms debounce is
    // waited out here rather than removed: a test that only passes without it would pass
    // against a field that fires a request per keystroke.
    expect(dom.window.document.querySelector("[data-viewer-workshop-runbook-search]")).toBeNull();
    const queryInput = dom.window.document.querySelector("[data-viewer-workshop-runbook-query]") as HTMLInputElement | null;
    if (queryInput) {
      queryInput.value = "release";
      queryInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/runbooks?q=release&includeHidden=1");
    expect(dom.window.document.querySelector("[data-viewer-workshop-runbooks]")?.textContent).toContain("No Active runbook matched");
  });

  it("no longer shows the dead \"View graph\" button in Runbooks (task_373)", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-nav-target="corpus:runbooks"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.querySelector("[data-viewer-workshop-runbook-graph]")).toBeNull();
  });

  it("defaults Runbooks \"Show hidden\" to on and persists a toggle to viewer preferences (task_372)", async () => {
    // item_801/task_372: this checkbox used to be in-memory only (workshopRunbookState.
    // includeHidden, hardcoded false) and reset to unchecked on every reload.
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.querySelector('[data-viewer-nav-target="corpus:runbooks"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const hidden = dom.window.document.querySelector("[data-viewer-workshop-runbook-hidden]") as HTMLInputElement | null;
    expect(hidden?.checked).toBe(true);
    expect(calls).toContain("/api/runbooks?includeHidden=1");

    hidden?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(stored.workshopRunbookShowHidden).toBe(false);
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

  it("clears stale paired-device credentials when a new LAN URL token is opened", async () => {
    const { dom } = createViewerDom({
      url: "http://192.168.1.42:8765/",
      lanMode: true,
      lanRwMode: true,
    });
    dom.window.sessionStorage.setItem("logics.lan.token", "old-lan-token");
    dom.window.localStorage.setItem("logics.lan.deviceToken", "stale-device-token");
    dom.window.localStorage.setItem("logics.lan.deviceId", "stale-device");
    dom.window.localStorage.setItem("logics.lan.deviceLabel", "Stale phone");
    dom.window.history.pushState(null, "", "/?t=secret-lan-token");

    loadScript(dom, "clients/viewer/browser-host.js");
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.sessionStorage.getItem("logics.lan.token")).toBe("secret-lan-token");
    expect(dom.window.localStorage.getItem("logics.lan.deviceToken")).toBeNull();
    expect(dom.window.localStorage.getItem("logics.lan.deviceId")).toBeNull();
    expect(dom.window.localStorage.getItem("logics.lan.deviceLabel")).toBeNull();
    expect(dom.window.document.getElementById("viewer-lan-banner")?.hidden).toBe(false);
    expect((dom.window.document.getElementById("viewer-lan-banner-pair") as HTMLButtonElement | null)?.hidden).toBe(false);
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
    const external = modal?.querySelector("[data-viewer-custom-terminal-external]") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(external?.checked).toBe(false);
    if (input) input.value = `node -e "console.log('ok ok')"`;
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(terminalCommands).toContainEqual({ command: ["sh", "-lc", `node -e "console.log('ok ok')"`], label: `node -e "console.log('ok ok')"` });
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("keeps system terminal mode off by default and routes launches there when enabled", async () => {
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const externalTerminalCommands: Array<{ command: string[]; label: string }> = [];
    const { dom } = createViewerDom({
      terminalCommands,
      externalTerminalCommands,
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
    await flushViewerAsync();
    await flushViewerAsync();
    const toggle = dom.window.document.querySelector("[data-viewer-workshop-system-terminal]") as HTMLInputElement | null;
    expect(toggle?.checked).toBe(false);

    toggle!.checked = true;
    toggle!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(terminalCommands).toEqual([]);
    expect(externalTerminalCommands).toContainEqual({ command: [], label: "" });
    expect(dom.window.document.querySelector("[data-viewer-workshop-external]")?.textContent).toContain("external");

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    (dom.window.document.querySelector('[data-viewer-cdx-session="session-1"][data-viewer-cdx-session-action="new"]') as HTMLElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(externalTerminalCommands).toContainEqual({ command: ["cdx", "session-1"], label: "cdx session-1" });
    const cdxExternal = Array.from(dom.window.document.querySelectorAll("[data-viewer-workshop-external]"))
      .find((row) => row.textContent?.includes("session-1")) as HTMLElement | undefined;
    expect(cdxExternal?.querySelector('[data-viewer-cdx-usage-refresh="session-1"]')).toBeTruthy();
    expect(cdxExternal?.getAttribute("data-viewer-workshop-external")).toMatch(/^external-backend-\d+$/);
    expect(cdxExternal?.getAttribute("title")).toContain("iterm-native-");
    const externalId = cdxExternal?.getAttribute("data-viewer-workshop-external") || "";
    const close = cdxExternal?.querySelector("[data-viewer-workshop-external-close]") as HTMLElement | null;
    expect(close).toBeTruthy();
    close?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushViewerAsync();
    expect(dom.window.document.querySelector(`[data-viewer-workshop-external="${externalId}"]`)).toBeNull();

    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector("[data-viewer-workshop-terminal-custom]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    const customModal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    const customExternal = customModal?.querySelector("[data-viewer-custom-terminal-external]") as HTMLInputElement | null;
    const customInput = customModal?.querySelector(".viewer-themed-modal__input") as HTMLInputElement | null;
    expect(customExternal?.checked).toBe(true);
    customExternal!.checked = false;
    customInput!.value = "pwd";
    (customModal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    expect(terminalCommands).toContainEqual({ command: ["sh", "-lc", "pwd"], label: "pwd" });
  });

  it("defaults to VS Code terminals when embedded in the VS Code viewer", async () => {
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const externalTerminalCommands: Array<{ command: string[]; label: string }> = [];
    const { dom, parentMessages } = createViewerDom({
      embeddedInVsCode: true,
      terminalCommands,
      externalTerminalCommands,
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
    await flushViewerAsync();
    await flushViewerAsync();
    const toggle = dom.window.document.querySelector("[data-viewer-workshop-system-terminal]") as HTMLInputElement | null;
    expect(toggle?.checked).toBe(true);

    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(terminalCommands).toEqual([]);
    expect(externalTerminalCommands).toEqual([]);
    expect(parentMessages).toContainEqual({ type: "launch-workshop-terminal", command: [], label: "terminal", cwd: "/workspace/logics-manager" });
    expect(dom.window.document.querySelector("[data-viewer-workshop-external]")?.textContent).toContain("external");
  });

  it("starts a custom Workshop terminal from an available CDX session", async () => {
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
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const customButton = dom.window.document.querySelector("[data-viewer-workshop-terminal-custom]") as HTMLButtonElement | null;
    customButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(customButton?.disabled).toBe(true);
    expect(customButton?.getAttribute("aria-busy")).toBe("true");
    expect(customButton?.textContent).toBe("Loading...");
    await flushViewerAsync();
    await flushViewerAsync();

    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    const select = modal?.querySelector(".viewer-themed-modal__select") as HTMLSelectElement | null;
    expect(Array.from(select?.options || []).map((option) => option.value)).toContain("session-1");
    expect(Array.from(select?.options || []).map((option) => option.textContent)).toContain("session-1 · Logics work · gpt-5-codex · active");
    select!.value = "session-1";
    select!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(terminalCommands).toContainEqual({ command: ["cdx", "session-1"], label: "cdx session-1" });
    expect(customButton?.disabled).toBe(false);
    expect(customButton?.getAttribute("aria-busy")).toBe("false");
    expect(customButton?.textContent).toBe("+ Custom");
  });

  it("keeps a CDX terminal usage gauge after renaming its display label", async () => {
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const terminalRenames: Array<{ sessionId: string; label: string }> = [];
    const { dom } = createViewerDom({
      terminalCommands,
      terminalRenames,
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
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.querySelector("[data-viewer-workshop-terminal-custom]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    let modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    const select = modal?.querySelector(".viewer-themed-modal__select") as HTMLSelectElement | null;
    select!.value = "session-1";
    select!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();
    expect(terminalCommands).toContainEqual({ command: ["cdx", "session-1"], label: "cdx session-1" });
    dom.window.document.querySelector(".viewer-themed-modal")?.remove();

    let row = dom.window.document.querySelector(".viewer-workshop__terminal-row:has(.viewer-workshop__usage)") as HTMLElement | null;
    const sessionId = row?.getAttribute("data-viewer-workshop-terminal-select") || "";
    expect(sessionId).toBeTruthy();
    expect(row?.querySelector(".viewer-workshop__usage")).toBeTruthy();
    const label = row?.querySelector("[data-viewer-workshop-terminal-rename]") as HTMLElement | null;
    expect(label).toBeTruthy();
    label?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, detail: 2 }));
    await flushViewerAsync();
    modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Rename terminal");
    const input = modal?.querySelector(".viewer-themed-modal__input") as HTMLInputElement | null;
    input!.value = "Build logs";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(terminalRenames).toContainEqual({ sessionId, label: "Build logs" });
    row = dom.window.document.querySelector(`[data-viewer-workshop-terminal-select="${sessionId}"]`) as HTMLElement | null;
    expect(row?.textContent).toContain("Build logs");
    expect(row?.querySelector(".viewer-workshop__usage")).toBeTruthy();
  });

  it("renames a Workshop terminal label from a double-click modal", async () => {
    const terminalCommands: Array<{ command: string[]; label: string }> = [];
    const terminalRenames: Array<{ sessionId: string; label: string }> = [];
    const { dom, calls } = createViewerDom({
      terminalCommands,
      terminalRenames,
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
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    let label = dom.window.document.querySelector("[data-viewer-workshop-terminal-rename]") as HTMLElement | null;
    expect(label?.textContent).toBe("shell");
    label?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, detail: 1 }));
    await flushViewerAsync();
    label = dom.window.document.querySelector("[data-viewer-workshop-terminal-rename]") as HTMLElement | null;
    label?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, detail: 2 }));
    await flushViewerAsync();

    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Rename terminal");
    const input = modal?.querySelector(".viewer-themed-modal__input") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (input) input.value = "Remote tests";
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/workshop-terminal-rename");
    expect(terminalRenames).toContainEqual({ sessionId: "terminal-1", label: "Remote tests" });
    expect(dom.window.document.querySelector("[data-viewer-workshop-terminal-rename]")?.textContent).toBe("Remote tests");
  });

  it("hides running terminal status while keeping ended status badges", async () => {
    const sources: Array<{
      url: string;
      listeners: Map<string, Array<(event: MessageEvent) => void>>;
      emit: (name: string, payload: unknown) => void;
      close: () => void;
    }> = [];
    class FakeEventSource {
      url: string;
      listeners = new Map<string, Array<(event: MessageEvent) => void>>();
      constructor(url: string) {
        this.url = url;
        sources.push(this);
      }
      addEventListener(name: string, handler: (event: MessageEvent) => void) {
        const list = this.listeners.get(name) || [];
        list.push(handler);
        this.listeners.set(name, list);
      }
      emit(name: string, payload: unknown) {
        const event = new dom.window.MessageEvent(name, { data: JSON.stringify(payload) });
        for (const handler of this.listeners.get(name) || []) handler(event);
      }
      close() {}
    }
    const { dom } = createViewerDom({
      terminalCommands: [],
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
    (dom.window as unknown as { EventSource: typeof EventSource }).EventSource = FakeEventSource as unknown as typeof EventSource;
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const row = dom.window.document.querySelector("[data-viewer-workshop-terminal-select]") as HTMLElement | null;
    expect(row?.querySelector(".viewer-workshop__state--running")).toBeNull();

    sources.find((source) => source.url.includes("/api/workshop-terminal/"))?.emit("end", { state: "failed" });
    await flushViewerAsync();

    const endedRow = dom.window.document.querySelector("[data-viewer-workshop-terminal-select]") as HTMLElement | null;
    expect(endedRow?.querySelector(".viewer-workshop__state--failed")?.textContent).toBe("failed");
  });

  it("reorders Workshop terminals with drag and drop", async () => {
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
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const rowsBefore = Array.from(dom.window.document.querySelectorAll("[data-viewer-workshop-terminal-drag]")) as HTMLElement[];
    expect(rowsBefore.map((row) => row.getAttribute("data-viewer-workshop-terminal-drag")).slice(0, 2)).toEqual(["terminal-1", "terminal-2"]);
    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      value: "",
      setData(_type: string, value: string) { this.value = value; },
      getData() { return this.value; }
    };
    const dragStart = new dom.window.Event("dragstart", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: typeof dataTransfer };
    dragStart.dataTransfer = dataTransfer;
    rowsBefore[1]!.dispatchEvent(dragStart);
    const dragOver = new dom.window.Event("dragover", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: typeof dataTransfer };
    dragOver.dataTransfer = dataTransfer;
    rowsBefore[0]!.dispatchEvent(dragOver);
    const drop = new dom.window.Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: typeof dataTransfer };
    drop.dataTransfer = dataTransfer;
    rowsBefore[0]!.dispatchEvent(drop);

    const rowsAfter = Array.from(dom.window.document.querySelectorAll("[data-viewer-workshop-terminal-drag]")) as HTMLElement[];
    expect(rowsAfter.map((row) => row.getAttribute("data-viewer-workshop-terminal-drag")).slice(0, 2)).toEqual(["terminal-2", "terminal-1"]);
    const preferences = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "{}");
    expect(preferences.workshopTerminalOrderByRoot?.["/workspace/logics-manager"].slice(0, 2)).toEqual(["terminal-2", "terminal-1"]);
  });

  it("only mounts the active Workshop terminal when reopening the terminal screen", async () => {
    const { dom } = createViewerDom({
      terminalCommands: [],
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
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="workshop:terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();
    dom.window.document.querySelector("[data-viewer-workshop-terminal-new]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.querySelector('[data-viewer-workshop-tab="explorer"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-workshop-tab="terminals"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const hosts = Array.from(dom.window.document.querySelectorAll("[data-viewer-workshop-terminal-host]"));
    expect(hosts.map((host) => host.getAttribute("data-viewer-workshop-terminal-host"))).toEqual(["terminal-2"]);
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

    const notice = dom.window.document.querySelector(".viewer-workspace__preview-notice");
    expect(notice?.textContent).toContain("Binary or unsupported file content cannot be previewed.");
    expect(notice?.closest(".viewer-workspace__placeholder")).toBeNull();
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

  it("prompts to bootstrap automatically for an unbootstrapped project", async () => {
    const { dom, calls } = createViewerDom({ canBootstrapLogics: true, shouldPromptBootstrapLogics: true });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Bootstrap Logics");
    expect(modal?.textContent).toContain("does not have a Logics workflow");
    expect((dom.window.document.getElementById("viewer-bootstrap-logics") as HTMLButtonElement | null)?.hidden).toBe(false);

    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/bootstrap-logics");
    expect(dom.window.document.querySelector("[data-viewer-project-label]")?.textContent).toBe("new-project");
  });

  it("reopens the bootstrap prompt from Settings after the automatic prompt is dismissed", async () => {
    const { dom, calls } = createViewerDom({ canBootstrapLogics: true, shouldPromptBootstrapLogics: true });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    let modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    (modal?.querySelector(".viewer-themed-modal__cancel") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    expect(dom.window.document.querySelector(".viewer-themed-modal")).toBeNull();

    dom.window.document.getElementById("viewer-bootstrap-logics")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Bootstrap Logics");

    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/bootstrap-logics");
  });

  it("keeps bootstrap refresh available without prompting for bootstrapped projects", async () => {
    const { dom, calls } = createViewerDom({ canBootstrapLogics: true, shouldPromptBootstrapLogics: false });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.document.querySelector(".viewer-themed-modal")).toBeNull();
    const button = dom.window.document.getElementById("viewer-bootstrap-logics") as HTMLButtonElement | null;
    expect(button?.hidden).toBe(false);
    expect(button?.disabled).toBe(false);
    expect(button?.title).toContain("Refresh Logics bootstrap files");

    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Bootstrap Logics");
    expect(modal?.textContent).toContain("Refresh generated Logics bootstrap files");
    expect(calls.filter((call) => call === "/api/bootstrap-logics")).toHaveLength(0);
  });

  it("shows a bootstrap refresh warning when local instructions are stale", async () => {
    const { dom } = createViewerDom({
      canBootstrapLogics: true,
      shouldPromptBootstrapLogics: false,
      bootstrapWarning: {
        title: "Logics bootstrap refresh recommended",
        message: "Refresh generated Logics assistant instructions with Bootstrap Logics or `logics-manager bootstrap` (LOGICS.md)."
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const banner = dom.window.document.getElementById("viewer-environment-warning") as HTMLElement | null;
    expect(banner?.hidden).toBe(false);
    expect(dom.window.document.getElementById("viewer-environment-warning-title")?.textContent).toContain("Logics bootstrap refresh recommended");
    expect(dom.window.document.getElementById("viewer-environment-warning-copy")?.textContent).toContain("logics-manager bootstrap");
  });

  it("opens the Settings screen and configures the interval from the payload", async () => {
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
    menuButton?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const interval = dom.window.document.querySelector("[data-viewer-settings-interval]") as HTMLSelectElement | null;
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Settings");
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

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Demo");

    releaseCdxStatus();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Demo");
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
    expect(dom.window.document.getElementById("viewer-update-copy")?.textContent).toContain("0.9.14");
    expect(dom.window.document.getElementById("viewer-update-command")?.textContent).toBe("logics-manager self-update && cdx update");
  });

  it("does not render duplicate executable details", async () => {
    const { dom } = createViewerDom({ shadowingExecutables: ["/opt/homebrew/bin/logics-manager"] });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const banner = dom.window.document.getElementById("viewer-update");
    expect(banner?.hidden).toBe(true);
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

  it("opens repository shortcuts through VS Code when embedded", async () => {
    const { dom, parentMessages } = createViewerDom({ embeddedInVsCode: true });
    const api = dom.window.acquireVsCodeApi();

    dom.window.dispatchEvent(new dom.window.MessageEvent("message", { data: { type: "viewer-embed-host", host: "vscode" } }));
    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const github = dom.window.document.getElementById("viewer-repo-github") as HTMLAnchorElement | null;
    const event = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
    github?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(parentMessages).toContainEqual({
      type: "open-external-link",
      target: "https://github.com/AlexAgo83/logics-manager"
    });
  });

  it("falls back to the embedded folder picker when opening the local folder is unavailable", async () => {
    const { dom, calls } = createViewerDom({
      openRepoFolderResponse: { ok: false, status: 403, body: { ok: false, error: "Local folder cannot be opened from this client." } }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const folder = dom.window.document.getElementById("viewer-repo-folder") as HTMLButtonElement | null;
    folder?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    expect(calls).toContain("/api/open-repo-folder");
    expect(calls.some((call) => call.startsWith("/api/project-picker-tree"))).toBe(true);
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Choose project folder");
    expect(modal?.textContent).toContain("Local folder cannot be opened from this client.");
  });

  it("hides the remote shortcut when the repository has no supported remote", async () => {
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

  it("points the repository shortcut at GitLab remotes", async () => {
    const { dom } = createViewerDom({ gitlabUrl: "https://gitlab.com/example/repo" });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const remote = dom.window.document.getElementById("viewer-repo-github") as HTMLAnchorElement | null;
    expect(remote?.hidden).toBe(false);
    expect(remote?.getAttribute("href")).toBe("https://gitlab.com/example/repo");
    expect(remote?.getAttribute("aria-label")).toBe("Open GitLab repository");
  });

  it("renders local corpus insights from loaded items", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.getElementById("viewer-insights")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // item_770: these screens render a loading placeholder the moment they are opened and
    // replace it when the scans return, so the assertion needs the extra turn that
    // replacement takes. Measured at 7.5-8.3s against a real corpus; here it is one tick.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(content?.textContent).toContain("Overview");
    expect(content?.textContent).toContain("5 signals need attention");
    expect(content?.textContent).toContain("Needs attention");
    expect(content?.textContent).toContain("Operator actions");
    expect(content?.textContent).toContain("Corpus shape");
    expect(content?.textContent).toContain("Flow health");
    expect(content?.textContent).toContain("Activity");
    expect(content?.textContent).toContain("Traceability");
    expect(content?.textContent).toContain("Quality signals");
    expect(content?.textContent).toContain("Blocked");
    // item_746/item_747: `Incomplete workflow chains` counted the normal state of new work --
    // at review time every document under it was a chain scaffolded within the hour. The row
    // is split by the rule that decides whether the signal is a defect: overdue chains are
    // counted by the headline, in-flight ones are reported without being claimed as work.
    expect(content?.textContent).toContain("Chains untouched for 14+ days");
    expect(content?.textContent).toContain("Chains in flight");
    expect(content?.textContent).toContain("req_001_demo -> logics/request/req_missing.md");
    expect(content?.textContent).not.toContain("req_001_demo -> README.md");
    expect(content?.textContent).not.toContain("req_001_demo -> clients/viewer/browser-host.js");
    expect(content?.querySelector(".viewer-insights__hero")).not.toBeNull();
    expect(content?.querySelector(".viewer-insights__workspace")).not.toBeNull();
    expect(content?.querySelector(".viewer-insights__bar-track")).not.toBeNull();
    expect(content?.querySelector("[data-viewer-open-health]")).not.toBeNull();
    const qualityCard = Array.from(content?.querySelectorAll(".viewer-insights__card") || [])
      .find((node) => node.textContent?.includes("Quality findings"));
    expect(qualityCard?.textContent).toContain("2");
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
    // item_770: these screens render a loading placeholder the moment they are opened and
    // replace it when the scans return, so the assertion needs the extra turn that
    // replacement takes. Measured at 7.5-8.3s against a real corpus; here it is one tick.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const action = dom.window.document.querySelector('[data-viewer-filter-group="focus"][data-viewer-filter-value="blocked"]') as HTMLButtonElement | null;
    action?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect((dom.window.document.querySelector('[data-viewer-filter-group="focus"]') as HTMLSelectElement | null)?.value).toBe("blocked");
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("focus: blocked");

    dom.window.document.getElementById("filter-reset")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect((dom.window.document.querySelector('[data-viewer-filter-group="focus"]') as HTMLSelectElement | null)?.value).toBe("all");
  });

  it("applies corpus focus from the toolbar focus menu", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.getElementById("focus-menu-toggle")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(dom.window.document.getElementById("focus-menu-options")?.hidden).toBe(false);

    dom.window.document.querySelector('[data-viewer-focus-value="blocked"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(dom.window.document.getElementById("focus-menu-options")?.hidden).toBe(true);
    expect(dom.window.document.getElementById("focus-menu-label")?.textContent).toBe("Blocked");
    expect((dom.window.document.querySelector('[data-viewer-filter-group="focus"]') as HTMLSelectElement | null)?.value).toBe("blocked");
    expect(dom.window.document.getElementById("viewer-filter-count")?.textContent).toContain("focus: blocked");
  });

  it("gives Getting Started a position, and lets it reflect the project in front of it", async () => {
    // item_752/item_753. Nothing said how many stages there were or where the reader was;
    // one stage had no action while another action appeared twice; and a corpus of 1 555
    // documents got the same first-run guide as an empty one, though the screen already
    // receives the counts that would let it say which stages this project has passed.
    const doc = (id: string, stage: string) => ({
      id,
      title: id,
      stage,
      relPath: `logics/${stage}/${id}.md`,
      path: `/workspace/mock/logics/${stage}/${id}.md`,
      updatedAt: new Date().toISOString(),
      indicators: { Status: "Ready" },
      references: [],
      usedBy: []
    });

    const { dom } = createViewerDom({
      items: [doc("req_600", "request"), doc("req_601", "request"), doc("task_600", "task")]
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const document = dom.window.document;

    // The screen says how many stages there are, and each stage says which one it is.
    expect(document.querySelector(".viewer-onboarding__nav-title")?.textContent).toContain("4 stages");
    const numbers = Array.from(document.querySelectorAll(".viewer-onboarding__stage-number")).map((node) => node.textContent);
    expect(numbers).toEqual(["1 of 4", "2 of 4", "3 of 4", "4 of 4"]);

    // item_753: each stage reports what this project already has there, and a stage with
    // nothing yet is marked -- to orient, not to grade. Nothing is hidden for having plenty.
    const holdings = Array.from(document.querySelectorAll(".viewer-onboarding__holding")).map(
      (node) => (node.textContent || "").trim()
    );
    expect(holdings[0]).toContain("2 request");
    expect(holdings[1]).toContain("nothing here yet");
    expect(holdings[2]).toContain("1 task");
    expect(document.querySelectorAll(".viewer-onboarding__holding--empty").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".viewer-onboarding__stage")).toHaveLength(4);

    // item_752: every stage ends in an action, and no action is offered twice.
    const stages = Array.from(document.querySelectorAll(".viewer-onboarding__stage"));
    expect(stages.every((stage) => stage.querySelector("[data-viewer-onboarding-action]"))).toBe(true);
    const actions = Array.from(document.querySelectorAll("[data-viewer-onboarding-action]")).map(
      (node) => (node as HTMLElement).dataset.viewerOnboardingAction
    );
    expect(new Set(actions).size).toBe(actions.length);
  });

  it("leads validation health with its own verdict and groups findings by file", async () => {
    // item_749/item_750. Five tiles, three of them zero, with `RELEASE READY: No` last and no
    // reason on a screen where everything else was green -- restating in a different
    // vocabulary an answer the release gate gives on its own screen. And five consecutive
    // findings printed the same path as their headline with the finding demoted beneath, so
    // the screen read as a list of paths rather than of findings.
    const { dom } = createViewerDom({
      items: [
        {
          id: "req_700_present",
          title: "Present",
          stage: "request",
          relPath: "logics/request/req_700_present.md",
          path: "/workspace/mock/logics/request/req_700_present.md",
          updatedAt: new Date().toISOString(),
          indicators: { Status: "Ready" },
          references: [],
          usedBy: []
        }
      ]
    });
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async (url: string, init?: unknown) => {
        if (String(url).startsWith("/api/lint")) {
          return {
            ok: true,
            json: async () => ({
              ok: true,
              payload: {
                ok: true,
                issue_count: 0,
                warning_count: 2,
                issues: [],
                findings: [
                  { path: "logics/request/req_001_demo.md", message: "First finding", source: "lint", severity: "warning" },
                  { path: "logics/request/req_001_demo.md", message: "Second finding", source: "lint", severity: "warning" },
                  { path: "logics/request/req_002_other.md", message: "references logics/request/req_700_present.md which is missing", source: "audit", severity: "warning" }
                ]
              }
            })
          };
        }
        if (String(url).startsWith("/api/audit")) {
          return { ok: true, json: async () => ({ ok: true, payload: { ok: true, issue_count: 0, warning_count: 0, issues: [], findings: [] } }) };
        }
        return originalFetch(String(url), init as never);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-health")?.dispatchEvent(new dom.window.Event("click"));
    await flushViewerAsync();
    await flushViewerAsync();

    const document = dom.window.document;

    // item_749: the screen's own verdict, and release readiness deferred rather than restated.
    const verdict = document.querySelector(".viewer-health__verdict-text")?.textContent || "";
    expect(verdict).toContain("Nothing blocks");
    expect(document.querySelector(".viewer-health__verdict-defer")?.textContent).toContain("Release screen");
    const cardLabels = Array.from(document.querySelectorAll(".viewer-health__label")).map((node) => node.textContent);
    expect(cardLabels).not.toContain("Release ready");

    // item_750: the file is the group, the finding is the headline of its own row.
    const groups = Array.from(document.querySelectorAll(".viewer-health__issue--group"));
    expect(groups).toHaveLength(2);
    const demoGroup = groups.find((node) => (node.textContent || "").includes("req_001_demo"));
    expect(demoGroup?.querySelector(".viewer-health__group-count")?.textContent).toContain("2 findings");
    expect(demoGroup?.querySelectorAll(".viewer-health__finding")).toHaveLength(2);
    expect(demoGroup?.querySelector(".viewer-health__finding-message")?.textContent).toBe("First finding");

    // item_750: a finding that says a document is absent while the corpus lists it is marked
    // suspect, with the contradiction named. The viewer reports; it does not adjudicate.
    const suspect = document.querySelector("[data-viewer-health-suspect]");
    expect(suspect).not.toBeNull();
    expect(suspect?.querySelector(".viewer-health__suspect-note")?.textContent).toContain(
      "logics/request/req_700_present.md is present in this corpus"
    );
    // The finding is not removed -- only marked.
    expect(suspect?.textContent).toContain("which is missing");
  });

  it("gives corpus insights one visual language, reusing the board's stage palette", async () => {
    // item_748. The corpus shape bars were all one blue while the board had given every
    // stage its own colour long before -- two screens describing the same corpus in two
    // languages -- and Open, Closed and Blocked were drawn as large key/value rows directly
    // beneath the thin bars they are the same kind of fact as.
    const doc = (id: string, stage: string) => ({
      id,
      title: id,
      stage,
      relPath: `logics/${stage}/${id}.md`,
      path: `/workspace/mock/logics/${stage}/${id}.md`,
      updatedAt: new Date().toISOString(),
      indicators: { Status: "Ready" },
      references: [],
      usedBy: []
    });

    const { dom } = createViewerDom({
      items: [doc("req_800", "request"), doc("item_800", "backlog"), doc("task_800", "task")]
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.getElementById("viewer-insights")?.dispatchEvent(new dom.window.Event("click"));
    await flushViewerAsync();
    await flushViewerAsync();

    const document = dom.window.document;

    // Each bar carries its stage, which is what lets the shared palette apply.
    const stages = Array.from(document.querySelectorAll(".viewer-insights__bar-row")).map(
      (node) => (node as HTMLElement).dataset.stage
    );
    expect(stages).toContain("request");
    expect(stages).toContain("backlog");
    expect(stages).toContain("task");

    // Both sets of facts in the Corpus shape card are bars, under subheads that say which
    // axis each counts -- they do not sum to the same thing.
    const shape = Array.from(document.querySelectorAll(".viewer-insights__section")).find(
      (node) => (node.querySelector("h2")?.textContent || "") === "Corpus shape"
    );
    expect(shape?.querySelectorAll(".viewer-insights__list")).toHaveLength(0);
    const subheads = Array.from(shape?.querySelectorAll(".viewer-insights__subhead") || []).map((node) => node.textContent);
    expect(subheads).toEqual(["By stage", "By state"]);
    expect(shape?.querySelectorAll(".viewer-insights__bars")).toHaveLength(2);

    // The palette is declared once rather than repeated per screen.
    const board = fs.readFileSync(path.resolve(process.cwd(), "clients/shared-web/media/css/board.css"), "utf8");
    expect(board).toMatch(/--stage-color-request:/);
    expect(board).toMatch(/\.card__title-prefix\[data-stage="request"\] \{ color: var\(--stage-color-request\); \}/);
    const viewerCss = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/viewer.css"), "utf8");
    expect(viewerCss).toMatch(/viewer-insights__bar-row\[data-stage="request"\][^\n]*var\(--stage-color-request\)/);
  });

  it("counts only what needs a decision in the insights headline", async () => {
    // item_746/item_747. At review time 100% of the documents Corpus insights listed under
    // Flow health were chains scaffolded within the hour, reported as incomplete chains and
    // promotion gaps -- which is exactly what a freshly scaffolded chain is. The headline
    // counted the normal state of new work, which made the number unusable rather than
    // merely imprecise.
    const day = 24 * 60 * 60 * 1000;
    const chain = (id: string, ageDays: number) => ({
      id,
      title: id,
      stage: "request",
      relPath: `logics/request/${id}.md`,
      path: `/workspace/mock/logics/request/${id}.md`,
      updatedAt: new Date(Date.now() - ageDays * day).toISOString(),
      indicators: { Status: "Draft" },
      references: [],
      usedBy: []
    });

    const openInsights = async (items: Array<Record<string, unknown>>) => {
      const { dom } = createViewerDom({ items });
      const api = dom.window.acquireVsCodeApi();
      api.postMessage({ type: "ready" });
      await flushViewerAsync();
      dom.window.document.getElementById("viewer-insights")?.dispatchEvent(new dom.window.Event("click"));
      await flushViewerAsync();
      await flushViewerAsync();
      const rows = Array.from(dom.window.document.querySelectorAll(".viewer-insights__signal")).map(
        (node) => (node.textContent || "").replace(/\s+/g, " ").trim()
      );
      const headline = dom.window.document.querySelector(".viewer-insights__hero p")?.textContent || "";
      const rowFor = (label: string) => rows.find((row) => row.startsWith(label)) || "";
      return {
        dom,
        rows,
        rowFor,
        content: dom.window.document.getElementById("viewer-document-content")?.textContent || "",
        headlineCount: Number((headline.match(/(\d+) signals need attention/) || [])[1] || 0)
      };
    };

    // The same three chains, aged differently. Comparing two corpora is what makes this
    // load-bearing: an assertion that reads the count off the headline and then compares it
    // to itself passes whether or not the classification is applied at all.
    const allOverdue = await openInsights([chain("req_900", 40), chain("req_901", 41), chain("req_902", 42)]);
    const twoInFlight = await openInsights([chain("req_900", 1), chain("req_901", 2), chain("req_902", 42)]);

    expect(allOverdue.headlineCount - twoInFlight.headlineCount).toBe(2);

    // In flight is reported, not hidden: a reader sees the queue without the headline
    // claiming it needs a decision.
    expect(twoInFlight.rowFor("Chains untouched for 14+ days")).toMatch(/\b1$/);
    expect(twoInFlight.rowFor("Chains in flight")).toMatch(/\b2$/);
    expect(allOverdue.rowFor("Chains untouched for 14+ days")).toMatch(/\b3$/);
    expect(allOverdue.rowFor("Chains in flight")).toMatch(/\b0$/);

    // AC3: the total is labelled as a total rather than sitting beside its own components.
    expect(twoInFlight.content).toContain("Needs attention (total)");

    // AC4: a row said its id and its status and never why it was on this list. The same
    // renderer serves several lists and a document can appear under more than one signal,
    // so the row names the signal that listed it rather than relying on a heading the
    // reader has scrolled past.
    const signals = Array.from(twoInFlight.dom.window.document.querySelectorAll("[data-viewer-insights-signal]")).map(
      (node) => (node as HTMLElement).dataset.viewerInsightsSignal
    );
    expect(signals).toContain("untouched 14+ days");
    expect(new Set(signals).size).toBeGreaterThan(0);
  });

  it("takes the screen's place immediately and says what it is waiting for", async () => {
    // item_770. Measured against this corpus (1 614 workflow documents), Corpus insights
    // takes 7.5-8.3s to become useful and Validation health 8.0-8.6s, cold or warm -- the
    // cost is the scan, not a cache. For all that time the viewer left the previous screen
    // in place with `Loading insights...` in the small grey meta line, so the click read as
    // nothing happening. After this change the title appears in 14ms and 5ms; the wait for
    // content is unchanged, which is what AC18 asks.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async (url: string, init?: unknown) => {
        if (String(url).startsWith("/api/lint") || String(url).startsWith("/api/audit")) {
          await gate;
        }
        return originalFetch(String(url), init as never);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-insights")?.dispatchEvent(new dom.window.Event("click"));
    await flushViewerAsync();

    // The screen takes its place while the scans are still running.
    const document = dom.window.document;
    expect(document.getElementById("viewer-document-title")?.textContent).toBe("Corpus insights");
    const loading = document.querySelector("[data-viewer-screen-loading]");
    expect(loading).not.toBeNull();
    expect(loading?.getAttribute("role")).toBe("status");
    expect(loading?.textContent).toContain("Working on Corpus insights");
    // It says what it is waiting for, not merely that it is busy.
    expect(loading?.textContent).toContain("the corpus lint and audit scans");

    release?.();
    for (let turn = 0; turn < 6; turn += 1) await flushViewerAsync();

    // The placeholder is replaced, not left up. It went up before the view token is taken:
    // setDocument invalidates pending views, so announcing the load after beginView()
    // cancelled the very load it announced and the screen stayed on the placeholder.
    expect(document.querySelector("[data-viewer-screen-loading]")).toBeNull();
    expect(document.getElementById("viewer-document-content")?.textContent).toContain("Overview");
  });

  it("drops a screen's late render once the operator has moved on", async () => {
    // item_774/item_775. Reproduced by the campaign three times, always the same shape: a
    // screen's asynchronous work landing over whichever screen was opened next.
    //
    // The guard was not broken -- it was never asked. showFleetHome, showSettings and
    // showChatgptMcp all fetched and committed without taking a view token, so isViewStale
    // had nothing to judge. And loadProjectState committed on
    // `options.renderFleetHome || isFleetHomeOpen()`, where the flag was captured before the
    // await: it meant "I was the fleet home when I started", which is not the question, and
    // the short-circuit made the correct test unreachable on the one path that needed it.
    //
    // This drives Settings rather than the fleet home. The fleet home's late render does not
    // reproduce under jsdom -- loadProjectState wraps everything in a try/catch and the
    // re-render never lands there -- so a test written against it asserts an outcome that is
    // also true when nothing happens. Settings has the same shape, renders in this harness,
    // and fails when its guard is removed, which is what AC6 asks for.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    let releaseInfo: (() => void) | null = null;
    let infoCalls = 0;
    const infoGate = new Promise<void>((resolve) => { releaseInfo = resolve; });
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async (url: string, init?: unknown) => {
        if (String(url).startsWith("/api/viewer-info")) {
          infoCalls += 1;
          await infoGate;
          return { ok: true, status: 200, json: async () => ({ ok: true, payload: { address: "http://127.0.0.1:1", mode: "read-only", transport: "HTTP", version: "0.0.0", repoName: "x" } }) };
        }
        return originalFetch(String(url), init as never);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const document = dom.window.document;

    // Open Settings; its viewer-info fetch is held open.
    document.getElementById("viewer-refresh-menu-button")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    // The operator moves on before it finishes.
    document.getElementById("viewer-getting-started")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(document.getElementById("viewer-document-title")?.textContent).toBe("Getting Started");

    // The late answer arrives. It must be dropped, not painted over the current screen.
    releaseInfo?.();
    for (let turn = 0; turn < 8; turn += 1) await flushViewerAsync();

    // The screen really was mid-flight, so the assertion below distinguishes "the guard
    // worked" from "nothing ever happened".
    expect(infoCalls).toBeGreaterThan(0);
    expect(document.getElementById("viewer-document-title")?.textContent).toBe("Getting Started");
  });

  it("keeps Insights, Health and Getting Started reachable from the navigation", async () => {
    // item_737, and a defect that slice introduced. Those three lived only inside the
    // settings dropdown, which the gear button stopped opening when it began opening the
    // Settings *screen* instead -- so the screen's own buttons were their only working
    // route. Removing them as "navigation dressed as settings" left all three unreachable
    // by clicking, and the slice's note asserted the navigation offered them without
    // checking. This is that assertion, checked.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const document = dom.window.document;
    const open = async (target: string) => {
      document.getElementById("viewer-document-close")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
      await flushViewerAsync();
      document.getElementById("viewer-corpus")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
      await flushViewerAsync();
      const entry = document.querySelector(`[data-viewer-nav-target="${target}"]`);
      expect(entry).not.toBeNull();
      entry?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
      for (let turn = 0; turn < 6; turn += 1) await flushViewerAsync();
      return document.getElementById("viewer-document-title")?.textContent || "";
    };

    expect(await open("corpus:insights")).toBe("Corpus insights");
    expect(await open("corpus:health")).toBe("Validation health");
    expect(await open("corpus:getting-started")).toBe("Getting Started");

    // The harness builds its own DOM, so the behaviour above is proved against the fixture.
    // The route only exists if the product's markup carries it too: removing the menu from
    // index.html leaves the test above green, which is exactly how this defect shipped.
    const html = fs.readFileSync(path.resolve(process.cwd(), "clients/viewer/index.html"), "utf8");
    expect(html).toMatch(/data-viewer-nav="corpus"/);
    expect(html).toMatch(/data-viewer-nav-target="corpus:insights"/);
    expect(html).toMatch(/data-viewer-nav-target="corpus:health"/);
    expect(html).toMatch(/data-viewer-nav-target="corpus:getting-started"/);
  });

  it("says what this viewer is, and does not dress navigation as settings", async () => {
    // item_737. Nine identical primary buttons, of which `Stop viewer` killed the server and
    // looked exactly like `Insights`, which was a link; three were navigation rather than
    // settings; the title was printed twice; and nothing reported the address, mode,
    // transport, version, or whether the MCP connector was on -- all of which the launch
    // banner has always printed to stdout, where a browser cannot read it.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const originalFetch = dom.window.fetch;
    Object.defineProperty(dom.window, "fetch", {
      configurable: true,
      value: async (url: string, init?: unknown) => {
        if (String(url).startsWith("/api/viewer-info")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              payload: {
                address: "http://127.0.0.1:8813",
                transport: "HTTP",
                mode: "read-only, loopback only",
                version: "2.21.9",
                repoName: "logics-manager"
              }
            })
          };
        }
        if (String(url).startsWith("/api/mcp-connector")) {
          return { ok: true, status: 200, json: async () => ({ ok: true, payload: { state: "off" } }) };
        }
        return originalFetch(String(url), init as never);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.getElementById("viewer-refresh-menu-button")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const document = dom.window.document;
    const identity = document.querySelector(".viewer-settings-identity")?.textContent || "";
    expect(identity).toContain("127.0.0.1:8813");
    expect(identity).toContain("read-only, loopback only");
    expect(identity).toContain("HTTP");
    expect(identity).toContain("v2.21.9");
    expect(identity).toContain("logics-manager");
    expect(identity).toContain("Off");

    // The title is printed once, by the document panel, not again by the screen's own hero.
    expect(document.getElementById("viewer-document-title")?.textContent).toBe("Settings");
    expect(document.querySelector(".viewer-settings-screen__hero")).toBeNull();

    // Insights, Health and Getting Started are navigation; they are reached from the
    // navigation, which already offers all three.
    const actions = Array.from(document.querySelectorAll("[data-viewer-settings-action]")).map(
      (node) => (node as HTMLElement).dataset.viewerSettingsAction
    );
    expect(actions).not.toContain("insights");
    expect(actions).not.toContain("health");
    expect(actions).not.toContain("getting-started");

    // A destructive action states what it costs and does not look like a link.
    const stop = document.querySelector('[data-viewer-settings-action="stop"]') as HTMLElement | null;
    expect(stop?.classList.contains("viewer-settings-danger")).toBe(true);
    expect(stop?.querySelector("small")?.textContent).toContain("stops working");
    const refresh = document.querySelector('[data-viewer-settings-action="refresh"]') as HTMLElement | null;
    expect(refresh?.classList.contains("viewer-settings-danger")).toBe(false);

    // A binary control shows where it sits.
    const toggle = document.querySelector("[data-viewer-settings-auto-refresh]") as HTMLInputElement | null;
    expect(toggle?.getAttribute("role")).toBe("switch");
    expect(toggle?.getAttribute("aria-checked")).toBe(String(toggle?.checked));
    expect(document.querySelector(".viewer-settings-toggle__state")?.textContent).toMatch(/^(On|Off)$/);
  });

  it("reconciles blocked, pass and the evidence count into one sentence, and leads with the blocking gate", async () => {
    // item_735/item_736. The screen showed `blocked`, `pass` and `8/8` side by side without
    // reconciling them; the sentence that resolves it was a right-aligned key/value cell at
    // the same weight as a file path; and the blocking gate sat fifth of eight.
    const gate = (id: string, status: string, extra: Record<string, unknown> = {}) => ({
      id,
      status,
      state: id.split("_")[0],
      required: true,
      evidence: { observed_at: "2026-08-13T10:00:00.000Z" },
      ...extra
    });

    const { dom } = createViewerDom({
      releaseResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "blocked",
            configured: true,
            contract_path: "logics/release/contract.json",
            commit: "abcdef1234567890",
            target_version: "1.2.3",
            next_action: "Re-run local validation against the current commit.",
            gates: [
              gate("ci_run", "passed"),
              gate("changelog", "passed"),
              gate("docs", "passed", { required: false }),
              gate("tests", "passed"),
              gate("local_validation", "stale", { blocking_reason: "evidence targets a different commit" })
            ]
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));
    dom.window.document.querySelector('[data-viewer-ci-mode="release"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const document = dom.window.document;

    // One sentence that reconciles the three numbers, with the action beside it.
    const verdict = document.querySelector(".viewer-release__verdict-text")?.textContent || "";
    expect(verdict).toContain("Blocked by local_validation");
    expect(verdict).toContain("evidence targets a different commit");
    expect(verdict).toContain("5 of 5 gates have evidence");
    expect(document.querySelector(".viewer-release__verdict-action")?.textContent).toContain("Re-run local validation");

    // The blocking gate leads, is marked, and is the one left open.
    const gates = Array.from(document.querySelectorAll("[data-viewer-release-gate]")) as HTMLDetailsElement[];
    expect(gates[0]?.dataset.viewerReleaseGate).toBe("local_validation");
    expect(gates[0]?.classList.contains("viewer-release__gate--blocking")).toBe(true);
    expect(gates[0]?.open).toBe(true);
    expect(gates.slice(1).every((node) => !node.open)).toBe(true);

    // A substate that only repeats the gate's own name is dropped; `optional` is stated
    // where it changes the conclusion and stays quiet where it does not.
    // Scoped to the summary: the blocking gate is expanded, so an unscoped query would
    // reach into its evidence rows and report their markup instead.
    expect(gates[0]?.querySelector(".viewer-release__gate-name em")).toBeNull();
    // `docs` is optional and passing, so the marker stays quiet: it changes what a failure
    // means, and there is no failure to reinterpret.
    const optionalGate = gates.find((node) => node.dataset.viewerReleaseGate === "docs");
    expect(optionalGate?.dataset.viewerReleaseGateTone).toBe("passing");
    expect(optionalGate?.querySelector(".viewer-release__gate-optional")).toBeNull();

    // The Next action row repeated the verdict's own action line.
    const listRows = Array.from(document.querySelectorAll(".viewer-ci__row")).map((node) => node.textContent || "");
    expect(listRows.join(" ")).not.toContain("Next action");
  });

  it("reports a CI run by its verdict and its duration, and lets a failure lead", async () => {
    // item_734. `completed / success` was printed on all six job rows in link blue, `pass`
    // appeared four times, both ends of the run were shown and its duration was not, and a
    // failing job was drawn at exactly the size of a passing one.
    const { dom } = createViewerDom({
      ciResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            visible: true,
            provider: "github",
            badgeState: "failing",
            branch: "main",
            headSha: "abc123",
            run: {
              id: 7,
              workflowName: "CI",
              status: "completed",
              conclusion: "failure",
              badgeState: "failing",
              event: "push",
              runStartedAt: "2026-08-13T10:00:00.000Z",
              updatedAt: "2026-08-13T10:04:12.000Z",
              commitMessage: "Something",
              author: "A"
            },
            jobs: [
              { name: "lint", status: "completed", conclusion: "success", startedAt: "2026-08-13T10:00:05.000Z", completedAt: "2026-08-13T10:01:05.000Z", htmlUrl: "" },
              { name: "build", status: "completed", conclusion: "failure", startedAt: "2026-08-13T10:01:00.000Z", completedAt: "2026-08-13T10:04:00.000Z", htmlUrl: "" },
              { name: "test", status: "completed", conclusion: "success", startedAt: "2026-08-13T10:00:05.000Z", completedAt: "2026-08-13T10:02:05.000Z", htmlUrl: "" }
            ]
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The CI screen is reached the way the existing CI tests reach it: open Git, then switch
    // mode. The nav entry alone lands on Git.
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await new Promise((resolve) => setTimeout(resolve, 10));
    dom.window.document.querySelector('[data-viewer-ci-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const document = dom.window.document;

    // The verdict says what happened and how long it took, once.
    const verdict = document.querySelector(".viewer-ci__verdict-text")?.textContent || "";
    expect(verdict).toContain("Failed");
    expect(verdict).toContain("4m 12s");

    // Job tone came from ciBadgeTone fed a raw GitHub conclusion, which that function does
    // not speak -- every job resolved to "unknown" and the rows were drawn identically.
    const tones = Array.from(document.querySelectorAll(".viewer-ci__job")).map(
      (node) => (node as HTMLElement).dataset.viewerCiJobState
    );
    expect(tones).toContain("failing");
    expect(tones).toContain("passing");
    expect(tones).not.toContain("unknown");

    // The failure leads and stays expanded; the passing jobs collapse to a counted line.
    const firstJob = document.querySelector(".viewer-ci__job") as HTMLElement | null;
    expect(firstJob?.dataset.viewerCiJobState).toBe("failing");
    expect(firstJob?.textContent).toContain("build");
    expect(firstJob?.textContent).toContain("3m");
    const fold = document.querySelector(".viewer-ci__job-fold details") as HTMLDetailsElement | null;
    expect(fold).not.toBeNull();
    expect(fold?.open).toBe(false);
    expect(fold?.querySelector("summary")?.textContent).toContain("2 jobs passed");

    // The repeated status string is gone from every row.
    const content = document.getElementById("viewer-document-content")?.textContent || "";
    expect(content).not.toContain("completed / success");
  });

  it("shows the diff rather than its header, and offers the rest when it is cut short", async () => {
    // item_732. Every diff opened with `diff --git`, `index <blob>..<blob>`, `--- a/<path>`
    // and `+++ b/<path>` -- the path the pane's own header already states and two hashes
    // nobody reads, five lines that pushed the actual change below the fold on a short pane.
    const diff = [
      "diff --git a/file.ts b/file.ts",
      "index abc1234..def5678 100644",
      "--- a/file.ts",
      "+++ b/file.ts",
      "@@ -1,3 +1,3 @@",
      " context",
      "-removed",
      "+added"
    ].join("\n");

    const { dom } = createViewerDom({
      gitDiffResponse: { ok: true, body: { ok: true, payload: { state: "ok", path: "file.ts", mode: "worktree", diff, truncated: true, canForce: true } } }
    });
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const lines = Array.from(dom.window.document.querySelectorAll(".viewer-git__diff-line")).map((node) => node.textContent || "");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toContain("@@");
    expect(lines.join("\n")).not.toContain("diff --git");
    expect(lines.join("\n")).not.toContain("index abc1234");

    // Additions, deletions and hunk headers are told apart by class, which the stylesheet
    // colours; the classes are what a test can hold.
    expect(dom.window.document.querySelectorAll(".viewer-git__diff-line--add").length).toBe(1);
    expect(dom.window.document.querySelectorAll(".viewer-git__diff-line--delete").length).toBe(1);
    expect(dom.window.document.querySelectorAll(".viewer-git__diff-line--hunk").length).toBe(1);
    expect(dom.window.document.querySelectorAll(".viewer-git__diff-line--meta").length).toBe(0);

    // A diff the server cut short says how to get the rest.
    const more = dom.window.document.querySelector("[data-viewer-git-diff-full]") as HTMLElement | null;
    expect(more).not.toBeNull();
    expect(more?.textContent).toContain("Load the rest");
    expect(more?.dataset.viewerGitDiffFull).toBe("file.ts");
  });

  it("opens the Git screen on a domain that has content and leads with a verdict", async () => {
    // item_731. `changes` was the default domain whatever the repository held, so a clean
    // tree opened the screen on two blank panes -- while `Ahead 5`, the one fact that needed
    // acting on, was a small pill beside a large `Clean` tile.
    const openGit = async (payload: Record<string, unknown>) => {
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
              recentCommits: [{ hash: "c0ffee1", subject: "Commit 1", author: "A", date: "2026-08-13", refs: "HEAD -> main" }],
              counts: { staged: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
              groups: { staged: [], modified: [], deleted: [], renamed: [], untracked: [] },
              ...payload
            }
          }
        }
      });
      const api = dom.window.acquireVsCodeApi();
      api.postMessage({ type: "ready" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      return dom;
    };

    // A clean tree with commits to push: History is the domain with content, and the verdict
    // names the thing to act on with the action beside it.
    const cleanAhead = await openGit({ ahead: 5 });
    const activeDomain = (cleanAhead.window.document.querySelector(".viewer-git__domain.is-active") as HTMLElement | null)?.dataset.viewerGitDomain;
    expect(activeDomain).toBe("history");
    expect(cleanAhead.window.document.querySelector(".viewer-git__verdict-text")?.textContent).toContain("5 commits ready to push");
    expect(cleanAhead.window.document.querySelector(".viewer-git__verdict-action")?.textContent).toBe("Push");
    // The action is the Actions menu's own control, not a second push path.
    expect(
      (cleanAhead.window.document.querySelector(".viewer-git__verdict-action") as HTMLElement | null)?.dataset.viewerGitRun
    ).toBe("viewer-git-push");

    // Behind takes precedence over ahead: pulling comes first when both are true.
    const behind = await openGit({ ahead: 2, behind: 3 });
    expect(behind.window.document.querySelector(".viewer-git__verdict-text")?.textContent).toContain("Diverged");
    expect(behind.window.document.querySelector(".viewer-git__verdict-action")?.textContent).toBe("Pull first");

    // Nothing to do says so, and offers no action, rather than leaving the operator to
    // read four tiles and conclude it.
    const idle = await openGit({});
    expect(idle.window.document.querySelector(".viewer-git__verdict-text")?.textContent).toContain("Nothing to push");
    expect(idle.window.document.querySelector(".viewer-git__verdict-action")).toBeNull();
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
    const summarySegments = Array.from(content?.querySelectorAll(".viewer-git__summary-segment") || []).map((node) => node.textContent || "");
    expect(summarySegments).toEqual(expect.arrayContaining([
      expect.stringContaining("Ahead"),
      expect.stringContaining("Behind")
    ]));

    // item_733: Staged, Worktree and Untracked were printed in a Files tile *and* in the
    // domain rail below it. They stay in the rail, which is also the control that scopes the
    // list, so a count appears once and clicking it does something.
    expect(summarySegments.join(" ")).not.toContain("Staged");
    const domains = Array.from(content?.querySelectorAll("[data-viewer-git-domain]") || []).map(
      (node) => (node as HTMLElement).dataset.viewerGitDomain
    );
    expect(domains).toEqual(["changes", "staged", "worktree", "untracked", "history"]);

    // The Remote domain's entire content was Tracking and Ahead/Behind, both already in the
    // tiles above it -- a place to go that takes you nowhere.
    expect(domains).not.toContain("remote");
    expect(content?.querySelector('[data-viewer-git-panel="remote"]')).toBeNull();
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
    expect((content?.querySelector("[data-viewer-git-detail]") as HTMLElement | null)?.hidden).toBe(false);
    expect(content?.querySelector(".viewer-git__workspace")?.classList.contains("has-diff-detail")).toBe(true);
    expect(content?.querySelector("[data-viewer-git-diff]")?.textContent).toContain("Select a commit to preview its diff.");
    expect(content?.textContent).toContain("Demo commit");
    expect(content?.textContent).toContain("HEAD -> main");
  });

  it("loads a Git history commit diff into the shared detail pane", async () => {
    const { dom, calls } = createViewerDom({
      gitCommitDiffResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            ref: "abc1234",
            mode: "commit",
            diff: "commit abc1234\n\ndiff --git a/logics/request/req_001_demo.md b/logics/request/req_001_demo.md\n+Commit demo",
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

    const historyDomain = dom.window.document.querySelector('[data-viewer-git-domain="history"]') as HTMLElement | null;
    historyDomain?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const commitButton = dom.window.document.querySelector('[data-viewer-git-commit="abc1234"]') as HTMLElement | null;
    commitButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls).toContain("/api/git-commit-diff?ref=abc1234");
    expect(commitButton?.classList.contains("is-active")).toBe(true);
    expect(content?.querySelector(".viewer-git__detail-title")?.textContent).toBe("Commit diff");
    expect(content?.querySelector(".viewer-git__diff-meta")?.textContent).toContain("abc1234 · commit");
    expect(content?.querySelector(".viewer-git__diff-line--meta")?.textContent).toContain("diff --git");
    expect(content?.querySelector(".viewer-git__diff-line--add")?.textContent).toContain("+Commit demo");
  });

  it("opens a Git commit modal and submits selected files with a message", async () => {
    const { dom, fetchCalls } = createViewerDom({
      gitResponseFactory: () => ({
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 0,
            behind: 0,
            clean: false,
            dirty: true,
            latestCommit: "abc1234 Demo commit",
            recentCommits: [{ hash: "abc1234", subject: "Demo commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" }],
            counts: { staged: 0, modified: 1, deleted: 0, renamed: 0, untracked: 1 },
            groups: {
              staged: [],
              modified: [{ path: "clients/viewer/browser-host.js", additions: 8, deletions: 2 }],
              deleted: [],
              renamed: [],
              untracked: [{ path: "new-file.md" }]
            }
          }
        }
      })
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const actionsWrapper = dom.window.document.getElementById("viewer-git-actions") as HTMLElement | null;
    expect(actionsWrapper?.hidden).toBe(false);
    dom.window.document.getElementById("viewer-git-actions-button")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const commitButton = dom.window.document.getElementById("viewer-git-commit") as HTMLButtonElement | null;
    commitButton?.click();
    await flushViewerAsync();

    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("clients/viewer/browser-host.js");
    expect(modal?.textContent).toContain("new-file.md");
    const checkboxes = Array.from(modal?.querySelectorAll("input[type='checkbox']") || []) as HTMLInputElement[];
    expect(checkboxes).toHaveLength(2);
    checkboxes[1]!.checked = false;
    checkboxes[1]!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    const message = modal?.querySelector("textarea") as HTMLTextAreaElement | null;
    message!.value = "Add Git commit modal";
    message!.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    const commitCall = fetchCalls.find((call) => call.url === "/api/git-commit");
    expect(commitCall).toBeTruthy();
    expect(JSON.parse(String(commitCall?.options?.body || "{}"))).toEqual({
      files: ["clients/viewer/browser-host.js"],
      message: "Add Git commit modal"
    });
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
            truncated: true,
            canForce: true,
            lineCount: 2
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
    const rows = Array.from(content?.querySelectorAll(".viewer-code__row") || []);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.querySelector(".viewer-code__line-number")?.textContent).toBe("1");
    expect(rows[0]?.querySelector(".viewer-code__line")?.textContent).toContain("# New file");
    expect(rows[1]?.querySelector(".viewer-code__line-number")?.textContent).toBe("2");
    expect(rows[1]?.querySelector(".viewer-code__line")?.textContent).toContain("Preview body");
    expect(content?.querySelector(".viewer-code__gutter")).toBeNull();
    expect(content?.querySelector("pre.viewer-code__scroll")).toBeNull();
    expect(content?.querySelector("code.hljs")).toBeNull();
    expect(content?.querySelector(".viewer-code__lines")?.textContent).toBe("2 lines");
    expect(content?.querySelector(".viewer-code__flag")?.textContent).toContain("truncated");
    content?.querySelector("[data-viewer-git-preview-full]")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toContain("/api/git-file-preview?path=new-file.md&full=1");
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
    const documentNav = dom.window.document.getElementById("viewer-document-nav");
    expect(calls).toContain("/api/release-status");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("Remote");
    expect(documentNav?.querySelector('[data-viewer-ci-mode="release"]')?.classList.contains("is-active")).toBe(true);
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
    // item_734: `in_progress` was printed on the run row and repeated on every job row. The
    // verdict says what the run is doing, once, in words rather than in an API enum.
    expect(content).toContain("Running");
    expect(content).not.toContain("in_progress");
    expect(content).toContain("Update release notes");
  });

  it("renders GitLab CI runs with GitLab-specific links", async () => {
    const { dom, calls } = createViewerDom({
      gitlabUrl: "https://gitlab.com/example/repo",
      ciResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            provider: "gitlab",
            state: "ok",
            visible: true,
            message: "",
            badgeState: "failing",
            branch: "main",
            headSha: "abc123",
            run: {
              id: 42,
              workflowName: "GitLab pipeline",
              status: "failed",
              conclusion: "",
              badgeState: "failing",
              branch: "main",
              headSha: "abc123",
              matchSource: "head-failing",
              htmlUrl: "https://gitlab.com/example/repo/-/pipelines/42",
              commitMessage: "Update pipeline"
            },
            jobs: [{ name: "test", status: "failed", conclusion: "", htmlUrl: "https://gitlab.com/example/repo/-/jobs/1" }]
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-ci-mode="runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const content = dom.window.document.getElementById("viewer-document-content");
    expect(calls).toContain("/api/ci-status");
    expect(content?.textContent).toContain("GitLab pipeline");
    expect(content?.textContent).toContain("Open in GitLab");
    expect((content?.querySelector(".viewer-ci__link") as HTMLAnchorElement | null)?.href).toBe("https://gitlab.com/example/repo/-/pipelines/42");
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
    // item_734: `completed / failure` appeared on the run row and on all six job rows in
    // link blue. The verdict states it once and the jobs carry their own durations.
    expect(content).toContain("Failed");
    expect(content).not.toContain("completed / failure");
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
    expect(dom.window.document.getElementById("viewer-document-nav")?.firstElementChild?.classList.contains("viewer-cdx__modes")).toBe(true);
    cwd!.checked = true;
    cwd?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).toContain("CWD");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("/workspace/logics-manager");
    expect(JSON.parse(dom.window.localStorage.getItem("logics.localViewer.preferences.v1") || "null")?.cdxRunColumns?.visibility).toMatchObject({
      cwd: true
    });
  });

  it("refreshes the CI badge on the background tick without opening the CI screen", async () => {
    const ciResponse = {
      ok: true,
      body: {
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
      }
    };
    const { dom } = createViewerDom({ ciResponse });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    const badge = dom.window.document.querySelector("[data-viewer-ci-badge]");
    expect(badge?.className).toContain("viewer-ci-badge--passing");
    expect(badge?.textContent).toBe("pass");

    // CI status flips server-side; a background refresh (no screen open) must
    // pick it up via the unified status poll instead of staying stale.
    ciResponse.body.payload.badgeState = "failing";
    ciResponse.body.payload.run.badgeState = "failing";
    ciResponse.body.payload.run.conclusion = "failure";
    api.postMessage({ type: "refresh" });
    await flushViewerAsync();
    const updated = dom.window.document.querySelector("[data-viewer-ci-badge]");
    expect(updated?.className).toContain("viewer-ci-badge--failing");
    expect(updated?.textContent).toBe("fail");
  });

  it("shows the release version on the badge and refreshes it on the background tick", async () => {
    const releaseRunsResponse = {
      ok: true,
      body: {
        ok: true,
        payload: {
          state: "ok",
          visible: true,
          message: "",
          badgeState: "passing",
          version: "v2.12.3",
          run: { id: 99, workflowName: "Release", status: "completed", conclusion: "success", badgeState: "passing", branch: "v2.12.3", version: "v2.12.3", matchSource: "release-latest" },
          jobs: [],
          activeCount: 0
        }
      }
    };
    const { dom } = createViewerDom({ releaseRunsResponse });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    const badge = dom.window.document.querySelector("[data-viewer-release-badge]");
    expect(badge?.className).toContain("viewer-ci-badge--passing");
    // The badge shows the release version (tag), not the state label.
    expect(badge?.textContent).toBe("v2.12.3");
    // The Release menu item mirrors the same badge.
    const menuBadge = dom.window.document.querySelector('[data-viewer-nav-target="remote:release"] [data-viewer-release-badge]');
    expect(menuBadge?.textContent).toBe("v2.12.3");

    // A new release starts (in_progress) server-side; a background refresh must
    // surface the running state and the new version without opening the screen.
    releaseRunsResponse.body.payload.badgeState = "running";
    releaseRunsResponse.body.payload.version = "v2.12.4";
    releaseRunsResponse.body.payload.run.badgeState = "running";
    releaseRunsResponse.body.payload.run.status = "in_progress";
    releaseRunsResponse.body.payload.run.conclusion = null as unknown as string;
    releaseRunsResponse.body.payload.run.version = "v2.12.4";
    api.postMessage({ type: "refresh" });
    await flushViewerAsync();
    const refreshed = dom.window.document.querySelector("[data-viewer-release-badge]");
    expect(refreshed?.className).toContain("viewer-ci-badge--running");
    expect(refreshed?.textContent).toBe("v2.12.4");
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

  it("counts active sessions on the CDX badge and running runs on the Missions badge", async () => {
    // Default fixture: 1 active session + 1 running run (run-1).
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Activity badge now counts sessions only — running runs are no longer
    // double-counted here.
    const badge = dom.window.document.querySelector("[data-viewer-cdx-badge]");
    expect(badge?.textContent).toBe("1");
    expect(badge?.className).not.toContain("viewer-cdx-button-badge--runs");
    expect((dom.window.document.getElementById("viewer-cdx") as HTMLButtonElement | null)?.title).toContain("1 active session");

    // The running run surfaces through the Missions gauge instead.
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");
  });

  it("counts Missions as running runs and Reports/History as new entries since seen", async () => {
    const runsResponse = {
      state: "ok",
      message: "",
      runs: [
        { run_id: "run-1", kind: "assistant", status: "succeeded", session: "work", cwd: "/workspace/logics-manager" },
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
              sessions: [],
              readiness: { auth: "ready", quota: "ok" }
            }
          }
        }
      })
    });
    const api = dom.window.acquireVsCodeApi();
    const menuBadge = (section: string) =>
      dom.window.document.querySelector(`[data-viewer-nav-target="cdx:${section}"] [data-viewer-cdx-unread-menu-badge]`);
    const aggregate = () => dom.window.document.querySelector("[data-viewer-cdx-unread-badge]");

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    // Nothing running, and the first snapshot seeds the seen sets, so no badge.
    expect(aggregate()).toBeNull();

    // A new finished report arrives → Reports = 1, Missions still 0.
    runsResponse.runs = [...runsResponse.runs, { run_id: "run-3", kind: "assistant", status: "succeeded", session: "work", cwd: "/workspace/logics-manager" }];
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();
    expect(menuBadge("missions")).toBeNull();
    expect(menuBadge("runs")?.textContent).toContain("!");
    expect(aggregate()?.textContent).toBe("!");

    // An already-seen run starts running (Missions = 1, live gauge) and a new
    // history entry lands (History = 1). Reports delta still 1 → aggregate 3.
    runsResponse.runs = runsResponse.runs.map((run) => (run.run_id === "run-1" ? { ...run, status: "running" } : run));
    historyResponse.history = [...historyResponse.history, { session_name: "auto", provider: "codex", status: "success", action: "run", label: "cdx run", started_at: "2026-06-20T03:14:27Z" }];
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();
    expect(menuBadge("missions")?.textContent).toContain("!");
    expect(menuBadge("runs")?.textContent).toContain("!");
    expect(menuBadge("history")?.textContent).toContain("!");
    expect(aggregate()?.textContent).toBe("3");

    // Opening Reports clears only the Reports delta; the Missions gauge persists.
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(menuBadge("runs")).toBeNull();
    expect(menuBadge("missions")?.textContent).toContain("!");
    expect(menuBadge("history")?.textContent).toContain("!");
    expect(aggregate()?.textContent).toBe("2");

    // Opening History clears its delta, leaving only the Missions gauge.
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:history"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(menuBadge("history")).toBeNull();
    expect(aggregate()?.textContent).toBe("!");

    // The running run finishes → the Missions gauge clears itself, without the
    // user having to open the Missions panel.
    runsResponse.runs = runsResponse.runs.map((run) => (run.run_id === "run-1" ? { ...run, status: "succeeded" } : run));
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();
    expect(menuBadge("missions")).toBeNull();
    expect(aggregate()).toBeNull();
  });

  it("ties the Missions gauge to running runs and ignores session telemetry churn", async () => {
    let remaining = 80;
    const runsResponse = {
      state: "ok",
      message: "",
      runs: [{ run_id: "run-1", kind: "assistant", status: "running", session: "work", cwd: "/workspace/logics-manager" }]
    };
    const { dom } = createViewerDom({
      cdxRunsResponse: runsResponse,
      cdxHistoryResponse: { state: "ok", message: "", history: [] },
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
              sessions: [
                { id: "session-1", status: "active", title: "Logics work", model: "gpt-5-codex", remaining_pct: remaining, usage: { input_tokens: 1000 + remaining } }
              ],
              readiness: { auth: "ready", quota: "ok" }
            }
          }
        }
      })
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    // One run is running → Missions = 1.
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");
    const before = dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")?.textContent;

    // Only session usage telemetry moves; the running-run count is unchanged, so
    // the gauge must not flicker or change value.
    remaining = 60;
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();
    expect(dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"] [data-viewer-cdx-unread-menu-badge]')?.textContent).toContain("!");
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")?.textContent).toBe(before);
  });

  it("clears the Reports badge when a new run disappears before being seen", async () => {
    const runsResponse = {
      state: "ok",
      message: "",
      runs: [{ run_id: "run-1", kind: "assistant", status: "succeeded", session: "work", cwd: "/workspace/logics-manager" }]
    };
    const { dom } = createViewerDom({
      cdxRunsResponse: runsResponse,
      cdxHistoryResponse: { state: "ok", message: "", history: [] },
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
              sessions: [],
              readiness: { auth: "ready", quota: "ok" }
            }
          }
        }
      })
    });
    const api = dom.window.acquireVsCodeApi();
    const runsBadge = () =>
      dom.window.document.querySelector('[data-viewer-nav-target="cdx:runs"] [data-viewer-cdx-unread-menu-badge]');

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")).toBeNull();

    // A new report appears → Reports = 1.
    runsResponse.runs = [...runsResponse.runs, { run_id: "run-2", kind: "assistant", status: "succeeded", session: "work", cwd: "/workspace/logics-manager" }];
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();
    expect(runsBadge()?.textContent).toContain("!");

    // It is pruned again before the user opens Reports → the badge must clear
    // itself instead of latching on the transient run id.
    runsResponse.runs = [{ run_id: "run-1", kind: "assistant", status: "succeeded", session: "work", cwd: "/workspace/logics-manager" }];
    api.postMessage({ type: "refresh", force: true });
    await flushViewerAsync();
    expect(runsBadge()).toBeNull();
    expect(dom.window.document.querySelector("[data-viewer-cdx-unread-badge]")).toBeNull();
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
    // Raw log renders through the shared code viewer (line numbers + content).
    expect(dom.window.document.querySelector(".viewer-cdx__log-raw .viewer-code__line")?.textContent).toContain("first log line");
    expect(dom.window.document.querySelector(".viewer-cdx__log-raw .viewer-code__line-number")).toBeTruthy();
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
    expect(command[2]).toContain("\nif [ $# -ge 2 ]; then");
    expect(command[2]).not.toContain("\\nif [ $# -ge 2 ]; then");
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
    expect(text).toContain("PERM.");
    expect(text).toContain("RESET WEEK");
    expect(text).toContain("work2");
    expect(text).toContain("review");
    expect(text).toContain("corvus");
    expect(text).toContain("Lowest Remaining");
    expect(text).toContain("Remaining");
    expect(text).toContain("Remaining 5h");
    expect(text).toContain("Remaining Week");
    expect(text).toContain("7%");
    expect(text).toContain("100%");
    expect(text).toContain("5H");
    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).toContain("PERM.");
    expect(headers).toContain("BANKED");
    expect(headers).not.toContain("BLOCK");
    expect(headers).not.toContain("CR");
    const bankedButton = dom.window.document.querySelector('[data-viewer-cdx-reset="work2"]') as HTMLButtonElement | null;
    expect(bankedButton?.textContent).toBe("2");
    expect(bankedButton?.title).toContain("Activate one banked reset for work2");
    const permissionLabels = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__permission-label")).map((node) => node.textContent?.trim());
    expect(permissionLabels).toEqual(["-", "review"]);
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

  it("renders the shared usage gauge in the CDX status OK column", async () => {
    const { dom } = createViewerDom({
      cdxResponse: cdxRowsStatusPayload()
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The OK column hosts the same gauge component used by the terminal view,
    // one per session row, and it stays clickable to refresh that session.
    const okCells = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__ok-cell"));
    expect(okCells.length).toBe(2);
    const gauges = dom.window.document.querySelectorAll('.viewer-cdx__ok-cell [data-viewer-cdx-usage-refresh]');
    expect(gauges.length).toBe(2);
    const targets = Array.from(gauges).map((node) => node.getAttribute("data-viewer-cdx-usage-refresh"));
    expect(targets).toContain("work2");
    expect(targets).toContain("corvus");
    const work2Gauge = dom.window.document.querySelector('.viewer-cdx__ok-cell [data-viewer-cdx-usage-refresh="work2"]') as HTMLElement | null;
    expect(work2Gauge?.getAttribute("title")).toContain("5h remaining: 0%");
    expect(work2Gauge?.getAttribute("title")).toContain("week remaining: 3%");
    expect(work2Gauge?.querySelectorAll(".viewer-workshop__usage-segment").length).toBe(2);
    expect(work2Gauge?.querySelector(".viewer-workshop__usage-segment--week")).toBeTruthy();
  });

  it("keeps known CDX usage when the weekly gauge value is missing", async () => {
    const payload = cdxRowsStatusPayload();
    payload.body.payload.status.rows[0].remaining_week_pct = null;
    const { dom } = createViewerDom({
      cdxResponse: payload
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const gauge = dom.window.document.querySelector('.viewer-cdx__ok-cell [data-viewer-cdx-usage-refresh="work2"]') as HTMLElement | null;
    expect(gauge?.getAttribute("title")).toContain("5h remaining: 0%");
    expect(gauge?.getAttribute("title")).toContain("week remaining: unknown");
  });

  it("does not substitute general availability when the 5h gauge value is missing", async () => {
    const payload = cdxRowsStatusPayload();
    payload.body.payload.status.rows[0].remaining_5h_pct = null;
    payload.body.payload.status.rows[0].reset_5h_at = null;
    const { dom } = createViewerDom({ cdxResponse: payload });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const gauge = dom.window.document.querySelector('.viewer-cdx__ok-cell [data-viewer-cdx-usage-refresh="work2"]') as HTMLElement | null;
    expect(gauge?.getAttribute("title")).not.toContain("5h remaining");
    expect(gauge?.getAttribute("title")).toContain("week remaining: 3%");
    expect(gauge?.classList.contains("viewer-workshop__usage--single")).toBe(true);
    expect(gauge?.querySelectorAll(".viewer-workshop__usage-segment").length).toBe(1);
    expect(gauge?.querySelector(".viewer-workshop__usage-segment--week")).toBeTruthy();

    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    const fiveHourIndex = headers.indexOf("5H");
    const resetFiveHourIndex = headers.indexOf("RESET 5H");
    const work2Row = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table tbody tr")).find((row) => row.textContent?.includes("work2"));
    const cells = Array.from(work2Row?.querySelectorAll("td") || []);
    expect(cells[fiveHourIndex]?.textContent?.trim()).toBe("");
    expect(cells[resetFiveHourIndex]?.textContent?.trim()).toBe("");
  });

  it("hides the 5H status column when no session reports 5h quota", async () => {
    const payload = cdxRowsStatusPayload();
    payload.body.payload.status.rows.forEach((row) => {
      row.remaining_5h_pct = null;
    });
    const { dom } = createViewerDom({ cdxResponse: payload });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("5H");
    expect(headers).toContain("WEEK");
  });

  it("refreshes a CDX status table usage gauge after clicking it", async () => {
    let refreshed = false;
    const { dom } = createViewerDom({
      cdxResponseFactory: () => {
        const payload = cdxRowsStatusPayload();
        payload.body.payload.status.rows[0].remaining_5h_pct = refreshed ? 88 : 7;
        return payload;
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    let gauge = dom.window.document.querySelector('.viewer-cdx__ok-cell [data-viewer-cdx-usage-refresh="work2"]') as HTMLElement | null;
    expect(gauge?.getAttribute("title")).toContain("7%");

    refreshed = true;
    gauge?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await flushViewerAsync();
      gauge = dom.window.document.querySelector('.viewer-cdx__ok-cell [data-viewer-cdx-usage-refresh="work2"]') as HTMLElement | null;
      if (gauge?.getAttribute("title")?.includes("88%")) break;
    }

    expect(gauge?.getAttribute("title")).toContain("88%");
  });

  it("opens CDX session action menus with resume and handoff choices", async () => {
    const payload = cdxRowsStatusPayload();
    const rows = payload.body.payload.status.rows;
    rows[0].model = "gpt-5-codex";
    rows[0].resume_available = true;
    rows[0].last_launched_at = "2026-06-19T10:00:00.000Z";
    rows[1].resume_available = true;
    rows[1].last_launched_at = "2026-06-19T09:00:00.000Z";
    rows.push({
      session_name: "atlas",
      provider: "codex",
      enabled: true,
      active: false,
      status: "ready",
      auth_status: "authenticated",
      available_pct: 88,
      remaining_5h_pct: 88,
      remaining_week_pct: 88,
      reset_5h_at: null,
      reset_week_at: null,
      last_launched_at: "2026-06-19T11:00:00.000Z",
      updated_at: null,
      resume_available: true
    });
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
    const work2Config = dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="config"]') as HTMLElement | null;
    const corvusHandoff = dom.window.document.querySelector('[data-viewer-cdx-session="corvus"][data-viewer-cdx-session-action="handoff"]') as HTMLElement | null;
    const work2Remove = dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="remove"]') as HTMLElement | null;
    const retiredConfig = dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="config"]') as HTMLElement | null;
    const disabledRemove = dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="remove"]') as HTMLElement | null;
    const work2Actions = Array.from(dom.window.document.querySelectorAll('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action]')).map((node) => node.textContent);
    const corvusActions = Array.from(dom.window.document.querySelectorAll('[data-viewer-cdx-session="corvus"][data-viewer-cdx-session-action]')).map((node) => node.textContent);
    const retiredActions = Array.from(dom.window.document.querySelectorAll('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action]')).map((node) => node.textContent);
    expect(work2Actions).toEqual(["New", "Resume", "Handoff...", "Config", "Remove"]);
    expect(corvusActions).toEqual(["New", "Resume", "Handoff...", "Config", "Remove"]);
    expect(retiredActions).toEqual(["Config", "Remove"]);
    expect(work2Menu?.textContent).toBe("Resume");
    expect(work2Config?.textContent).toBe("Config");
    expect(work2Config?.classList.contains("viewer-cdx__menu-action--danger")).toBe(false);
    expect(corvusHandoff?.textContent).toBe("Handoff...");
    expect(work2Remove?.textContent).toBe("Remove");
    expect(work2Remove?.classList.contains("viewer-cdx__menu-action--danger")).toBe(true);
    expect(retiredConfig?.textContent).toBe("Config");
    expect(disabledRemove?.textContent).toBe("Remove");
    expect(dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="new"]')).toBeNull();
    expect(dom.window.document.querySelector('[data-viewer-cdx-session="retired"][data-viewer-cdx-session-action="resume"]')).toBeNull();
    work2Config?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("CDX session: work2");
    const modelInput = modal?.querySelector('[data-viewer-cdx-session-config-input="model"]') as HTMLInputElement | null;
    const reasoningInput = modal?.querySelector('[data-viewer-cdx-session-config-input="reasoningEffort"]') as HTMLSelectElement | null;
    const powerInput = modal?.querySelector('[data-viewer-cdx-session-config-input="power"]') as HTMLSelectElement | null;
    expect(modelInput?.value).toBe("gpt-5-codex");
    if (modelInput) {
      modelInput.value = "gpt-5.1-codex";
      modelInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    if (reasoningInput) {
      reasoningInput.value = "xhigh";
      reasoningInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    if (powerInput) {
      powerInput.value = "high";
      powerInput.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("CDX config updated for work2.");
    dom.window.document.querySelectorAll(".viewer-themed-modal").forEach((node) => node.remove());
    expect(dom.window.document.querySelector(".viewer-themed-modal")).toBeNull();

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:missions"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((dom.window.document.querySelector("select[data-viewer-cdx-session]") as HTMLSelectElement | null)?.value).toBe("work2");
    expect((dom.window.document.querySelector('[data-viewer-cdx-input="model"]') as HTMLInputElement | null)?.value).toBe("gpt-5.1-codex");
    expect((dom.window.document.querySelector('[data-viewer-cdx-input="reasoningEffort"]') as HTMLSelectElement | null)?.value).toBe("xhigh");
    expect((dom.window.document.querySelector('[data-viewer-cdx-input="power"]') as HTMLSelectElement | null)?.value).toBe("high");

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const refreshedWork2Menu = dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="resume"]') as HTMLElement | null;
    const sessionMenu = refreshedWork2Menu?.closest("details") as HTMLDetailsElement | null;
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

    refreshedWork2Menu?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
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
    const handoffModal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    const handoffSelect = handoffModal?.querySelector(".viewer-themed-modal__select") as HTMLSelectElement | null;
    expect(Array.from(handoffSelect?.options || []).map((option) => option.value)).toEqual(["atlas", "work2"]);
    handoffSelect!.value = "work2";
    (handoffModal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
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

  it("updates CDX session rows optimistically while enable toggles are pending", async () => {
    let resolveToggle: (() => void) | null = null;
    const cdxToggleGate = new Promise<void>((resolve) => {
      resolveToggle = resolve;
    });
    const payload = cdxRowsStatusPayload();
    const { dom, fetchCalls } = createViewerDom({
      cdxResponse: payload,
      cdxToggleGate,
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
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="new"]')).toBeTruthy();

    (dom.window.document.querySelector('[data-viewer-cdx-toggle="work2"]') as HTMLButtonElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const pendingToggle = dom.window.document.querySelector('[data-viewer-cdx-toggle="work2"]') as HTMLButtonElement | null;
    expect(fetchCalls.find((call) => call.url === "/api/cdx-toggle")?.options?.body).toBe(JSON.stringify({ session: "work2", enable: false }));
    expect(pendingToggle?.getAttribute("data-viewer-cdx-toggle-state")).toBe("off");
    expect(pendingToggle?.classList.contains("is-off")).toBe(true);
    expect(pendingToggle?.classList.contains("is-updating")).toBe(true);
    expect(pendingToggle?.disabled).toBe(true);
    expect(pendingToggle?.textContent).toContain("Disabled");
    expect(dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="new"]')).toBeNull();

    resolveToggle?.();
    await flushViewerAsync();
    await flushViewerAsync();
  });

  it("renders the CDX disk screen with profile shares and cleanup candidates", async () => {
    const { dom, calls } = createViewerDom({ cdxResponse: cdxRowsStatusPayload() });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:disk"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls).toContain("/api/cdx-disk");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX disk");
    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("Total");
    expect(text).toContain("3 GB");
    expect(text).toContain("Reclaimable");
    expect(text).toContain("500 MB");
    expect(text).toContain("work2");
    expect(text).toContain("67%");
    expect(text).toContain("old-logs");
    expect(text).toContain("log files older than 30 days");
    expect(text).toContain("cdx clean profiles --tmp");
    expect(text).toContain("cached 5 min");

    const diskTab = dom.window.document.querySelector('[data-viewer-cdx-mode="disk"]');
    expect(diskTab?.classList.contains("is-active")).toBe(true);
  });

  it("renders the CDX memory screen with scope and raw toggles", async () => {
    const { dom, calls } = createViewerDom({ cdxResponse: cdxRowsStatusPayload() });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:memory"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    expect(calls).toContain("/api/cdx-memory?scope=current");
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX memory");
    let text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("current cleaned handoff");
    expect(text).not.toContain("current raw /usage");
    expect(dom.window.document.querySelector(".viewer-cdx__memory-body")).toBeTruthy();
    expect(dom.window.document.querySelector(".viewer-code")).toBeNull();

    dom.window.document.querySelector('[data-viewer-cdx-memory-view="raw"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("current raw /usage");
    expect(dom.window.document.querySelector(".viewer-code")).toBeTruthy();

    dom.window.document.querySelector('[data-viewer-cdx-memory-scope="global"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(calls).toContain("/api/cdx-memory?scope=global");
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    expect(text).toContain("global raw /usage");
    expect(text).toContain("high-noise-memory");
  });

  it("activates a banked CDX reset from the status table after confirmation", async () => {
    const payload = cdxRowsStatusPayload();
    const { dom, fetchCalls } = createViewerDom({ cdxResponse: payload });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const bankedButton = dom.window.document.querySelector('[data-viewer-cdx-reset="work2"]') as HTMLButtonElement | null;
    expect(bankedButton).toBeTruthy();

    bankedButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    let modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("Consume one banked Codex reset for work2");
    (modal?.querySelector(".viewer-themed-modal__cancel") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    expect(fetchCalls.find((call) => call.url === "/api/cdx-reset")).toBeUndefined();

    dom.window.document.querySelector('[data-viewer-cdx-reset="work2"]')
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    (modal?.querySelector(".viewer-themed-modal__submit") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(fetchCalls.find((call) => call.url === "/api/cdx-reset")?.options?.body).toBe(JSON.stringify({ session: "work2" }));
  });

  it("edits CDX session permission values from the session config modal", async () => {
    const payload = cdxRowsStatusPayload();
    const { dom, fetchCalls } = createViewerDom({ cdxResponse: payload });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const permissionLabel = dom.window.document.querySelector('[data-viewer-cdx-session="work2"] .viewer-cdx__permission-label')
      ?? dom.window.document.querySelectorAll(".viewer-cdx__permission-label")[1];
    expect(permissionLabel?.textContent?.trim()).toBe("review");

    (dom.window.document.querySelector('[data-viewer-cdx-session="work2"][data-viewer-cdx-session-action="config"]') as HTMLElement | null)
      ?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const modal = dom.window.document.querySelector(".viewer-themed-modal") as HTMLElement | null;
    expect(modal?.textContent).toContain("CDX session: work2");
    const select = modal?.querySelector('[data-viewer-cdx-session-config-input="permission"]') as HTMLSelectElement | null;
    expect(Array.from(select?.options || []).map((option) => option.value)).toEqual(["review", "default", "auto", "full"]);
    expect(select?.value).toBe("review");
    if (select) select.value = "full";
    (modal?.querySelector("[data-viewer-cdx-session-config-submit]") as HTMLButtonElement | null)?.click();
    await flushViewerAsync();
    await flushViewerAsync();

    expect(fetchCalls.find((call) => call.url === "/api/cdx-permission")?.options?.body).toBe(JSON.stringify({ session: "work2", permission: "full" }));
    const updatedLabel = dom.window.document.querySelector('[data-viewer-cdx-session="work2"] .viewer-cdx__permission-label')
      ?? dom.window.document.querySelectorAll(".viewer-cdx__permission-label")[1];
    expect(updatedLabel?.textContent?.trim()).toBe("full");
    expect(dom.window.document.getElementById("viewer-meta")?.textContent).toContain("CDX status refreshed.");
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
    expect(headers).toContain("PERM.");
    expect(headers).not.toContain("BLOCK");
    expect(headers).not.toContain("CR");
    expect(text).toContain("review");
    expect(text).not.toContain("9.68");

    const permission = dom.window.document.querySelector('[data-viewer-cdx-column="permission"]') as HTMLInputElement | null;
    expect(permission?.checked).toBe(true);
    permission!.checked = false;
    permission?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("PERM.");
    expect(text).not.toContain("review");

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
      permission: false,
      block: true,
      credits: true
    });
  });

  it("restores persisted CDX status column visibility", async () => {
    const { dom } = createViewerDom({
      cdxResponse: cdxRowsStatusPayload(),
      initialPreferences: {
        version: 1,
        cdxStatusColumns: { visibility: { permission: false, block: true, credits: true } }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const text = dom.window.document.getElementById("viewer-document-content")?.textContent || "";
    const headers = Array.from(dom.window.document.querySelectorAll(".viewer-cdx__table th")).map((node) => node.textContent?.trim());
    expect(headers).not.toContain("PERM.");
    expect(headers).toContain("BLOCK");
    expect(headers).toContain("CR");
    expect(text).not.toContain("review");
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

  it("keeps CDX status menus open while changing filter and config options", async () => {
    const { dom } = createViewerDom({ cdxResponse: cdxRowsStatusPayload() });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    const provider = dom.window.document.querySelector('[data-viewer-cdx-provider="claude"]') as HTMLInputElement | null;
    const providerMenu = provider?.closest(".viewer-cdx__menu") as HTMLDetailsElement | null;
    expect(providerMenu).toBeTruthy();
    providerMenu!.open = true;
    provider!.checked = false;
    provider?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await flushViewerAsync();

    const restoredProviderMenu = dom.window.document
      .querySelector('.viewer-cdx__menu-panel[aria-label="CDX provider filter"]')
      ?.closest(".viewer-cdx__menu") as HTMLDetailsElement | null;
    expect(restoredProviderMenu?.open).toBe(true);

    const blockColumn = dom.window.document.querySelector('[data-viewer-cdx-column="block"]') as HTMLInputElement | null;
    const columnMenu = blockColumn?.closest(".viewer-cdx__menu") as HTMLDetailsElement | null;
    expect(columnMenu).toBeTruthy();
    columnMenu!.open = true;
    blockColumn!.checked = true;
    blockColumn?.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    await flushViewerAsync();

    const restoredColumnMenu = dom.window.document
      .querySelector('.viewer-cdx__menu-panel[aria-label="CDX status columns"]')
      ?.closest(".viewer-cdx__menu") as HTMLDetailsElement | null;
    expect(restoredColumnMenu?.open).toBe(true);
  });

  it("sends force overwrite when importing CDX accounts with Force enabled", async () => {
    const { dom, fetchCalls } = createViewerDom({ cdxResponse: cdxRowsStatusPayload() });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();

    class MockFileReader {
      result = "";
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      readAsDataURL() {
        this.result = "data:application/octet-stream;base64,Y2R4";
        this.onload?.();
      }
    }
    (dom.window as unknown as { FileReader: typeof MockFileReader }).FileReader = MockFileReader;

    const fileInput = dom.window.document.getElementById("viewer-cdx-import-file") as HTMLInputElement | null;
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [{ name: "accounts.cdx" }]
    });
    const force = dom.window.document.getElementById("viewer-cdx-import-force") as HTMLInputElement | null;
    const merge = dom.window.document.getElementById("viewer-cdx-import-merge") as HTMLInputElement | null;
    const importButton = dom.window.document.getElementById("viewer-cdx-import-btn") as HTMLButtonElement | null;

    expect(force).toBeTruthy();
    force!.checked = true;
    expect(merge?.checked).toBe(true);
    importButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const importCall = fetchCalls.find((call) => call.url === "/api/cdx-import");
    expect(importCall).toBeTruthy();
    expect(JSON.parse(String(importCall?.options?.body || "{}"))).toMatchObject({
      fileBase64: "Y2R4",
      merge: true,
      force: true
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

  it("refreshes the open CDX status screen from background status polling", async () => {
    const starting = {
      ok: true,
      body: { ok: true, payload: { state: "ok", message: "", status: { availability: "starting", providers: [], sessions: [], readiness: {}, nextCommands: [] } } }
    };
    const ready = {
      ok: true,
      body: { ok: true, payload: { state: "ok", message: "", status: { availability: "ready", providers: [{ name: "anthropic", state: "ready" }], sessions: [], readiness: {}, nextCommands: ["cdx status"] } } }
    };
    const { dom } = createViewerDom({ cdxResponses: [starting, starting, ready] });
    const sources: Array<{
      listeners: Map<string, Array<(event: MessageEvent) => void>>;
      emit: (name: string, payload: unknown) => void;
    }> = [];
    class FakeEventSource {
      listeners = new Map<string, Array<(event: MessageEvent) => void>>();
      constructor(_url: string) {
        sources.push(this);
      }
      addEventListener(name: string, handler: (event: MessageEvent) => void) {
        const list = this.listeners.get(name) || [];
        list.push(handler);
        this.listeners.set(name, list);
      }
      emit(name: string, payload: unknown) {
        const event = new dom.window.MessageEvent(name, { data: JSON.stringify(payload) });
        for (const handler of this.listeners.get(name) || []) handler(event);
      }
      close() {}
    }
    (dom.window as unknown as { EventSource: typeof EventSource }).EventSource = FakeEventSource as unknown as typeof EventSource;

    dom.window.acquireVsCodeApi().postMessage({ type: "ready" });
    for (let attempt = 0; attempt < 10 && !sources.length; attempt += 1) {
      await flushViewerAsync();
    }
    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("Starting");

    sources[0]?.emit("changed", { components: ["workshop"] });
    for (let attempt = 0; attempt < 10 && !dom.window.document.getElementById("viewer-document-content")?.textContent?.includes("anthropic"); attempt += 1) {
      await flushViewerAsync();
    }

    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");
    expect(dom.window.document.getElementById("viewer-document-content")?.textContent).toContain("anthropic");
  });

  it("does not reopen a closed CDX status screen on a background cdx change event", async () => {
    const { dom } = createViewerDom();
    const sources: Array<{
      url: string;
      listeners: Map<string, Array<(event: MessageEvent) => void>>;
      emit: (name: string, payload: unknown) => void;
    }> = [];
    class FakeEventSource {
      url: string;
      onerror: ((event: Event) => void) | null = null;
      listeners = new Map<string, Array<(event: MessageEvent) => void>>();
      constructor(url: string) {
        this.url = url;
        sources.push(this);
      }
      addEventListener(name: string, handler: (event: MessageEvent) => void) {
        const list = this.listeners.get(name) || [];
        list.push(handler);
        this.listeners.set(name, list);
      }
      emit(name: string, payload: unknown) {
        const event = new dom.window.MessageEvent(name, { data: JSON.stringify(payload) });
        for (const handler of this.listeners.get(name) || []) handler(event);
      }
      close() {}
    }
    (dom.window as unknown as { EventSource: typeof EventSource }).EventSource = FakeEventSource as unknown as typeof EventSource;
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await flushViewerAsync();
    await flushViewerAsync();

    dom.window.document.querySelector('[data-viewer-nav-target="cdx:status"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("viewer-document-title")?.textContent).toBe("CDX status");

    dom.window.document.getElementById("viewer-document-close")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(true);

    // The closed panel keeps its "CDX status" title text; a background cdx event
    // must not reopen it.
    sources[0]?.emit("changed", { components: ["cdx"] });
    await flushViewerAsync();
    await flushViewerAsync();

    expect(dom.window.document.getElementById("viewer-document")?.hidden).toBe(true);
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

  it("shows the behind-commits badge left of the ahead badge", async () => {
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
            behind: 5,
            clean: true,
            dirty: false,
            latestCommit: "abc1234 Demo commit",
            recentCommits: [],
            badgeCounts: { unpushedCommits: 2, unpulledCommits: 5, uncommittedFiles: 0 },
            counts: { staged: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
            groups: { staged: [], modified: [], deleted: [], renamed: [], untracked: [] }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const badges = dom.window.document
      .querySelector('#viewer-ci [data-viewer-git-badges="main"]')
      ?.querySelectorAll(".viewer-git-badge");
    expect(badges?.length).toBe(2);
    // Behind badge renders first (leftmost) and uses its own yellow variant.
    expect(badges?.[0]?.className).toContain("viewer-git-badge--commits-behind");
    expect(badges?.[0]?.textContent).toBe("5");
    expect(badges?.[1]?.className).toContain("viewer-git-badge--commits");
    expect(badges?.[1]?.textContent).toBe("2");
  });

  it("adds recent Git commits to the activity panel from badge refreshes", async () => {
    const { dom } = createViewerDom({
      gitResponse: {
        ok: true,
        body: {
          ok: true,
          payload: {
            state: "ok",
            branch: "main",
            tracking: "origin/main",
            ahead: 1,
            behind: 0,
            clean: true,
            dirty: false,
            latestCommit: "abc1234 Demo commit",
            recentCommits: [{ hash: "abc1234", subject: "Demo commit", author: "Alex", date: "2026-06-09", refs: "HEAD -> main" }],
            badgeCounts: { unpushedCommits: 1, uncommittedFiles: 0 },
            counts: { staged: 0, modified: 0, deleted: 0, renamed: 0, untracked: 0 },
            groups: { staged: [], modified: [], deleted: [], renamed: [], untracked: [] }
          }
        }
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const storedState = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    const commitEntry = storedState?.activityByRoot?.["/workspace/logics-manager"]?.activityHistory?.find((entry: { id?: string }) => entry.id === "git-commit-abc1234");
    expect(commitEntry).toMatchObject({
      type: "git-commit",
      title: "Demo commit",
      label: "Commit",
      meta: "abc1234 · Alex · 2026-06-09"
    });
  });

  it("adds CI runs to the activity feed dispatch from the ci-status payload", async () => {
    const { dom } = createViewerDom();
    const dataPayloads: Array<{ activityEvents?: Array<{ kind?: string; title?: string }> }> = [];
    dom.window.addEventListener("message", (event: MessageEvent) => {
      if (event?.data?.type === "data" && event.data.payload) {
        dataPayloads.push(event.data.payload);
      }
    });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Open the activity view; the toggle handler re-dispatches the feed, which now
    // includes the CI runs fetched into latestCiStatus during the initial load.
    dom.window.document.getElementById("activity-panel")?.removeAttribute("hidden");
    dom.window.document.getElementById("activity-toggle")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const ciEvent = dataPayloads
      .flatMap((payload) => payload.activityEvents || [])
      .find((event) => event.kind === "ci");
    expect(ciEvent).toBeTruthy();
    expect(ciEvent?.title).toContain("CI");
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

  it("fetches the remote before reloading status on a manual Git-screen refresh", async () => {
    const { dom, calls } = createViewerDom({});
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    dom.window.document.querySelector('[data-viewer-nav-target="remote:git"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const fetchesBefore = calls.filter((call) => call === "/api/git-fetch").length;
    expect(fetchesBefore).toBe(0); // opening the screen must not fetch

    dom.window.document.getElementById("viewer-document-refresh")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toContain("/api/git-fetch");
    // The fetch precedes the status reload it triggers.
    expect(calls.lastIndexOf("/api/git-fetch")).toBeLessThan(calls.lastIndexOf("/api/git-status"));
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
    dom.window.document.querySelector('[data-viewer-focus-value="active"]')?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

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

  it("marks the filter toggle when browser-host filters differ from defaults", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const toggle = dom.window.document.getElementById("filter-toggle");
    setViewerFilter(dom, "type", "task");

    expect(toggle?.getAttribute("data-viewer-filter-active")).toBe("true");
    expect(toggle?.getAttribute("data-has-active-controls")).toBe("true");
    expect(toggle?.classList.contains("toolbar__filter--active")).toBe(true);

    dom.window.document.getElementById("filter-reset")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(toggle?.getAttribute("data-viewer-filter-active")).toBe("false");
    expect(toggle?.getAttribute("data-has-active-controls")).toBe("false");
    expect(toggle?.classList.contains("toolbar__filter--active")).toBe(false);
  });

  it("returns the panel to its defaults when filters are cleared", async () => {
    // req_310: clearing used to un-check the inherited hide toggles, which is what the
    // assertion here pinned. Those toggles are no longer consulted while the panel is
    // installed, so what has to be true after clearing is that the panel is back to its
    // defaults -- the state that decides what the board shows.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const typeSelect = dom.window.document.querySelector('[data-viewer-filter-group="type"]') as HTMLSelectElement | null;
    typeSelect!.value = "task";
    typeSelect!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    expect(typeSelect!.value).toBe("task");

    dom.window.document.getElementById("filter-reset")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(typeSelect!.value).toBe("all");
    const statusSelect = dom.window.document.querySelector('[data-viewer-filter-group="status"]') as HTMLSelectElement | null;
    expect(statusSelect!.value).toBe("any");
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

  it("selects Done by status rather than by being closed", async () => {
    // req_310: the Done option asked `isClosed`, so every terminal status answered yes and
    // the option counted Settled documents as Done.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    setViewerFilter(dom, "focus", "all");
    const statusSelect = dom.window.document.querySelector('[data-viewer-filter-group="status"]') as HTMLSelectElement;
    const done = dom.window.document.createElement("option");
    done.value = "done";
    done.textContent = "Done";
    statusSelect.appendChild(done);
    setViewerFilter(dom, "status", "done");
    const matches = (item: Record<string, unknown>) => dom.window.__CDX_LOGICS_VIEWER_FILTER__(item);

    expect(matches({ stage: "task", indicators: { Status: "Done" }, references: [], usedBy: [] })).toBe(true);
    expect(matches({ stage: "product", indicators: { Status: "Settled" }, references: [], usedBy: [] })).toBe(false);
    expect(matches({ stage: "task", indicators: { Status: "Archived" }, references: [], usedBy: [] })).toBe(false);
  });

  it("says on each filter option what it would return", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    setViewerFilter(dom, "focus", "all");
    const typeSelect = dom.window.document.querySelector('[data-viewer-filter-group="type"]') as HTMLSelectElement;
    const option = (value: string) => Array.from(typeSelect.options).find((entry) => entry.value === value)!;

    // The seeded corpus holds one request and one task, and no companion document.
    // item_764: the neutral option's count was always the corpus size, so it said nothing
    // about the filter it belonged to. It names the dimension and what is left to narrow by.
    expect(option("all").textContent).toBe("All types — 1 to narrow by");
    expect(option("task").textContent).toBe("Tasks (1)");
    expect(option("companion").textContent).toBe("Companions (0)");
    expect(option("companion").disabled).toBe(true);
    expect(option("companion").title).toBe("No document matches this here");
    expect(option("task").disabled).toBe(false);
    expect(option("task").title).toBe("1 document(s)");
  });

  it("never disables the option currently chosen", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    setViewerFilter(dom, "focus", "all");
    setViewerFilter(dom, "type", "companion");
    const typeSelect = dom.window.document.querySelector('[data-viewer-filter-group="type"]') as HTMLSelectElement;
    const companion = Array.from(typeSelect.options).find((entry) => entry.value === "companion")!;

    expect(companion.textContent).toBe("Companions (0)");
    expect(companion.disabled).toBe(false);
  });

  it("counts an option added to the markup later without being edited", async () => {
    // The counts walk the control, not a hand-written list of values.
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const statusSelect = dom.window.document.querySelector('[data-viewer-filter-group="status"]') as HTMLSelectElement;
    const invented = dom.window.document.createElement("option");
    invented.value = "blocked";
    invented.textContent = "Invented later";
    statusSelect.appendChild(invented);

    setViewerFilter(dom, "focus", "all");

    expect(invented.textContent).toBe("Invented later (1)");
  });

  it("renders health as a summary with document links", async () => {
    const { dom, calls } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    dom.window.document.getElementById("viewer-health")?.dispatchEvent(new dom.window.Event("click"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // item_770: these screens render a loading placeholder the moment they are opened and
    // replace it when the scans return, so the assertion needs the extra turn that
    // replacement takes. Measured at 7.5-8.3s against a real corpus; here it is one tick.
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
    // item_770: these screens render a loading placeholder the moment they are opened and
    // replace it when the scans return, so the assertion needs the extra turn that
    // replacement takes. Measured at 7.5-8.3s against a real corpus; here it is one tick.
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
    const firstActivity = firstState?.activityByRoot?.["/workspace/logics-manager"];
    expect(firstActivity?.activitySnapshot?.["logics/request/req_001_demo.md"]?.status).toBe("Ready");
    expect(firstActivity?.activityHistory?.some((entry: { type?: string }) => entry.type === "updated")).toBe(true);

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
    const secondActivity = secondState?.activityByRoot?.["/workspace/logics-manager"];
    expect(secondActivity?.activityHistory?.[0]?.type).toBe("status-change");
    expect(secondActivity?.activityHistory?.length).toBeLessThanOrEqual(80);

    dom.window.document.getElementById("activity-clear")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const cleared = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(cleared?.activityByRoot?.["/workspace/logics-manager"]).toBeUndefined();
    expect(cleared?.viewerFilterState).toBeDefined();
  });

  it("deduplicates local recent activity entries within the same minute", async () => {
    const { dom } = createViewerDom({
      initialState: {
        activityByRoot: {
          "/workspace/logics-manager": {
            activitySnapshot: {},
            activityHistory: [
              {
                path: "logics/request/req_001_demo.md",
                at: "2026-06-22T10:15:05.000Z",
                status: "Ready",
                previousStatus: "",
                type: "updated"
              }
            ]
          }
        }
      }
    });
    const realDate = dom.window.Date;
    const fixedNow = realDate.parse("2026-06-22T10:15:42.000Z");
    function FixedDate(this: Date, ...args: ConstructorParameters<DateConstructor>) {
      return args.length ? new realDate(...args) : new realDate(fixedNow);
    }
    FixedDate.now = () => fixedNow;
    FixedDate.parse = realDate.parse;
    FixedDate.UTC = realDate.UTC;
    FixedDate.prototype = realDate.prototype;
    Object.defineProperty(dom.window, "Date", { configurable: true, value: FixedDate });
    const api = dom.window.acquireVsCodeApi();

    api.postMessage({ type: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    const history = state?.activityByRoot?.["/workspace/logics-manager"]?.activityHistory || [];
    const matchingEntries = history.filter((entry: { path?: string; type?: string }) =>
      entry.path === "logics/request/req_001_demo.md" && entry.type === "updated"
    );
    expect(matchingEntries).toHaveLength(1);
    expect(matchingEntries[0]?.at).toBe("2026-06-22T10:15:05.000Z");
  });

  it("scopes recent activity to the active project when switching projects", async () => {
    const { dom } = createViewerDom();
    const api = dom.window.acquireVsCodeApi();
    const payloads: Array<any> = [];
    dom.window.addEventListener("message", (event: MessageEvent) => {
      if (event.data?.type === "data") {
        payloads.push(event.data.payload);
      }
    });

    api.postMessage({ type: "ready" });
    await flushViewerAsync();

    const switcher = dom.window.document.getElementById("viewer-repo-pill") as HTMLButtonElement | null;
    const menu = dom.window.document.getElementById("viewer-project-menu") as HTMLElement | null;
    for (let attempt = 0; attempt < 10 && !menu?.textContent?.includes("cdx-manager"); attempt += 1) {
      await flushViewerAsync();
    }
    switcher?.click();
    const cdxProject = menu?.querySelector('[data-viewer-project-id="project-cdx"]') as HTMLButtonElement | null;
    cdxProject?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await flushViewerAsync();
    await flushViewerAsync();

    const state = JSON.parse(dom.window.localStorage.getItem("logics.localViewer.state") || "null");
    expect(state?.activityByRoot?.["/workspace/logics-manager"]?.activityHistory?.some((entry: { path?: string }) => entry.path === "logics/request/req_001_demo.md")).toBe(true);
    expect(state?.activityByRoot?.["/workspace/cdx-manager"]?.activityHistory?.some((entry: { path?: string }) => entry.path === "logics/request/req_002_cdx.md")).toBe(true);
    const latestPayload = payloads[payloads.length - 1];
    expect(latestPayload?.root).toBe("/workspace/cdx-manager");
    expect(latestPayload?.activityEvents || []).toEqual([]);
  });
});
