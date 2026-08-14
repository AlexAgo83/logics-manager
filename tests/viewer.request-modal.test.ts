/**
 * Regression tests for item_763: the three things the new-request modal was missing.
 *
 * The path test is a drift gate, not an example test. The naming rule now exists twice --
 * `_slugify_viewer_doc` in logics_manager/viewer.py and `slugifyViewerDoc` in the browser
 * host -- and a modal that states a path the backend does not use is worse than one that
 * states nothing, because the operator has no reason to doubt it. Both are run against
 * the same inputs here, so a change to either one alone fails.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js module shared with the browser host bundle
import { slugifyViewerDoc, previewRequestPath } from "../clients/viewer/src/browser-host/util.js";

const CASES = [
  "Make the reader readable",
  "  leading and trailing  ",
  "Punctuation: it's here, isn't it?",
  "MiXeD CaSe",
  "accents éàü and symbols ©",
  "___underscores___",
  "!!!",
  "a".repeat(120),
  "one--two__three  four"
];

function pythonSlugs(values: string[]): string[] {
  const script = [
    "import json,sys",
    "from logics_manager.viewer import _slugify_viewer_doc",
    "print(json.dumps([_slugify_viewer_doc(v) for v in json.loads(sys.argv[1])]))"
  ].join("\n");
  const raw = execFileSync("python3", ["-c", script, JSON.stringify(values)], { encoding: "utf-8" });
  return JSON.parse(raw);
}

describe("the modal states where the document will be written", () => {
  it("slugs a title exactly the way the backend does", () => {
    expect(CASES.map((value) => slugifyViewerDoc(value))).toEqual(pythonSlugs(CASES));
  });

  it("falls back to the first line of the need, as the backend does", () => {
    // Not a convenience added here: the backend derives the title from the need when the
    // title is blank, and a modal silent in that case is silent exactly when the operator
    // cannot predict the name themselves.
    expect(previewRequestPath({ title: "", intent: "Fix the board\nsecond line", nextNumber: 12 }))
      .toBe("logics/request/req_012_fix_the_board.md");
  });

  it("names the part it does not know rather than inventing it", () => {
    expect(previewRequestPath({ title: "Something", intent: "x" }))
      .toBe("logics/request/req_<next>_something.md");
  });

  it("pads the number the way a request reference is padded", () => {
    expect(previewRequestPath({ title: "Something", intent: "x", nextNumber: 7 }))
      .toBe("logics/request/req_007_something.md");
  });
});

describe("the modal's dismiss control", () => {
  it("is a glyph and not a letter", async () => {
    // @ts-expect-error -- plain .js module
    const { createThemedModal } = await import("../clients/viewer/src/browser-host/util.js");
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM("<!doctype html><body></body>");
    const globals = globalThis as Record<string, unknown>;
    const previous = { document: globals.document, HTMLElement: globals.HTMLElement, HTMLButtonElement: globals.HTMLButtonElement };
    globals.document = dom.window.document;
    globals.HTMLElement = dom.window.HTMLElement;
    globals.HTMLButtonElement = dom.window.HTMLButtonElement;
    const modal = createThemedModal({ title: "T", message: "" });
    Object.assign(globals, previous);
    const close = modal.querySelector(".viewer-themed-modal__close");
    expect(close?.textContent).toBe("×");
    expect(close?.textContent).not.toBe("x");
  });
});
