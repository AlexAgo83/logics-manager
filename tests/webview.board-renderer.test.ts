import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, pushData } from "./webviewHarnessTestUtils";

describe("webview board renderer behavior", () => {
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
