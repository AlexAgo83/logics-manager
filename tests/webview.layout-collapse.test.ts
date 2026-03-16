import * as fs from "fs";
import * as path from "path";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";

function readCssBundle(entryPath: string, seen = new Set<string>()) {
  const resolved = path.resolve(process.cwd(), entryPath);
  if (seen.has(resolved)) {
    return "";
  }
  seen.add(resolved);
  const css = fs.readFileSync(resolved, "utf8");
  const importPattern = /@import url\("(.+?)"\);/g;
  let match: RegExpExecArray | null;
  let bundled = css;
  while ((match = importPattern.exec(css)) !== null) {
    const importPath = path.resolve(path.dirname(resolved), match[1]);
    bundled += "\n" + readCssBundle(importPath, seen);
  }
  return bundled;
}

function getCssRule(css: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{[^}]+\\}`))?.[0] || "";
}

function getCssRules(css: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{[^}]+\\}`, "g")) || [];
}

function bootstrapWebview(stacked: boolean, narrow = false) {
  const html = `
    <!doctype html>
    <html>
      <body>
        <button id="filter-toggle"></button>
        <button id="tools-toggle"></button>
        <div id="tools-panel">
          <button data-action="change-project-root"></button>
          <button data-action="reset-project-root"></button>
          <button data-action="refresh"></button>
          <button data-action="fix-docs"></button>
        </div>
        <div id="filter-panel" hidden>
          <button id="filter-reset" type="button"></button>
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
        </div>
        <button id="activity-toggle" type="button"></button>
        <button id="attention-toggle" type="button"></button>
        <button data-action="select-agent"></button>
        <button data-action="new-request-guided"></button>
        <button data-action="promote"></button>
        <button data-action="open"></button>
        <button data-action="read"></button>
        <input id="hide-complete" type="checkbox" />
        <input id="hide-processed-requests" type="checkbox" />
        <input id="hide-spec" type="checkbox" />
        <div id="layout" class="layout">
          <div id="layout-main" class="layout__main">
            <div id="board"></div>
            <div id="activity-panel" hidden></div>
          </div>
          <div id="splitter" role="separator"></div>
          <aside id="details" class="details">
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
  const postedMessages: Array<{ type?: string }> = [];
  const state = {};
  const document = dom.window.document;
  const layout = document.getElementById("layout") as HTMLElement | null;
  const mainPane = document.getElementById("layout-main") as HTMLElement | null;
  const splitter = document.getElementById("splitter") as HTMLElement | null;
  const activityPanel = document.getElementById("activity-panel") as HTMLElement | null;
  const board = document.getElementById("board") as HTMLElement | null;
  const details = document.getElementById("details") as HTMLElement | null;
  let boardContentHeight = 10000;

  if (layout && mainPane && splitter && activityPanel && board && details) {
    Object.defineProperty(layout, "clientHeight", {
      configurable: true,
      get() {
        return 600;
      }
    });
    layout.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: layout.clientHeight,
        right: 320,
        width: 320,
        height: layout.clientHeight,
        toJSON: () => ({})
      }) as DOMRect;
    splitter.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 14,
        right: 320,
        width: 320,
        height: 14,
        toJSON: () => ({})
      }) as DOMRect;
    Object.defineProperty(board, "scrollHeight", {
      configurable: true,
      get() {
        return boardContentHeight;
      }
    });
    Object.defineProperty(activityPanel, "scrollHeight", {
      configurable: true,
      get() {
        return 10000;
      }
    });
    details.getBoundingClientRect = () => {
      const collapsed = details.classList.contains("details--collapsed");
      const height = collapsed ? 92 : Number.parseInt(details.style.height || "220", 10);
      return {
        x: 0,
        y: 0,
        top: layout.clientHeight - height,
        left: 0,
        bottom: layout.clientHeight,
        right: 320,
        width: 320,
        height,
        toJSON: () => ({})
      } as DOMRect;
    };
    mainPane.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: layout.clientHeight,
        right: 320,
        width: 320,
        height: layout.clientHeight,
        toJSON: () => ({})
      }) as DOMRect;
  }

  const mediaState = { stacked, narrow };
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

  Object.defineProperty(dom.window, "acquireVsCodeApi", {
    value: () => ({
      postMessage: (message: { type?: string }) => postedMessages.push(message),
      getState: () => state,
      setState: () => undefined
    })
  });

  const modelScript = fs.readFileSync(path.resolve(process.cwd(), "media/logicsModel.js"), "utf8");
  const uiStatusScript = fs.readFileSync(path.resolve(process.cwd(), "media/uiStatus.js"), "utf8");
  const harnessApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/harnessApi.js"), "utf8");
  const layoutControllerScript = fs.readFileSync(path.resolve(process.cwd(), "media/layoutController.js"), "utf8");
  const hostApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/hostApi.js"), "utf8");
  const webviewSelectorsScript = fs.readFileSync(path.resolve(process.cwd(), "media/webviewSelectors.js"), "utf8");
  const webviewPersistenceScript = fs.readFileSync(path.resolve(process.cwd(), "media/webviewPersistence.js"), "utf8");
  const webviewChromeScript = fs.readFileSync(path.resolve(process.cwd(), "media/webviewChrome.js"), "utf8");
  const renderBoardScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderBoard.js"), "utf8");
  const renderDetailsScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderDetails.js"), "utf8");
  const renderMarkdownScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderMarkdown.js"), "utf8");
  const mainScript = fs.readFileSync(path.resolve(process.cwd(), "media/main.js"), "utf8");
  dom.window.eval(modelScript);
  dom.window.eval(uiStatusScript);
  dom.window.eval(harnessApiScript);
  dom.window.eval(layoutControllerScript);
  dom.window.eval(hostApiScript);
  dom.window.eval(webviewSelectorsScript);
  dom.window.eval(webviewPersistenceScript);
  dom.window.eval(webviewChromeScript);
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

  return {
    dom,
    postedMessages,
    setStacked,
    setBoardContentHeight(nextValue: number) {
      boardContentHeight = nextValue;
    }
  };
}

describe("webview collapsed details layout behavior", () => {
  it("disables splitter interactions when stacked layout is collapsed", () => {
    const { dom } = bootstrapWebview(true);
    const document = dom.window.document;
    const layout = document.getElementById("layout");
    const splitter = document.getElementById("splitter");
    const detailsToggle = document.getElementById("details-toggle");
    const details = document.getElementById("details");
    expect(layout).toBeTruthy();
    expect(splitter).toBeTruthy();
    expect(detailsToggle).toBeTruthy();

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(details?.classList.contains("details--collapsed")).toBe(true);
    expect(layout?.classList.contains("layout--split-disabled")).toBe(true);
    expect(splitter?.getAttribute("aria-disabled")).toBe("true");
    expect(splitter?.tabIndex).toBe(-1);
  });

  it("keeps splitter enabled in horizontal layout even when collapsed", () => {
    const { dom } = bootstrapWebview(false);
    const document = dom.window.document;
    const layout = document.getElementById("layout");
    const splitter = document.getElementById("splitter");
    const detailsToggle = document.getElementById("details-toggle");

    detailsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(layout?.classList.contains("layout--split-disabled")).toBe(false);
    expect(layout?.classList.contains("layout--horizontal")).toBe(true);
    expect(splitter?.getAttribute("aria-disabled")).toBe("false");
    expect(splitter?.tabIndex).toBe(0);
    expect((splitter as HTMLElement | null)?.style.display).toBe("none");
  });

  it("contains CSS rules for split-disabled and collapsed action anchoring", () => {
    const css = readCssBundle("media/main.css");
    const bodyRule = getCssRule(css, "body");
    const layoutRules = getCssRules(css, ".layout");
    const layoutRule = layoutRules.find((rule) => rule.includes("flex: 1 1 0;")) || "";
    const layoutOverflowRule = layoutRules.find((rule) => rule.includes("overflow: hidden;")) || "";
    const stackedRule = getCssRule(css, ".layout--stacked");
    const horizontalRule = getCssRule(css, ".layout--horizontal");
    const activityPanelRule = getCssRule(css, ".activity-panel");
    const activityPanelListRule = getCssRule(css, ".activity-panel__list");
    const detailsRules = getCssRules(css, ".details");
    const detailsRule = detailsRules.find((rule) => rule.includes("grid-template-rows: auto minmax(0, 1fr) auto;")) || "";
    const detailsBodyRule = getCssRule(css, ".details__body");
    const detailsActionsRules = getCssRules(css, ".details__actions");
    const detailsActionsRule = detailsActionsRules.find((rule) => rule.includes("align-self: end;")) || "";
    const splitDisabledRule = getCssRule(css, ".layout--stacked.layout--split-disabled .splitter");
    const horizontalSplitterRule = getCssRule(css, ".layout--horizontal .splitter");
    const stackedSplitterRule = getCssRule(css, ".layout--stacked .splitter");
    const collapsedActionsRule = getCssRule(css, ".details--collapsed .details__actions");
    const collapsedDetailsRules = getCssRules(css, ".details--collapsed");
    const collapsedDetailsRule = collapsedDetailsRules.find((rule) => rule.includes("grid-template-rows: auto;")) || "";
    const horizontalMainRule = getCssRule(css, ".layout--horizontal .layout__main");
    const horizontalDetailsRule = getCssRule(css, ".layout--horizontal .details");
    const stackedDetailsRule = getCssRule(css, ".layout--stacked .details");
    const boardRules = getCssRules(css, ".board");
    const boardRule = boardRules.find((rule) => rule.includes("--board-column-width: 260px;")) || "";
    const columnRule = getCssRule(css, ".column");

    expect(bodyRule.includes("display: flex;")).toBe(true);
    expect(bodyRule.includes("flex-direction: column;")).toBe(true);
    expect(bodyRule.includes("height: 100vh;")).toBe(true);
    expect(bodyRule.includes("max-height: 100vh;")).toBe(true);
    expect(bodyRule.includes("overflow: hidden;")).toBe(true);
    expect(layoutRule.includes("flex: 1 1 0;")).toBe(true);
    expect(layoutRule.includes("max-height: 100%;")).toBe(true);
    expect(layoutOverflowRule.includes("overflow: hidden;")).toBe(true);
    expect(css.includes("height: calc(100vh - 42px);")).toBe(false);
    expect(stackedRule.includes("flex-direction: column;")).toBe(true);
    expect(horizontalRule.includes("flex-direction: row;")).toBe(true);
    expect(activityPanelRule.includes("flex: 1 1 auto;")).toBe(true);
    expect(activityPanelRule.includes("min-height: 0;")).toBe(true);
    expect(activityPanelRule.includes("overflow: hidden;")).toBe(true);
    expect(activityPanelListRule.includes("overflow: auto;")).toBe(true);
    expect(detailsRule.includes("position: relative;")).toBe(true);
    expect(detailsRule.includes("bottom: auto;")).toBe(true);
    expect(detailsRule.includes("overflow: hidden;")).toBe(true);
    expect(detailsRule.includes("display: grid;")).toBe(true);
    expect(detailsRule.includes("grid-template-rows: auto minmax(0, 1fr) auto;")).toBe(true);
    expect(detailsBodyRule.includes("overflow-y: auto;")).toBe(true);
    expect(detailsBodyRule.includes("overflow-x: hidden;")).toBe(true);
    expect(detailsBodyRule.includes("min-height: 0;")).toBe(true);
    expect(detailsActionsRule.includes("align-self: end;")).toBe(true);
    expect(detailsActionsRule.includes("border-top: 1px solid")).toBe(true);
    expect(splitDisabledRule.includes("display: none")).toBe(true);
    expect(horizontalSplitterRule.includes("display: none")).toBe(true);
    expect(stackedSplitterRule.includes("position: absolute;")).toBe(true);
    expect(collapsedActionsRule.includes("display: none;")).toBe(true);
    expect(collapsedDetailsRule.includes("grid-template-rows: auto;")).toBe(true);
    expect(horizontalMainRule.includes("min-height: 0;")).toBe(true);
    expect(horizontalDetailsRule.includes("flex: 0 0 300px;")).toBe(true);
    expect(horizontalDetailsRule.includes("min-height: 0;")).toBe(true);
    expect(stackedDetailsRule.includes("position: absolute;")).toBe(true);
    expect(stackedDetailsRule.includes("bottom: 0;")).toBe(true);
    expect(stackedDetailsRule.includes("min-height: 220px;")).toBe(true);
    expect(stackedDetailsRule.includes("overflow: hidden;")).toBe(true);
    expect(stackedDetailsRule.includes("z-index: 2;")).toBe(true);
    expect(boardRule.includes("--board-column-width: 260px;")).toBe(true);
    expect(columnRule.includes("flex: 0 0 var(--board-column-width);")).toBe(true);
    expect(columnRule.includes("width: var(--board-column-width);")).toBe(true);
    expect(columnRule.includes("min-width: var(--board-column-width);")).toBe(true);
  });

  it("allows long detail titles and ids to wrap without ellipsis overflow", () => {
    const css = readCssBundle("media/main.css");
    const headerTitleRule = css.match(/\.details__header-title\s*\{[^}]+\}/)?.[0] || "";
    const nameValueRule = css.match(/\.details__name-value\s*\{[^}]+\}/)?.[0] || "";

    expect(headerTitleRule.includes("white-space: normal;")).toBe(true);
    expect(headerTitleRule.includes("overflow-wrap: anywhere;")).toBe(true);
    expect(headerTitleRule.includes("text-overflow: ellipsis;")).toBe(false);
    expect(nameValueRule.includes("overflow-wrap: anywhere;")).toBe(true);
    expect(nameValueRule.includes("word-break: break-word;")).toBe(true);
  });

  it("keeps board columns and cards from widening on long supporting-doc text", () => {
    const css = readCssBundle("media/main.css");
    const boardRules = css.match(/\.board\s*\{[^}]+\}/g) || [];
    const boardRule = boardRules.find((rule) => rule.includes("overflow-x: auto;")) || "";
    const hiddenBoardRule = getCssRule(css, ".board[hidden]");
    const boardListRule = css.match(/\.board--list\s*\{[^}]+\}/)?.[0] || "";
    const columnRule = css.match(/\.column\s*\{[^}]+\}/)?.[0] || "";
    const cardRule = css.match(/\.card\s*\{[^}]+\}/)?.[0] || "";
    const titleRule = css.match(/\.card__title\s*\{[^}]+\}/)?.[0] || "";
    const metaRule = css.match(/\.card__meta\s*\{[^}]+\}/)?.[0] || "";

    expect(boardRule.includes("overflow-x: auto;")).toBe(true);
    expect(boardRule.includes("overflow-y: hidden;")).toBe(true);
    expect(hiddenBoardRule.includes("display: none !important;")).toBe(true);
    expect(boardListRule.includes("overflow-y: auto;")).toBe(true);
    expect(columnRule.includes("min-inline-size: 0;")).toBe(true);
    expect(cardRule.includes("min-width: 0;")).toBe(true);
    expect(cardRule.includes("overflow: hidden;")).toBe(true);
    expect(titleRule.includes("overflow-wrap: anywhere;")).toBe(true);
    expect(metaRule.includes("overflow-wrap: anywhere;")).toBe(true);
  });

  it("keeps detail indicators in a stable two-column grid for long labels and values", () => {
    const css = readCssBundle("media/main.css");
    const indicatorRule = css.match(/\.details__reference,\s*\.details__indicator\s*\{[^}]+\}/)?.[0] || "";
    const indicatorLabelRule = css.match(/\.details__indicator-label,\s*\.details__reference > div\s*\{[^}]+\}/)?.[0] || "";
    const indicatorValueRule =
      css.match(/\.details__indicator-value,\s*\.details__reference > span\s*\{[^}]+\}/)?.[0] || "";
    const detailsBodyRule = css.match(/\.details__body\s*\{[^}]+\}/)?.[0] || "";
    const indicatorActionsRule = css.match(/\.details__indicator-actions\s*\{[^}]+\}/)?.[0] || "";

    expect(indicatorRule.includes("display: grid;")).toBe(true);
    expect(indicatorRule.includes("grid-template-columns: minmax(96px, 116px) minmax(0, 1fr);")).toBe(true);
    expect(indicatorLabelRule.includes("overflow-wrap: normal;")).toBe(true);
    expect(indicatorLabelRule.includes("word-break: normal;")).toBe(true);
    expect(indicatorValueRule.includes("text-align: left;")).toBe(true);
    expect(indicatorValueRule.includes("justify-self: stretch;")).toBe(true);
    expect(indicatorValueRule.includes("display: flex;")).toBe(true);
    expect(indicatorValueRule.includes("flex-direction: column;")).toBe(true);
    expect(indicatorValueRule.includes("overflow-wrap: anywhere;")).toBe(true);
    expect(detailsBodyRule.includes("overflow-x: hidden;")).toBe(true);
    expect(detailsBodyRule.includes("overflow-y: auto;")).toBe(true);
    expect(indicatorActionsRule.includes("display: flex;")).toBe(true);
    expect(indicatorActionsRule.includes("flex-wrap: wrap;")).toBe(true);
  });

  it("clears splitter dragging state when switching from stacked to horizontal layout", () => {
    const { dom, setStacked } = bootstrapWebview(true);
    const document = dom.window.document;
    const splitter = document.getElementById("splitter");

    splitter?.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true, cancelable: true }));
    expect(splitter?.classList.contains("splitter--dragging")).toBe(true);
    expect(document.body.classList.contains("is-resizing")).toBe(true);

    setStacked(false);

    expect(splitter?.classList.contains("splitter--dragging")).toBe(false);
    expect(document.body.classList.contains("is-resizing")).toBe(false);
    expect((splitter as HTMLElement | null)?.style.display).toBe("none");
  });

  it("keeps stacked split sizing stable when activity replaces the main pane", () => {
    const { dom } = bootstrapWebview(true);
    const document = dom.window.document;
    const details = document.getElementById("details") as HTMLElement | null;
    const splitter = document.getElementById("splitter") as HTMLElement | null;
    const activityToggle = document.getElementById("activity-toggle");

    expect(details?.style.height).toBe("234px");
    expect(splitter?.style.bottom).toBe("234px");

    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(details?.style.height).toBe("234px");
    expect(splitter?.style.bottom).toBe("234px");
  });

  it("sizes stacked details from the active main pane instead of the hidden board", () => {
    const { dom, setBoardContentHeight } = bootstrapWebview(true);
    const document = dom.window.document;
    const details = document.getElementById("details") as HTMLElement | null;
    const splitter = document.getElementById("splitter") as HTMLElement | null;
    const activityToggle = document.getElementById("activity-toggle");

    setBoardContentHeight(140);
    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(details?.style.height).toBe("234px");
    expect(splitter?.style.bottom).toBe("234px");
  });
});
