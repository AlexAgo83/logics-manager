import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

export type BootstrapOptions = {
  stacked?: boolean;
  narrow?: boolean;
  harness?: boolean;
  initialState?: Record<string, unknown>;
  showDirectoryPicker?: () => Promise<{ name?: string }>;
  fetchImpl?: (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
  confirmImpl?: (message: string) => boolean;
};

export function bootstrapWebview(options: BootstrapOptions = {}) {
  const html = `
    <!doctype html>
    <html>
      <body>
        <div class="toolbar">
          <div class="toolbar__row toolbar__row--primary">
            <button id="filter-toggle" class="toolbar__filter"></button>
            <button id="tools-toggle" class="toolbar__filter"></button>
            <div id="tools-panel">
              <div class="tools-panel__switcher" role="tablist" aria-label="Tools categories">
                <button
                  class="tools-panel__switch is-active"
                  type="button"
                  role="tab"
                  id="tools-view-tab-workflow"
                  aria-selected="true"
                  aria-controls="tools-view-workflow"
                  tabindex="0"
                  data-tools-view-toggle="workflow"
                >
                  Workflow
                </button>
                <button
                  class="tools-panel__switch"
                  type="button"
                  role="tab"
                  id="tools-view-tab-system"
                  aria-selected="false"
                  aria-controls="tools-view-system"
                  tabindex="-1"
                  data-tools-view-toggle="system"
                >
                  System
                </button>
              </div>
              <div data-tools-section="recommended">
                <div>Recommended</div>
                <div data-tools-body="recommended">
                  <button class="tools-panel__item" data-action="new-request-guided" title="Start a guided new request in Codex"></button>
                  <button class="tools-panel__item" data-action="assist-next-step" title="Suggest the next step"></button>
                  <button class="tools-panel__item" data-action="assist-triage" title="Turn a rough idea into a structured request"></button>
                  <button class="tools-panel__item" data-action="bootstrap-logics" title="Bootstrap Logics in this repository"></button>
                  <button class="tools-panel__item" data-action="check-environment" title="Check environment"></button>
                </div>
              </div>
              <div class="tools-panel__view" id="tools-view-workflow" data-tools-view="workflow">
                <div data-tools-section="workflow">
                  <div>Workflow</div>
                  <div data-tools-body="workflow">
                    <button class="tools-panel__item" data-action="select-agent" title="Select the active agent profile"></button>
                    <button class="tools-panel__item" data-action="create-companion-doc" title="Create a companion doc"></button>
                    <button class="tools-panel__item" data-action="refresh" title="Refresh"></button>
                  </div>
                </div>
                <div data-tools-section="assist">
                  <div>Assist</div>
                  <div data-tools-body="assist">
                    <button class="tools-panel__item" data-action="assist-commit-all"></button>
                    <button class="tools-panel__item" data-action="assist-diff-risk"></button>
                    <button class="tools-panel__item" data-action="assist-summarize-validation"></button>
                    <button class="tools-panel__item" data-action="assist-validation-checklist"></button>
                    <button class="tools-panel__item" data-action="assist-doc-consistency"></button>
                  </div>
                </div>
              </div>
              <div class="tools-panel__view" id="tools-view-system" data-tools-view="system" hidden>
                <div data-tools-section="runtime">
                  <div>Runtime</div>
                  <div data-tools-body="runtime">
                    <button class="tools-panel__item" data-action="launch-codex-overlay" title="Launch Codex with the globally published Logics kit"></button>
                    <button class="tools-panel__item" data-action="check-hybrid-runtime"></button>
                    <button class="tools-panel__item" data-action="open-hybrid-insights"></button>
                  </div>
                </div>
                <div data-tools-section="kit">
                  <div>Kit</div>
                  <div data-tools-body="kit">
                    <button class="tools-panel__item" data-action="update-logics-kit"></button>
                    <button class="tools-panel__item" data-action="sync-codex-overlay"></button>
                  </div>
                </div>
                <div data-tools-section="workspace">
                  <div>Workspace</div>
                  <div data-tools-body="workspace">
                    <button class="tools-panel__item" data-action="change-project-root"></button>
                    <button class="tools-panel__item" data-action="reset-project-root"></button>
                  </div>
                </div>
                <div data-tools-section="maintenance">
                  <div>Maintenance</div>
                  <div data-tools-body="maintenance">
                    <button class="tools-panel__item" data-action="fix-docs"></button>
                    <button class="tools-panel__item" data-action="about"></button>
                  </div>
                </div>
              </div>
            </div>
            <button id="activity-toggle" type="button"></button>
            <button id="attention-toggle" type="button"></button>
            <button data-action="toggle-view-mode"></button>
            <button data-action="select-agent"></button>
            <button data-action="create-companion-doc" title="Create a companion doc"></button>
          </div>
          <div id="filter-panel" class="toolbar__row toolbar__row--secondary" hidden>
            <input id="search-input" type="search" />
            <select id="group-by">
              <option value="stage">Stage</option>
              <option value="status">Status</option>
            </select>
            <select id="sort-by">
              <option value="default">Default</option>
              <option value="updated-desc">Updated</option>
              <option value="progress-desc">Progress</option>
              <option value="status-asc">Status</option>
            </select>
            <button id="filter-reset" type="button"></button>
          </div>
        </div>
        <button class="btn btn--primary" data-action="open"></button>
        <button class="btn btn--primary" data-action="read"></button>
        <button class="btn btn--contextual" data-action="promote"></button>
        <button class="btn btn--secondary" data-action="mark-done"></button>
        <button class="btn btn--caution" data-action="mark-obsolete"></button>
        <input id="hide-complete" type="checkbox" />
        <input id="hide-processed-requests" type="checkbox" />
        <input id="hide-spec" type="checkbox" />
        <input id="show-companion-docs" type="checkbox" />
        <input id="hide-empty-columns" type="checkbox" />
        <div id="layout" class="layout">
          <div id="layout-main" class="layout__main">
            <div id="board"></div>
            <div id="activity-panel" hidden></div>
          </div>
          <div id="splitter" role="separator"></div>
          <aside id="details" class="details">
            <div id="details-eyebrow"></div>
            <div id="details-title"></div>
            <button id="details-toggle" aria-expanded="true"></button>
            <div id="details-body"></div>
          </aside>
        </div>
        <div id="help-banner"><div id="help-banner-copy"></div><button id="help-banner-dismiss" type="button"></button></div>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
  const postedMessages: Array<{ type?: string; [key: string]: unknown }> = [];
  const state = { ...(options.initialState || {}) };
  const persistedStates: Array<Record<string, unknown>> = [];
  const openedUrls: string[] = [];
  const openedDocuments: string[] = [];
  const fetchCalls: string[] = [];
  const setProjectRootCalls: Array<string | null> = [];

  const mediaState = {
    stacked: Boolean(options.stacked),
    narrow: Boolean(options.narrow)
  };
  const listeners = new Map<string, Array<(event: { matches: boolean }) => void>>();
  const getMatches = (query: string) => {
    if (query === "(max-width: 900px)") {
      return mediaState.stacked;
    }
    if (query === "(max-width: 500px)") {
      return mediaState.narrow;
    }
    return false;
  };
  const registerListener = (query: string, callback: (event: { matches: boolean }) => void) => {
    const callbacks = listeners.get(query) || [];
    callbacks.push(callback);
    listeners.set(query, callbacks);
  };

  Object.defineProperty(dom.window, "matchMedia", {
    value: (query: string) => ({
      media: query,
      get matches() {
        return getMatches(query);
      },
      addEventListener: (_type: string, callback: (event: { matches: boolean }) => void) => {
        registerListener(query, callback);
      },
      removeEventListener: () => undefined,
      addListener: (callback: (event: { matches: boolean }) => void) => {
        registerListener(query, callback);
      },
      removeListener: () => undefined
    })
  });

  Object.defineProperty(dom.window, "open", {
    value: (url?: string) => {
      openedUrls.push(String(url || ""));
      const writes: string[] = [];
      return {
        document: {
          open: () => undefined,
          write: (value?: string) => {
            writes.push(String(value || ""));
          },
          close: () => {
            openedDocuments.push(writes.join(""));
          }
        },
        location: {
          href: ""
        }
      };
    }
  });

  Object.defineProperty(dom.window, "fetch", {
    value: (url: string) => {
      fetchCalls.push(String(url));
      if (options.fetchImpl) {
        return options.fetchImpl(String(url));
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: async () => ""
      });
    }
  });

  const confirmMessages: string[] = [];
  Object.defineProperty(dom.window, "confirm", {
    value: (message: string) => {
      confirmMessages.push(String(message));
      if (options.confirmImpl) {
        return options.confirmImpl(String(message));
      }
      return true;
    }
  });

  if (options.showDirectoryPicker) {
    Object.defineProperty(dom.window, "showDirectoryPicker", {
      value: options.showDirectoryPicker
    });
  }

  if (options.harness) {
    Object.defineProperty(dom.window, "__CDX_LOGICS_HARNESS__", {
      value: {
        isHarness: true,
        notify: () => undefined,
        setProjectRootLabel: (root: string | null) => setProjectRootCalls.push(root),
        resetProjectRoot: () => undefined
      }
    });
  }

  Object.defineProperty(dom.window, "acquireVsCodeApi", {
    value: () => ({
      postMessage: (message: { type?: string }) => postedMessages.push(message),
      getState: () => state,
      setState: (nextState: Record<string, unknown>) => {
        Object.assign(state, nextState);
        persistedStates.push(nextState);
      }
    })
  });

  const modelScript = fs.readFileSync(path.resolve(process.cwd(), "media/logicsModel.js"), "utf8");
  const uiStatusScript = fs.readFileSync(path.resolve(process.cwd(), "media/uiStatus.js"), "utf8");
  const harnessApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/harnessApi.js"), "utf8");
  const layoutControllerScript = fs.readFileSync(path.resolve(process.cwd(), "media/layoutController.js"), "utf8");
  const hostApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/hostApi.js"), "utf8");
  const toolsPanelLayoutScript = fs.readFileSync(path.resolve(process.cwd(), "media/toolsPanelLayout.js"), "utf8");
  const webviewSelectorsScript = fs.readFileSync(path.resolve(process.cwd(), "media/webviewSelectors.js"), "utf8");
  const webviewPersistenceScript = fs.readFileSync(path.resolve(process.cwd(), "media/webviewPersistence.js"), "utf8");
  const webviewChromeScript = fs.readFileSync(path.resolve(process.cwd(), "media/webviewChrome.js"), "utf8");
  const renderBoardScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderBoard.js"), "utf8");
  const renderDetailsScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderDetails.js"), "utf8");
  const renderMarkdownScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderMarkdown.js"), "utf8");
  const mainInteractionsScript = fs.readFileSync(path.resolve(process.cwd(), "media/mainInteractions.js"), "utf8");
  const mainScript = fs.readFileSync(path.resolve(process.cwd(), "media/main.js"), "utf8");
  dom.window.eval(modelScript);
  dom.window.eval(uiStatusScript);
  dom.window.eval(harnessApiScript);
  dom.window.eval(layoutControllerScript);
  dom.window.eval(hostApiScript);
  dom.window.eval(toolsPanelLayoutScript);
  dom.window.eval(webviewSelectorsScript);
  dom.window.eval(webviewPersistenceScript);
  dom.window.eval(webviewChromeScript);
  dom.window.eval(renderBoardScript);
  dom.window.eval(renderDetailsScript);
  dom.window.eval(renderMarkdownScript);
  dom.window.eval(mainInteractionsScript);
  dom.window.eval(mainScript);

  const emitMediaChange = (query: string) => {
    (listeners.get(query) || []).forEach((callback) => callback({ matches: getMatches(query) }));
  };
  const setStacked = (nextValue: boolean) => {
    mediaState.stacked = nextValue;
    emitMediaChange("(max-width: 900px)");
  };
  const setNarrow = (nextValue: boolean) => {
    mediaState.narrow = nextValue;
    emitMediaChange("(max-width: 500px)");
  };

  return {
    dom,
    postedMessages,
    openedUrls,
    openedDocuments,
    setProjectRootCalls,
    fetchCalls,
    persistedStates,
    confirmMessages,
    setStacked,
    setNarrow
  };
}

export function pushData(
  dom: JSDOM,
  payload: {
    selectedId?: string;
    root?: string;
    canResetProjectRoot?: boolean;
    canBootstrapLogics?: boolean;
    bootstrapLogicsTitle?: string;
    changedPaths?: string[];
    activeAgent?: Record<string, unknown> | null;
    items: Array<Record<string, unknown>>;
  }
) {
  dom.window.dispatchEvent(
    new dom.window.MessageEvent("message", {
      data: {
        type: "data",
        payload
      }
    })
  );
}

export const baseItem = {
  id: "req_000_kickoff",
  title: "Kickoff",
  stage: "request",
  relPath: "logics/request/req_000_kickoff.md",
  path: "/workspace/mock/logics/request/req_000_kickoff.md",
  indicators: {
    Status: "Draft"
  },
  references: [],
  usedBy: []
};

export const specItem = {
  id: "spec_001_reference_contract",
  title: "Reference Contract Spec",
  stage: "spec",
  relPath: "logics/specs/spec_001_reference_contract.md",
  path: "/workspace/mock/logics/specs/spec_001_reference_contract.md",
  indicators: {
    Status: "Draft"
  },
  references: [],
  usedBy: []
};

export const productItem = {
  id: "prod_000_plugin_ux",
  title: "Plugin companion UX",
  stage: "product",
  relPath: "logics/product/prod_000_plugin_ux.md",
  path: "/workspace/mock/logics/product/prod_000_plugin_ux.md",
  indicators: {
    Status: "Proposed"
  },
  references: [],
  usedBy: []
};

export const architectureItem = {
  id: "adr_000_plugin_model",
  title: "Plugin companion architecture",
  stage: "architecture",
  relPath: "logics/architecture/adr_000_plugin_model.md",
  path: "/workspace/mock/logics/architecture/adr_000_plugin_model.md",
  indicators: {
    Status: "Accepted"
  },
  references: [],
  usedBy: []
};

type MockTree = {
  dirs?: Record<string, MockTree>;
  files?: Record<string, string>;
};

export function createDirectoryHandle(name: string, tree: MockTree) {
  return {
    name,
    async getDirectoryHandle(dirName: string) {
      const next = tree.dirs && tree.dirs[dirName];
      if (!next) {
        throw new Error(`Missing directory: ${dirName}`);
      }
      return createDirectoryHandle(dirName, next);
    },
    async getFileHandle(fileName: string) {
      const content = tree.files && tree.files[fileName];
      if (typeof content !== "string") {
        throw new Error(`Missing file: ${fileName}`);
      }
      return {
        async getFile() {
          return {
            async text() {
              return content;
            }
          };
        }
      };
    }
  };
}
