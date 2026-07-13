import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { baseItem, bootstrapWebview, pushData } from "./webviewHarnessTestUtils";

describe("webview chrome toolbar and filter behavior", () => {
  it("only draws the filter badge from the non-default controls flag", () => {
    const css = readFileSync(join(process.cwd(), "clients/shared-web/media/css/toolbar.css"), "utf8");

    expect(css).toContain('#filter-toggle[data-has-active-controls="true"]::after');
    expect(css).not.toContain(".toolbar__filter--active::after");
  });

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

  it("toggles the tools panel open and closed with correct ARIA state", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const toolsToggle = dom.window.document.getElementById("tools-toggle");
    const toolsPanel = dom.window.document.getElementById("tools-panel");

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(false);

    toolsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(true);
    expect(toolsPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(toolsToggle?.getAttribute("aria-expanded")).toBe("true");

    toolsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(false);
    expect(toolsToggle?.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the tools panel from the compact close button", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const toolsToggle = dom.window.document.getElementById("tools-toggle");
    const toolsPanel = dom.window.document.getElementById("tools-panel");
    const closeButton = dom.window.document.querySelector("[data-tools-panel-close]");

    toolsToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(true);

    closeButton?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(false);
    expect(toolsToggle?.getAttribute("aria-expanded")).toBe("false");
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

  it("enables the change-status action when selected and posts the message on click", () => {
    const { dom, postedMessages } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const changeStatusButton = dom.window.document.querySelector('[data-action="change-status"]') as HTMLButtonElement | null;

    expect(changeStatusButton?.disabled).toBe(false);
    expect(changeStatusButton?.title).toContain("Change status of selected item");

    changeStatusButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "change-status")).toBe(true);
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
    expect(viewModeToggle?.hidden).toBe(true);
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
    expect(viewModeToggle?.hidden).toBe(false);
  });

  it("hides help banner when no items are loaded", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: []
    });

    const helpBanner = dom.window.document.getElementById("help-banner");
    const helpBannerCopy = dom.window.document.getElementById("help-banner-copy");

    expect(helpBanner?.hidden).toBe(true);
    expect(helpBannerCopy?.textContent).toBe("");
  });

  it("hides help banner when items exist but none selected", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const helpBanner = dom.window.document.getElementById("help-banner");
    const helpBannerCopy = dom.window.document.getElementById("help-banner-copy");
    expect(helpBanner?.hidden).toBe(true);
    expect(helpBannerCopy?.textContent).toBe("");
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

  it("opens activity by default and toggles back to project", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const activityToggle = dom.window.document.getElementById("activity-toggle");
    const activityPanel = dom.window.document.getElementById("activity-panel");
    const board = dom.window.document.getElementById("board");

    expect(activityPanel?.hidden).toBe(false);
    expect(board?.hidden).toBe(true);
    expect(activityToggle?.getAttribute("aria-pressed")).toBe("true");
    expect(activityToggle?.getAttribute("aria-label")).toContain("Hide");

    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(activityPanel?.hidden).toBe(true);
    expect(board?.hidden).toBe(false);
    expect(activityToggle?.getAttribute("aria-pressed")).toBe("false");
    expect(activityToggle?.getAttribute("aria-label")).toContain("Show");
  });

  it("keeps Project open when a previous session selected it", () => {
    const { dom } = bootstrapWebview({
      initialState: {
        workspaceRoot: "/workspace/mock",
        activityPanelOpen: false
      }
    });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem],
      activityEvents: [{ id: "new-event", kind: "git", title: "New event" }]
    });

    expect(dom.window.document.getElementById("activity-panel")?.hidden).toBe(true);
    expect(dom.window.document.getElementById("board")?.hidden).toBe(false);
    expect(dom.window.document.getElementById("activity-toggle")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("preserves the activity feed scroll position across re-renders", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const list = dom.window.document.querySelector(".activity-panel__list") as HTMLElement | null;
    expect(list).toBeTruthy();
    if (list) {
      list.scrollTop = 120;
    }

    // An auto-refresh re-pushes the same payload; the feed must not snap to the top.
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const nextList = dom.window.document.querySelector(".activity-panel__list") as HTMLElement | null;
    expect(nextList).toBeTruthy();
    expect(nextList?.scrollTop).toBe(120);
  });

  it("hides corpus document entries when the corpus activity filter is unchecked", () => {
    const { dom } = bootstrapWebview();

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    // The document change for baseItem is a corpus entry and shows by default.
    const entriesBefore = dom.window.document.querySelectorAll(".activity-panel__entry");
    expect(entriesBefore.length).toBeGreaterThan(0);

    const corpusToggle = dom.window.document.getElementById("activity-filter-corpus") as HTMLInputElement | null;
    expect(corpusToggle).toBeTruthy();
    if (corpusToggle) {
      corpusToggle.checked = false;
      corpusToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const entriesAfter = dom.window.document.querySelectorAll(".activity-panel__entry");
    expect(entriesAfter.length).toBe(0);

    const filterToggle = dom.window.document.getElementById("activity-filter-toggle");
    expect(filterToggle?.classList.contains("toolbar__filter--active")).toBe(true);
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

describe("recent activity feed legibility (req_284)", () => {
  const events = [
    { id: "ci-ok", kind: "ci", stage: "ci", marker: "C", title: "deploy.yml", label: "success", workflow: "deploy.yml", outcome: "success", badgeState: "success", updatedAt: "2024-06-01T00:02:00.000Z" },
    { id: "ci-bad", kind: "ci", stage: "ci", marker: "C", title: "build.yml", label: "failure", workflow: "build.yml", outcome: "failure", badgeState: "failure", updatedAt: "2024-06-01T00:01:00.000Z" },
    { id: "git-commit-abc1234", kind: "git", stage: "git", marker: "G", action: "Commit", title: "Fix the thing", branch: "main", sha: "abc1234", updatedAt: "2024-06-01T00:00:30.000Z" },
    { id: "git-nobranch", kind: "git", stage: "git", marker: "G", action: "Commit", title: "No branch", sha: "def5678", updatedAt: "2024-06-01T00:00:00.000Z" }
  ];

  const markerOf = (dom: ReturnType<typeof bootstrapWebview>["dom"], id: string) =>
    dom.window.document.querySelector(`.activity-panel__entry[data-id="${id}"] .activity-panel__marker`);
  const metaOf = (dom: ReturnType<typeof bootstrapWebview>["dom"], id: string) =>
    dom.window.document.querySelector(`.activity-panel__entry[data-id="${id}"] .activity-panel__meta`)?.textContent ?? "";

  it("colours CI markers by badge state and shows per-kind glyphs (item_516)", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, { root: "/workspace/mock", items: [baseItem], activityEvents: events });

    expect(markerOf(dom, "ci-ok")?.getAttribute("data-badge-state")).toBe("success");
    expect(markerOf(dom, "ci-ok")?.textContent).toBe("✓");
    expect(markerOf(dom, "ci-bad")?.getAttribute("data-badge-state")).toBe("failure");
    expect(markerOf(dom, "ci-bad")?.textContent).toBe("✗");
    expect(markerOf(dom, "git-commit-abc1234")?.textContent).toBe("⎇");
    // kind/id stay reachable in the accessible label and tooltip.
    expect(markerOf(dom, "ci-ok")?.getAttribute("aria-label")).toContain("ci-ok");
    expect(markerOf(dom, "ci-ok")?.getAttribute("title")).toContain("ci-ok");
  });

  it("recomposes git and CI activity lines into human summaries (item_517)", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, { root: "/workspace/mock", items: [baseItem], activityEvents: events });

    expect(metaOf(dom, "ci-ok")).toContain("deploy.yml · success");
    expect(metaOf(dom, "git-commit-abc1234")).toContain("Commit · main @ abc1234");
    // Degrades gracefully: no branch -> "action · sha", with no dangling " @ ".
    expect(metaOf(dom, "git-nobranch")).toContain("Commit · def5678");
    expect(metaOf(dom, "git-nobranch")).not.toContain(" @ ");
  });
});
