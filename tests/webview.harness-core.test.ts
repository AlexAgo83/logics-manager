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
      bootstrapLogicsTitle: "Bootstrap unavailable until the current Logics runtime setup is repaired",
      items: [baseItem]
    });

    const bootstrapButton = dom.window.document.querySelector('[data-action="bootstrap-logics"]') as HTMLButtonElement | null;
    expect(bootstrapButton?.disabled).toBe(true);
    expect(bootstrapButton?.title).toBe(
      "Bootstrap unavailable until the current Logics runtime setup is repaired"
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
    const toolsPanel = dom.window.document.getElementById("tools-panel") as HTMLDivElement | null;
    const toolsToggle = dom.window.document.getElementById("tools-toggle") as HTMLButtonElement | null;
    const workflowSwitch = dom.window.document.querySelector('[data-tools-view-switch="workflow"]') as HTMLButtonElement | null;
    const systemSwitch = dom.window.document.querySelector('[data-tools-view-switch="system"]') as HTMLButtonElement | null;

    expect(workflowView?.hidden).toBe(false);
    expect(systemView?.hidden).toBe(true);
    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(false);
    expect(toolsToggle?.getAttribute("aria-expanded")).toBe("false");
    expect(workflowSwitch?.getAttribute("aria-selected")).toBe("true");
    expect(systemSwitch?.getAttribute("aria-selected")).toBe("false");

    systemSwitch?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(workflowView?.hidden).toBe(true);
    expect(systemView?.hidden).toBe(false);
    expect(toolsPanel?.classList.contains("tools-panel--open")).toBe(true);
    expect(toolsToggle?.getAttribute("aria-expanded")).toBe("true");
    expect(workflowSwitch?.getAttribute("aria-selected")).toBe("false");
    expect(systemSwitch?.getAttribute("aria-selected")).toBe("true");
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

  it("posts guided new-request action with prefilled draft in non-harness mode", async () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const guidedButton = dom.window.document.querySelector('[data-action="new-request"]');
    guidedButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    expect(
      postedMessages.some(
        (message) =>
          message.type === "new-request-guided" &&
          (message.draft as Record<string, unknown> | undefined)?.intent === "Harness need"
      )
    ).toBe(true);
  });

  it("posts check-environment action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const button = dom.window.document.querySelector('[data-action="check-environment"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "check-environment")).toBe(true);
  });

  it("posts triage action with the selected item in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [baseItem]
    });

    const button = dom.window.document.querySelector('[data-action="assist-triage"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "assist-triage" && message.id === "req_000_kickoff")).toBe(true);
  });

  it("posts open-onboarding action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const button = dom.window.document.querySelector('[data-action="open-onboarding"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open-onboarding")).toBe(true);
  });

  it("posts logics insights action in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const button = dom.window.document.querySelector('[data-action="open-logics-insights"]');
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open-logics-insights")).toBe(true);
  });

  it("posts logics insights action from the header button in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const button = dom.window.document.getElementById("header-logics-insights");
    button?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "open-logics-insights")).toBe(true);
  });

  it("routes trigger-tool-action messages through the existing tool buttons", async () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          type: "trigger-tool-action",
          action: "new-request"
        }
      })
    );
    await new Promise((resolve) => dom.window.setTimeout(resolve, 0));

    expect(postedMessages.some((message) => message.type === "new-request-guided")).toBe(true);
  });

  it("posts repair actions in non-harness mode", () => {
    const { dom, postedMessages } = bootstrapWebview({ harness: false });

    const repairButton = dom.window.document.querySelector('[data-action="repair-logics-kit"]');
    repairButton?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

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

  it("uses host-provided repair availability in the tools menu", () => {
    const { dom } = bootstrapWebview({ harness: true });

    pushData(dom, {
      root: "/workspace/mock",
      canRepairLogicsKit: false,
      repairLogicsKitTitle: "Select a project root first",
      items: [baseItem]
    });

    const repairButton = dom.window.document.querySelector(
      '[data-action="repair-logics-kit"]'
    ) as HTMLButtonElement | null;

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
      title: "Followup",
      updatedAt: "2024-01-01T00:00:00.000Z"
    };
    const backlogItem = {
      ...baseItem,
      id: "item_001_plan_followup",
      title: "Plan Followup",
      stage: "backlog",
      updatedAt: "2024-01-01T00:00:00.000Z"
    };
    const taskItem = {
      ...baseItem,
      id: "task_001_ship_followup",
      title: "Ship Followup",
      stage: "task",
      updatedAt: "2024-01-01T00:00:00.000Z"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      selectedId: "req_000_kickoff",
      items: [
        { ...baseItem, updatedAt: "2024-02-01T00:00:00.000Z" },
        requestFollowup,
        backlogItem,
        taskItem
      ]
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

    if (hideSpecToggle) {
      hideSpecToggle.checked = true;
      hideSpecToggle.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    }

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

    expect(sectionLabels).toContain("Draft1/1");
    expect(sectionLabels).toContain("Proposed1/1");
  });

  it("defaults board cards to most recently updated first", () => {
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

    const cardTitles = Array.from(dom.window.document.querySelectorAll('.column[data-stage="request"] .card__title')).map(
      (node) => node.querySelector(".card__title-text")?.textContent?.trim()
    );
    expect(cardTitles).toEqual(["Newer request", "Older request"]);
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
      node.querySelector(".card__title-text")?.textContent?.trim()
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
        Status: "In Progress"
      }
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [olderItem, newerItem]
    });

    const document = dom.window.document;
    const activityPanel = document.getElementById("activity-panel");
    const board = document.getElementById("board");

    const entries = Array.from(document.querySelectorAll(".activity-panel__entry"));
    expect(activityPanel?.hidden).toBe(false);
    expect(board?.hidden).toBe(true);
    expect(entries[0]?.textContent).toContain("Recent activity");
    expect(entries[0]?.querySelector(".activity-panel__updated")).toBeNull();
    expect(entries[1]?.textContent).toContain("Older activity");

    entries[0]?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.querySelector(".card--selected")?.getAttribute("data-id")).toBe("task_001_recent_activity");
  });

  it("hides closed items from recent activity when hide completed is active", () => {
    const visibleItem = {
      ...baseItem,
      id: "req_010_activity_visible",
      title: "Visible activity",
      updatedAt: "2024-03-02T00:00:00.000Z"
    };
    const hiddenClosedItem = {
      ...baseItem,
      id: "task_010_activity_obsolete",
      title: "Obsolete activity",
      stage: "task",
      updatedAt: "2024-04-01T00:00:00.000Z",
      indicators: {
        Status: "Obsolete",
        Progress: "35%"
      }
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [visibleItem, hiddenClosedItem]
    });

    const document = dom.window.document;
    const entries = Array.from(document.querySelectorAll(".activity-panel__entry"));
    const entryIds = entries.map((entry) => entry.getAttribute("data-id"));
    expect(entryIds).toContain("req_010_activity_visible");
    expect(entryIds).not.toContain("task_010_activity_obsolete");
  });

  it("renders git action notifications in recent activity", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem],
      activityEvents: [
        {
          id: "git-push-1",
          kind: "git",
          category: "git",
          stage: "git",
          marker: "G",
          title: "Git Push",
          label: "Push",
          meta: "Git push started in a Workshop terminal",
          updatedAt: "2024-06-01T00:00:00.000Z"
        }
      ]
    });

    const entry = Array.from(dom.window.document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Git Push")
    ) as HTMLButtonElement | undefined;
    expect(entry).toBeTruthy();
    expect(entry?.disabled).toBe(true);
    expect(entry?.textContent).toContain("Git push started");
    expect(entry?.querySelector(".activity-panel__marker")?.getAttribute("data-activity-kind")).toBe("git");
  });

  it("filters git and ci events via the toolbar activity filter, leaving doc activity", () => {
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem],
      activityEvents: [
        { id: "git-1", kind: "git", stage: "git", marker: "G", title: "Git commit", label: "Commit", updatedAt: "2024-06-01T00:00:00.000Z" },
        { id: "ci-1", kind: "ci", stage: "ci", marker: "C", title: "CI run", label: "CI", updatedAt: "2024-06-01T00:01:00.000Z" }
      ]
    });
    const document = dom.window.document;
    const kinds = () =>
      Array.from(document.querySelectorAll(".activity-panel__marker")).map((m) => m.getAttribute("data-activity-kind"));
    expect(kinds()).toContain("git");
    expect(kinds()).toContain("ci");

    // The filter button is in the toolbar; its menu is hidden until the button is clicked.
    const filterButton = document.getElementById("activity-filter-toggle") as HTMLButtonElement | null;
    const filterMenu = document.getElementById("activity-filter-menu") as HTMLElement | null;
    expect(filterButton).toBeTruthy();
    expect(filterMenu?.hidden).toBe(true);
    filterButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(filterMenu?.hidden).toBe(false);

    // Uncheck "CI events": ci entries disappear, git + doc activity stay.
    const ciCheckbox = document.getElementById("activity-filter-ci") as HTMLInputElement | null;
    expect(ciCheckbox).toBeTruthy();
    ciCheckbox!.checked = false;
    ciCheckbox!.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

    expect(kinds()).toContain("git");
    expect(kinds()).not.toContain("ci");
    expect(filterButton?.classList.contains("toolbar__filter--active")).toBe(true);
  });

  it("puts one header on a day and the time on each row", () => {
    // Two recent entries in the same wall-clock minute, 40s apart. They used to be at risk
    // of splitting into two headers when the relative label rounded differently per entry;
    // item_723 groups by day, so the risk is gone and the minute moved onto the row --
    // one scaffold's eleven documents used to produce a single header timing the batch
    // rather than the work, and nothing said which day anything happened on.
    const base = Math.floor(Date.now() / 60000) * 60000 - 3 * 60000;
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem],
      activityEvents: [
        { id: "g1", kind: "git", stage: "git", marker: "G", title: "Commit A", label: "Commit", updatedAt: new Date(base + 10000).toISOString() },
        { id: "g2", kind: "git", stage: "git", marker: "G", title: "Commit B", label: "Commit", updatedAt: new Date(base + 50000).toISOString() }
      ]
    });
    const document = dom.window.document;
    const labels = Array.from(document.querySelectorAll(".activity-panel__group-label")).map((el) => el.textContent);
    // One header for the day the two commits share. `Unknown` is the corpus entry that
    // carries no timestamp at all -- it degrades to a named group rather than being dropped
    // into whichever day happens to be last.
    //
    // The header is not asserted to read "Today": these entries are three minutes old, so a
    // run that crosses midnight sees "Yesterday" and the assertion was failing on the clock
    // rather than on the code. What matters is that the two share one header.
    const dayLabels = labels.filter((label) => label !== "Unknown");
    expect(dayLabels).toHaveLength(1);
    expect(dayLabels[0]).toMatch(/Today|Yesterday|\d/);

    const times = Array.from(document.querySelectorAll(".activity-panel__entry .activity-panel__time"));
    expect(times).toHaveLength(2);
    expect(times.every((node) => (node.textContent || "").trim().length > 0)).toBe(true);

    // The kind is named on the row rather than left to an undecoded letter in the marker.
    const kinds = Array.from(document.querySelectorAll(".activity-panel__kind")).map((node) => node.textContent);
    expect(kinds.filter((kind) => kind === "Commit")).toHaveLength(2);
    expect(kinds.every((kind) => (kind || "").trim().length > 0)).toBe(true);
  });

  it("shows more precise Updated values for selected recently changed cards", () => {
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

    card?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    // item_719/item_720: recency used to appear only inside the preview a click expanded,
    // written as "N ago". It is now on the card face at all times as an age segment, and the
    // panel carries the absolute date. Neither restates the other.
    expect(document.querySelector('.card[data-id="req_004_recent_precision"] .card__badge-age')).toBeTruthy();
    expect(document.getElementById("details")?.textContent).toContain("Updated");
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
    const detailsTitle = document.getElementById("details-title");

    if (searchInput) {
      searchInput.value = "kickoff only";
      searchInput.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    }

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
    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Activity read target")
    );
    entry?.dispatchEvent(new dom.window.MouseEvent("dblclick", { bubbles: true }));

    expect(postedMessages.some((message) => message.type === "read" && message.id === "req_003_activity_read_target")).toBe(true);
  });

  it("collapses one chain's events into one row and spends the row budget on rows", () => {
    const { dom } = bootstrapWebview({ harness: true });
    const now = Date.now();
    const chainRequest = { ...baseItem, id: "req_900_chain", title: "Chain root", stage: "request" };
    const members = [1, 2, 3].map((n) => ({
      ...baseItem,
      id: `item_90${n}_member`,
      title: `Member ${n}`,
      stage: "backlog",
      updatedAt: new Date(now - n * 1000).toISOString(),
      references: [{ kind: "manual", label: "Request", path: "logics/request/req_900_chain.md" }]
    }));

    pushData(dom, {
      root: "/workspace/mock",
      items: [{ ...chainRequest, relPath: "logics/request/req_900_chain.md" }, ...members]
    });

    const document = dom.window.document;
    const chainRow = document.querySelector(".activity-panel__chain") as HTMLElement | null;

    // item_724, bounded by item_716: one scaffold wrote ten documents and produced ten peer
    // rows. The run itself is not recoverable from a snapshot diff, so the collapse groups by
    // workflow chain and says so rather than implying it captured the operation.
    expect(chainRow).toBeTruthy();
    // Four, not three: a request belongs to its own chain, so the root is counted with the
    // members it produced rather than sitting outside them.
    expect(chainRow?.dataset.count).toBe("4");
    expect(chainRow?.textContent).toContain("4 documents in one chain");
    expect(chainRow?.textContent).toContain("Chain root");
    expect(chainRow?.textContent).not.toContain("run");
    expect(chainRow?.getAttribute("aria-expanded")).toBe("false");

    // Collapsed by default: the members are behind the control, not beside it.
    expect(document.querySelectorAll(".activity-panel__entry--in-chain")).toHaveLength(0);

    chainRow?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

    const expanded = document.querySelector(".activity-panel__chain");
    expect(expanded?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelectorAll(".activity-panel__entry--in-chain")).toHaveLength(4);
  });

  it("draws a stretch with no activity instead of leaving it to be subtracted", () => {
    const { dom } = bootstrapWebview({ harness: true });
    const day = 24 * 60 * 60 * 1000;
    const recent = new Date(Date.now() - day);
    const older = new Date(Date.now() - 6 * day);

    pushData(dom, {
      root: "/workspace/mock",
      items: [],
      activityEvents: [
        { id: "g1", kind: "git", stage: "git", marker: "G", title: "Recent commit", label: "Commit", updatedAt: recent.toISOString() },
        { id: "g2", kind: "git", stage: "git", marker: "G", title: "Older commit", label: "Commit", updatedAt: older.toISOString() }
      ]
    });

    // item_723 (AC13): two dated headers leave the operator subtracting them to find out
    // whether anything happened in between. The gap is drawn and counted.
    const quiet = dom.window.document.querySelector(".activity-panel__quiet") as HTMLElement | null;
    expect(quiet).toBeTruthy();
    expect(quiet?.dataset.days).toBe("4");
    expect(quiet?.textContent).toContain("4 days with no recorded activity");
  });

  it("groups recent activity by logical timestamp", () => {
    const recentItem = {
      ...baseItem,
      id: "req_004_activity_updated",
      title: "Activity updated target",
      updatedAt: "2024-05-01T10:00:00.000Z"
    };
    const sameBucketItem = {
      ...baseItem,
      id: "item_004_activity_updated",
      title: "Same timestamp bucket",
      stage: "backlog",
      updatedAt: "2024-05-01T10:00:30.000Z"
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, {
      root: "/workspace/mock",
      items: [baseItem, recentItem, sameBucketItem]
    });

    const document = dom.window.document;
    // Read the labels as text: asserting on jsdom nodes makes vitest's diff printer throw
    // while formatting the failure, which hides the assertion that actually failed.
    const groupLabels = Array.from(document.querySelectorAll(".activity-panel__group-label")).map(
      (node) => node.textContent || ""
    );
    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Activity updated target")
    );
    // item_723: the header names a day, and two entries 30s apart share it rather than
    // producing one header each.
    // One header for the day the two entries share; `Unknown` is baseItem, which carries no
    // parseable timestamp and gets a named group rather than being folded into a real day.
    expect(groupLabels.filter((label) => label.includes("2024"))).toHaveLength(1);
    expect(groupLabels).toContain("Unknown");
    expect(entry?.querySelector(".activity-panel__updated")).toBeNull();
    expect(entry?.querySelector(".activity-panel__time")).toBeTruthy();
    // The row no longer repeats the document's own title back as a slug.
    expect(entry?.textContent).not.toContain("req_00");
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
    const entry = Array.from(document.querySelectorAll(".activity-panel__entry")).find((button) =>
      button.textContent?.includes("Activity unknown timestamp")
    );
    expect(document.querySelector(".activity-panel__group-label")?.textContent).toBe("Unknown");
    expect(entry?.querySelector(".activity-panel__updated")).toBeNull();
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
    // item_720: suggested actions were on the card's inline preview, which is retired. They
    // are facts about the document, so they moved into the panel rather than being dropped.
    (productCard as HTMLElement | null)?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.getElementById("details")?.textContent).toContain("Link flow");
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
    expect(helpBanner?.hidden).toBe(true);
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

    expect(helpBanner?.hidden).toBe(true);
    expect(helpBanner?.textContent || "").not.toContain("Use Search");
    expect(detailsBody?.textContent).toContain("Select a card to inspect indicators");
    expect(detailsBody?.textContent || "").not.toContain("Use Search or Attention");

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

    // The card still says, by itself, that something is wrong; what is wrong and what to do
    // about it is the panel's job now that the inline preview is gone (item_720).
    expect(blockedCard?.classList.contains("card--health-alert")).toBe(true);
    expect(blockedCard?.textContent).toContain("Blocked");
    expect(orphanCard?.classList.contains("card--health-alert")).toBe(true);

    (orphanCard as HTMLElement | null)?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    const panel = document.getElementById("details")?.textContent || "";
    expect(panel).toContain("Orphaned");
    expect(panel).toContain("Link flow");
  });

  it("does not call a runbook orphaned for not being attached to anything", () => {
    // Reported by the operator once runbooks became documents: a runbook is a procedure,
    // not the framing of a piece of work, so having no primary link is its normal state.
    const runbook = {
      ...productItem,
      id: "run_001_recover_the_viewer",
      title: "Recover the viewer",
      stage: "runbook",
      relPath: "logics/runbooks/run_001_recover_the_viewer.md",
      path: "/workspace/mock/logics/runbooks/run_001_recover_the_viewer.md",
      references: [],
      usedBy: []
    };
    const { dom } = bootstrapWebview({ harness: true });
    pushData(dom, { root: "/workspace/mock", items: [runbook] });

    const document = dom.window.document;
    const card = document.querySelector('.card[data-id="run_001_recover_the_viewer"]');
    expect(card).not.toBeNull();
    expect(card?.classList.contains("card--health-alert")).toBe(false);

    (card as HTMLElement | null)?.dispatchEvent(new dom.window.Event("click", { bubbles: true }));
    expect(document.getElementById("details")?.textContent || "").not.toContain("Orphaned");
  });

});
