/**
 * Regression tests for item_764 and item_765: what the filter panel says.
 *
 * The defect both slices fix is the panel stating numbers that are true and useless --
 * the corpus size four times over, and a count of "shown" that contradicted the screen
 * behind it. So these tests assert the wording, because the wording was the defect.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .js module shared with the browser host bundle
import { updateFilterOptionCounts } from "../clients/viewer/src/browser-host/filters.js";

type Item = { id: string; stage: string; indicators?: Record<string, string> };

function panel(items: Item[]) {
  const dom = new JSDOM(`<!doctype html><body>
    <select data-viewer-filter-group="type">
      <option value="all">All</option>
      <option value="request">Requests</option>
      <option value="backlog">Backlog</option>
      <option value="task">Tasks</option>
    </select>
    <select data-viewer-filter-group="status">
      <option value="any">Any</option>
      <option value="draft">Draft</option>
      <option value="done">Done</option>
    </select>
  </body>`);
  const globals = globalThis as Record<string, unknown>;
  const previous = { document: globals.document, HTMLSelectElement: globals.HTMLSelectElement };
  globals.document = dom.window.document;
  globals.HTMLSelectElement = dom.window.HTMLSelectElement;
  updateFilterOptionCounts({ items, filterState: { type: "all", status: "any" } });
  Object.assign(globals, previous);
  return dom.window.document;
}

const CORPUS: Item[] = [
  { id: "req_001_a", stage: "request", indicators: { Status: "Draft" } },
  { id: "req_002_b", stage: "request", indicators: { Status: "Done" } },
  { id: "item_001_c", stage: "backlog", indicators: { Status: "Draft" } }
];

describe("each filter says what it would narrow", () => {
  it("does not leave every neutral option restating the corpus size", () => {
    // The defect exactly: four collapsed controls reading `All (1574)` and `Any (1574)`
    // three times over. A neutral option's count is the corpus size by definition, so
    // the number carries nothing -- what it can carry is the dimension it is neutral about.
    const document = panel(CORPUS);
    const neutrals = Array.from(document.querySelectorAll("select"))
      .map((select) => select.options[0].textContent || "");
    expect(neutrals[0]).toContain("types");
    expect(neutrals[1]).toContain("status");
    expect(new Set(neutrals).size).toBe(neutrals.length);
    for (const label of neutrals) {
      expect(label).not.toBe(`All (${CORPUS.length})`);
      expect(label).not.toBe(`Any (${CORPUS.length})`);
    }
  });

  it("counts the choices that would actually narrow, not the ones that exist", () => {
    // "task" matches nothing in this corpus, so offering it as something to narrow by
    // would send the operator to an empty board.
    const document = panel(CORPUS);
    expect(document.querySelector("[data-viewer-filter-group='type']")?.querySelector("option")?.textContent)
      .toContain("2 to narrow by");
  });

  it("says so when a dimension has nothing to narrow by", () => {
    const document = panel([]);
    expect(document.querySelector("select")?.options[0].textContent).toContain("nothing to narrow by");
  });

  it("still counts each narrowing option", () => {
    // The per-option counts were never the problem and must survive: they are the only
    // thing telling the operator what a choice costs before making it.
    const document = panel(CORPUS);
    const requests = Array.from(document.querySelectorAll("[data-viewer-filter-group='type'] option"))
      .find((option) => (option as HTMLOptionElement).value === "request");
    expect(requests?.textContent).toBe("Requests (2)");
  });
});

describe("the panel and the board agree on what is shown", () => {
  it("does not use the word the columns use for a different number", () => {
    // item_765: the panel read `1574 of 1576 docs shown` while the columns behind it read
    // ten-of-349. Both true; one word. The panel counts what matches the filter, and the
    // columns draw a page at a time -- so the panel says "match" and names the paging.
    const source = require("node:fs").readFileSync("clients/viewer/src/browser-host/index.js", "utf8");
    const template = /count\.textContent = `([^`]+)`/.exec(source)?.[1] || "";
    expect(template).toContain("docs match");
    expect(template).not.toContain("docs shown");
    expect(template).toContain("${paging}");
  });
});
