import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

type BootstrapOptions = {
  stacked?: boolean;
  harness?: boolean;
  showDirectoryPicker?: () => Promise<{ name?: string }>;
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
          <button data-action="refresh"></button>
          <button data-action="change-project-root"></button>
          <button data-action="reset-project-root"></button>
          <button data-action="fix-docs"></button>
        </div>
        <button data-action="promote"></button>
        <button data-action="open"></button>
        <button data-action="read"></button>
        <input id="hide-complete" type="checkbox" />
        <input id="hide-used-requests" type="checkbox" />
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
  const openedUrls: string[] = [];
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
      return {
        document: {
          open: () => undefined,
          write: () => undefined,
          close: () => undefined
        },
        location: {
          href: ""
        }
      };
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
      setState: () => undefined
    })
  });

  const mainScript = fs.readFileSync(path.resolve(process.cwd(), "media/main.js"), "utf8");
  dom.window.eval(mainScript);

  return { dom, postedMessages, openedUrls, setProjectRootCalls };
}

function pushData(
  dom: JSDOM,
  payload: {
    selectedId?: string;
    root?: string;
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

describe("webview harness controls and accessibility", () => {
  it("opens selected item in a new tab in harness mode without posting open message", () => {
    const { dom, postedMessages, openedUrls } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(openedUrls.some((url) => url.includes("/logics/request/req_000_kickoff.md"))).toBe(true);
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

  it("adds discoverable labels/tooltips and keyboard-accessible card interactions", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const filterToggle = document.getElementById("filter-toggle");
    const toolsToggle = document.getElementById("tools-toggle");
    const addButton = document.querySelector(".column__add") as HTMLButtonElement | null;
    const card = document.querySelector(".card") as HTMLDivElement | null;
    const detailsToggle = document.getElementById("details-toggle");

    expect(filterToggle?.getAttribute("title")).toBe("Filter options");
    expect(toolsToggle?.getAttribute("title")).toBe("Tools");
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
});
