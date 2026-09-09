/**
 * Regression test for item_882: an open Review surface refreshes in place.
 *
 * F6 was reported as a suspicion and confirmed here. `refreshViewer` only re-rendered
 * Review when `isReviewOpen()` was true, and that predicate also required the document
 * title to read "Review". Review renders into its own surface panel and nothing in the
 * host ever sets that title, so the branch was unreachable: the timeline only reloaded
 * when the operator left the surface and came back.
 *
 * The predicate is lifted out of the host and run against a DOM rather than asserted as
 * a string, so it is the behaviour that is checked, not the wording.
 */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const source = readFileSync("clients/viewer/src/browser-host/index.js", "utf8");

function liftedIsReviewOpen(dom: JSDOM): () => boolean {
  const start = source.indexOf("function isReviewOpen()");
  expect(start).toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf("\n  }", start) + 4);
  return new Function("document", "HTMLElement", `${body}; return isReviewOpen;`)(
    dom.window.document,
    dom.window.HTMLElement
  ) as () => boolean;
}

function reviewDom(options: { surface: string; panel: string; documentTitle?: string }) {
  return new JSDOM(
    `<!doctype html><body data-viewer-surface="${options.surface}">
      <h1 id="viewer-document-title">${options.documentTitle ?? "Some document"}</h1>
      <section id="review-panel">${options.panel}</section>
    </body>`
  );
}

describe("an open Review surface is recognised by the refresh loop", () => {
  it("is open when Review is showing, whatever the document title says", () => {
    const dom = reviewDom({ surface: "review", panel: "<ol class='review'><li>burst</li></ol>" });

    expect(liftedIsReviewOpen(dom)()).toBe(true);
  });

  it("is not open on another surface", () => {
    const dom = reviewDom({ surface: "project", panel: "<ol class='review'><li>burst</li></ol>" });

    expect(liftedIsReviewOpen(dom)()).toBe(false);
  });

  it("is not open before the timeline has rendered anything", () => {
    const dom = reviewDom({ surface: "review", panel: "" });

    expect(liftedIsReviewOpen(dom)()).toBe(false);
  });

  it("still drives the Review branch of refreshViewer", () => {
    const branch = source.slice(source.indexOf("async function refreshViewer("));
    expect(branch.slice(0, branch.indexOf("\n  }"))).toContain("isReviewOpen()");
  });
});
