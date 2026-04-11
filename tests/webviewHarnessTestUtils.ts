import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

function loadMediaScript(dom: JSDOM, relPath: string) {
  const absPath = path.resolve(process.cwd(), relPath);
  const source = fs.readFileSync(absPath, "utf8");
  dom.window.eval(`${source}\n//# sourceURL=${absPath}\n`);
}

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
            <button id="workflow-toggle" class="toolbar__filter"></button>
            <button id="assist-toggle" class="toolbar__filter"></button>
            <button id="system-toggle" class="toolbar__filter"></button>
            <div id="tools-panel">
              <div data-tools-section="recommended">
                <div>Recommended</div>
                <div data-tools-body="recommended">
                  <button class="tools-panel__item" data-action="new-request" title="Create a new request document"></button>
                  <button class="tools-panel__item" data-action="assist-next-step" title="Suggest the next bounded workflow step for the current Logics wave"></button>
                  <button class="tools-panel__item" data-action="assist-triage" title="Classify a workflow doc into a request, backlog item, or task with the shared runtime"></button>
                  <button class="tools-panel__item" data-action="bootstrap-logics" title="Bootstrap Logics in this repository"></button>
                  <button class="tools-panel__item" data-action="check-environment" title="Review environment health and recommended fixes">Check Environment</button>
                </div>
              </div>
              <div class="tools-panel__view" id="tools-view-workflow" data-tools-view="workflow">
                <div data-tools-section="workflow">
                  <div>Workflow</div>
                  <div data-tools-body="workflow">
                    <button class="tools-panel__item" data-action="open-onboarding" title="Open the getting started guide"></button>
                    <button class="tools-panel__item" data-action="select-agent" title="Select the active assistant persona used for workflow actions"></button>
                    <button class="tools-panel__item" data-action="create-companion-doc" title="Create a companion doc for the selected Logics item"></button>
                  </div>
                </div>
              </div>
              <div class="tools-panel__view" id="tools-view-assist" data-tools-view="assist" hidden>
                <div data-tools-section="assist">
                  <div>Assist</div>
                  <div data-tools-body="assist">
                    <button class="tools-panel__item" data-action="assist-commit-all" title="Suggest a bounded commit plan for the current workspace changes"></button>
                    <button class="tools-panel__item" data-action="assist-diff-risk" title="Assess the current diff risk before you commit or hand off changes"></button>
                    <button class="tools-panel__item" data-action="assist-summarize-changelog" title="Draft a changelog summary from the current Logics delivery wave"></button>
                    <button class="tools-panel__item" data-action="assist-prepare-release" title="Prepare a release by generating missing changelog material and staging the release prep changes"></button>
                    <button class="tools-panel__item" data-action="assist-publish-release" title="Create the release tag, push it, and publish the GitHub release"></button>
                    <button class="tools-panel__item" data-action="assist-summarize-validation" title="Summarize the latest validation outcome and what still needs attention"></button>
                    <button class="tools-panel__item" data-action="assist-validation-checklist" title="Build a concise validation checklist for the current delivery wave"></button>
                    <button class="tools-panel__item" data-action="assist-doc-consistency" title="Review the workflow docs for consistency, stale indicators, and broken references"></button>
                  </div>
                </div>
              </div>
              <div class="tools-panel__view" id="tools-view-system" data-tools-view="system" hidden>
                <div data-tools-section="runtime">
                  <div>AI Runtime</div>
                  <div data-tools-body="runtime">
                    <button class="tools-panel__item" data-action="check-hybrid-runtime" title="Check provider availability, cooldown state, and hybrid assist health">AI Runtime Status</button>
                    <button class="tools-panel__item" data-action="open-hybrid-insights" title="Open multi-provider Hybrid Insights with dispatch and fallback breakdowns">AI Provider Insights</button>
                  </div>
                </div>
                <div data-tools-section="kit">
                  <div>Kit</div>
                  <div data-tools-body="kit">
                    <button class="tools-panel__item" data-action="update-logics-kit"></button>
                    <button class="tools-panel__item" data-action="repair-logics-kit"></button>
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
                    <button class="tools-panel__item" data-action="open-logics-insights" title="Open corpus stats and relationship signals">Logics Insights</button>
                    <button class="tools-panel__item" data-action="about"></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="toolbar__buttons">
            <button id="header-logics-insights" type="button" title="Open Logics insights"></button>
            <button id="activity-toggle" type="button"></button>
            <button id="attention-toggle" type="button"></button>
            <button data-action="toggle-view-mode"></button>
            <button data-action="select-agent"></button>
            <button data-action="create-companion-doc" title="Create a companion doc"></button>
          </div>
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
        <button class="btn btn--caution" data-action="change-status"></button>
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

  const mediaFiles = [
    "media/logicsModel.js",
    "media/uiStatus.js",
    "media/harnessApi.js",
    "media/layoutController.js",
    "media/hostApi.js",
    "media/toolsPanelLayout.js",
    "media/webviewSelectors.js",
    "media/webviewPersistence.js",
    "media/webviewChrome.js",
    "media/renderBoardApp.js",
    "media/renderDetails.js",
    "media/renderMarkdown.js",
    "media/mainCore.js",
    "media/mainInteractionHandlers.js",
    "media/mainInteractions.js",
    "media/mainApp.js"
  ];
  for (const relPath of mediaFiles) {
    loadMediaScript(dom, relPath);
  }

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
    canPublishRelease?: boolean;
    publishReleaseTitle?: string;
    shouldRecommendCheckEnvironment?: boolean;
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
