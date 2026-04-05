import { describe, expect, it } from "vitest";
import {
  architectureItem,
  baseItem,
  bootstrapWebview,
  createDirectoryHandle,
  productItem,
  pushData,
  specItem
} from "./webviewHarnessTestUtils";

describe("webview harness core behaviors", () => {
  it("renders host error payloads as plain text instead of HTML", () => {
    const { dom } = bootstrapWebview({ harness: true });

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          type: "data",
          payload: {
            root: "/workspace/mock",
            items: [],
            error: 'Broken <strong>markup</strong> in /tmp/<repo>'
          }
        }
      })
    );

    const board = dom.window.document.getElementById("board");
    expect(board?.innerHTML).toContain("&lt;strong&gt;");
    expect(board?.textContent).toContain("Broken <strong>markup</strong> in /tmp/<repo>");
  });

  it("uses host-provided bootstrap titles when bootstrap is unavailable", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      canBootstrapLogics: false,
      bootstrapLogicsTitle: "Bootstrap unavailable until the current logics/skills setup is repaired",
      items: [baseItem]
    });

    const bootstrapButton = dom.window.document.querySelector('[data-action="bootstrap-logics"]') as HTMLButtonElement | null;
    expect(bootstrapButton?.disabled).toBe(true);
    expect(bootstrapButton?.title).toBe(
      "Bootstrap unavailable until the current logics/skills setup is repaired"
    );
  });

  it("keeps the tools menu grouped with a recommended section", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      canBootstrapLogics: true,
      bootstrapLogicsTitle: "Bootstrap Logics in this project",
      items: [baseItem]
    });

    const sections = Array.from(dom.window.document.querySelectorAll("[data-tools-section]"));
    expect(sections.length).toBeGreaterThanOrEqual(6);

    const recommendedActions = Array.from(
      dom.window.document.querySelectorAll('[data-tools-body="recommended"] [data-action]')
    ).map((element) => element.getAttribute("data-action"));
    expect(recommendedActions).toEqual(["bootstrap-logics", "check-environment", "change-project-root"]);
  });

  it("promotes Check Environment into recommended when the payload marks it as state-relevant", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      shouldRecommendCheckEnvironment: true,
      items: [baseItem]
    });

    const recommendedActions = Array.from(
      dom.window.document.querySelectorAll('[data-tools-body="recommended"] [data-action]')
    ).map((element) => element.getAttribute("data-action"));
    expect(recommendedActions).toEqual(["check-environment", "change-project-root"]);
  });

  it("disables Publish Release when the host marks GitHub release publication unavailable", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      canPublishRelease: false,
      publishReleaseTitle: "Publish Release requires GitHub CLI (`gh`) on PATH.",
      items: [baseItem]
    });

    const publishButton = dom.window.document.querySelector('[data-action="assist-publish-release"]') as HTMLButtonElement | null;
    expect(publishButton?.disabled).toBe(true);
    expect(publishButton?.title).toBe("Publish Release requires GitHub CLI (`gh`) on PATH.");
  });

  it("switches the tools panel between workflow and system views", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const workflowView = dom.window.document.getElementById("tools-view-workflow");
    const systemView = dom.window.document.getElementById("tools-view-system");
    const systemTab = dom.window.document.querySelector('[data-tools-view-toggle="system"]') as HTMLButtonElement | null;

    expect(workflowView?.hidden).toBe(false);
    expect(systemView?.hidden).toBe(true);
    expect(systemTab?.getAttribute("aria-selected")).toBe("false");

    systemTab?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(workflowView?.hidden).toBe(true);
    expect(systemView?.hidden).toBe(false);
    expect(systemTab?.getAttribute("aria-selected")).toBe("true");
  });

  it("opens selected item in harness mode without posting open message", async () => {
    const { dom, postedMessages, openedUrls } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(openedUrls.length).toBeGreaterThan(0);
    expect(postedMessages.some((message) => message.type === "open")).toBe(false);
  });

  it("uses the browser directory picker fallback for change project root in harness mode", async () => {
    let pickerCalls = 0;
    const { dom, postedMessages, setProjectRootCalls } = bootstrapWebview({
      harness: true,
      showDirectoryPicker: async () => {
        pickerCalls += 1;
        return { name: "repo-root" };
      }
    });

    const button = dom.window.document.querySelector('[data-action="change-project-root"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pickerCalls).toBe(1);
    expect(setProjectRootCalls).toContain("repo-root");
    expect(postedMessages.some((message) => message.type === "change-project-root")).toBe(false);
  });

  it("uses selected directory handle content for edit preview in harness mode", async () => {
    const rootHandle = createDirectoryHandle("repo-root", {
      dirs: {
        logics: {
          dirs: {
            request: {
              files: {
                "req_000_kickoff.md": "# Kickoff"
              }
            }
          }
        }
      }
    });
    const { dom, openedUrls, fetchCalls } = bootstrapWebview({
      harness: true,
      showDirectoryPicker: async () => rootHandle
    });

    const changeRootButton = dom.window.document.querySelector('[data-action="change-project-root"]');
    changeRootButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(openedUrls).toContain("");
    expect(fetchCalls.length).toBe(0);
  });

  it("keeps VS Code message routing in non-harness mode for open, change root, and select agent", () => {
    const { dom, postedMessages, openedUrls } = bootstrapWebview({ harness: false });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const openButton = dom.window.document.querySelector('[data-action="open"]');
    const changeRootButton = dom.window.document.querySelector('[data-action="change-project-root"]');
    const selectAgentButton = dom.window.document.querySelector('[data-action="select-agent"]');
    openButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    changeRootButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    selectAgentButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open")).toBe(true);
    expect(postedMessages.some((message) => message.type === "change-project-root")).toBe(true);
    expect(postedMessages.some((message) => message.type === "select-agent")).toBe(true);
    expect(openedUrls.length).toBe(0);
  });

  it("posts guided new-request action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const guidedButton = dom.window.document.querySelector('[data-action="new-request-guided"]');
    guidedButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "new-request-guided")).toBe(true);
  });

  it("posts check-environment action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const button = dom.window.document.querySelector('[data-action="check-environment"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "check-environment")).toBe(true);
  });

  it("posts open-onboarding action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const button = dom.window.document.querySelector('[data-action="open-onboarding"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open-onboarding")).toBe(true);
  });

  it("posts runtime launcher and repair actions in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const launchClaudeButton = dom.window.document.querySelector('[data-action="launch-claude"]');
    const repairButton = dom.window.document.querySelector('[data-action="repair-logics-kit"]');
    launchClaudeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    repairButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "launch-claude")).toBe(true);
    expect(postedMessages.some((message) => message.type === "repair-logics-kit")).toBe(true);
  });

  it("posts create companion doc action from tools in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const createCompanionDocButton = dom.window.document.querySelector('[data-action="create-companion-doc"]');
    createCompanionDocButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(
      postedMessages.some((message) => message.type === "create-companion-doc" && message.id === "req_000_kickoff")
    ).toBe(true);
  });

  it("disables use-workspace-root when payload indicates no override", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      canResetProjectRoot: false,
      items: [baseItem]
    });

    const resetButton = dom.window.document.querySelector(
      '[data-action="reset-project-root"]'
    ) as HTMLButtonElement | null;
    expect(resetButton?.disabled).toBe(true);

    pushData(dom, {
      root: "/workspace/mock/other",
      canResetProjectRoot: true,
      items: [baseItem]
    });
    expect(resetButton?.disabled).toBe(false);
  });

  it("uses host-provided launcher and repair availability in the tools menu", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      canLaunchCodex: false,
      launchCodexTitle: "Codex CLI not found on PATH",
      canLaunchClaude: false,
      launchClaudeTitle: "Claude CLI not found on PATH",
      canRepairLogicsKit: false,
      repairLogicsKitTitle: "Select a project root first",
      items: [baseItem]
    });

    const launchCodexButton = dom.window.document.querySelector(
      '[data-action="launch-codex-overlay"]'
    ) as HTMLButtonElement | null;
    const launchClaudeButton = dom.window.document.querySelector(
      '[data-action="launch-claude"]'
    ) as HTMLButtonElement | null;
    const repairButton = dom.window.document.querySelector(
      '[data-action="repair-logics-kit"]'
    ) as HTMLButtonElement | null;

    expect(launchCodexButton?.disabled).toBe(true);
    expect(launchCodexButton?.title).toBe("Codex CLI not found on PATH");
    expect(launchClaudeButton?.disabled).toBe(true);
    expect(launchClaudeButton?.title).toBe("Claude CLI not found on PATH");
    expect(repairButton?.disabled).toBe(true);
    expect(repairButton?.title).toBe("Select a project root first");
  });

  it("switches to list mode and persists view mode state", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const modeButton = dom.window.document.querySelector('[data-action="toggle-view-mode"]');
    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const board = dom.window.document.getElementById("board");
    expect(board?.classList.contains("board--list")).toBe(true);
    expect(modeButton?.getAttribute("data-current-mode")).toBe("list");
    expect(modeButton?.getAttribute("aria-pressed")).toBe("true");
    expect(dom.window.document.querySelectorAll(".list-view__section").length).toBeGreaterThan(0);
    expect(persistedStates.some((state) => state.viewMode === "list")).toBe(true);
  });

  it("forces list mode below 500px and restores the saved mode above that threshold", () => {
    const { dom, setNarrow } = bootstrapWebview({ harness: true, narrow: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]') as HTMLButtonElement | null;

    expect(board?.classList.contains("board--list")).toBe(true);
    expect(modeButton?.dataset.currentMode).toBe("list");
    expect(modeButton?.disabled).toBe(true);

    setNarrow(false);

    expect(board?.classList.contains("board--list")).toBe(false);
    expect(modeButton?.dataset.currentMode).toBe("board");
    expect(modeButton?.disabled).toBe(false);
  });

  it("allows collapsing and expanding list groups and persists their state", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');
    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const getHeader = () =>
      document.querySelector('.list-view__section[data-stage="request"] .list-view__header') as HTMLButtonElement | null;
    const getBody = () => document.getElementById("list-section-request");

    expect(getHeader()?.getAttribute("aria-expanded")).toBe("true");
    expect(getBody()?.hidden).toBe(false);

    getHeader()?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const collapsedHeader = getHeader();
    const collapsedBody = getBody();
    expect(collapsedHeader?.getAttribute("aria-expanded")).toBe("false");
    expect(collapsedBody?.hidden).toBe(true);
    expect(
      persistedStates.some((state) => Array.isArray(state.collapsedListStages) && state.collapsedListStages.includes("request"))
    ).toBe(true);

    collapsedHeader?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const expandedHeader = getHeader();
    const expandedBody = getBody();
    expect(expandedHeader?.getAttribute("aria-expanded")).toBe("true");
    expect(expandedBody?.hidden).toBe(false);
  });

  it("supports directional keyboard navigation across board columns and rows", () => {
    const requestFollowup = {
      ...baseItem,
      id: "req_001_followup",
      title: "Followup"
    };
    const backlogItem = {
      ...baseItem,
      id: "item_001_plan_followup",
      title: "Plan Followup",
      stage: "backlog"
    };
    const taskItem = {
      ...baseItem,
      id: "task_001_ship_followup",
      title: "Ship Followup",
      stage: "task"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem, requestFollowup, backlogItem, taskItem]
    });

    const document = dom.window.document;
    const getSelectedCard = () => document.querySelector(".card--selected") as HTMLDivElement | null;

    getSelectedCard()?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(getSelectedCard()?.dataset.id).toBe("req_001_followup");

    getSelectedCard()?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(getSelectedCard()?.dataset.id).toBe("item_001_plan_followup");

    getSelectedCard()?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(getSelectedCard()?.dataset.id).toBe("task_001_ship_followup");
  });

  it("supports keyboard open and read actions from cards", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const getCard = () => document.querySelector('.card[data-id="req_000_kickoff"]') as HTMLDivElement | null;

    getCard()?.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true
      })
    );
    expect(postedMessages.some((message) => message.type === "read" && message.id === "req_000_kickoff")).toBe(true);

    getCard()?.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true
      })
    );
    expect(postedMessages.some((message) => message.type === "open" && message.id === "req_000_kickoff")).toBe(true);
  });

  it("supports collapsing and expanding list groups from the keyboard", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const document = dom.window.document;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');
    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const getCard = () => document.querySelector('.card[data-id="req_000_kickoff"]') as HTMLDivElement | null;
    const getHeader = () =>
      document.querySelector('.list-view__section[data-stage="request"] .list-view__header') as HTMLButtonElement | null;
    const getBody = () => document.getElementById("list-section-request");

    getCard()?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(getHeader()?.getAttribute("aria-expanded")).toBe("false");
    expect(getBody()?.hidden).toBe(true);
    expect(document.activeElement).toBe(getHeader());

    getHeader()?.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(getHeader()?.getAttribute("aria-expanded")).toBe("true");
    expect(getBody()?.hidden).toBe(false);
  });

  it("filters visible items instantly from the global search input", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, productItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;

    if (searchInput) {
      searchInput.value = "draft";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    expect(board?.textContent).toContain("Kickoff");
    expect(board?.textContent).not.toContain("Plugin UX");

    if (searchInput) {
      searchInput.value = "";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    expect(board?.textContent).toContain("Kickoff");
    expect(board?.textContent).toContain("Plugin companion UX");
  });

  it("applies search after filters and works in list mode", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, specItem]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');
    const hideSpecToggle = document.getElementById("hide-spec") as HTMLInputElement | null;

    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    if (searchInput) {
      searchInput.value = "spec";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    expect(board?.textContent).toContain('No items match search "spec".');

    if (hideSpecToggle) {
      hideSpecToggle.checked = false;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    expect(board?.classList.contains("board--list")).toBe(true);
    expect(board?.textContent).toContain("Reference Contract Spec");
  });

  it("supports status grouping in list mode", () => {
    const requestProposed = {
      ...baseItem,
      id: "req_001_status_proposed",
      title: "Status Proposed",
      indicators: {
        Status: "Proposed"
      }
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, requestProposed]
    });

    const document = dom.window.document;
    const modeButton = document.querySelector('[data-action="toggle-view-mode"]');
    const groupBySelect = document.getElementById("group-by") as HTMLSelectElement | null;

    modeButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    if (groupBySelect) {
      groupBySelect.value = "status";
      groupBySelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const sectionLabels = Array.from(document.querySelectorAll(".list-view__header")).map((header) =>
      header.textContent?.replace(/[▾▸]/g, "").replace(/\s+/g, " ").trim()
    );

    expect(sectionLabels).toContain("Draft (1)");
    expect(sectionLabels).toContain("Proposed (1)");
  });

  it("sorts board cards by most recently updated when requested", () => {
    const olderRequest = {
      ...baseItem,
      id: "req_001_older",
      title: "Older request",
      updatedAt: "2024-01-01T00:00:00.000Z"
    };
    const newerRequest = {
      ...baseItem,
      id: "req_002_newer",
      title: "Newer request",
      updatedAt: "2024-02-01T00:00:00.000Z"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [olderRequest, newerRequest]
    });

    const document = dom.window.document;
    const sortBySelect = document.getElementById("sort-by") as HTMLSelectElement | null;
    if (sortBySelect) {
      sortBySelect.value = "updated-desc";
      sortBySelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

    const cardTitles = Array.from(document.querySelectorAll('.column[data-stage="request"] .card__title')).map((node) =>
      node.textContent?.trim()
    );
    expect(cardTitles).toEqual(["Newer request", "Older request"]);
  });

  it("filters the view down to explicit attention-required items", () => {
    const blockedTask = {
      ...baseItem,
      id: "task_001_blocked",
      title: "Blocked task",
      stage: "task",
      indicators: {
        Status: "Blocked"
      }
    };
    const healthyTask = {
      ...baseItem,
      id: "task_002_healthy",
      title: "Healthy task",
      stage: "task",
      indicators: {
        Status: "In progress"
      }
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, blockedTask, healthyTask]
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const attentionToggle = document.getElementById("attention-toggle");

    attentionToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(board?.textContent).toContain("Kickoff");
    expect(board?.textContent).toContain("Blocked task");
    expect(board?.textContent).not.toContain("Healthy task");
    expect(attentionToggle?.getAttribute("aria-pressed")).toBe("true");
  });

  it("shows a recent activity panel and lets users jump back to an item", () => {
    const olderItem = {
      ...baseItem,
      id: "req_001_older_activity",
      title: "Older activity",
      updatedAt: "2024-01-01T00:00:00.000Z"
    };
    const newerItem = {
      ...baseItem,
      id: "task_001_recent_activity",
      title: "Recent activity",
      stage: "task",
      updatedAt: "2024-03-01T00:00:00.000Z",
      indicators: {
        Status: "Done"
      }
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [olderItem, newerItem]
    });

    const document = dom.window.document;
    const activityToggle = document.getElementById("activity-toggle");
    const activityPanel = document.getElementById("activity-panel");
    const board = document.getElementById("board");

    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const entries = Array.from(document.querySelectorAll(".activity-panel__entry"));
    expect(activityPanel?.hidden).toBe(false);
    expect(board?.hidden).toBe(true);
    expect(entries[0]?.textContent).toContain("Recent activity");
    expect(entries[0]?.textContent).toContain("Marked done");
    expect(entries[1]?.textContent).toContain("Older activity");

    entries[0]?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.querySelector(".card--selected")?.getAttribute("data-id")).toBe("task_001_recent_activity");
  });

  it("shows more precise Updated values for recently changed cards", () => {
    const recentItem = {
      ...baseItem,
      id: "req_004_recent_precision",
      title: "Recent precision",
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: recentItem.id,
      items: [recentItem]
    });

    const document = dom.window.document;
    const card = document.querySelector('.card[data-id="req_004_recent_precision"]') as HTMLDivElement | null;

    card?.dispatchEvent(new dom.window.MouseEvent("mouseenter", { bubbles: true }));

    const preview = card?.querySelector(".card__preview");
    expect(preview?.textContent).toContain("Updated");
    expect(preview?.textContent).toContain("ago");
  });

  it("updates details from activity even when the selected item is filtered out of the board", () => {
    const hiddenBySearch = {
      ...baseItem,
      id: "req_002_hidden_from_board",
      title: "Hidden from board but visible in activity",
      updatedAt: "2024-04-01T00:00:00.000Z"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, hiddenBySearch]
    });

    const document = dom.window.document;
    const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
    const activityToggle = document.getElementById("activity-toggle");
    const detailsTitle = document.getElementById("details-title");

    if (searchInput) {
      searchInput.value = "kickoff only";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Hidden from board but visible in activity")
    );
    entry?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(detailsTitle?.textContent).toContain("Hidden from board but visible in activity");
  });

  it("reads an item when recent activity is double-clicked in non-harness mode", () => {
    const recentItem = {
      ...baseItem,
      id: "req_003_activity_read_target",
      title: "Activity read target",
      updatedAt: "2024-05-01T00:00:00.000Z"
    };
    const { dom, postedMessages } = bootstrapWebview({ harness: false });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, recentItem]
    });

    const document = dom.window.document;
    const activityToggle = document.getElementById("activity-toggle");

    activityToggle?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Activity read target")
    );
    entry?.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "req_003_activity_read_target")).toBe(true);
  });

  it("shows updated metadata inside activity cells", () => {
    const recentItem = {
      ...baseItem,
      id: "req_004_activity_updated",
      title: "Activity updated target",
      updatedAt: "2024-05-01T10:00:00.000Z"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, recentItem]
    });

    const document = dom.window.document;
    document.getElementById("activity-toggle")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Activity updated target")
    );
    expect(entry?.querySelector(".activity-panel__updated")?.textContent).toContain("Updated:");
  });

  it("degrades gracefully when an activity item has no valid updated timestamp", () => {
    const invalidItem = {
      ...baseItem,
      id: "req_005_activity_unknown",
      title: "Activity unknown timestamp",
      updatedAt: "not-a-date"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [invalidItem]
    });

    const document = dom.window.document;
    document.getElementById("activity-toggle")?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Activity unknown timestamp")
    );
    expect(entry?.querySelector(".activity-panel__updated")?.textContent).toBe("Updated: Unknown");
  });

  it("hides promote and add-docs badges on cards while keeping other suggested actions", () => {
    const orphanProduct = {
      ...productItem,
      references: [],
      usedBy: []
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, orphanProduct]
    });

    const document = dom.window.document;
    const requestCard = document.querySelector('.card[data-id="req_000_kickoff"]');
    const productCard = document.querySelector('.card[data-id="prod_000_plugin_ux"]');

    expect(requestCard?.textContent).not.toContain("Promote");
    expect(requestCard?.textContent).not.toContain("Add docs");
    expect(productCard?.textContent).toContain("Link flow");
  });

  it("shows actionable empty-state guidance when no items are available", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: []
    });

    const document = dom.window.document;
    const board = document.getElementById("board");
    const helpBanner = document.getElementById("help-banner");

    expect(board?.textContent).toContain("New Request");
    expect(board?.textContent).toContain("Bootstrap Logics");
    expect(helpBanner?.hidden).toBe(false);
  });

  it("shows and dismisses contextual onboarding help without breaking the details empty state", () => {
    const { dom, persistedStates } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem]
    });

    const document = dom.window.document;
    const helpBanner = document.getElementById("help-banner");
    const helpBannerDismiss = document.getElementById("help-banner-dismiss");
    const detailsBody = document.getElementById("details-body");

    expect(helpBanner?.textContent).toContain("Use Search");
    expect(detailsBody?.textContent).toContain("Use Search or Attention");

    helpBannerDismiss?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(helpBanner?.hidden).toBe(true);
    expect(persistedStates.some((state) => state.helpDismissed === true)).toBe(true);
  });

  it("renders stronger health signals for blocked and orphaned items", () => {
    const blockedTask = {
      ...baseItem,
      id: "task_003_blocked_health",
      title: "Blocked health task",
      stage: "task",
      indicators: {
        Status: "Blocked"
      }
    };
    const orphanProduct = {
      ...productItem,
      references: [],
      usedBy: []
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [blockedTask, orphanProduct]
    });

    const document = dom.window.document;
    const blockedCard = document.querySelector('.card[data-id="task_003_blocked_health"]');
    const orphanCard = document.querySelector('.card[data-id="prod_000_plugin_ux"]');

    expect(blockedCard?.classList.contains("card--health-alert")).toBe(true);
    expect(blockedCard?.textContent).toContain("Blocked");
    expect(orphanCard?.classList.contains("card--health-alert")).toBe(true);
    expect(orphanCard?.textContent).toContain("Orphaned");
    expect(orphanCard?.textContent).toContain("Link flow");
  });

  it("shows a compact preview on hover and dismisses it cleanly", () => {
    const previewItem = {
      ...baseItem,
      updatedAt: "2024-02-03T00:00:00.000Z",
      references: [{ kind: "manual", label: "Reference", path: "logics/product/prod_000_plugin_ux.md" }],
      usedBy: [
        {
          id: "item_001_plan_followup",
          title: "Plan Followup",
          stage: "backlog",
          relPath: "logics/backlog/item_001_plan_followup.md"
        }
      ]
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
    expect(getPreview()?.textContent).toContain("References");
    expect(getPreview()?.textContent).toContain("Used by");

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
});
