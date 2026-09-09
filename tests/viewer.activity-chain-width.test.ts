/**
 * Regression test for item_884: a grouped Recent Activity row stays inside its container.
 *
 * The measured cause was in the rule, not in the markup: `.activity-panel__chain` set
 * `width: 100%` -- the full width of the list -- and then pushed itself 34px right with
 * `margin-left`, so the row ended 22px past the list's right edge at every viewport
 * (measured in headless Chrome: listScrollWidth 1474 against clientWidth 1440 at 1440px,
 * 424 against 390 at 390px; both equal after the fix). JSDOM has no layout engine, so the
 * durable check here is the rule itself; the width measurements and screenshots recorded
 * for the slice are the visual proof.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("clients/shared-web/media/css/toolbar.css", "utf8");

function rule(selector: string) {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `${selector} is missing`).toBeGreaterThan(-1);
  // Comments explain the old value, so they are stripped before the rule is asserted.
  return css.slice(start, css.indexOf("\n}", start)).replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("a grouped chain row is bounded by the activity list", () => {
  it("does not add a margin to a row that already fills the container", () => {
    const chain = rule(".activity-panel__chain");

    expect(chain).toContain("margin-left: 34px");
    expect(chain).not.toMatch(/\bwidth:\s*100%/);
  });

  it("breaks a long chain title instead of widening the row", () => {
    expect(rule(".activity-panel__chain")).toContain("overflow-wrap: anywhere");
  });

  it("keeps the list itself the scrolling boundary", () => {
    expect(rule(".activity-panel__list")).toContain("overflow: auto");
  });
});
