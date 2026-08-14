/**
 * Regression tests for item_767, item_768 and item_769.
 *
 * Two halves, because neither alone is load-bearing:
 *
 * - The check logic is exercised against a fixture that carries the defect, so a check
 *   that stops detecting colour-only state fails here.
 * - The product's own stylesheet is asserted directly, because jsdom applies no
 *   stylesheet: a check run under jsdom sees no border-left-style at all and would pass
 *   against a product that had gone back to hue alone. That is the same gap item_737
 *   shipped through, and the same fix -- assert the file.
 */
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs helper shared with the campaign script
import { layoutChecks } from "./helpers/viewer-layout-checks.mjs";

const boardCss = readFileSync("clients/shared-web/media/css/board.css", "utf8");

function checkNamed(html: string, name: string) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { pretendToBeVisual: true });
  const { window } = dom;
  // jsdom lays nothing out, so every element reports a zero box and the checks' own
  // `visible()` would skip all of them. The fixtures need a size to be looked at.
  window.Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, width: 120, height: 20, right: 120, bottom: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
  const check = layoutChecks(window).find((entry: { name: string }) => entry.name === name);
  if (!check) throw new Error(`no check named ${name}`);
  return check;
}

describe("the campaign fails on colour-only state", () => {
  const NAME = "no state is carried by colour alone";

  it("catches two states that differ only in colour", () => {
    // The defect item_767 exists to prevent: green against red, the pairing colour vision
    // deficiency most commonly affects, with nothing else telling the two apart.
    const check = checkNamed(`
      <span class="gate gate--passed" style="color: #22c55e">gate</span>
      <span class="gate gate--failed" style="color: #ef4444">gate</span>
    `, NAME);
    expect(() => check.run()).toThrow(/differ only in colour/);
  });

  it("accepts states told apart by the accent's shape", () => {
    // The channel item_767 decided: the accent bar's style and width, which survive
    // greyscale and cost no horizontal space on a phone.
    const check = checkNamed(`
      <span class="gate gate--passed" style="color: #22c55e; border-left-style: solid; border-left-width: 2px">gate</span>
      <span class="gate gate--failed" style="color: #ef4444; border-left-style: double; border-left-width: 6px">gate</span>
    `, NAME);
    expect(() => check.run()).not.toThrow();
  });

  it("accepts states told apart by what they say", () => {
    const check = checkNamed(`
      <span class="job job--passing" style="color: #22c55e">passing</span>
      <span class="job job--failing" style="color: #ef4444">failing</span>
    `, NAME);
    expect(() => check.run()).not.toThrow();
  });

  it("does not compare states from different components", () => {
    // A CI badge and a board card are never on screen as a pair to be told apart, so
    // requiring them to differ would fail runs over a distinction nobody has to make.
    const check = checkNamed(`
      <span class="job job--failing" style="color: #ef4444"></span>
      <span class="gate gate--failed" style="color: #ef4444"></span>
    `, NAME);
    expect(() => check.run()).not.toThrow();
  });

  it("says nothing about a component showing only one state", () => {
    const check = checkNamed(`<span class="gate gate--passed" style="color: #22c55e"></span>`, NAME);
    expect(check.run()).toContain("1 state(s)");
  });
});

describe("the campaign fails on an unreachable control", () => {
  const NAME = "every control can be reached from the keyboard";

  it("catches a control that only answers to a pointer", () => {
    const check = checkNamed(`<div data-action="promote">Promote</div>`, NAME);
    expect(() => check.run()).toThrow(/cannot be reached from the keyboard/);
  });

  it("catches a natively focusable control taken out of the tab order", () => {
    // The subtler shape: a real button, reachable by construction, opted out by hand.
    const check = checkNamed(`<button data-action="promote" tabindex="-1">Promote</button>`, NAME);
    expect(() => check.run()).toThrow(/cannot be reached from the keyboard/);
  });

  it("accepts a button, and a div given a tab stop", () => {
    const check = checkNamed(`
      <button data-action="promote">Promote</button>
      <div role="button" tabindex="0">Fold</div>
    `, NAME);
    expect(() => check.run()).not.toThrow();
  });

  it("says nothing about a control that is disabled", () => {
    // A disabled control is not reachable and should not be: the check that owns it is
    // "a disabled action says why", which is a different question.
    const check = checkNamed(`<button data-action="promote" disabled>Promote</button>`, NAME);
    expect(check.run()).toContain("0 keyboard-reachable");
  });
});

