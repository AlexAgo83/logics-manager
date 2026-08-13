import { describe, expect, it, vi } from "vitest";
import { baseItem, bootstrapWebview, productItem, pushData, specItem } from "./webviewHarnessTestUtils";

describe("webview board renderer behavior", () => {
  function makeRequestItems(count: number, titlePrefix = "Large corpus request") {
    return Array.from({ length: count }, (_, index) => ({
      ...baseItem,
      id: `req_${String(index + 1).padStart(3, "0")}_large`,
      title: `${titlePrefix} ${String(index + 1).padStart(3, "0")}`,
      relPath: `logics/request/req_${String(index + 1).padStart(3, "0")}_large.md`,
      path: `/workspace/mock/logics/request/req_${String(index + 1).padStart(3, "0")}_large.md`
    }));
  }

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

  it("hides column add buttons across corpus columns", () => {
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
    expect(board?.querySelector(".column__add")).toBeFalsy();
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

  it("renders large board columns progressively with a show more control", () => {
    const { dom } = bootstrapWebview();
    const items = makeRequestItems(12);

    pushData(dom, { root: "/workspace/mock", items });

    const board = dom.window.document.getElementById("board");
    const requestColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "request"
    );

    expect(requestColumn?.querySelectorAll(".card").length).toBe(10);
    expect(requestColumn?.querySelector(".column__title-count")?.textContent).toBe("10/12");
    const showMore = requestColumn?.querySelector(".group-show-more") as HTMLButtonElement | null;
    expect(showMore?.textContent).toBe("Show 2 more");
    expect(showMore?.title).toContain("2 of 12");

    showMore?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const updatedColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "request"
    );
    expect(updatedColumn?.querySelectorAll(".card").length).toBe(12);
    expect(updatedColumn?.querySelector(".column__title-count")?.textContent).toBe("12/12");
    expect(updatedColumn?.querySelector(".group-show-more")).toBeNull();
  });

  it("extends a progressive board group before keyboard selection moves past rendered items", () => {
    const { dom } = bootstrapWebview();
    pushData(dom, { root: "/workspace/mock", items: makeRequestItems(12) });

    const board = dom.window.document.getElementById("board");
    const tenthCard = board?.querySelector('[data-id="req_010_large"]');

    tenthCard?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    const updatedColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "request"
    );
    const nextCard = updatedColumn?.querySelector('[data-id="req_011_large"]');
    expect(nextCard).toBeTruthy();
    expect(nextCard?.classList.contains("card--selected")).toBe(true);
    expect(updatedColumn?.querySelector(".column__title-count")?.textContent).toBe("11/12");
    expect(updatedColumn?.querySelector(".group-show-more")?.textContent).toBe("Show 1 more");
  });

  it("does not expose the legacy column add menu", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const addButton = board?.querySelector(".column__add") as HTMLButtonElement | null;

    expect(addButton).toBeNull();
    expect(board?.querySelector(".column__menu")).toBeNull();
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

  it("renders large list groups progressively and reveals the next page on demand", () => {
    const { dom } = bootstrapWebview();
    pushData(dom, { root: "/workspace/mock", items: makeRequestItems(13) });

    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    const requestSection = Array.from(board?.querySelectorAll(".list-view__section") || []).find(
      (section) => (section as HTMLElement).dataset.group === "request"
    );

    expect(requestSection?.querySelectorAll(".card").length).toBe(10);
    expect(requestSection?.querySelector(".list-view__header-count")?.textContent).toBe("10/13");
    const showMore = requestSection?.querySelector(".group-show-more") as HTMLButtonElement | null;
    expect(showMore?.textContent).toBe("Show 3 more");

    showMore?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const updatedSection = Array.from(board?.querySelectorAll(".list-view__section") || []).find(
      (section) => (section as HTMLElement).dataset.group === "request"
    );
    expect(updatedSection?.querySelectorAll(".card").length).toBe(13);
    expect(updatedSection?.querySelector(".list-view__header-count")?.textContent).toBe("13/13");
  });

  it("extends a progressive list group before keyboard selection moves past rendered items", () => {
    const { dom } = bootstrapWebview();
    pushData(dom, { root: "/workspace/mock", items: makeRequestItems(12) });

    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    const tenthCard = board?.querySelector('[data-id="req_010_large"]');

    tenthCard?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));

    const updatedSection = Array.from(board?.querySelectorAll(".list-view__section") || []).find(
      (section) => (section as HTMLElement).dataset.group === "request"
    );
    const nextCard = updatedSection?.querySelector('[data-id="req_011_large"]');
    expect(nextCard).toBeTruthy();
    expect(nextCard?.classList.contains("card--selected")).toBe(true);
    expect(updatedSection?.querySelector(".list-view__header-count")?.textContent).toBe("11/12");
    expect(updatedSection?.querySelector(".group-show-more")?.textContent).toBe("Show 1 more");
  });

  it("does not truncate active search results behind show more controls", () => {
    const { dom } = bootstrapWebview();
    pushData(dom, { root: "/workspace/mock", items: makeRequestItems(12, "Needle request") });

    const searchInput = dom.window.document.getElementById("search-input") as HTMLInputElement | null;
    if (searchInput) {
      searchInput.value = "Needle";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    const board = dom.window.document.getElementById("board");
    const requestColumn = Array.from(board?.querySelectorAll(".column") || []).find(
      (c) => (c as HTMLElement).dataset.stage === "request"
    );
    expect(requestColumn?.querySelectorAll(".card").length).toBe(12);
    expect(requestColumn?.querySelector(".column__title-count")?.textContent).toBe("12/12");
    expect(requestColumn?.querySelector(".group-show-more")).toBeNull();
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
    expect(card?.querySelector(".card__meta")).toBeFalsy();
  });

  it("keeps linkage metadata while dropping filename subtitles from cards", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...productItem,
          id: "prod_010_linked",
          title: "Linked product",
          usedBy: [
            {
              id: "req_010_linked_request",
              stage: "request",
              title: "Linked request",
              relPath: "logics/request/req_010_linked_request.md"
            }
          ]
        },
        {
          ...baseItem,
          id: "req_010_linked_request",
          title: "Linked request",
          relPath: "logics/request/req_010_linked_request.md",
          path: "/workspace/mock/logics/request/req_010_linked_request.md",
          indicators: { Status: "Ready" }
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="prod_010_linked"]') as HTMLElement | null;
    expect(card?.querySelector(".card__meta")).toBeFalsy();
    // item_720: the linkage line moved with the inline preview into the panel, which is
    // where it was being duplicated from in the first place.
    card?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(dom.window.document.getElementById("details")?.textContent).toContain("req_010_linked_request");
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
    // The compact prefix is decodable: full stage name in tooltip/aria-label and
    // a per-stage data attribute for colour.
    expect(prefix?.getAttribute("title")).toBe("Request · R000");
    expect(prefix?.getAttribute("aria-label")).toBe("Request (R000)");
    expect(prefix?.getAttribute("data-stage")).toBe("request");
  });

  it("puts theme, status and updated in the panel instead of copying them onto the card", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          indicators: {
            Status: "Ready",
            Theme: "Navigation",
            Updated: "2026-04-12T00:00:00.000Z"
          }
        }
      ]
    });

    // item_720: these facts used to be copied onto the card as an inline preview that
    // repeated the panel's own header and grew the card. The panel renders every indicator
    // already, so selecting is what shows them and the card stays the size it was.
    const card = dom.window.document.querySelector('[data-id="req_000_kickoff"]') as HTMLElement | null;
    expect(card?.querySelector(".card__preview")).toBeNull();
    const heightBefore = card?.childElementCount;

    card?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const selectedCard = dom.window.document.querySelector('[data-id="req_000_kickoff"]') as HTMLElement | null;
    expect(selectedCard?.childElementCount).toBe(heightBefore);
    expect(selectedCard?.classList.contains("card--selected")).toBe(true);

    const details = dom.window.document.getElementById("details");
    expect(details?.classList.contains("details--collapsed")).toBe(false);
    expect(details?.textContent).toContain("Navigation");
    expect(details?.textContent).toContain("Ready");
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

    expect(specCard?.querySelector(".card__meta--linkage")).toBeFalsy();
    // item_720 retired the inline preview that carried the Flow line; the card must still
    // not claim a primary-flow link a spec does not have.
    expect(specCard?.textContent ?? "").not.toContain("Flow");
  });

  it("keeps the reference index out of the columns and lets its control actually close it", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        baseItem,
        productItem,
        specItem,
        {
          ...baseItem,
          id: "adr_501_index",
          title: "Architecture companion",
          stage: "architecture",
          relPath: "logics/architecture/adr_501_index.md",
          path: "/workspace/mock/logics/architecture/adr_501_index.md"
        }
      ]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");

    // item_717: seven stages rendered as peer columns, so the sixth clipped mid-word at 1440
    // and a third of the board went to settled companion documents. Flow stages are the
    // queue; companions are an index below it.
    const columnStages = Array.from(board?.querySelectorAll(".column") || []).map(
      (node) => (node as HTMLElement).dataset.stage
    );
    expect(columnStages).toEqual(["request"]);
    expect(board?.querySelectorAll(".companion-index__group").length).toBeGreaterThan(0);

    // The control has to close it. It first shipped with `display: flex` on the body, which
    // beats the hidden attribute, so the index rendered open while its own marker said
    // closed. This harness loads no stylesheet, so what follows covers the state and not the
    // rendering of it: reintroducing that CSS rule leaves this test green. The rendered half
    // was verified by capture and belongs to the campaign, which reaches the board under
    // item_725.
    const toggle = document.querySelector(".companion-index__toggle") as HTMLElement | null;
    const body = () => document.querySelector(".companion-index__body") as HTMLElement | null;
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(body()?.hidden).toBe(false);

    toggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(document.querySelector(".companion-index__toggle")?.getAttribute("aria-expanded")).toBe("false");
    expect(body()?.hidden).toBe(true);
  });

  it("carries a card's status by shape as well as colour, so the ordering survives greyscale", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        { ...baseItem, id: "req_401_blocked", title: "Blocked", indicators: { Status: "Blocked" } },
        { ...baseItem, id: "req_402_progress", title: "Running", indicators: { Status: "In Progress" } },
        { ...baseItem, id: "req_403_ready", title: "Ready", indicators: { Status: "Ready" } },
        { ...baseItem, id: "req_404_draft", title: "Draft", indicators: { Status: "Draft" } }
      ]
    });

    // item_719: the card fill already encodes the stage, which the column states anyway, so
    // status -- what actually varies inside a column -- had nothing but the done-dimming.
    // The accent carries it, and each status gets its own border style so an operator who
    // cannot separate the colours can still separate the states.
    const board = dom.window.document.getElementById("board");
    const accentOf = (id: string) =>
      Array.from((board?.querySelector(`[data-id="${id}"]`) as HTMLElement | null)?.classList || []).find((name) =>
        name.startsWith("card--status-")
      );

    expect(accentOf("req_401_blocked")).toBe("card--status-blocked");
    expect(accentOf("req_402_progress")).toBe("card--status-progress");
    expect(accentOf("req_403_ready")).toBe("card--status-ready");
    expect(accentOf("req_404_draft")).toBe("card--status-draft");
    expect(new Set([
      accentOf("req_401_blocked"),
      accentOf("req_402_progress"),
      accentOf("req_403_ready"),
      accentOf("req_404_draft")
    ]).size).toBe(4);
  });

  it("keeps understanding and confidence off the card face and puts age there instead", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          ageDays: 4,
          indicators: {
            Understanding: "95%",
            Confidence: "90%",
            Complexity: "Medium"
          }
        }
      ]
    });

    // item_719: measured across all 1 393 workflow docs, `U __% / C __%` takes 91 distinct
    // values of which one pair covers 34%, and every document sits at 85 or above. It was
    // the loudest element after the title and very nearly a constant, so the face carries
    // age -- which does vary -- and the values move to the card's detail.
    const badge = dom.window.document.querySelector(".card__badge--metric");
    expect(badge?.textContent).not.toContain("U 95%");
    expect(badge?.textContent).not.toContain("C 90%");
    expect(badge?.textContent).toContain("M");
    expect(badge?.querySelector(".card__badge-age")).toBeTruthy();
    // item_720 retired the inline preview; the panel renders every indicator already, so
    // this is where understanding and confidence are read now.
    (dom.window.document.querySelector('[data-id="req_000_kickoff"]') as HTMLElement | null)?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );
    const detail = dom.window.document.getElementById("details")?.textContent || "";
    expect(detail).toContain("95%");
    expect(detail).toContain("90%");
  });

  it("moves understanding and confidence off the face for non-request items too", () => {
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

    // item_719: the same rule for non-request stages -- the face keeps complexity and age,
    // the values move to the detail rather than being dropped.
    const badge = dom.window.document.querySelector(".card__badge--metric");
    expect(badge?.textContent).not.toContain("88%");
    expect(badge?.textContent).not.toContain("84%");
    expect(badge?.textContent).toContain("H");
    // item_720: read from the panel the click opens, not from an inline copy of it.
    (dom.window.document.querySelector('[data-id="task_001"]') as HTMLElement | null)?.dispatchEvent(
      new dom.window.Event("click", { bubbles: true })
    );
    const detail = dom.window.document.getElementById("details")?.textContent || "";
    expect(detail).toContain("88%");
    expect(detail).toContain("84%");
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

  it("renders backlog priority badges with a default", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "item_001",
          stage: "backlog",
          indicators: {
            Priority: "High"
          }
        },
        {
          ...baseItem,
          id: "item_002",
          stage: "backlog",
          indicators: {}
        }
      ]
    });

    const meters = Array.from(dom.window.document.querySelectorAll(".card__priority-meter"));
    expect(meters.map((node) => node.getAttribute("aria-label"))).toEqual(["Priority: High", "Priority: Medium"]);
    expect(meters.map((node) => node.className.match(/card__priority-meter--(\w+)/)?.[1])).toEqual(["high", "medium"]);
    expect(meters.map((node) => node.querySelectorAll(".card__priority-bar--on").length)).toEqual([3, 2]);
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

  it("renders task coverage dots for active tasks only in board and list views", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "task_131_active",
          title: "Active task",
          stage: "task",
          relPath: "logics/tasks/task_131_active.md",
          path: "/workspace/mock/logics/tasks/task_131_active.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "task_141_active",
          title: "Second active task",
          stage: "task",
          relPath: "logics/tasks/task_141_active.md",
          path: "/workspace/mock/logics/tasks/task_141_active.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "item_010_followup",
          title: "Covered item",
          stage: "backlog",
          relPath: "logics/backlog/item_010_followup.md",
          path: "/workspace/mock/logics/backlog/item_010_followup.md",
          usedBy: [
            {
              id: "task_131_active",
              title: "Active task",
              stage: "task",
              relPath: "logics/tasks/task_131_active.md"
            }
          ]
        },
        {
          ...baseItem,
          id: "item_011_dual",
          title: "Dual-covered item",
          stage: "backlog",
          relPath: "logics/backlog/item_011_dual.md",
          path: "/workspace/mock/logics/backlog/item_011_dual.md",
          usedBy: [
            {
              id: "task_131_active",
              title: "Active task",
              stage: "task",
              relPath: "logics/tasks/task_131_active.md"
            },
            {
              id: "task_141_active",
              title: "Second active task",
              stage: "task",
              relPath: "logics/tasks/task_141_active.md"
            }
          ]
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const activeTaskCard = board?.querySelector('[data-id="task_131_active"]');
    const secondTaskCard = board?.querySelector('[data-id="task_141_active"]');
    const coveredCard = board?.querySelector('[data-id="item_010_followup"]');
    const dualCoveredCard = board?.querySelector('[data-id="item_011_dual"]');

    expect(activeTaskCard?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(secondTaskCard?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(coveredCard?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(dualCoveredCard?.querySelectorAll(".card__task-dot").length).toBe(2);
    expect(activeTaskCard?.querySelector(".card__task-dot")?.getAttribute("style")).not.toBe(
      secondTaskCard?.querySelector(".card__task-dot")?.getAttribute("style")
    );

    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(board?.querySelector('[data-id="task_131_active"]')?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(board?.querySelector('[data-id="task_141_active"]')?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(board?.querySelector('[data-id="item_010_followup"]')?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(board?.querySelector('[data-id="item_011_dual"]')?.querySelectorAll(".card__task-dot").length).toBe(2);
  });

  it("renders request badges before task dots when an item is linked to both request and task", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "req_201_origin",
          title: "Origin request",
          stage: "request",
          relPath: "logics/request/req_201_origin.md",
          path: "/workspace/mock/logics/request/req_201_origin.md"
        },
        {
          ...baseItem,
          id: "task_201_cover",
          title: "Cover task",
          stage: "task",
          relPath: "logics/tasks/task_201_cover.md",
          path: "/workspace/mock/logics/tasks/task_201_cover.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "item_201_linked",
          title: "Linked item",
          stage: "backlog",
          relPath: "logics/backlog/item_201_linked.md",
          path: "/workspace/mock/logics/backlog/item_201_linked.md",
          references: [{ kind: "request", label: "Request", path: "logics/request/req_201_origin.md" }],
          usedBy: [
            {
              id: "task_201_cover",
              title: "Cover task",
              stage: "task",
              relPath: "logics/tasks/task_201_cover.md"
            }
          ]
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const requestCard = board?.querySelector('[data-id="req_201_origin"]');
    const linkedCard = board?.querySelector('[data-id="item_201_linked"]');

    expect(requestCard?.querySelector(".card__request-badge")).toBeTruthy();
    expect(linkedCard?.querySelector(".card__request-badge")).toBeTruthy();
    expect(linkedCard?.querySelector(".card__task-dot")).toBeTruthy();
    expect(linkedCard?.querySelector(".card__request-badge")?.nextElementSibling?.classList.contains("card__task-dot-container")).toBe(true);
    expect(linkedCard?.querySelector(".card__request-badge")?.getAttribute("style")).not.toBe(
      linkedCard?.querySelector(".card__task-dot")?.getAttribute("style")
    );
  });

  it("keeps companion, metric, and linkage badges inside a single badge strip", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...productItem,
          id: "prod_201_companion",
          title: "Product companion",
          relPath: "logics/product/prod_201_companion.md",
          path: "/workspace/mock/logics/product/prod_201_companion.md"
        },
        {
          ...specItem,
          id: "spec_201_companion",
          title: "Spec companion",
          relPath: "logics/specs/spec_201_companion.md",
          path: "/workspace/mock/logics/specs/spec_201_companion.md"
        },
        {
          ...baseItem,
          id: "adr_201_companion",
          title: "Architecture companion",
          stage: "architecture",
          relPath: "logics/architecture/adr_201_companion.md",
          path: "/workspace/mock/logics/architecture/adr_201_companion.md"
        },
        {
          ...baseItem,
          id: "task_201_cover",
          title: "Cover task",
          stage: "task",
          relPath: "logics/tasks/task_201_cover.md",
          path: "/workspace/mock/logics/tasks/task_201_cover.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "req_201_compact",
          title: "Compact badge request",
          indicators: {
            Status: "Draft",
            Understanding: "92%",
            Confidence: "88%",
            Complexity: "High"
          },
          ageDays: 12,
          references: [
            { kind: "product", label: "Product", path: "logics/product/prod_201_companion.md" },
            { kind: "architecture", label: "ADR", path: "logics/architecture/adr_201_companion.md" },
            { kind: "spec", label: "Spec", path: "logics/specs/spec_201_companion.md" }
          ],
          usedBy: [
            {
              id: "task_201_cover",
              title: "Cover task",
              stage: "task",
              relPath: "logics/tasks/task_201_cover.md"
            }
          ]
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="req_201_compact"]') as HTMLElement | null;
    const badgeStrip = card?.querySelector(".card__badges--strip");
    const directBadgeContainers = Array.from(card?.children || []).filter((node) =>
      (node as HTMLElement).classList?.contains("card__badges")
    );

    expect(directBadgeContainers.length).toBe(1);
    expect(badgeStrip).toBeTruthy();
    expect(badgeStrip?.firstElementChild?.classList.contains("card__badges--metrics")).toBe(true);
    expect(badgeStrip?.textContent).not.toContain("PROD");
    expect(badgeStrip?.textContent).not.toContain("ADR");
    expect(badgeStrip?.textContent).not.toContain("SPEC");
    // item_719: the metric pill now carries age and complexity; the containment rule this
    // test guards is unchanged -- whatever the pill holds stays inside the one strip.
    expect(badgeStrip?.textContent).toContain("12d");
    expect(badgeStrip?.textContent).toContain("H");
    expect(badgeStrip?.textContent).not.toContain("92%");
    // item_720: these were read off the inline preview, which repeated the panel. They are
    // still reachable, from the panel the click opens.
    card?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const panelText = dom.window.document.getElementById("details")?.textContent || "";
    expect(panelText).toContain("prod_201_companion");
    expect(panelText).toContain("adr_201_companion");
    expect(panelText).toContain("spec_201_companion");
    expect(card?.querySelector(".card__request-badge")).toBeTruthy();
    expect(card?.querySelector(".card__task-dot-container")).toBeTruthy();
    expect(card?.querySelector(".card__request-badge")?.closest(".card__badges--strip")).toBeFalsy();
    expect(card?.querySelector(".card__task-dot-container")?.closest(".card__badges--strip")).toBeFalsy();
  });

  it("omits request badges when the request reference cannot be resolved", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "task_202_cover",
          title: "Cover task",
          stage: "task",
          relPath: "logics/tasks/task_202_cover.md",
          path: "/workspace/mock/logics/tasks/task_202_cover.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "item_202_broken",
          title: "Broken request link",
          stage: "backlog",
          relPath: "logics/backlog/item_202_broken.md",
          path: "/workspace/mock/logics/backlog/item_202_broken.md",
          references: [{ kind: "request", label: "Request", path: "logics/request/req_999_missing.md" }],
          usedBy: [
            {
              id: "task_202_cover",
              title: "Cover task",
              stage: "task",
              relPath: "logics/tasks/task_202_cover.md"
            }
          ]
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="item_202_broken"]');

    expect(card?.querySelector(".card__request-badge")).toBeFalsy();
    expect(card?.querySelectorAll(".card__task-dot").length).toBe(1);
  });

  it("resolves task coverage dots from usedBy path values as well as relPath values", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "task_181_active",
          title: "Path-backed task",
          stage: "task",
          relPath: "logics/tasks/task_181_active.md",
          path: "/workspace/mock/logics/tasks/task_181_active.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "item_030_path_used_by",
          title: "Path usedBy item",
          stage: "backlog",
          relPath: "logics/backlog/item_030_path_used_by.md",
          path: "/workspace/mock/logics/backlog/item_030_path_used_by.md",
          usedBy: [
            {
              id: "task_181_active",
              title: "Path-backed task",
              stage: "task",
              path: "/workspace/mock/logics/tasks/task_181_active.md"
            }
          ]
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="item_030_path_used_by"]');

    expect(card?.querySelectorAll(".card__task-dot").length).toBe(1);
  });

  it("renders overflow text when an item is covered by three active tasks", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [
        {
          ...baseItem,
          id: "task_131_alpha",
          title: "Alpha task",
          stage: "task",
          relPath: "logics/tasks/task_131_alpha.md",
          path: "/workspace/mock/logics/tasks/task_131_alpha.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "task_132_beta",
          title: "Beta task",
          stage: "task",
          relPath: "logics/tasks/task_132_beta.md",
          path: "/workspace/mock/logics/tasks/task_132_beta.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "task_133_gamma",
          title: "Gamma task",
          stage: "task",
          relPath: "logics/tasks/task_133_gamma.md",
          path: "/workspace/mock/logics/tasks/task_133_gamma.md",
          indicators: {
            Status: "Ready"
          }
        },
        {
          ...baseItem,
          id: "item_020_multi",
          title: "Multi-covered item",
          stage: "backlog",
          relPath: "logics/backlog/item_020_multi.md",
          path: "/workspace/mock/logics/backlog/item_020_multi.md",
          usedBy: [
            {
              id: "task_131_alpha",
              title: "Alpha task",
              stage: "task",
              relPath: "logics/tasks/task_131_alpha.md"
            },
            {
              id: "task_132_beta",
              title: "Beta task",
              stage: "task",
              relPath: "logics/tasks/task_132_beta.md"
            },
            {
              id: "task_133_gamma",
              title: "Gamma task",
              stage: "task",
              relPath: "logics/tasks/task_133_gamma.md"
            }
          ]
        }
      ]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="item_020_multi"]');

    expect(card?.querySelectorAll(".card__task-dot").length).toBe(1);
    expect(card?.querySelector(".card__task-dot-overflow")?.textContent).toBe("+2");
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

  it("gives a click one outcome: select the card and open the panel", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const board = dom.window.document.getElementById("board");
    const card = board?.querySelector('[data-id="req_000_kickoff"]');
    // item_720: a click did three things -- selected, expanded an inline preview, and grew
    // the card so every card below it moved under the pointer. It now has one outcome.
    // Hover and focus never opened anything and still must not; the card's content is the
    // same before and after the click, and only the selection and the panel change.
    const contentBefore = card?.innerHTML;

    card?.dispatchEvent(new dom.window.Event("mouseenter"));
    card?.dispatchEvent(new dom.window.Event("focus"));
    expect(card?.classList.contains("card--selected")).toBe(false);
    expect(card?.innerHTML).toBe(contentBefore);

    card?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const selectedCard = board?.querySelector('[data-id="req_000_kickoff"]') as HTMLElement | null;
    expect(selectedCard?.classList.contains("card--selected")).toBe(true);
    expect(selectedCard?.innerHTML).toBe(contentBefore);
    expect(selectedCard?.querySelector(".card__preview")).toBeNull();
    expect(dom.window.document.getElementById("details")?.classList.contains("details--collapsed")).toBe(false);
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
