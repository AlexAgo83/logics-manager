/**
 * Regression test for item_880: the Activity / Project / Review selector must show the
 * surface that is actually rendered.
 *
 * Adding or switching a project goes through `returnToProjectSurface`, which used to
 * change the body state without repainting the selector -- so the content moved and the
 * highlight stayed behind. The selector is now derived from the rendered surface, which
 * is what both paths assert here.
 */
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js modules shared with the browser host bundle
import { syncSurfaceSelector, viewerSurface } from "../clients/viewer/src/browser-host/util.js";
// @ts-expect-error -- plain .js modules shared with the browser host bundle
import { returnToProjectSurface } from "../clients/viewer/src/browser-host/render.js";

const globals = globalThis as Record<string, unknown>;
let restore: Record<string, unknown> | null = null;

function selectorDom(activeSurface: string) {
  const dom = new JSDOM(
    `<!doctype html><body data-viewer-surface="${activeSurface}">
      <div id="activity-panel"${activeSurface === "activity" ? "" : " hidden"}></div>
      <button id="activity-toggle" type="button" role="tab" data-viewer-surface="activity" aria-selected="${activeSurface === "activity"}" class="${activeSurface === "activity" ? "is-active" : ""}">Activity</button>
      <button type="button" role="tab" data-viewer-surface="project" aria-selected="${activeSurface === "project"}" class="${activeSurface === "project" ? "is-active" : ""}">Project</button>
      <button type="button" role="tab" data-viewer-surface="review" aria-selected="${activeSurface === "review"}" class="${activeSurface === "review" ? "is-active" : ""}">Review</button>
    </body>`,
    { pretendToBeVisual: true }
  );
  restore = { document: globals.document, HTMLElement: globals.HTMLElement };
  globals.document = dom.window.document;
  globals.HTMLElement = dom.window.HTMLElement;
  return dom;
}

function selection(dom: JSDOM) {
  return Array.from(dom.window.document.querySelectorAll("button[data-viewer-surface]")).map((node) => ({
    surface: node.getAttribute("data-viewer-surface"),
    selected: node.getAttribute("aria-selected"),
    active: node.classList.contains("is-active")
  }));
}

afterEach(() => {
  if (restore) {
    Object.assign(globals, restore);
    restore = null;
  }
});

describe("the surface selector follows the rendered surface", () => {
  it("highlights exactly one tab, and never the stale one", () => {
    const dom = selectorDom("review");

    syncSurfaceSelector("activity");

    expect(selection(dom)).toEqual([
      { surface: "activity", selected: "true", active: true },
      { surface: "project", selected: "false", active: false },
      { surface: "review", selected: "false", active: false }
    ]);
  });

  it("repaints the selector when a project change returns to Project", () => {
    const dom = selectorDom("activity");
    expect(selection(dom)[0]).toEqual({ surface: "activity", selected: "true", active: true });

    returnToProjectSurface();

    expect(viewerSurface()).toBe("project");
    expect(selection(dom).filter((entry) => entry.active).map((entry) => entry.surface)).toEqual(["project"]);
    expect(selection(dom).filter((entry) => entry.selected === "true").map((entry) => entry.surface)).toEqual(["project"]);
  });

  it("follows the panel that is mounted, not the body's claim about it", () => {
    // The defect this file failed to catch the first time: the Activity feed was on
    // screen while the body still said "project", so the selector lit Project over an
    // Activity screen. Asserting aria-selected alone missed it, because that attribute
    // was consistent -- with the wrong surface.
    const dom = selectorDom("activity");
    dom.window.document.body.dataset.viewerSurface = "project";

    syncSurfaceSelector();

    expect(viewerSurface()).toBe("activity");
    expect(selection(dom).filter((entry) => entry.active).map((entry) => entry.surface)).toEqual(["activity"]);
  });

  it("uses the body only once the panel is closed", () => {
    const dom = selectorDom("activity");
    dom.window.document.getElementById("activity-panel")!.hidden = true;
    dom.window.document.body.dataset.viewerSurface = "review";

    syncSurfaceSelector();

    expect(viewerSurface()).toBe("review");
    expect(selection(dom).filter((entry) => entry.active).map((entry) => entry.surface)).toEqual(["review"]);
  });

  it("derives the highlight from the body when called with no argument", () => {
    const dom = selectorDom("project");
    dom.window.document.body.dataset.viewerSurface = "review";
    expect(dom.window.document.getElementById("activity-panel")!.hidden).toBe(true);

    syncSurfaceSelector();

    expect(selection(dom).filter((entry) => entry.selected === "true").map((entry) => entry.surface)).toEqual(["review"]);
  });
});
