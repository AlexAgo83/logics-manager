import { describe, expect, it, vi } from "vitest";
import { baseItem, bootstrapWebview, pushData, specItem } from "./webviewHarnessTestUtils";

describe("webview board renderer behavior", () => {
  function installIntersectionObserverMock(dom: ReturnType<typeof bootstrapWebview>["dom"]) {
    const instances: Array<{
      callback: (entries: Array<Record<string, unknown>>) => void;
      observe: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    class MockIntersectionObserver {
      callback: (entries: Array<Record<string, unknown>>) => void;
      observe = vi.fn();
      disconnect = vi.fn();

      constructor(callback: (entries: Array<Record<string, unknown>>) => void) {
        this.callback = callback;
        instances.push(this);
      }
    }
    Object.defineProperty(dom.window, "IntersectionObserver", {
      configurable: true,
      value: MockIntersectionObserver
    });
    return instances;
  }

  it("renders board columns for each visible stage", () => {
    const { dom } = bootstrapWebview();

    const items = [
      baseItem,
      {
        ...baseItem,
        id: "item_001_backlog",
        title: "Backlog item",
        stage: "backlog",
        relPath: "logics/backlog/item_001_backlog.md",
        path: "/workspace/mock/logics/backlog/item_001_backlog.md"
      },
      {
        ...baseItem,
        id: "task_001_work",
        title: "Task item",
        stage: "task",
        relPath: "logics/tasks/task_001_work.md",
        path: "/workspace/mock/logics/tasks/task_001_work.md"
      }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const board = dom.window.document.getElementById("board");
    const columns = Array.from(board?.querySelectorAll(".column") || []);
    const stages = columns.map((c) => (c as HTMLElement).dataset.stage);
    expect(stages).toContain("request");
    expect(stages).toContain("backlog");
    expect(stages).toContain("task");
    expect(board?.querySelector(".list-view__wrapper")).toBeFalsy();
  });

  it("shows add button only on primary flow stage columns", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...baseItem,
          id: "prod_001",
          title: "Product doc",
          stage: "product",
          relPath: "logics/product/prod_001.md",
          path: "/workspace/mock/logics/product/prod_001.md"
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const requestColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "request"
    );
    const productColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "product"
    );

    expect(requestColumn?.querySelector(".column__add")).toBeTruthy();
    expect(productColumn?.querySelector(".column__add")).toBeFalsy();
  });

  it("shows per-column totals in the board column header", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...baseItem,
          id: "req_001_followup",
          title: "Follow-up request"
        },
        {
          ...baseItem,
          id: "item_001_backlog",
          title: "Backlog item",
          stage: "backlog",
          relPath: "logics/backlog/item_001_backlog.md",
          path: "/workspace/mock/logics/backlog/item_001_backlog.md"
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const requestColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "request"
    );
    const requestCount = requestColumn?.querySelector(".column__title-count")?.textContent;

    expect(requestCount).toBe("2/2");
  });

  it("opens and closes the column add menu on toggle", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const addButton = board?.querySelector(".column__add") as HTMLButtonElement | null;

    addButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    const menu = board?.querySelector(".column__menu");
    expect(menu).toBeTruthy();
    expect(addButton?.getAttribute("aria-expanded")).toBe("true");

    const menuItems = menu?.querySelectorAll(".column__menu-item") || [];
    expect(menuItems.length).toBe(3); // Request, Backlog, Task

    // Toggle again to close
    addButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    const menuAfter = board?.querySelector(".column__menu");
    expect(menuAfter).toBeFalsy();
  });

  it("selects a card on click and deselects previous", () => {
    const { dom } = bootstrapWebview();

    const items = [
      baseItem,
      { ...baseItem, id: "req_001_second", title: "Second request" }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const board = dom.window.document.getElementById("board");

    // Click first card
    const firstCard = board?.querySelector('[data-id="req_000_kickoff"]');
    firstCard?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(board?.querySelector('[data-id="req_000_kickoff"]')?.classList.contains("card--selected")).toBe(true);

    // Click second card
    const secondCard = board?.querySelector('[data-id="req_001_second"]');
    secondCard?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(board?.querySelector('[data-id="req_000_kickoff"]')?.classList.contains("card--selected")).toBe(false);
    expect(board?.querySelector('[data-id="req_001_second"]')?.classList.contains("card--selected")).toBe(true);
  });

  it("renders list view with section headers and card count", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // Switch to list mode
    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    const listView = board?.querySelector(".list-view");
    expect(listView).toBeTruthy();

    const headers = Array.from(board?.querySelectorAll(".list-view__header") || []);
    expect(headers.length).toBeGreaterThan(0);

    const firstHeader = headers[0];
    expect(firstHeader?.querySelector(".list-view__header-count")?.textContent).toBe("1/1");
  });

  it("renders sticky sentinels in list mode and updates them from observer entries", () => {
    const { dom } = bootstrapWebview();
    const instances = installIntersectionObserverMock(dom);

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...baseItem,
          id: "item_001_backlog",
          title: "Backlog item",
          stage: "backlog",
          relPath: "logics/backlog/item_001_backlog.md",
          path: "/workspace/mock/logics/backlog/item_001_backlog.md"
        },
        {
          ...baseItem,
          id: "task_001_work",
          title: "Task item",
          stage: "task",
          relPath: "logics/tasks/task_001_work.md",
          path: "/workspace/mock/logics/tasks/task_001_work.md"
        }
      ]
    });

    dom.window.document.querySelector('[data-action="toggle-view-mode"]')?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );

    const board = dom.window.document.getElementById("board");
    const wrapper = board?.querySelector(".list-view__wrapper");
    const sentinels = Array.from(board?.querySelectorAll(".list-view__sentinel") || []);
    const headers = Array.from(board?.querySelectorAll(".list-view__header") || []);

    expect(wrapper).toBeTruthy();
    expect(sentinels.length).toBe(2);
    expect(instances).toHaveLength(1);
    expect(instances[0].observe).toHaveBeenCalledTimes(headers.length);

    const topHeader = headers.find((header) => (header.querySelector(".list-view__header-label")?.textContent || "").includes("Request")) || headers[0];
    const bottomHeader = headers.find((header) => (header.querySelector(".list-view__header-label")?.textContent || "").includes("Task")) || headers[headers.length - 1];
    const visibleHeader = headers.find((header) => header !== topHeader && header !== bottomHeader) || headers[1] || headers[0];

    instances[0].callback([
      {
        target: topHeader,
        isIntersecting: false,
        boundingClientRect: { top: 0, bottom: 10 },
        rootBounds: { top: 20, bottom: 120 }
      },
      {
        target: visibleHeader,
        isIntersecting: true,
        boundingClientRect: { top: 40, bottom: 80 },
        rootBounds: { top: 20, bottom: 120 }
      },
      {
        target: bottomHeader,
        isIntersecting: false,
        boundingClientRect: { top: 200, bottom: 240 },
        rootBounds: { top: 20, bottom: 120 }
      }
    ]);

    const topSentinel = board?.querySelector(".list-view__sentinel--top");
    const bottomSentinel = board?.querySelector(".list-view__sentinel--bottom");

    expect(topSentinel?.hidden).toBe(false);
    expect(topSentinel?.querySelector(".list-view__sentinel-label")?.textContent).toBe(
      topHeader.querySelector(".list-view__header-label")?.textContent
    );
    expect(topSentinel?.querySelector(".list-view__sentinel-count")?.textContent).toBe(
      topHeader.querySelector(".list-view__header-count")?.textContent
    );
    expect(bottomSentinel?.hidden).toBe(false);
    expect(bottomSentinel?.querySelector(".list-view__sentinel-label")?.textContent).toBe(
      bottomHeader.querySelector(".list-view__header-label")?.textContent
    );
  });

  it("disconnects sticky sentinels and keeps a single wrapper on rerender", () => {
    const { dom } = bootstrapWebview();
    const instances = installIntersectionObserverMock(dom);

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    dom.window.document.querySelector('[data-action="toggle-view-mode"]')?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        {
          ...baseItem,
          id: "req_001_followup",
          title: "Follow-up request"
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    expect(board?.querySelectorAll(".list-view__wrapper").length).toBe(1);
    expect(board?.querySelectorAll(".list-view__sentinel").length).toBe(2);
    expect(instances[0].disconnect).toHaveBeenCalledTimes(1);
  });

  it("renders compact cards in list mode", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector(".card");
    expect(card?.classList.contains("card--compact")).toBe(true);
  });

  it("renders the compact document prefix before the card title", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const prefix = dom.window.document.querySelector(".card__title-prefix");
    const title = dom.window.document.querySelector(".card__title-text");
    expect(prefix?.textContent).toBe("R000");
    expect(title?.textContent).toBe("Kickoff");
  });

  it("omits primary-flow text from spec cards in board and list renderings", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...specItem,
          references: [{ kind: "manual", label: "Reference", path: "logics/request/req_000_kickoff.md" }]
        }
      ]
    });

    const specCard = dom.window.document.querySelector('[data-id="spec_001_reference_contract"]') as HTMLElement | null;
    const preview = specCard?.querySelector(".card__preview");

    expect(specCard?.querySelector(".card__meta--linkage")).toBeFalsy();
    expect(preview?.textContent ?? "").not.toContain("Flow");
  });

  it("renders request badges with understanding, confidence, and complexity", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          indicators: {
            Understanding: "95%",
            Confidence: "90%",
            Complexity: "Medium"
          }
        }
      ]
    });

    const badge = dom.window.document.querySelector(".card__badge--metric");
    expect(badge?.querySelector(".card__badge-metric-prefix")?.textContent).toBe("U");
    expect(badge?.querySelector(".card__badge-metric-value")?.textContent).toBe("95%");
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-prefix") || []).map((node) => node.textContent)).toEqual(["U", "C"]);
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-value") || []).map((node) => node.textContent)).toContain("90%");
    expect(badge?.textContent).toContain("M");
  });

  it("renders understanding and confidence badges for non-request items when present", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "task_001",
          stage: "task",
          indicators: {
            Understanding: "88%",
            Confidence: "84%",
            Complexity: "High"
          }
        }
      ]
    });

    const badge = dom.window.document.querySelector(".card__badge--metric");
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-prefix") || []).map((node) => node.textContent)).toEqual([
      "U",
      "C"
    ]);
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-value") || []).map((node) => node.textContent)).toContain("88%");
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-value") || []).map((node) => node.textContent)).toContain("84%");
    expect(badge?.textContent).toContain("H");
  });

  it("renders progress badges with a muted P prefix", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "task_001",
          stage: "task",
          indicators: {
            Status: "Ready",
            Progress: "65%",
            Complexity: "High"
          }
        }
      ]
    });

    const badge = dom.window.document.querySelector(".card__badge--metric");
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-prefix") || []).map((node) => node.textContent)).toEqual(["P"]);
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-value") || []).map((node) => node.textContent)).toContain("65%");
    expect(badge?.textContent).toContain("H");
  });

  it("renders progress badges for unknown stages without losing the progress metric", () => {
    const { dom } = bootstrapWebview();
    const board = dom.window.document.getElementById("board");
    const renderBoard = dom.window.createCdxLogicsBoardRenderer({
      board,
      hostApi: {},
      getItems: () => [
        {
          ...baseItem,
          id: "misc_001",
          stage: "misc",
          relPath: "logics/misc/misc_001.md",
          path: "/workspace/mock/logics/misc/misc_001.md",
          indicators: {
            Progress: "150%",
            Complexity: "High"
          }
        }
      ],
      getTotalItemCount: () => 1,
      getSelectedId: () => null,
      setSelectedId: () => undefined,
      isListMode: () => false,
      getVisibleStages: () => ["misc"],
      groupByStage: (items: Array<{ stage: string }>) => ({ misc: items }),
      getListGroups: () => [],
      isVisible: () => true,
      isPrimaryFlowStage: () => false,
      isRequestProcessed: () => false,
      getStageHeading: () => "Misc",
      getStageLabel: () => "misc",
      collectCompanionDocs: () => [],
      collectSpecs: () => [],
      collectPrimaryFlowItems: () => [],
      getAttentionReasons: () => [],
      getHealthSignals: () => [],
      getSuggestedActions: () => [],
      progressState: () => "",
      getProgressValue: () => 150,
      isComplete: () => false,
      render: () => undefined,
      openSelectedItem: () => undefined,
      closeColumnMenu: () => undefined,
      toggleColumnMenu: () => undefined,
      persistState: () => undefined,
      getCollapsedListStages: () => new Set<string>(),
      getHideCompleted: () => false,
      getHideProcessedRequests: () => false,
      getHideSpec: () => false,
      getShowCompanionDocs: () => true,
      getHideEmptyColumns: () => false,
      getSearchQuery: () => "",
      getAttentionOnly: () => false
    });

    renderBoard.renderBoard();

    const badge = dom.window.document.querySelector(".card__badge--metric");
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-prefix") || []).map((node) => node.textContent)).toEqual(["P"]);
    expect(Array.from(badge?.querySelectorAll(".card__badge-metric-value") || []).map((node) => node.textContent)).toContain("100%");
    expect(badge?.textContent).toContain("H");
  });

  it("navigates up and down within a board column using arrow keys", () => {
    const { dom } = bootstrapWebview();

    const items = [
      { ...baseItem, id: "req_a", title: "A" },
      { ...baseItem, id: "req_b", title: "B" },
      { ...baseItem, id: "req_c", title: "C" }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const board = dom.window.document.getElementById("board");

    // Select first card
    const firstCard = board?.querySelector('[data-id="req_a"]');
    firstCard?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    // Press down arrow
    const downEvent = new dom.window.KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true
    });
    board?.querySelector('[data-id="req_a"]')?.dispatchEvent(downEvent);

    expect(board?.querySelector('[data-id="req_b"]')?.classList.contains("card--selected")).toBe(true);
  });

  it("navigates between board columns with left and right arrow keys", () => {
    const { dom } = bootstrapWebview();

    const items = [
      baseItem,
      {
        ...baseItem,
        id: "item_001_backlog",
        title: "Backlog item",
        stage: "backlog",
        relPath: "logics/backlog/item_001_backlog.md",
        path: "/workspace/mock/logics/backlog/item_001_backlog.md"
      }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const board = dom.window.document.getElementById("board");

    // Select request card
    board?.querySelector('[data-id="req_000_kickoff"]')?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );

    // Press right arrow to move to backlog
    const rightEvent = new dom.window.KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true
    });
    board?.querySelector('[data-id="req_000_kickoff"]')?.dispatchEvent(rightEvent);

    expect(board?.querySelector('[data-id="item_001_backlog"]')?.classList.contains("card--selected")).toBe(true);
  });

  it("opens item on Enter+Shift and edits on Enter+Ctrl from a card", () => {
    const { dom, postedMessages } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="req_000_kickoff"]');

    // Shift+Enter should read
    const shiftEnter = new dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true,
      cancelable: true
    });
    card?.dispatchEvent(shiftEnter);

    expect(postedMessages.some((m) => m.type === "read")).toBe(true);

    // Ctrl+Enter should open
    const ctrlEnter = new dom.window.KeyboardEvent("keydown", {
      key: "Enter",
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    card?.dispatchEvent(ctrlEnter);

    expect(postedMessages.some((m) => m.type === "open")).toBe(true);
  });

  it("selects item with Space key from a card", () => {
    const { dom } = bootstrapWebview();

    const items = [
      { ...baseItem, id: "req_a", title: "A" },
      { ...baseItem, id: "req_b", title: "B" }
    ];

    pushData(dom, { root: "/workspace/mock", items });

    const board = dom.window.document.getElementById("board");
    const cardB = board?.querySelector('[data-id="req_b"]');

    const spaceEvent = new dom.window.KeyboardEvent("keydown", {
      key: " ",
      bubbles: true,
      cancelable: true
    });
    cardB?.dispatchEvent(spaceEvent);

    expect(board?.querySelector('[data-id="req_b"]')?.classList.contains("card--selected")).toBe(true);
  });

  it("shows preview on hover and hides on leave", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="req_000_kickoff"]');
    const preview = card?.querySelector(".card__preview") as HTMLElement | null;

    expect(preview?.hidden).toBe(true);

    card?.dispatchEvent(new dom.window.Event("mouseenter"));
    expect(preview?.hidden).toBe(false);
    expect(card?.classList.contains("card--preview-open")).toBe(true);

    card?.dispatchEvent(new dom.window.Event("mouseleave"));
    expect(preview?.hidden).toBe(true);
    expect(card?.classList.contains("card--preview-open")).toBe(false);
  });

  it("closes preview with Escape key", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="req_000_kickoff"]');
    const preview = card?.querySelector(".card__preview") as HTMLElement | null;

    // Open preview via hover
    card?.dispatchEvent(new dom.window.Event("mouseenter"));
    expect(preview?.hidden).toBe(false);

    // Close via Escape
    const escEvent = new dom.window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    });
    card?.dispatchEvent(escEvent);

    expect(preview?.hidden).toBe(true);
  });

  it("shows empty column label for stages with no items", () => {
    const { dom } = bootstrapWebview({
      initialState: {
        hideEmptyColumns: false,
        workspaceRoot: "/workspace/mock"
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem] // Only request stage has items
    });

    const board = dom.window.document.getElementById("board");
    const emptyLabels = Array.from(board?.querySelectorAll(".column__empty") || []);
    expect(emptyLabels.length).toBeGreaterThan(0);

    const emptyTexts = emptyLabels.map((el) => el.textContent);
    expect(emptyTexts.some((text) => text === "No items")).toBe(true);
  });

  it("renders card with accessible role and label", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="req_000_kickoff"]');

    expect(card?.getAttribute("role")).toBe("button");
    expect(card?.getAttribute("tabindex")).toBe("0");
    expect(card?.getAttribute("aria-label")).toContain("Kickoff");
    expect(card?.getAttribute("aria-label")).toContain("req_000_kickoff");
  });

  it("navigates list sections with ArrowDown from header to first item", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // Switch to list mode
    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    const header = board?.querySelector(".list-view__header") as HTMLElement | null;

    const downEvent = new dom.window.KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true
    });
    header?.dispatchEvent(downEvent);

    const selectedCard = board?.querySelector(".card--selected");
    expect(selectedCard).toBeTruthy();
  });

  it("collapses list section with ArrowLeft from card", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // Switch to list mode
    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");

    // Select a card first
    const card = board?.querySelector(".card");
    card?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    // Press ArrowLeft to collapse the section
    const leftEvent = new dom.window.KeyboardEvent("keydown", {
      key: "ArrowLeft",
      bubbles: true,
      cancelable: true
    });
    board?.querySelector(".card--selected")?.dispatchEvent(leftEvent);

    const header = board?.querySelector(".list-view__header");
    expect(header?.getAttribute("aria-expanded")).toBe("false");
  });
});
