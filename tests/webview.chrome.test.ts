import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, pushData } from "./webviewHarnessTestUtils";

describe("webview chrome toolbar and filter behavior", () => {
  it("highlights the filter toggle when non-default controls are active but panel is closed", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // Open filter panel, set a non-default control, then close panel
    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const hideCompleteToggle = dom.window.document.getElementById("hide-complete") as HTMLInputElement | null;
    if (hideCompleteToggle) {
      hideCompleteToggle.checked = false;
      hideCompleteToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    // Close the panel
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(filterToggle?.classList.contains("toolbar__filter--active")).toBe(true);
    expect(filterToggle?.getAttribute("data-has-active-controls")).toBe("true");
    expect(filterToggle?.getAttribute("aria-label")).toContain("non-default");
  });

  it("syncs group-by disabled state based on view mode", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // Open filter panel
    const filterToggle = dom.window.document.getElementById("filter-toggle");
    filterToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const groupBySelect = dom.window.document.getElementById("group-by") as HTMLSelectElement | null;
    // In board mode, groupBy should be disabled
    expect(groupBySelect?.disabled).toBe(true);

    // Switch to list mode
    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    // Now group-by should be enabled
    expect(groupBySelect?.disabled).toBe(false);
  });

  it("toggles attention mode and reflects button state", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const attentionToggle = dom.window.document.getElementById("attention-toggle");
    expect(attentionToggle?.getAttribute("aria-pressed")).toBe("false");
    expect(attentionToggle?.classList.contains("btn--active")).toBe(false);

    attentionToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(attentionToggle?.getAttribute("aria-pressed")).toBe("true");
    expect(attentionToggle?.classList.contains("btn--active")).toBe(true);
    expect(attentionToggle?.getAttribute("aria-label")).toContain("Showing");
  });

  it("toggles the workflow panel open and closed with correct ARIA state", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const workflowToggle = dom.window.document.getElementById("workflow-toggle");
    const toolsPanel = dom.window.document.getElementById("tools-panel");

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(false);

    workflowToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(true);
    expect(toolsPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(workflowToggle?.getAttribute("aria-expanded")).toBe("true");

    workflowToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(false);
    expect(workflowToggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("disables action buttons when no item is selected", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]') as HTMLButtonElement | null;
    const promoteButton = dom.window.document.querySelector('[data-action="promote"]') as HTMLButtonElement | null;
    const markDoneButton = dom.window.document.querySelector('[data-action="mark-done"]') as HTMLButtonElement | null;
    const readButton = dom.window.document.querySelector('[data-action="read"]') as HTMLButtonElement | null;

    expect(openButton?.disabled).toBe(true);
    expect(promoteButton?.disabled).toBe(true);
    expect(markDoneButton?.disabled).toBe(true);
    expect(readButton?.disabled).toBe(true);
    expect(openButton?.title).toContain("Select");
  });

  it("enables action buttons when an item is selected", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]') as HTMLButtonElement | null;
    const markDoneButton = dom.window.document.querySelector('[data-action="mark-done"]') as HTMLButtonElement | null;

    expect(openButton?.disabled).toBe(false);
    expect(markDoneButton?.disabled).toBe(false);
  });

  it("updates the view mode toggle icon and ARIA label when switching modes", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]') as HTMLButtonElement | null;

    // Initially in board mode
    expect(viewModeToggle?.dataset.currentMode).toBe("board");
    expect(viewModeToggle?.getAttribute("aria-label")).toContain("board");
    expect(viewModeToggle?.getAttribute("aria-label")).toContain("list");

    // Switch to list
    viewModeToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(viewModeToggle?.dataset.currentMode).toBe("list");
    expect(viewModeToggle?.getAttribute("aria-label")).toContain("list");
  });

  it("forces list mode and disables the view toggle below 500px", () => {
    const { dom, setNarrow } = bootstrapWebview({ narrow: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const viewModeToggle = dom.window.document.querySelector('[data-action="toggle-view-mode"]') as HTMLButtonElement | null;

    expect(viewModeToggle?.disabled).toBe(true);
    expect(viewModeToggle?.dataset.currentMode).toBe("list");
    expect(viewModeToggle?.getAttribute("aria-label")).toContain("required");

    // Restore to wider viewport
    setNarrow(false);

    // Re-push data to trigger render
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    expect(viewModeToggle?.disabled).toBe(false);
  });

  it("shows help banner when no items are loaded", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: []
    });

    const helpBanner = dom.window.document.getElementById("help-banner");
    const helpBannerCopy = dom.window.document.getElementById("help-banner-copy");

    expect(helpBanner?.hidden).toBe(false);
    expect(helpBannerCopy?.textContent).toContain("No Logics items");
  });

  it("shows help banner with selection guidance when items exist but none selected", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const helpBannerCopy = dom.window.document.getElementById("help-banner-copy");
    expect(helpBannerCopy?.textContent).toContain("Select a card");
  });

  it("hides help banner once an item is selected", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const helpBanner = dom.window.document.getElementById("help-banner");
    expect(helpBanner?.hidden).toBe(true);
  });

  it("dismisses help banner permanently on dismiss button click", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const helpBannerDismiss = dom.window.document.getElementById("help-banner-dismiss");
    helpBannerDismiss?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const helpBanner = dom.window.document.getElementById("help-banner");
    expect(helpBanner?.hidden).toBe(true);

    // Re-push data - banner should stay hidden
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    expect(helpBanner?.hidden).toBe(true);
  });

  it("toggles activity panel and reflects the button's pressed state", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const activityToggle = dom.window.document.getElementById("activity-toggle");
    const activityPanel = dom.window.document.getElementById("activity-panel");
    const board = dom.window.document.getElementById("board");

    expect(activityPanel?.hidden).toBe(true);
    expect(activityToggle?.getAttribute("aria-pressed")).toBe("false");

    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(activityPanel?.hidden).toBe(false);
    expect(board?.hidden).toBe(true);
    expect(activityToggle?.getAttribute("aria-pressed")).toBe("true");
    expect(activityToggle?.getAttribute("aria-label")).toContain("Hide");
  });

  it("posts assist actions in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const commitAllButton = dom.window.document.querySelector('[data-action="assist-commit-all"]');
    commitAllButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((m) => m.type === "assist-commit-all")).toBe(true);
  });
});