describe("the board's own status accents carry shape", () => {
  it("gives each status a distinct accent, not only a distinct colour", () => {
    // Asserted against the stylesheet because jsdom applies none: a check that only ran
    // under jsdom would pass against a product drawing five states in five hues and one
    // shape. The pairs below are (border-left-style, border-left-width).
    const shapes = new Map<string, string>();
    for (const status of ["blocked", "progress", "ready", "draft", "done"]) {
      const start = boardCss.indexOf(`.card--status-${status} {`);
      expect(start, `no accent rule for ${status}`).toBeGreaterThan(-1);
      const body = boardCss.slice(start, boardCss.indexOf("}", start));
      const style = /border-left-style:\s*([a-z]+)/.exec(body)?.[1] || "solid";
      const width = /border-left-width:\s*([0-9]+px)/.exec(body)?.[1] || "5px";
      shapes.set(status, `${style} ${width}`);
    }
    // Every status distinguishable from every other with hue removed.
    expect(new Set(shapes.values()).size).toBe(shapes.size);
  });
});

describe("focus moves in, returns out, and is visible", () => {
  function modalIn(html: string) {
    const dom = new JSDOM(`<!doctype html><body>${html}</body>`);
    const globals = globalThis as Record<string, unknown>;
    const previous = {
      document: globals.document, HTMLElement: globals.HTMLElement, HTMLButtonElement: globals.HTMLButtonElement
    };
    globals.document = dom.window.document;
    globals.HTMLElement = dom.window.HTMLElement;
    globals.HTMLButtonElement = dom.window.HTMLButtonElement;
    return { dom, restore: () => Object.assign(globals, previous) };
  }

  it("hands focus back to whatever opened the modal", async () => {
    // Without this it falls to the body, so a keyboard operator who cancels lands at the
    // top of the page and tabs back to where they were -- every time.
    // @ts-expect-error -- plain .js module
    const { createThemedModal, closeThemedModal } = await import("../clients/viewer/src/browser-host/util.js");
    const { dom, restore } = modalIn(`<button id="opener">New</button>`);
    const opener = dom.window.document.getElementById("opener")!;
    opener.focus();
    const modal = createThemedModal({ title: "T", message: "" });
    closeThemedModal(modal);
    restore();
    expect(dom.window.document.activeElement?.id).toBe("opener");
  });

  it("does not throw when whatever opened it has gone", async () => {
    // @ts-expect-error -- plain .js module
    const { createThemedModal, closeThemedModal } = await import("../clients/viewer/src/browser-host/util.js");
    const { dom, restore } = modalIn(`<button id="opener">New</button>`);
    const opener = dom.window.document.getElementById("opener")!;
    opener.focus();
    const modal = createThemedModal({ title: "T", message: "" });
    opener.remove();
    expect(() => closeThemedModal(modal)).not.toThrow();
    restore();
  });

  it("gives every focusable control a ring, not the twenty somebody remembered", () => {
    // Asserted on the stylesheet: the rule is a bare `:focus-visible`, so the control
    // added tomorrow is covered without anyone editing anything.
    const css = readFileSync("clients/viewer/viewer.css", "utf8");
    const rule = /(^|\n):focus-visible \{([^}]*)\}/.exec(css);
    expect(rule, "no global focus-visible rule").not.toBeNull();
    expect(rule![2]).toContain("outline");
    // `:focus` would draw a ring on a pointer click, which is why it is not that.
    expect(css).not.toMatch(/(^|\n):focus \{/);
  });
});
