/**
 * Regression tests for req_310: one filtering authority, and a count that means the board.
 *
 * The reported defect: on a corpus whose documents are all finished, no board filter gave
 * the right result. Two filtering systems were applied in series and every panel selection
 * re-armed the inherited hide toggles, so filtering the board was what emptied it.
 */
import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, pushData } from "./webviewHarnessTestUtils";

const finishedCorpus = [
  { ...baseItem, id: "req_001_done", title: "Delivered request", stage: "request", indicators: { Status: "Done" } },
  { ...baseItem, id: "item_001_done", title: "Delivered slice", stage: "backlog", indicators: { Status: "Done" } },
  { ...baseItem, id: "task_001_done", title: "Delivered task", stage: "task", indicators: { Status: "Done" } },
  { ...baseItem, id: "prod_001_settled", title: "Settled brief", stage: "product", indicators: { Status: "Settled" } }
];

/** Install the panel hook the local viewer installs, with the given predicate. */
function installPanel(dom: any, predicate: (item: any) => boolean) {
  dom.window.__CDX_LOGICS_VIEWER_FILTER__ = predicate;
}

function renderedIds(dom: any): string[] {
  return Array.from(dom.window.document.querySelectorAll("#board .card[data-id]")).map((card: any) =>
    card.getAttribute("data-id")
  );
}

describe("board filter authority", () => {
  it("does not let an inherited toggle undo a panel selection", () => {
    // hideCompleted is on, every document is finished, and the panel asks for tasks.
    const { dom } = bootstrapWebview({ initialState: { hideCompleted: true, workspaceRoot: "/workspace/mock" } });
    installPanel(dom, (item: any) => item.stage === "task");

    pushData(dom, { root: "/workspace/mock", items: finishedCorpus });

    expect(renderedIds(dom)).toEqual(["task_001_done"]);
  });

  it("keeps the inherited toggles authoritative where there is no panel", () => {
    // The extension webview has no panel: hideCompleted must still hide finished work.
    const { dom } = bootstrapWebview({ initialState: { hideCompleted: true, workspaceRoot: "/workspace/mock" } });

    pushData(dom, { root: "/workspace/mock", items: finishedCorpus });

    // Unchanged behavior: the three Done documents are hidden, and Settled is not one of
    // the statuses that toggle treats as complete.
    expect(renderedIds(dom)).toEqual(["prod_001_settled"]);
  });

  it("still applies the search box while the panel is the authority", () => {
    const { dom } = bootstrapWebview({
      initialState: { hideCompleted: true, searchQuery: "delivered task", workspaceRoot: "/workspace/mock" }
    });
    installPanel(dom, () => true);

    pushData(dom, { root: "/workspace/mock", items: finishedCorpus });

    expect(renderedIds(dom)).toEqual(["task_001_done"]);
  });

  it("counts what the board renders, not what the panel alone would allow", () => {
    const { dom } = bootstrapWebview({ initialState: { hideCompleted: true, workspaceRoot: "/workspace/mock" } });
    installPanel(dom, (item: any) => item.stage !== "product");

    pushData(dom, { root: "/workspace/mock", items: finishedCorpus });

    // The count the browser host prints comes from this hook; it must agree with the board.
    expect(typeof dom.window.__CDX_LOGICS_VISIBLE_COUNT__).toBe("function");
    expect(dom.window.__CDX_LOGICS_VISIBLE_COUNT__()).toBe(renderedIds(dom).length);
    expect(renderedIds(dom).length).toBe(3);
  });

  it("agrees with the board for every panel selection, including one that allows nothing", () => {
    const { dom } = bootstrapWebview({ initialState: { hideCompleted: true, workspaceRoot: "/workspace/mock" } });
    for (const [label, predicate] of [
      ["all", () => true],
      ["none", () => false],
      ["requests", (item: any) => item.stage === "request"],
      ["workflow", (item: any) => ["request", "backlog", "task"].includes(item.stage)]
    ] as [string, (item: any) => boolean][]) {
      installPanel(dom, predicate);
      pushData(dom, { root: "/workspace/mock", items: finishedCorpus });

      expect(dom.window.__CDX_LOGICS_VISIBLE_COUNT__(), label).toBe(renderedIds(dom).length);
    }
  });

  it("exposes a render path the panel can ask for, rather than borrowing a toggle's", () => {
    // The panel used to redraw the board only as a side effect of re-arming the hide
    // toggles, whose change events reached a handler that rendered.
    const { dom } = bootstrapWebview({ initialState: { hideCompleted: true, workspaceRoot: "/workspace/mock" } });
    installPanel(dom, () => true);
    pushData(dom, { root: "/workspace/mock", items: finishedCorpus });

    expect(typeof dom.window.__CDX_LOGICS_RENDER__).toBe("function");

    installPanel(dom, (item: any) => item.stage === "request");
    dom.window.__CDX_LOGICS_RENDER__();

    expect(renderedIds(dom)).toEqual(["req_001_done"]);
  });
});
