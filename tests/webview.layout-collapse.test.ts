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
        <div id="tools-panel"></div>
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
        <button data-action="refresh"></button>
        <button data-action="select-agent"></button>
        <button data-action="new-request-guided"></button>
        <button data-action="change-project-root"></button>
        <button data-action="reset-project-root"></button>
        <button data-action="fix-docs"></button>
        <button data-action="promote"></button>
        <button data-action="open"></button>
        <button data-action="read"></button>
        <input id="hide-complete" type="checkbox" />
        <input id="hide-processed-requests" type="checkbox" />
        <input id="hide-spec" type="checkbox" />
        <div id="layout" class="layout">
          <div id="board"></div>
          <div id="splitter" role="separator"></div>
          <aside id="details" class="details">
            <div id="details-title"></div>
            <button id="details-toggle" aria-expanded="true"></button>
            <div id="details-body"></div>
          </aside>
        </div>
        <div id="help-banner"><div id="help-banner-copy"></div><button id="help-banner-dismiss" type="button"></button></div>
        <div id="activity-panel"></div>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
  const postedMessages: Array<{ type?: string }> = [];
  const state = {};

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

  return { dom, postedMessages, setStacked };
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
    const layoutRule = layoutRules.find((rule) => rule.includes("flex: 1 1 auto;")) || "";
    const stackedRule = getCssRule(css, ".layout--stacked");
    const horizontalRule = getCssRule(css, ".layout--horizontal");
    const splitDisabledRule = getCssRule(css, ".layout--stacked.layout--split-disabled .splitter");
    const horizontalSplitterRule = getCssRule(css, ".layout--horizontal .splitter");
    const collapsedActionsRule = getCssRule(css, ".details--collapsed .details__actions");
    const stackedDetailsRule = getCssRule(css, ".layout--stacked .details");

    expect(bodyRule.includes("display: flex;")).toBe(true);
    expect(bodyRule.includes("flex-direction: column;")).toBe(true);
    expect(bodyRule.includes("overflow: hidden;")).toBe(true);
    expect(layoutRule.includes("flex: 1 1 auto;")).toBe(true);
    expect(css.includes("height: calc(100vh - 42px);")).toBe(false);
    expect(stackedRule.includes("flex-direction: column;")).toBe(true);
    expect(horizontalRule.includes("flex-direction: row;")).toBe(true);
    expect(splitDisabledRule.includes("display: none")).toBe(true);
    expect(horizontalSplitterRule.includes("display: none")).toBe(true);
    expect(collapsedActionsRule.length).toBeGreaterThan(0);
    expect(stackedDetailsRule.includes("position: relative;")).toBe(true);
    expect(stackedDetailsRule.includes("bottom: auto;")).toBe(true);
    expect(stackedDetailsRule.includes("z-index: 2;")).toBe(true);
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
    const boardListRule = css.match(/\.board--list\s*\{[^}]+\}/)?.[0] || "";
    const columnRule = css.match(/\.column\s*\{[^}]+\}/)?.[0] || "";
    const cardRule = css.match(/\.card\s*\{[^}]+\}/)?.[0] || "";
    const titleRule = css.match(/\.card__title\s*\{[^}]+\}/)?.[0] || "";
    const metaRule = css.match(/\.card__meta\s*\{[^}]+\}/)?.[0] || "";

    expect(boardRule.includes("overflow-x: auto;")).toBe(true);
    expect(boardRule.includes("overflow-y: hidden;")).toBe(true);
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

    expect(indicatorRule.includes("display: grid;")).toBe(true);
    expect(indicatorRule.includes("grid-template-columns: minmax(96px, 116px) minmax(0, 1fr);")).toBe(true);
    expect(indicatorLabelRule.includes("overflow-wrap: normal;")).toBe(true);
    expect(indicatorLabelRule.includes("word-break: normal;")).toBe(true);
    expect(indicatorValueRule.includes("text-align: left;")).toBe(true);
    expect(indicatorValueRule.includes("justify-self: stretch;")).toBe(true);
    expect(indicatorValueRule.includes("overflow-wrap: anywhere;")).toBe(true);
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
});
