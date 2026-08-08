/**
 * Regression tests for item_622: the campaign checks that fail when a filter lies.
 *
 * Same arrangement as the layout checks — the module under test is the one the campaign
 * serializes into the page, so a check that passes here is the check that runs there.
 */
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain .mjs helper shared with the campaign script
import { filterChecks } from "./helpers/viewer-filter-checks.mjs";

function build(options: { count: string; cards: string[]; typeOptions?: string[]; searchable?: boolean }) {
  const typeOptions = options.typeOptions ?? ["all", "request", "task"];
  const dom = new JSDOM(
    `<!doctype html><body>
      <select data-viewer-filter-group="type">${typeOptions.map((value) => `<option value="${value}">${value}</option>`).join("")}</select>
      ${options.searchable === false ? "" : '<input id="search-input" />'}
      <div id="viewer-filter-count">${options.count}</div>
      <div id="board">${options.cards.map((id) => `<div class="card" data-id="${id}"></div>`).join("")}</div>
    </body>`,
    { pretendToBeVisual: true }
  );
  const checks = filterChecks(dom.window) as { name: string; run: () => Promise<string> }[];
  return { dom, run: (name: string) => checks.find((check) => check.name.includes(name))!.run() };
}

describe("viewer filter checks", () => {
  it("reports a count announced above an empty board", async () => {
    const lying = build({ count: "310 of 1325 docs shown · type: request", cards: [] });

    await expect(lying.run("count agrees")).rejects.toThrow(/announced 310 above an empty board/);
  });

  it("reports a board rendering cards under a count of none", async () => {
    const lying = build({ count: "0 of 1325 docs shown · type: request", cards: ["req_001_demo"] });

    await expect(lying.run("count agrees")).rejects.toThrow(/announced none while the board rendered 1/);
  });

  it("passes when the count and the board agree", async () => {
    const honest = build({ count: "2 of 1325 docs shown · All docs", cards: ["req_001_demo", "task_001_demo"] });

    await expect(honest.run("count agrees")).resolves.toContain("selection(s) checked");
  });

  it("reports a type filter returning a document it did not name", async () => {
    const lying = build({ count: "1 of 1 docs shown · type: request", cards: ["task_001_demo"] });

    await expect(lying.run("only what it names")).rejects.toThrow(/type=request rendered task/);
  });

  it("walks the type options read from the control, not a list of its own", async () => {
    // A type present in the markup is checked without this test naming it here.
    const added = build({
      count: "1 of 1 docs shown · type: roadmap",
      cards: ["item_001_demo"],
      typeOptions: ["all", "roadmap"]
    });

    await expect(added.run("only what it names")).rejects.toThrow(/type=roadmap rendered item/);
  });

  it("reports a count that ignores the search box", async () => {
    // req_314: typing narrowed the board to nine cards under a count still reading 1337.
    const frozen = build({ count: "1337 of 1337 docs shown · All docs", cards: ["req_001_demo"] });

    await expect(frozen.run("follows the search box")).rejects.toThrow(/the count stayed at 1337/);
  });

  it("skips the search check when there is no search box", async () => {
    const bare = build({ count: "1 of 1 docs shown", cards: ["req_001_demo"], searchable: false });

    await expect(bare.run("follows the search box")).resolves.toContain("no search box");
  });
});
