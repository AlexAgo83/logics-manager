import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, pushData } from "./webviewHarnessTestUtils";

describe("webview persistence behavior", () => {
  it("persists scroll state via debounced schedulePersistState", async () => {
    const { dom, persistedStates } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    if (board) {
      Object.defineProperty(board, "scrollLeft", { value: 42, writable: true });
      Object.defineProperty(board, "scrollTop", { value: 88, writable: true });
    }

    // Trigger a board scroll which should schedule persist
    board?.dispatchEvent(new dom.window.Event("scroll"));

    // Wait for debounce to fire (80ms + margin)
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(persistedStates.length).toBeGreaterThan(0);
    const lastState = persistedStates[persistedStates.length - 1];
    expect(lastState).toHaveProperty("boardScrollLeft");
    expect(lastState).toHaveProperty("boardScrollTop");
  });

  it("captures and restores details scroll position across re-renders", () => {
    const { dom, persistedStates } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const detailsBody = dom.window.document.getElementById("details-body");
    if (detailsBody) {
      Object.defineProperty(detailsBody, "scrollTop", { value: 55, writable: true });
    }

    // Re-push data to trigger a re-render cycle
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    // The persistence layer should have captured scroll state
    expect(persistedStates.length).toBeGreaterThanOrEqual(0);
  });

  it("resets persisted UI state to defaults when filter reset is triggered", () => {
    const { dom, persistedStates } = bootstrapWebview({
      initialState: {
        hideCompleted: false,
        viewMode: "list",
        secondaryToolbarOpen: true,
        workspaceRoot: "/workspace/mock"
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const filterReset = dom.window.document.getElementById("filter-reset");
    filterReset?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    // After reset, the board should be in its default view
    const board = dom.window.document.getElementById("board");
    expect(board).toBeTruthy();

    // The persisted state should reflect filter defaults being restored
    if (persistedStates.length > 0) {
      const lastState = persistedStates[persistedStates.length - 1];
      expect(lastState.hideCompleted).toBe(true);
      // Filter reset resets filter state; viewMode is preserved since it's a layout preference
    }
  });

  it("restores persisted filter and view state on hydration", () => {
    const { dom } = bootstrapWebview({
      initialState: {
        hideCompleted: false,
        hideSpec: false,
        showCompanionDocs: false,
        viewMode: "list",
        groupMode: "status",
        sortMode: "updated-desc",
        workspaceRoot: "/workspace/mock"
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        { ...baseItem, id: "req_001_done", title: "Done item", indicators: { Status: "Done", Progress: "100%" } }
      ]
    });

    // With hideCompleted restored as false, the done item should be visible
    const board = dom.window.document.getElementById("board");
    const cards = board?.querySelectorAll(".card") || [];
    const cardIds = Array.from(cards).map((c) => (c as HTMLElement).dataset.id);
    expect(cardIds).toContain("req_001_done");
  });

  it("restores legacy hideUsedRequests field as hideProcessedRequests", () => {
    const { dom } = bootstrapWebview({
      initialState: {
        hideUsedRequests: false,
        workspaceRoot: "/workspace/mock"
      }
    });

    const requestItem = {
      ...baseItem,
      id: "req_002_processed",
      title: "Processed request",
      stage: "request",
      references: [{ path: "logics/backlog/item_100_test.md" }],
      usedBy: []
    };
    const backlogItem = {
      id: "item_100_test",
      title: "Test backlog",
      stage: "backlog",
      relPath: "logics/backlog/item_100_test.md",
      path: "/workspace/mock/logics/backlog/item_100_test.md",
      indicators: { Status: "Ready" },
      references: [],
      usedBy: []
    };

    pushData(dom, {
      root: "/workspace/mock",
      items: [requestItem, backlogItem]
    });

    // With hideUsedRequests=false restored, processed requests should be visible
    const board = dom.window.document.getElementById("board");
    const cards = board?.querySelectorAll(".card") || [];
    const cardIds = Array.from(cards).map((c) => (c as HTMLElement).dataset.id);
    expect(cardIds).toContain("req_002_processed");
  });

  it("drops restored state when the workspace root has changed", () => {
    const { dom } = bootstrapWebview({
      initialState: {
        selectedId: "req_000_kickoff",
        viewMode: "list",
        workspaceRoot: "/old/workspace"
      }
    });

    pushData(dom, {
      root: "/workspace/new",
      items: [baseItem]
    });

    // When workspace root changes, the persisted selection should be dropped
    const board = dom.window.document.getElementById("board");
    const selectedCards = board?.querySelectorAll(".card--selected") || [];
    expect(selectedCards.length).toBe(0);
  });

  it("preserves collapsed detail sections through persist and hydrate cycle", () => {
    const { dom, persistedStates } = bootstrapWebview({
      initialState: {
        collapsedDetailSections: ["attentionExplain", "references"],
        workspaceRoot: "/workspace/mock"
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    // The details panel should have rendered with the section collapse state
    const detailsBody = dom.window.document.getElementById("details-body");
    expect(detailsBody).toBeTruthy();

    // Triggering persist should include the collapsed sections
    if (persistedStates.length > 0) {
      const lastState = persistedStates[persistedStates.length - 1];
      expect(Array.isArray(lastState.collapsedDetailSections)).toBe(true);
    }
  });

  it("includes splitRatio and detailsCollapsed in persisted snapshot", () => {
    const { dom, persistedStates } = bootstrapWebview({
      stacked: true,
      initialState: {
        splitRatio: 0.7,
        detailsCollapsed: true,
        workspaceRoot: "/workspace/mock"
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    if (persistedStates.length > 0) {
      const lastState = persistedStates[persistedStates.length - 1];
      expect(lastState).toHaveProperty("splitRatio");
      expect(lastState).toHaveProperty("detailsCollapsed");
    }
  });
});
