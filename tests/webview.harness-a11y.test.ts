import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

type BootstrapOptions = {
  stacked?: boolean;
  narrow?: boolean;
  harness?: boolean;
  showDirectoryPicker?: () => Promise<{ name?: string }>;
  fetchImpl?: (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
};

function bootstrapWebview(options: BootstrapOptions = {}) {
  const html = `
    <!doctype html>
    <html>
      <body>
        <div class="toolbar">
          <button id="filter-toggle" class="toolbar__filter"></button>
          <div id="filter-panel"></div>
          <button id="tools-toggle" class="toolbar__filter"></button>
          <div id="tools-panel"></div>
          <button data-action="toggle-view-mode"></button>
          <button data-action="refresh"></button>
          <button data-action="select-agent"></button>
          <button data-action="new-request-guided"></button>
          <button data-action="create-companion-doc" title="Create a companion doc"></button>
          <button data-action="bootstrap-logics"></button>
          <button data-action="change-project-root"></button>
          <button data-action="reset-project-root"></button>
          <button data-action="fix-docs"></button>
          <button data-action="about"></button>
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
          <div id="board"></div>
          <div id="splitter" role="separator"></div>
          <aside id="details" class="details">
            <div id="details-eyebrow"></div>
            <div id="details-title"></div>
            <button id="details-toggle" aria-expanded="true"></button>
            <div id="details-body"></div>
          </aside>
        </div>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
  const postedMessages: Array<{ type?: string }> = [];
  const state = {};
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
        persistedStates.push(nextState);
      }
    })
  });

  const modelScript = fs.readFileSync(path.resolve(process.cwd(), "media/logicsModel.js"), "utf8");
  const uiStatusScript = fs.readFileSync(path.resolve(process.cwd(), "media/uiStatus.js"), "utf8");
  const harnessApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/harnessApi.js"), "utf8");
  const layoutControllerScript = fs.readFileSync(path.resolve(process.cwd(), "media/layoutController.js"), "utf8");
  const hostApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/hostApi.js"), "utf8");
  const renderBoardScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderBoard.js"), "utf8");
  const renderDetailsScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderDetails.js"), "utf8");
  const renderMarkdownScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderMarkdown.js"), "utf8");
  const mainScript = fs.readFileSync(path.resolve(process.cwd(), "media/main.js"), "utf8");
  dom.window.eval(modelScript);
  dom.window.eval(uiStatusScript);
  dom.window.eval(harnessApiScript);
  dom.window.eval(layoutControllerScript);
  dom.window.eval(hostApiScript);
  dom.window.eval(renderBoardScript);
  dom.window.eval(renderDetailsScript);
  dom.window.eval(renderMarkdownScript);
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

  return { dom, postedMessages, openedUrls, openedDocuments, setProjectRootCalls, fetchCalls, persistedStates, setStacked, setNarrow };
}

function pushData(
  dom: JSDOM,
  payload: {
    selectedId?: string;
    root?: string;
    canResetProjectRoot?: boolean;
    canBootstrapLogics?: boolean;
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

const baseItem = {
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

const specItem = {
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

const productItem = {
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

const architectureItem = {
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

function createDirectoryHandle(name: string, tree: MockTree) {
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

describe("webview harness controls and accessibility", () => {
  it("opens selected item in harness mode without posting open message", async () => {
    const { dom, postedMessages, openedUrls } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(openedUrls.length).toBeGreaterThan(0);
    expect(postedMessages.some((message) => message.type === "open")).toBe(false);
  });

  it("uses the browser directory picker fallback for change project root in harness mode", async () => {
    let pickerCalls = 0;
    const { dom, postedMessages, setProjectRootCalls } = bootstrapWebview({
      harness: true,
      showDirectoryPicker: async () => {
        pickerCalls += 1;
        return { name: "repo-root" };
      }
    });

    const button = dom.window.document.querySelector('[data-action="change-project-root"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pickerCalls).toBe(1);
    expect(setProjectRootCalls).toContain("repo-root");
    expect(postedMessages.some((message) => message.type === "change-project-root")).toBe(false);
  });

  it("uses selected directory handle content for edit preview in harness mode", async () => {
    const rootHandle = createDirectoryHandle("repo-root", {
      dirs: {
        logics: {
          dirs: {
            request: {
              files: {
                "req_000_kickoff.md": "# Kickoff"
              }
            }
          }
        }
      }
    });
    const { dom, openedUrls, fetchCalls } = bootstrapWebview({
      harness: true,
      showDirectoryPicker: async () => rootHandle
    });

    const changeRootButton = dom.window.document.querySelector('[data-action="change-project-root"]');
    changeRootButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(openedUrls).toContain("");
    expect(fetchCalls.length).toBe(0);
  });

  it("keeps VS Code message routing in non-harness mode for open, change root, and select agent", () => {
    const { dom, postedMessages, openedUrls } = bootstrapWebview({ harness: false });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    const changeRootButton = dom.window.document.querySelector('[data-action="change-project-root"]');
    const selectAgentButton = dom.window.document.querySelector('[data-action="select-agent"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    changeRootButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    selectAgentButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open")).toBe(true);
    expect(postedMessages.some((message) => message.type === "change-project-root")).toBe(true);
    expect(postedMessages.some((message) => message.type === "select-agent")).toBe(true);
    expect(openedUrls.length).toBe(0);
  });

  it("posts guided new-request action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const guidedButton = dom.window.document.querySelector('[data-action="new-request-guided"]');
    guidedButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "new-request-guided")).toBe(true);
  });

  it("posts create companion doc action from tools in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const createCompanionDocButton = dom.window.document.querySelector('[data-action="create-companion-doc"]');
    createCompanionDocButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some((message) => message.type === "create-companion-doc" && message.id === "req_000_kickoff")
    ).toBe(true);
  });

  it("disables use-workspace-root when payload indicates no override", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      canResetProjectRoot: false,
      items: [baseItem]
    });

    const resetButton = dom.window.document.querySelector(
      '[data-action="reset-project-root"]'
    ) as HTMLButtonElement | null;
    expect(resetButton?.disabled).toBe(true);

    pushData(dom, {
      root: "/workspace/mock/other",
      canResetProjectRoot: true,
      items: [baseItem]
    });
    expect(resetButton?.disabled).toBe(false);
  });

  it("switches to list mode and persists view mode state", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const modeButton = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    expect(board?.classList.contains("board--list")).toBe(true);
    expect(modeButton?.getAttribute("data-current-mode")).toBe("list");
    expect(modeButton?.getAttribute("aria-pressed")).toBe("true");
    expect(dom.window.document.querySelectorAll(".list-view__section").length).toBeGreaterThan(0);
    expect(
      persistedStates.some((state) => state.viewMode === "list")
    ).toBe(true);
  });

  it("forces list mode below 500px and restores the saved mode above that threshold", () => {
    const { dom, setNarrow } = bootstrapWebview({ harness: true, narrow: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]') as HTMLButtonElement | null;

    expect(board?.classList.contains("board--list")).toBe(true);
    expect(modeButton?.dataset.currentMode).toBe("list");
    expect(modeButton?.disabled).toBe(true);

    setNarrow(false);

    expect(board?.classList.contains("board--list")).toBe(false);
    expect(modeButton?.dataset.currentMode).toBe("board");
    expect(modeButton?.disabled).toBe(false);
  });

  it("hides SPEC by default and applies the toggle in board and list modes", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [specItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const hideSpecToggle = document.getElementById("hide-spec") as HTMLInputElement | null;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');

    expect(hideSpecToggle?.checked).toBe(true);
    expect(board?.textContent?.includes("No items match the current filters.")).toBe(true);
    expect(document.querySelector('[data-stage="spec"]')).toBeNull();

    if (hideSpecToggle) {
      hideSpecToggle.checked = false;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelectorAll('.column[data-stage="spec"]').length).toBe(1);
    expect(persistedStates.some((state) => state.hideSpec === false)).toBe(true);

    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.querySelectorAll('.list-view__section[data-stage="spec"]').length).toBe(1);

    if (hideSpecToggle) {
      hideSpecToggle.checked = true;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('[data-stage="spec"]')).toBeNull();
    expect(persistedStates.some((state) => state.hideSpec === true)).toBe(true);
  });

  it("hides only processed requests when the processed filter is enabled", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_001_processed",
          title: "Processed request",
          relPath: "logics/request/req_001_processed.md",
          path: "/workspace/mock/logics/request/req_001_processed.md",
          references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_001_processed.md" }]
        },
        {
          ...baseItem,
          id: "req_002_draft_linked",
          title: "Linked draft request",
          relPath: "logics/request/req_002_draft_linked.md",
          path: "/workspace/mock/logics/request/req_002_draft_linked.md",
          references: [{ kind: "backlog", label: "Backlog", path: "logics/backlog/item_002_draft_linked.md" }]
        },
        {
          ...baseItem,
          id: "item_001_processed",
          title: "Processed backlog",
          stage: "backlog",
          relPath: "logics/backlog/item_001_processed.md",
          path: "/workspace/mock/logics/backlog/item_001_processed.md",
          indicators: { Status: "Ready" }
        },
        {
          ...baseItem,
          id: "item_002_draft_linked",
          title: "Draft backlog",
          stage: "backlog",
          relPath: "logics/backlog/item_002_draft_linked.md",
          path: "/workspace/mock/logics/backlog/item_002_draft_linked.md",
          indicators: { Status: "Draft" }
        }
      ]
    });

    const document = dom.window.document;
    const processedToggle = document.getElementById("hide-processed-requests") as HTMLInputElement | null;

    expect(document.querySelector('[data-id="req_001_processed"]')).not.toBeNull();
    expect(document.querySelector('[data-id="req_002_draft_linked"]')).not.toBeNull();

    if (processedToggle) {
      processedToggle.checked = true;
      processedToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('[data-id="req_001_processed"]')).toBeNull();
    expect(document.querySelector('[data-id="req_002_draft_linked"]')).not.toBeNull();
    expect(persistedStates.some((state) => state.hideProcessedRequests === true)).toBe(true);
  });

  it("hides processed requests when the linked backlog reference is stored as an id", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_003_processed_by_id",
          title: "Processed request by id",
          relPath: "logics/request/req_003_processed_by_id.md",
          path: "/workspace/mock/logics/request/req_003_processed_by_id.md",
          indicators: { Status: "Done" },
          references: [{ kind: "backlog", label: "Backlog", path: "item_003_processed_by_id" }]
        },
        {
          ...baseItem,
          id: "item_003_processed_by_id",
          title: "Processed backlog by id",
          stage: "backlog",
          relPath: "logics/backlog/item_003_processed_by_id.md",
          path: "/workspace/mock/logics/backlog/item_003_processed_by_id.md",
          indicators: { Status: "Done" }
        }
      ]
    });

    const document = dom.window.document;
    const processedToggle = document.getElementById("hide-processed-requests") as HTMLInputElement | null;
    expect(document.querySelector('[data-id="req_003_processed_by_id"]')).not.toBeNull();

    if (processedToggle) {
      processedToggle.checked = true;
      processedToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('[data-id="req_003_processed_by_id"]')).toBeNull();
  });

  it("hides empty columns in board view by default and can be disabled", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const hideEmptyColumnsToggle = document.getElementById("hide-empty-columns") as HTMLInputElement | null;

    expect(hideEmptyColumnsToggle?.checked).toBe(true);
    expect(document.querySelector('.column[data-stage="request"]')).not.toBeNull();
    expect(document.querySelector('.column[data-stage="backlog"]')).toBeNull();
    expect(document.querySelector('.column[data-stage="task"]')).toBeNull();

    if (hideEmptyColumnsToggle) {
      hideEmptyColumnsToggle.checked = false;
      hideEmptyColumnsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelector('.column[data-stage="request"]')).not.toBeNull();
    expect(document.querySelector('.column[data-stage="backlog"]')).not.toBeNull();
    expect(document.querySelector('.column[data-stage="task"]')).not.toBeNull();
    expect(persistedStates.some((state) => state.hideEmptyColumns === false)).toBe(true);
  });

  it("applies detail header hierarchy and action emphasis for the selected item", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const eyebrow = dom.window.document.getElementById("details-eyebrow");
    const title = dom.window.document.getElementById("details-title");
    const promoteButton = dom.window.document.querySelector('[data-action="promote"]');
    const openButton = dom.window.document.querySelector('[data-action="open"]');
    const readButton = dom.window.document.querySelector('[data-action="read"]');
    const obsoleteButton = dom.window.document.querySelector('[data-action="mark-obsolete"]');

    expect(eyebrow?.textContent).toContain("request");
    expect(title?.textContent).toContain("Kickoff");
    expect(openButton?.classList.contains("btn--primary")).toBe(true);
    expect(readButton?.classList.contains("btn--primary")).toBe(true);
    expect(promoteButton?.classList.contains("btn--contextual")).toBe(true);
    expect(promoteButton?.classList.contains("btn--contextual-active")).toBe(true);
    expect(obsoleteButton?.classList.contains("btn--caution")).toBe(true);
  });

  it("opens selected item on card double-click in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const card = dom.window.document.querySelector(".card");
    card?.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open")).toBe(true);
  });

  it("shows companion docs in details and opens linked companion items", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [
            { kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" },
            { kind: "manual", label: "Reference", path: "logics/architecture/adr_000_plugin_model.md" }
          ]
        },
        productItem,
        architectureItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Companion docs");
    expect(detailsBody?.textContent).toContain("product brief • prod_000_plugin_ux");
    expect(detailsBody?.textContent).toContain("architecture decision • adr_000_plugin_model");

    const openButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const companionOpenButton = openButtons.find((button) => button.textContent?.trim() === "Open");
    companionOpenButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open" && message.id === "prod_000_plugin_ux")).toBe(true);
  });

  it("opens managed references from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" }]
        },
        productItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const openButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const referenceOpenButton = openButtons.find((button) => button.textContent?.trim() === "Open");
    referenceOpenButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open" && message.id === "prod_000_plugin_ux")).toBe(true);
  });

  it("reads managed references from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" }]
        },
        productItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const actionButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const readButton = actionButtons.find((button) => button.textContent?.trim() === "Read");
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "prod_000_plugin_ux")).toBe(true);
  });

  it("shows companion badges on delivery cards when linked docs exist", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          references: [
            { kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" },
            { kind: "manual", label: "Reference", path: "logics/architecture/adr_000_plugin_model.md" },
            { kind: "manual", label: "Reference", path: "logics/specs/spec_001_reference_contract.md" }
          ]
        },
        productItem,
        architectureItem,
        specItem
      ]
    });

    const card = dom.window.document.querySelector(".card");
    expect(card?.textContent).toContain("PROD");
    expect(card?.textContent).toContain("ADR");
    expect(card?.textContent).toContain("SPEC");
    expect(card?.querySelector(".card__badge--product")).not.toBeNull();
    expect(card?.querySelector(".card__badge--architecture")).not.toBeNull();
    expect(card?.querySelector(".card__badge--spec")).not.toBeNull();
  });

  it("shows linked specs in a dedicated details section", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        {
          ...baseItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/specs/spec_001_reference_contract.md" }]
        },
        specItem
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Specs");
    expect(detailsBody?.textContent).toContain("spec • spec_001_reference_contract");

    const actionButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const readButton = actionButtons.find((button) => button.textContent?.trim() === "Read");
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "spec_001_reference_contract")).toBe(
      true
    );
  });

  it("posts companion doc creation from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("No companion docs linked yet.");

    const createButton = dom.window.document.querySelector('[aria-label="Create companion doc"]');
    createButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some((message) => message.type === "create-companion-doc" && message.id === "req_000_kickoff")
    ).toBe(true);
  });

  it("offers explicit product and architecture companion actions when framing docs are missing", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    const buttons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const productButton = buttons.find((button) => button.textContent?.trim() === "+ Product brief");
    const architectureButton = buttons.find((button) => button.textContent?.trim() === "+ Architecture decision");

    expect(productButton).toBeTruthy();
    expect(architectureButton).toBeTruthy();

    productButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    architectureButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some(
        (message) =>
          message.type === "create-companion-doc" &&
          message.id === "req_000_kickoff" &&
          (message as { preferredKind?: string }).preferredKind === "product"
      )
    ).toBe(true);
    expect(
      postedMessages.some(
        (message) =>
          message.type === "create-companion-doc" &&
          message.id === "req_000_kickoff" &&
          (message as { preferredKind?: string }).preferredKind === "architecture"
      )
    ).toBe(true);
  });

  it("keeps companion docs hidden by default and reveals them with the toggle", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...productItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        },
        architectureItem,
        specItem
      ]
    });

    const document = dom.window.document;
    const showCompanionDocsToggle = document.getElementById("show-companion-docs") as HTMLInputElement | null;
    const hideSpecToggle = document.getElementById("hide-spec") as HTMLInputElement | null;

    expect(document.querySelector('.column[data-stage="product"]')).toBeNull();
    expect(document.querySelector('.column[data-stage="architecture"]')).toBeNull();

    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelectorAll('.column[data-stage="product"]').length).toBe(1);
    expect(document.querySelectorAll('.column[data-stage="architecture"]').length).toBe(1);
    expect(document.querySelector('.column[data-stage="product"] .column__title')?.textContent).toBe("Product briefs");
    expect(document.querySelector('.column[data-stage="architecture"] .column__title')?.textContent).toBe(
      "Architecture decisions"
    );
    expect(document.querySelector('.column[data-stage="product"] .column__add')).toBeNull();
    expect(document.querySelector('.column[data-stage="architecture"] .column__add')).toBeNull();
    expect(document.querySelector('.column[data-stage="product"] .card__meta')?.textContent).toContain(
      "product brief • prod_000_plugin_ux"
    );
    expect(document.querySelector('.column[data-stage="product"] .card__meta--linkage')?.textContent).toContain(
      "For request • req_000_kickoff"
    );
    expect(document.querySelector('.column[data-stage="architecture"] .card__meta--linkage')?.textContent).toContain(
      "Unlinked to primary flow"
    );
    expect(persistedStates.some((state) => state.showCompanionDocs === true)).toBe(true);

    if (hideSpecToggle) {
      hideSpecToggle.checked = false;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const stageSequence = Array.from(document.querySelectorAll(".column")).map((column) => column.getAttribute("data-stage"));
    expect(stageSequence).toEqual(["request", "product", "architecture", "spec"]);
  });

  it("shows primary flow links in details for supporting docs", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...productItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        }
      ]
    });

    const showCompanionDocsToggle = dom.window.document.getElementById("show-companion-docs") as HTMLInputElement | null;
    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "prod_000_plugin_ux",
      items: [
        baseItem,
        {
          ...productItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        }
      ]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Primary flow");
    expect(detailsBody?.textContent).toContain("request • req_000_kickoff");

    const openButtons = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []);
    const openButton = openButtons.find((button) => button.textContent?.trim() === "Open");
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open" && message.id === "req_000_kickoff")).toBe(true);
  });

  it("offers a direct link-to-primary-flow action for unlinked supporting docs", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [architectureItem]
    });

    const showCompanionDocsToggle = dom.window.document.getElementById("show-companion-docs") as HTMLInputElement | null;
    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "adr_000_plugin_model",
      items: [architectureItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody?.textContent).toContain("Primary flow");
    expect(detailsBody?.textContent).toContain("No primary workflow item linked yet.");

    const linkButton = Array.from(detailsBody?.querySelectorAll(".details__inline-cta") || []).find(
      (button) => button.textContent?.trim() === "+ Link to primary flow"
    );
    expect(linkButton).toBeTruthy();

    linkButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "add-reference" && message.id === "adr_000_plugin_model")).toBe(
      true
    );
  });

  it("posts lifecycle actions in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const doneButton = dom.window.document.querySelector('[data-action="mark-done"]');
    const obsoleteButton = dom.window.document.querySelector('[data-action="mark-obsolete"]');
    doneButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    obsoleteButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "mark-done")).toBe(true);
    expect(postedMessages.some((message) => message.type === "mark-obsolete")).toBe(true);
  });

  it("adds discoverable labels/tooltips and keyboard-accessible card interactions", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const filterToggle = document.getElementById("filter-toggle");
    const toolsToggle = document.getElementById("tools-toggle");
    const newRequestButton = document.querySelector('[data-action="new-request-guided"]');
    const createCompanionDocButton = document.querySelector('[data-action="create-companion-doc"]');
    const addButton = document.querySelector(".column__add") as HTMLButtonElement | null;
    const card = document.querySelector(".card") as HTMLDivElement | null;
    const detailsToggle = document.getElementById("details-toggle");

    expect(filterToggle?.getAttribute("title")).toBe("Filter options");
    expect(toolsToggle?.getAttribute("title")).toBe("Tools");
    expect(newRequestButton?.getAttribute("title")).toBe("Start a guided new request in Codex");
    expect(createCompanionDocButton?.getAttribute("title")).toBe("Create a companion doc");
    expect(addButton?.getAttribute("title")).toBe("Add Logics item");
    expect(card?.getAttribute("role")).toBe("button");
    expect(card?.tabIndex).toBe(0);
    expect(card?.getAttribute("aria-label")).toContain("request item");

    card?.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true
      })
    );
    expect(document.querySelectorAll(".card.card--selected").length).toBe(1);

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(detailsToggle?.getAttribute("title")).toBe("Expand details");
  });

  it("renders markdown preview with Mermaid bootstrap in harness read mode", async () => {
    const mermaidItem = {
      ...baseItem,
      path: "/workspace/mock/logics/request/req_000_kickoff.md",
      relPath: "logics/request/req_000_kickoff.md"
    };
    const { dom, openedDocuments } = bootstrapWebview({
      harness: true,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () =>
          [
            "# Kickoff",
            "",
            "```mermaid",
            "flowchart TD",
            "A[Need] --> B[Result]",
            "```"
          ].join("\n")
      })
    });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [mermaidItem]
    });

    const readButton = dom.window.document.querySelector('[data-action="read"]');
    readButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const html = openedDocuments[0] || "";
    expect(html.includes('class="mermaid"')).toBe(true);
    expect(html.includes("/node_modules/mermaid/dist/mermaid.min.js")).toBe(true);
    expect(html.includes("Mermaid preview unavailable")).toBe(true);
  });
});
