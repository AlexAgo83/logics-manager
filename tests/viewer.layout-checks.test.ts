/**
 * Regression tests for item_616: the layout defect classes a passing unit suite cannot see.
 *
 * Each test introduces one defect and asserts the matching check reports it. The checks
 * under test are the same module the campaign serializes into the page, so a check that
 * passes here is the check that runs there.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs helper shared with the campaign script
import { layoutChecks } from "./helpers/viewer-layout-checks.mjs";

type Box = { left: number; top: number; width: number; height: number };

function build(html: string, boxes: Record<string, Box> = {}, innerWidth = 1440) {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { pretendToBeVisual: true });
  const { window } = dom;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
  // jsdom lays nothing out, so every element reports a zero box and would be invisible to
  // the checks. The boxes each test cares about are stated; the rest get a default one.
  for (const node of Array.from(window.document.querySelectorAll("*")) as HTMLElement[]) {
    const box = (node.id && boxes[node.id]) || { left: 0, top: 0, width: 10, height: 10 };
    node.getBoundingClientRect = () =>
      ({
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        right: box.left + box.width,
        bottom: box.top + box.height,
        x: box.left,
        y: box.top,
        toJSON: () => ({})
      }) as DOMRect;
  }
  const checks = layoutChecks(window) as { name: string; run: () => string }[];
  return {
    window,
    run: (name: string) => checks.find((check) => check.name.includes(name))!.run()
  };
}

describe("viewer layout checks", () => {
  it("reports sibling controls drawn over each other", () => {
    const collapsed = build(
      `<div><button id="a">A</button><button id="b">B</button></div>`,
      { a: { left: 0, top: 0, width: 100, height: 30 }, b: { left: 10, top: 5, width: 100, height: 30 } }
    );

    expect(() => collapsed.run("drawn over each other")).toThrow(/button#a over button#b/);

    const laidOut = build(
      `<div><button id="a">A</button><button id="b">B</button></div>`,
      { a: { left: 0, top: 0, width: 100, height: 30 }, b: { left: 110, top: 0, width: 100, height: 30 } }
    );

    expect(laidOut.run("drawn over each other")).toContain("1 sibling pair(s) checked");
  });

  it("does not report controls that overlap across layers", () => {
    // An open panel over the board is the design, not a defect.
    const layered = build(
      `<div id="board"><button id="a">A</button></div><div id="panel"><button id="b">B</button></div>`,
      { a: { left: 0, top: 0, width: 100, height: 30 }, b: { left: 10, top: 5, width: 100, height: 30 } }
    );

    expect(() => layered.run("drawn over each other")).not.toThrow();
  });

  it("reports a control clipped outside the viewport", () => {
    const clipped = build(
      `<div><button id="a">A</button></div>`,
      { a: { left: 900, top: 0, width: 200, height: 30 } },
      820
    );

    expect(() => clipped.run("clipped outside")).toThrow(/button#a spans 900-1100 in 820/);
  });

  it("does not report a control reachable by scrolling its container", () => {
    const scrolled = build(
      `<div id="rail" style="overflow-x: auto"><button id="a">A</button></div>`,
      { a: { left: 900, top: 0, width: 200, height: 30 } },
      820
    );
    const rail = scrolled.window.document.getElementById("rail")!;
    Object.defineProperty(rail, "scrollWidth", { configurable: true, value: 1200 });
    Object.defineProperty(rail, "clientWidth", { configurable: true, value: 820 });

    expect(scrolled.run("clipped outside")).toContain("nothing outside");
  });

  it("reports horizontal page scroll", () => {
    const sideways = build(`<div><button id="a">A</button></div>`);
    Object.defineProperty(sideways.window.document.documentElement, "scrollWidth", { configurable: true, value: 1600 });
    Object.defineProperty(sideways.window.document.documentElement, "clientWidth", { configurable: true, value: 1440 });

    expect(() => sideways.run("scroll sideways")).toThrow(/160px of horizontal overflow/);
  });

  it("reports an empty surface with no explanation", () => {
    const bare = build(`<div id="board"></div>`, { board: { left: 0, top: 0, width: 400, height: 300 } });

    expect(() => bare.run("empty surface")).toThrow(/rendered empty with no explanation/);

    const explained = build(
      `<div id="board">Nothing matches this filter.</div>`,
      { board: { left: 0, top: 0, width: 400, height: 300 } }
    );

    expect(explained.run("empty surface")).toContain("no unexplained empty surface");
  });

  it("reports a disabled action that does not say why", () => {
    const silent = build(`<div><button id="a" disabled>A</button></div>`);

    expect(() => silent.run("disabled action")).toThrow(/button#a unavailable without stating why/);

    const explained = build(`<div><button id="a" disabled title="No document selected">A</button></div>`);

    expect(explained.run("disabled action")).toContain("1 disabled control(s)");
  });

  it("walks the interface rather than a hand-written list of surfaces", () => {
    // A control added later is covered without editing the check: the same defect is
    // reported under a container the check has never heard of.
    const added = build(
      `<section id="brand-new-surface"><button id="a">A</button><button id="b">B</button></section>`,
      { a: { left: 0, top: 0, width: 100, height: 30 }, b: { left: 10, top: 5, width: 100, height: 30 } }
    );

    expect(() => added.run("drawn over each other")).toThrow(/button#a over button#b/);
  });
});
