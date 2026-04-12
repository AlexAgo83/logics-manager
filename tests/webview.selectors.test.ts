import { describe, expect, it } from "vitest";
import {
  baseItem,
  bootstrapWebview,
  productItem,
  architectureItem,
  specItem,
  pushData
} from "./webviewHarnessTestUtils";

describe("webview selectors behavior", () => {
  it("computes progress state classes for cards at different progress levels", () => {
    const { dom } = bootstrapWebview({
      initialState: { hideCompleted: false, workspaceRoot: "/workspace/mock" }
    });

    const zeroItem = {
      ...baseItem,
      id: "req_zero",
      title: "Zero progress",
      indicators: { Status: "Draft", Progress: "0%" }
    };
    const activeItem = {
      ...baseItem,
      id: "req_active",
      title: "Active progress",
      indicators: { Status: "In Progress", Progress: "50%" }
    };
    const doneItem = {
      ...baseItem,
      id: "req_done",
      title: "Complete",
      stage: "backlog",
      indicators: { Status: "Done", Progress: "100%" }
    };

    pushData(dom, {
      root: "/workspace/mock",
      items: [zeroItem, activeItem, doneItem]
    });

    const board = dom.window.document.getElementById("board");
    const zeroCard = board?.querySelector('[data-id="req_zero"]');
    const activeCard = board?.querySelector('[data-id="req_active"]');
    const doneCard = board?.querySelector('[data-id="req_done"]');

    expect(zeroCard?.classList.contains("card--progress-zero")).toBe(true);
    expect(activeCard?.classList.contains("card--progress-active")).toBe(true);
    expect(activeCard?.classList.contains("card--progress-bar")).toBe(true);
    expect(doneCard?.classList.contains("card--progress-done")).toBe(true);
    expect(doneCard?.classList.contains("card--done")).toBe(true);
  });

  it("throws when collectLinkedWorkflowItems is missing from the model API", () => {
    const { dom } = bootstrapWebview();
    const selectors = dom.window.createCdxLogicsWebviewSelectors({
      modelApi: {},
      primaryStageOrder: ["request", "backlog", "task"],
      companionStageOrder: ["product", "architecture"],
      compactListQuery: { matches: false },
      getItems: () => [baseItem],
      getSelectedId: () => null,
      getActiveWorkspaceRoot: () => "/workspace/mock",
      getChangedPaths: () => [],
      getActiveAgent: () => null,
      getLastInjectedContext: () => null,
      getHideCompleted: () => false,
      getHideProcessedRequests: () => false,
      getHideSpec: () => false,
      getShowCompanionDocs: () => true,
      getHideEmptyColumns: () => false,
      getSearchQuery: () => "",
      getGroupMode: () => "stage",
      getSortMode: () => "default",
      getAttentionOnly: () => false,
      getUiState: () => ({ viewMode: "board" })
    });

    expect(() => selectors.collectLinkedWorkflowItems(baseItem as never)).toThrow(
      "collectLinkedWorkflowItems is not available on modelApi."
    );
  });

  it("renders a CSS custom property for the progress bar on active cards", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_bar",
          title: "Progress bar",
          indicators: { Status: "In Progress", Progress: "65%" }
        }
      ]
    });

    const card = dom.window.document.querySelector('[data-id="req_bar"]') as HTMLElement | null;
    expect(card?.style.getPropertyValue("--progress")).toBe("65%");
  });

  it("hides completed items when hideCompleted is true (default)", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...baseItem,
          id: "req_complete",
          title: "Complete item",
          indicators: { Status: "Done", Progress: "100%" }
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const cards = Array.from(board?.querySelectorAll(".card") || []);
    const cardIds = cards.map((c) => (c as HTMLElement).dataset.id);
    expect(cardIds).toContain("req_000_kickoff");
    expect(cardIds).not.toContain("req_complete");
  });

  it("searches across title, id, stage, references, and indicators", () => {
    const { dom } = bootstrapWebview();

    const items = [
      baseItem,
      {
        ...baseItem,
        id: "req_002_deploy",
        title: "Deploy pipeline",
        indicators: { Status: "Blocked" },
        references: [{ path: "ci/deploy.yaml", label: "Deploy configuration" }]
      }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    // Search by indicator value
    const searchInput = dom.window.document.getElementById("search-input") as HTMLInputElement | null;
    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    if (searchInput) {
      searchInput.value = "blocked";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    const board = dom.window.document.getElementById("board");
    const cards = Array.from(board?.querySelectorAll(".card") || []);
    expect(cards.length).toBe(1);
    expect((cards[0] as HTMLElement).dataset.id).toBe("req_002_deploy");
  });

  it("sorts cards by progress descending when requested", () => {
    const { dom } = bootstrapWebview({
      initialState: { workspaceRoot: "/workspace/mock" }
    });

    const items = [
      { ...baseItem, id: "req_a", title: "A", indicators: { Status: "Draft", Progress: "10%" } },
      { ...baseItem, id: "req_b", title: "B", indicators: { Status: "Draft", Progress: "90%" } },
      { ...baseItem, id: "req_c", title: "C", indicators: { Status: "Draft", Progress: "50%" } }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    // Open filter panel and change sort
    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const sortBySelect = dom.window.document.getElementById("sort-by") as HTMLSelectElement | null;
    if (sortBySelect) {
      sortBySelect.value = "progress-desc";
      sortBySelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const board = dom.window.document.getElementById("board");
    const cards = Array.from(board?.querySelectorAll(".card") || []);
    const cardIds = cards.map((c) => (c as HTMLElement).dataset.id);
    expect(cardIds).toEqual(["req_b", "req_c", "req_a"]);
  });

  it("treats the Default sort option as newest-first ordering", () => {
    const { dom } = bootstrapWebview({
      initialState: { workspaceRoot: "/workspace/mock" }
    });

    const items = [
      {
        ...baseItem,
        id: "req_old",
        title: "Old request",
        indicators: { Status: "Draft", Progress: "10%" },
        updatedAt: "2024-01-01T00:00:00.000Z"
      },
      {
        ...baseItem,
        id: "req_new",
        title: "New request",
        indicators: { Status: "Draft", Progress: "90%" },
        updatedAt: "2024-02-01T00:00:00.000Z"
      }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const sortBySelect = dom.window.document.getElementById("sort-by") as HTMLSelectElement | null;
    if (sortBySelect) {
      sortBySelect.value = "default";
      sortBySelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const board = dom.window.document.getElementById("board");
    const cards = Array.from(board?.querySelectorAll(".card") || []);
    const cardIds = cards.map((c) => (c as HTMLElement).dataset.id);
    expect(cardIds).toEqual(["req_new", "req_old"]);
  });

  it("sorts cards by status ascending when requested", () => {
    const { dom } = bootstrapWebview();

    const items = [
      { ...baseItem, id: "req_z", title: "Z", indicators: { Status: "Ready" } },
      { ...baseItem, id: "req_a", title: "A", indicators: { Status: "Blocked" } },
      { ...baseItem, id: "req_m", title: "M", indicators: { Status: "Draft" } }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const sortBySelect = dom.window.document.getElementById("sort-by") as HTMLSelectElement | null;
    if (sortBySelect) {
      sortBySelect.value = "status-asc";
      sortBySelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const board = dom.window.document.getElementById("board");
    const cards = Array.from(board?.querySelectorAll(".card") || []);
    const cardIds = cards.map((c) => (c as HTMLElement).dataset.id);
    // Status ascending: Blocked < Draft < Ready
    expect(cardIds).toEqual(["req_a", "req_m", "req_z"]);
  });

  it("toggles attention mode and filters the board based on attention state", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const attentionToggle = dom.window.document.getElementById("attention-toggle");

    // Verify items are visible before attention toggle
    expect(board?.querySelectorAll(".card").length).toBeGreaterThan(0);

    // Toggle attention on
    attentionToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(attentionToggle?.classList.contains("btn--active")).toBe(true);

    // Toggle attention off
    attentionToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(attentionToggle?.classList.contains("btn--active")).toBe(false);

    // Items should be visible again
    expect(board?.querySelectorAll(".card").length).toBeGreaterThan(0);
  });

  it("shows filter-specific empty message when all items are hidden by active filters", () => {
    const { dom } = bootstrapWebview();

    // All items are 100% progress, and hideCompleted is default true
    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_done_only",
          title: "Done",
          indicators: { Status: "Done", Progress: "100%" }
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const emptyMessage = board?.querySelector(".state-message");
    expect(emptyMessage?.textContent).toContain("filters");
  });

  it("shows search-specific empty message when a search query has no matches", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const searchInput = dom.window.document.getElementById("search-input") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.value = "zzzznonexistent";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    const board = dom.window.document.getElementById("board");
    const emptyMessage = board?.querySelector(".state-message");
    expect(emptyMessage?.textContent).toContain("zzzznonexistent");
  });

  it("shows setup guidance when no items exist at all", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: []
    });

    const board = dom.window.document.getElementById("board");
    const emptyMessage = board?.querySelector(".state-message");
    expect(emptyMessage?.textContent).toContain("Bootstrap Logics");
  });

  it("shows visible stages including companion and spec based on toggle state", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, productItem, architectureItem, specItem]
    });

    const board = dom.window.document.getElementById("board");

    // By default showCompanionDocs=true, hideSpec=true
    const columns = Array.from(board?.querySelectorAll(".column") || []);
    const stages = columns.map((c) => (c as HTMLElement).dataset.stage);
    expect(stages).toContain("product");
    expect(stages).toContain("architecture");
    expect(stages).not.toContain("spec");

    // Toggle spec visibility
    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const hideSpecToggle = dom.window.document.getElementById("hide-spec") as HTMLInputElement | null;
    if (hideSpecToggle) {
      hideSpecToggle.checked = false;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const columnsAfter = Array.from(board?.querySelectorAll(".column") || []);
    const stagesAfter = columnsAfter.map((c) => (c as HTMLElement).dataset.stage);
    expect(stagesAfter).toContain("spec");
  });

  it("keeps linkage metadata for supporting docs without the filename subtitle", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, productItem]
    });

    const board = dom.window.document.getElementById("board");
    const productCard = board?.querySelector('[data-id="prod_000_plugin_ux"]');
    const meta = productCard?.querySelector(".card__meta--linkage");
    expect(meta?.textContent).toContain("Unlinked to primary flow");
    expect(productCard?.querySelector(".card__meta:not(.card__meta--linkage)")).toBeFalsy();
  });

  it("handles items with no progress indicator gracefully", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_noprog",
          title: "No progress",
          indicators: { Status: "Draft" }
        }
      ]
    });

    const card = dom.window.document.querySelector('[data-id="req_noprog"]');
    expect(card?.classList.contains("card--progress-zero")).toBe(false);
    expect(card?.classList.contains("card--progress-active")).toBe(false);
    expect(card?.classList.contains("card--progress-done")).toBe(false);
    expect(card?.classList.contains("card--progress-bar")).toBe(false);
  });

  it("clamps progress bar value between 0 and 100", () => {
    const { dom } = bootstrapWebview({
      initialState: { hideCompleted: false, workspaceRoot: "/workspace/mock" }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_over",
          title: "Overclaimed",
          indicators: { Status: "Draft", Progress: "150%" }
        }
      ]
    });

    // 150% is >= 100, so it should be done, not have a progress bar
    const card = dom.window.document.querySelector('[data-id="req_over"]') as HTMLElement | null;
    expect(card?.classList.contains("card--progress-done")).toBe(true);
    expect(card?.classList.contains("card--progress-bar")).toBe(false);
  });
});
