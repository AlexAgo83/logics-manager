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

function bootstrapWebview(stacked: boolean) {
  const html = `
    <!doctype html>
    <html>
      <body>
        <button id="filter-toggle"></button>
        <div id="filter-panel"></div>
        <button id="tools-toggle"></button>
        <div id="tools-panel"></div>
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
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/" });
  const postedMessages: Array<{ type?: string }> = [];
  const state = {};

  let mediaMatches = stacked;
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  const mediaQuery = {
    get matches() {
      return mediaMatches;
    },
    addEventListener: (_type: string, callback: (event: { matches: boolean }) => void) => {
      listeners.push(callback);
    },
    removeEventListener: () => undefined,
    addListener: (callback: (event: { matches: boolean }) => void) => {
      listeners.push(callback);
    },
    removeListener: () => undefined
  };

  Object.defineProperty(dom.window, "matchMedia", {
    value: () => mediaQuery
  });

  Object.defineProperty(dom.window, "acquireVsCodeApi", {
    value: () => ({
      postMessage: (message: { type?: string }) => postedMessages.push(message),
      getState: () => state,
      setState: () => undefined
    })
  });

  const modelScript = fs.readFileSync(path.resolve(process.cwd(), "media/logicsModel.js"), "utf8");
  const hostApiScript = fs.readFileSync(path.resolve(process.cwd(), "media/hostApi.js"), "utf8");
  const renderBoardScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderBoard.js"), "utf8");
  const renderDetailsScript = fs.readFileSync(path.resolve(process.cwd(), "media/renderDetails.js"), "utf8");
  const mainScript = fs.readFileSync(path.resolve(process.cwd(), "media/main.js"), "utf8");
  dom.window.eval(modelScript);
  dom.window.eval(hostApiScript);
  dom.window.eval(renderBoardScript);
  dom.window.eval(renderDetailsScript);
  dom.window.eval(mainScript);

  const setStacked = (nextValue: boolean) => {
    mediaMatches = nextValue;
    listeners.forEach((callback) => callback({ matches: nextValue }));
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
    expect(css.includes(".layout--stacked.layout--split-disabled .splitter")).toBe(true);
    expect(css.includes(".layout--horizontal .splitter")).toBe(true);
    expect(css.includes(".details--collapsed .details__actions")).toBe(true);
    expect(css.includes(".layout--stacked .details")).toBe(true);
    expect(css.includes("z-index: 2;")).toBe(true);
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
