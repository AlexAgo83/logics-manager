import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, productItem, pushData } from "./webviewHarnessTestUtils";

describe("webview harness state, preview, and persistence behaviors", () => {
  it("shows a compact preview on hover and dismisses it cleanly", () => {
    const previewItem = {
      ...baseItem,
      indicators: { Status: "Draft" },
      references: [{ kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" }],
      usedBy: [{ id: "task_000_followup", relPath: "logics/tasks/task_000_followup.md" }]
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [previewItem]
    });

    const document = dom.window.document;
    const card = document.querySelector('.card[data-id="req_000_kickoff"]') as HTMLDivElement | null;
    const getPreview = () => card?.querySelector(".card__preview") as HTMLDivElement | null;

    expect(getPreview()?.hidden).toBe(true);

    card?.dispatchEvent(new dom.window.MouseEvent("mouseenter", { bubbles: true }));
    expect(getPreview()?.hidden).toBe(false);
    expect(getPreview()?.textContent).toContain("Status");
    expect(getPreview()?.textContent).toContain("Draft");
    expect(getPreview()?.textContent).not.toContain("References");
    expect(getPreview()?.textContent).not.toContain("Used by");

    card?.dispatchEvent(new dom.window.MouseEvent("mouseleave", { bubbles: true }));
    expect(getPreview()?.hidden).toBe(true);
    expect(document.querySelector(".card--selected")?.getAttribute("data-id")).toBe("req_000_kickoff");
  });

  it("restores persisted UI state for the current workspace when it is still valid", () => {
    const { dom } = bootstrapWebview({
      harness: true,
      initialState: {
        workspaceRoot: "/workspace/mock",
        selectedId: "prod_000_plugin_ux",
        searchQuery: "plugin",
        viewMode: "list",
        boardScrollTop: 42,
        detailsScrollTop: 18
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, productItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const detailsBody = document.getElementById("details-body");
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;

    expect(searchInput?.value).toBe("plugin");
    expect(board?.classList.contains("board--list")).toBe(true);
    expect(document.querySelector(".card--selected")?.getAttribute("data-id")).toBe("prod_000_plugin_ux");
    expect(board?.scrollTop).toBe(42);
    expect(detailsBody?.scrollTop).toBe(18);
  });

  it("drops stale restored UI fragments when the workspace root changes", () => {
    const { dom } = bootstrapWebview({
      harness: true,
      initialState: {
        workspaceRoot: "/workspace/other",
        selectedId: "prod_000_plugin_ux",
        searchQuery: "plugin",
        viewMode: "list",
        detailsCollapsed: true
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, productItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const details = document.getElementById("details");
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;

    expect(searchInput?.value).toBe("");
    expect(board?.classList.contains("board--list")).toBe(false);
    expect(document.querySelector(".card--selected")).toBeNull();
    expect(details?.classList.contains("details--collapsed")).toBe(false);
  });

  it("keeps persisted UI state when Windows roots differ only by case or slash direction", () => {
    const { dom } = bootstrapWebview({
      harness: true,
      initialState: {
        workspaceRoot: "c:\\Users\\alex\\repo\\",
        selectedId: "prod_000_plugin_ux",
        searchQuery: "plugin",
        viewMode: "list",
        detailsCollapsed: true
      }
    });

    pushData(dom, {
      root: "C:/Users/alex/repo",
      items: [baseItem, productItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const details = document.getElementById("details");
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;

    expect(searchInput?.value).toBe("plugin");
    expect(board?.classList.contains("board--list")).toBe(true);
    expect(document.querySelector(".card--selected")?.getAttribute("data-id")).toBe("prod_000_plugin_ux");
    expect(details?.classList.contains("details--collapsed")).toBe(true);
  });
});
