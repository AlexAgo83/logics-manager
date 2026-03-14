import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

type BootstrapOptions = {
  stacked?: boolean;
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
        <button data-action="promote"></button>
        <button data-action="mark-done"></button>
        <button data-action="mark-obsolete"></button>
        <button data-action="open"></button>
        <button data-action="read"></button>
        <input id="hide-complete" type="checkbox" />
        <input id="hide-used-requests" type="checkbox" />
        <input id="hide-spec" type="checkbox" />
        <input id="show-companion-docs" type="checkbox" />
        <div id="layout" class="layout">
          <div id="board"></div>
          <div id="splitter" role="separator"></div>
          <aside id="details" class="details">
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

  Object.defineProperty(dom.window, "matchMedia", {
    value: () => ({
      matches: Boolean(options.stacked),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
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

  const mainScript = fs.readFileSync(path.resolve(process.cwd(), "media/main.js"), "utf8");
  dom.window.eval(mainScript);

  return { dom, postedMessages, openedUrls, openedDocuments, setProjectRootCalls, fetchCalls, persistedStates };
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
    expect(detailsBody?.textContent).toContain("product • prod_000_plugin_ux");
    expect(detailsBody?.textContent).toContain("architecture • adr_000_plugin_model");

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
            { kind: "manual", label: "Reference", path: "logics/architecture/adr_000_plugin_model.md" }
          ]
        },
        productItem,
        architectureItem
      ]
    });

    const card = dom.window.document.querySelector(".card");
    expect(card?.textContent).toContain("PROD");
    expect(card?.textContent).toContain("ADR");
    expect(card?.querySelector(".card__badge--product")).not.toBeNull();
    expect(card?.querySelector(".card__badge--architecture")).not.toBeNull();
  });

  it("posts companion doc creation from the details panel", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const createButton = dom.window.document.querySelector('[aria-label="Create companion doc"]');
    createButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some((message) => message.type === "create-companion-doc" && message.id === "req_000_kickoff")
    ).toBe(true);
  });

  it("keeps companion docs hidden by default and reveals them with the toggle", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [productItem, architectureItem]
    });

    const document = dom.window.document;
    const showCompanionDocsToggle = document.getElementById("show-companion-docs") as HTMLInputElement | null;

    expect(document.querySelector('.column[data-stage="product"]')).toBeNull();
    expect(document.querySelector('.column[data-stage="architecture"]')).toBeNull();

    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = true;
      showCompanionDocsToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(document.querySelectorAll('.column[data-stage="product"]').length).toBe(1);
    expect(document.querySelectorAll('.column[data-stage="architecture"]').length).toBe(1);
    expect(persistedStates.some((state) => state.showCompanionDocs === true)).toBe(true);
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
