/**
 * Regression tests for item_761 and item_762: the reader's identity and its reading layout.
 *
 * Both halves are covered, because each broke on its own during delivery. The identity
 * half lives partly in `clients/viewer/index.html` and partly in the stylesheet, and a
 * test that only exercised the JavaScript would stay green with the markup or the
 * uppercase rule put back -- that is exactly how item_737 shipped a screen nobody could
 * reach. So the markup and the stylesheet are asserted as files.
 */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js module shared with the browser host bundle
import { applyReadingLayout } from "../clients/viewer/src/browser-host/util.js";

const viewerHtml = readFileSync("clients/viewer/index.html", "utf8");
const viewerCss = readFileSync("clients/viewer/viewer.css", "utf8");

function readerFrom(sectionCount: number) {
  const sections = Array.from({ length: sectionCount }, (_, index) =>
    `<h2>Section ${index + 1}</h2><p>Body ${index + 1}</p>`
  ).join("");
  const dom = new JSDOM(`<!doctype html><body><div id="content">${sections}</div></body>`, {
    pretendToBeVisual: true
  });
  // The helper is browser code: it reaches for `document` to build the list and for
  // `HTMLElement` to reject anything else. Both come from this window while it runs.
  const globals = globalThis as Record<string, unknown>;
  const previous = { document: globals.document, HTMLElement: globals.HTMLElement, requestAnimationFrame: globals.requestAnimationFrame };
  globals.document = dom.window.document;
  globals.HTMLElement = dom.window.HTMLElement;
  globals.requestAnimationFrame = (callback: FrameRequestCallback) => { callback(0); return 0; };
  const content = dom.window.document.getElementById("content")!;
  const detach = applyReadingLayout(content);
  Object.assign(globals, previous);
  return { dom, content, detach };
}

describe("the reader identifies a document", () => {
  it("offers the file path through a control rather than across the header", () => {
    // item_761 moved the path off the eyebrow. If the control goes, the path has no
    // remaining route to the operator at all, which is worse than the loud eyebrow.
    expect(viewerHtml).toContain('id="viewer-document-path-copy"');
  });

  it("does not uppercase the eyebrow", () => {
    const rule = viewerCss.slice(viewerCss.indexOf(".viewer-document__eyebrow {"));
    const body = rule.slice(0, rule.indexOf("}"));
    expect(body).not.toContain("text-transform");
  });
});

describe("the reader is a place to read", () => {
  it("gives the contents rail a fixed track and the content everything else", () => {
    // item_762 capped the prose at a 72ch measure. Dropped at the operator's call: these
    // documents are as much tables, mermaid chains and code blocks as prose, and the cap
    // left most of a wide window empty. What still has to hold is the split -- a fixed
    // rail, and content that takes the rest rather than a width of its own.
    const grid = viewerCss.slice(viewerCss.indexOf(".markdown-preview--reading {"));
    const gridBody = grid.slice(0, grid.indexOf("}"));
    expect(gridBody).toContain("minmax(0, 260px) minmax(0, 1fr)");

    const prose = viewerCss.slice(viewerCss.indexOf(".markdown-preview--reading .markdown-preview__prose {"));
    expect(prose.slice(0, prose.indexOf("}"))).not.toContain("max-width");
  });

  it("lists the sections and says how many there are", () => {
    const { content } = readerFrom(5);
    const nav = content.querySelector(".markdown-preview__contents")!;
    expect(nav.querySelector(".markdown-preview__contents-title")?.textContent).toBe("5 sections");
    expect(nav.querySelectorAll(".markdown-preview__contents-list a")).toHaveLength(5);
  });

  it("leaves a short document alone", () => {
    // A contents list for two sections is a second copy of a screen you can already see
    // the end of. The measure still applies -- that is wrong at any number of headings.
    const { content } = readerFrom(2);
    expect(content.querySelector(".markdown-preview__contents")).toBeNull();
    expect(content.classList.contains("markdown-preview--reading")).toBe(true);
  });

  it("gives every listed section a target to jump to", () => {
    const { content } = readerFrom(4);
    const links = Array.from(content.querySelectorAll<HTMLAnchorElement>(".markdown-preview__contents-list a"));
    for (const link of links) {
      expect(content.querySelector(`#${link.dataset.section}`)).not.toBeNull();
    }
  });

  it("stops marking positions once the document is replaced", () => {
    // Without this the previous document's listener keeps running against headings that
    // are no longer on the screen, and every reader opened adds another one.
    const { content, detach } = readerFrom(4);
    let marks = 0;
    const originalRect = content.getBoundingClientRect.bind(content);
    content.getBoundingClientRect = () => { marks += 1; return originalRect(); };
    content.dispatchEvent(new content.ownerDocument.defaultView!.Event("scroll"));
    expect(marks).toBeGreaterThan(0);
    detach!();
    const after = marks;
    content.dispatchEvent(new content.ownerDocument.defaultView!.Event("scroll"));
    expect(marks).toBe(after);
  });
});
