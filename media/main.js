(() => {
  const vscode =
    typeof acquireVsCodeApi === "function"
      ? acquireVsCodeApi()
      : {
          postMessage: () => undefined,
          getState: () => null,
          setState: () => undefined
        };
  const board = document.getElementById("board");
  const layout = document.getElementById("layout");
  const splitter = document.getElementById("splitter");
  const details = document.getElementById("details");
  const detailsBody = document.getElementById("details-body");
  const detailsToggle = document.getElementById("details-toggle");
  const detailsTitle = document.getElementById("details-title");
  const detailsEyebrow = document.getElementById("details-eyebrow");
  const filterToggle = document.getElementById("filter-toggle");
  const filterPanel = document.getElementById("filter-panel");
  const toolsToggle = document.getElementById("tools-toggle");
  const toolsPanel = document.getElementById("tools-panel");
  const searchInput = document.getElementById("search-input");
  const groupBySelect = document.getElementById("group-by");
  const sortBySelect = document.getElementById("sort-by");
  const activityToggle = document.getElementById("activity-toggle");
  const attentionToggle = document.getElementById("attention-toggle");
  const activityPanel = document.getElementById("activity-panel");
  const helpBanner = document.getElementById("help-banner");
  const helpBannerCopy = document.getElementById("help-banner-copy");
  const helpBannerDismiss = document.getElementById("help-banner-dismiss");
  const viewModeToggleButton = document.querySelector('[data-action="toggle-view-mode"]');
  const refreshButton = document.querySelector('[data-action="refresh"]');
  const selectAgentButton = document.querySelector('[data-action="select-agent"]');
  const newRequestToolButton = document.querySelector('[data-action="new-request-guided"]');
  const createCompanionDocToolButton = document.querySelector('[data-action="create-companion-doc"]');
  const bootstrapLogicsButton = document.querySelector('[data-action="bootstrap-logics"]');
  const changeProjectRootButton = document.querySelector('[data-action="change-project-root"]');
  const resetProjectRootButton = document.querySelector('[data-action="reset-project-root"]');
  const fixDocsButton = document.querySelector('[data-action="fix-docs"]');
  const aboutButton = document.querySelector('[data-action="about"]');
  const promoteButton = document.querySelector('[data-action="promote"]');
  const markDoneButton = document.querySelector('[data-action="mark-done"]');
  const markObsoleteButton = document.querySelector('[data-action="mark-obsolete"]');
  const openButton = document.querySelector('[data-action="open"]');
  const readButton = document.querySelector('[data-action="read"]');
  const hideCompleteToggle = document.getElementById("hide-complete");
  const hideProcessedRequestsToggle = document.getElementById("hide-processed-requests");
  const hideSpecToggle = document.getElementById("hide-spec");
  const showCompanionDocsToggle = document.getElementById("show-companion-docs");
  const hideEmptyColumnsToggle = document.getElementById("hide-empty-columns");
  const filterResetButton = document.getElementById("filter-reset");
  const harnessBridge = window.__CDX_LOGICS_HARNESS__;
  const isHarnessMode = Boolean(harnessBridge && harnessBridge.isHarness);

  const defaultFilterState = {
    hideCompleted: true,
    hideProcessedRequests: true,
    hideSpec: true,
    showCompanionDocs: true,
    hideEmptyColumns: true
  };

  let items = [];
  let selectedId = null;
  let hideCompleted = defaultFilterState.hideCompleted;
  let hideProcessedRequests = defaultFilterState.hideProcessedRequests;
  let hideSpec = defaultFilterState.hideSpec;
  let showCompanionDocs = defaultFilterState.showCompanionDocs;
  let hideEmptyColumns = defaultFilterState.hideEmptyColumns;
  let searchQuery = "";
  let groupMode = "stage";
  let sortMode = "default";
  let activityPanelOpen = false;
  let attentionOnly = false;
  let helpDismissed = false;
  let collapsedListStages = new Set();
  const defaultCollapsedDetailSections = ["companionDocs", "specs", "primaryFlow", "references", "usedBy"];
  let collapsedDetailSections = new Set(defaultCollapsedDetailSections);
  let activeColumnMenu = null;
  let activeColumnMenuButton = null;
  let filterPanelOpen = false;
  let toolsPanelOpen = false;
  let canResetProjectRoot = false;
  let canBootstrapLogics = false;
  let activeWorkspaceRoot = null;
  let persistedWorkspaceRoot = null;
  const previousState = vscode.getState() || null;
  const scrollState = {
    boardLeft: 0,
    boardTop: 0,
    detailsTop: 0
  };
  let persistStateTimer = null;

  const primaryStageOrder = ["request", "backlog", "task"];
  const companionStageOrder = ["product", "architecture"];
  const stackedQuery = window.matchMedia("(max-width: 900px)");
  const compactListQuery = window.matchMedia("(max-width: 500px)");
  const projectGithubUrl = "https://github.com/AlexAgo83/cdx-logics-vscode";
  const uiState = {
    layoutMode: "horizontal",
    detailsCollapsed: false,
    viewMode: "board",
    splitRatio: 0.6
  };
  const debugUi = (() => {
    const globalFlag = Boolean(window.__CDX_LOGICS_DEBUG__);
    let queryFlag = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get("debug-ui");
      queryFlag = value === "1" || value === "true";
    } catch {
      queryFlag = false;
    }
    return globalFlag || queryFlag;
  })();
  const modelApi = window.CdxLogicsModel || {};
  const uiStatusFactory = window.createCdxLogicsUiStatusApi;
  const harnessApiFactory = window.createCdxLogicsHarnessApi;
  const layoutControllerFactory = window.createCdxLogicsLayoutController;
  const hostApiFactory = window.createCdxLogicsHostApi;
  const boardRendererFactory = window.createCdxLogicsBoardRenderer;
  const detailsRendererFactory = window.createCdxLogicsDetailsRenderer;
  const markdownApiFactory = window.createCdxLogicsMarkdownApi;

  function debugLog(eventName, payload = {}) {
    if (!debugUi) {
      return;
    }
    console.debug("[cdx-logics-webview]", eventName, payload);
  }

  function captureScrollState() {
    if (board) {
      scrollState.boardLeft = board.scrollLeft;
      scrollState.boardTop = board.scrollTop;
    }
    if (detailsBody) {
      scrollState.detailsTop = detailsBody.scrollTop;
    }
  }

  function restoreScrollState() {
    if (board) {
      board.scrollLeft = scrollState.boardLeft;
      board.scrollTop = scrollState.boardTop;
    }
    if (detailsBody) {
      detailsBody.scrollTop = scrollState.detailsTop;
    }
  }

  function schedulePersistState() {
    if (persistStateTimer) {
      clearTimeout(persistStateTimer);
    }
    persistStateTimer = setTimeout(() => {
      persistStateTimer = null;
      persistState();
    }, 80);
  }

  function resetPersistedUiState() {
    hideCompleted = defaultFilterState.hideCompleted;
    hideProcessedRequests = defaultFilterState.hideProcessedRequests;
    hideSpec = defaultFilterState.hideSpec;
    showCompanionDocs = defaultFilterState.showCompanionDocs;
    hideEmptyColumns = defaultFilterState.hideEmptyColumns;
    searchQuery = "";
    groupMode = "stage";
    sortMode = "default";
    activityPanelOpen = false;
    attentionOnly = false;
    helpDismissed = false;
    collapsedListStages = new Set();
    collapsedDetailSections = new Set(defaultCollapsedDetailSections);
    selectedId = null;
    scrollState.boardLeft = 0;
    scrollState.boardTop = 0;
    scrollState.detailsTop = 0;
    uiState.detailsCollapsed = false;
    uiState.viewMode = "board";
    uiState.splitRatio = 0.6;
  }

  function getStageLabel(stage) {
    return typeof modelApi.getStageLabel === "function" ? modelApi.getStageLabel(stage) : String(stage || "item");
  }

  function getStageHeading(stage) {
    return typeof modelApi.getStageHeading === "function" ? modelApi.getStageHeading(stage) : String(stage || "").trim();
  }

  function buildColumnMenu() {
    const menu = document.createElement("div");
    menu.className = "column__menu";
    menu.setAttribute("role", "menu");

    const options = [
      { label: "New Request", kind: "request" },
      { label: "New Backlog item", kind: "backlog" },
      { label: "New Task", kind: "task" }
    ];

    options.forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "column__menu-item";
      item.textContent = option.label;
      item.setAttribute("role", "menuitem");
      item.title = option.label;
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        closeColumnMenu();
        hostApi.createItem(option.kind);
      });
      menu.appendChild(item);
    });

    return menu;
  }

  function closeColumnMenu() {
    if (activeColumnMenu) {
      activeColumnMenu.remove();
    }
    if (activeColumnMenuButton) {
      activeColumnMenuButton.setAttribute("aria-expanded", "false");
    }
    activeColumnMenu = null;
    activeColumnMenuButton = null;
  }

  function toggleColumnMenu(button) {
    if (activeColumnMenu && activeColumnMenuButton === button) {
      closeColumnMenu();
      return;
    }

    closeColumnMenu();
    const menu = buildColumnMenu();
    activeColumnMenu = menu;
    activeColumnMenuButton = button;
    button.setAttribute("aria-expanded", "true");

    const container = button.parentElement;
    if (container) {
      container.appendChild(menu);
    }
  }

  function canPromote(item) {
    if (!item) {
      return false;
    }
    if (item.isPromoted) {
      return false;
    }
    if (isRequestProcessed(item)) {
      return false;
    }
    return item.stage === "request" || item.stage === "backlog";
  }

  function isCompactListForced() {
    return Boolean(compactListQuery && compactListQuery.matches);
  }

  function getEffectiveViewMode() {
    return isCompactListForced() ? "list" : uiState.viewMode;
  }

  function isListMode() {
    return getEffectiveViewMode() === "list";
  }

  function updateViewModeToggle() {
    if (!viewModeToggleButton) {
      return;
    }
    const currentMode = getEffectiveViewMode();
    if (isCompactListForced()) {
      viewModeToggleButton.textContent = "List";
      viewModeToggleButton.dataset.currentMode = currentMode;
      viewModeToggleButton.setAttribute("aria-pressed", "true");
      viewModeToggleButton.setAttribute("aria-label", "Current mode: list. List mode is required below 500px");
      viewModeToggleButton.title = "Current mode: list. List mode is required below 500px";
      viewModeToggleButton.disabled = true;
      return;
    }
    const switchToList = currentMode !== "list";
    viewModeToggleButton.textContent = switchToList ? "List" : "Board";
    viewModeToggleButton.dataset.currentMode = currentMode;
    viewModeToggleButton.setAttribute("aria-pressed", String(currentMode === "list"));
    viewModeToggleButton.setAttribute(
      "aria-label",
      switchToList
        ? `Current mode: ${currentMode}. Switch to list mode`
        : `Current mode: ${currentMode}. Switch to board mode`
    );
    viewModeToggleButton.title = switchToList
      ? `Current mode: ${currentMode}. Switch to list mode`
      : `Current mode: ${currentMode}. Switch to board mode`;
    viewModeToggleButton.disabled = false;
  }

  function setState(nextItems, nextSelectedId) {
    items = Array.isArray(nextItems) ? nextItems : [];
    if (typeof nextSelectedId === "string") {
      selectedId = nextSelectedId;
    } else if (!items.find((item) => item.id === selectedId)) {
      selectedId = null;
    }
    debugLog("state:update", {
      itemCount: items.length,
      selectedId,
      layoutMode: uiState.layoutMode,
      viewMode: uiState.viewMode,
      detailsCollapsed: uiState.detailsCollapsed
    });
    render();
  }

  function render() {
    if (layoutController && typeof layoutController.updateLayoutMode === "function") {
      layoutController.updateLayoutMode();
    }
    if (
      layoutController &&
      typeof layoutController.isSplitInteractionDisabled === "function" &&
      typeof layoutController.isDraggingSplit === "function" &&
      layoutController.isSplitInteractionDisabled() &&
      layoutController.isDraggingSplit()
    ) {
      if (typeof layoutController.resetDraggingState === "function") {
        layoutController.resetDraggingState();
      }
    }
    const selectedItem = items.find((item) => item.id === selectedId);
    if (selectedItem && !isVisible(selectedItem)) {
      selectedId = null;
    }
    if (details) {
      details.classList.toggle("details--collapsed", uiState.detailsCollapsed);
    }
    if (detailsToggle) {
      detailsToggle.setAttribute("aria-expanded", String(!uiState.detailsCollapsed));
      detailsToggle.setAttribute(
        "aria-label",
        uiState.detailsCollapsed ? "Expand details" : "Collapse details"
      );
      detailsToggle.title = uiState.detailsCollapsed ? "Expand details" : "Collapse details";
    }
    if (layoutController && typeof layoutController.updateSplitterA11y === "function") {
      layoutController.updateSplitterA11y();
    }
    if (board) {
      board.classList.toggle("board--list", isListMode());
    }
    updateViewModeToggle();
    renderBoard();
    renderDetails();
    renderActivityPanel();
    renderHelpBanner();
    restoreScrollState();
    updateButtons();
    updateFilterState();
    if (hideCompleteToggle) {
      hideCompleteToggle.checked = hideCompleted;
    }
    if (hideProcessedRequestsToggle) {
      hideProcessedRequestsToggle.checked = hideProcessedRequests;
    }
    if (hideSpecToggle) {
      hideSpecToggle.checked = hideSpec;
    }
    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = showCompanionDocs;
    }
    if (hideEmptyColumnsToggle) {
      hideEmptyColumnsToggle.checked = hideEmptyColumns;
    }
    if (searchInput) {
      searchInput.value = searchQuery;
    }
    if (groupBySelect) {
      groupBySelect.value = groupMode;
      groupBySelect.disabled = !isListMode();
      groupBySelect.title = isListMode() ? "Group visible list items" : "Grouping modes apply in list mode";
    }
    if (sortBySelect) {
      sortBySelect.value = sortMode;
      sortBySelect.title = "Sort visible items";
    }
    if (attentionToggle) {
      attentionToggle.classList.toggle("btn--active", attentionOnly);
      attentionToggle.setAttribute("aria-pressed", String(attentionOnly));
      attentionToggle.title = attentionOnly
        ? "Showing blocked, orphaned, unprocessed, or inconsistent items"
        : "Show blocked, orphaned, unprocessed, or inconsistent items";
    }
    if (activityToggle) {
      activityToggle.classList.toggle("btn--active", activityPanelOpen);
      activityToggle.setAttribute("aria-pressed", String(activityPanelOpen));
      activityToggle.title = activityPanelOpen ? "Hide recent activity" : "Show recent activity";
    }
  }

  function renderBoard() {
    if (boardRenderer && typeof boardRenderer.renderBoard === "function") {
      boardRenderer.renderBoard();
    }
  }

  function renderDetails() {
    if (detailsRenderer && typeof detailsRenderer.renderDetails === "function") {
      detailsRenderer.renderDetails();
    }
  }

  function renderActivityPanel() {
    if (!activityPanel) {
      return;
    }
    activityPanel.hidden = !activityPanelOpen;
    if (!activityPanelOpen) {
      activityPanel.innerHTML = "";
      return;
    }

    const entries = getActivityEntries();
    activityPanel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "activity-panel__header";
    header.textContent = "Recent activity";
    activityPanel.appendChild(header);

    const list = document.createElement("div");
    list.className = "activity-panel__list";

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "state-message";
      empty.textContent = "No recent activity is available yet.";
      list.appendChild(empty);
    } else {
      entries.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "activity-panel__entry";
        button.dataset.id = entry.id;

        const title = document.createElement("div");
        title.className = "activity-panel__title";
        title.textContent = entry.title;
        button.appendChild(title);

        const meta = document.createElement("div");
        meta.className = "activity-panel__meta";
        meta.textContent = `${entry.label} • ${getStageLabel(entry.stage)} • ${entry.id}`;
        button.appendChild(meta);

        button.addEventListener("click", () => {
          selectedId = entry.id;
          render();
        });

        list.appendChild(button);
      });
    }

    activityPanel.appendChild(list);
  }

  function renderHelpBanner() {
    if (!helpBanner || !helpBannerCopy) {
      return;
    }
    const message = helpDismissed ? "" : getHelpBannerMessage();
    helpBanner.hidden = !message;
    helpBannerCopy.textContent = message;
  }

  function updateButtons() {
    const item = items.find((entry) => entry.id === selectedId);
    openButton.disabled = !item;
    promoteButton.disabled = !canPromote(item);
    if (markDoneButton) {
      markDoneButton.disabled = !item;
      markDoneButton.title = item ? "Mark selected item as done" : "Select an item first";
    }
    if (markObsoleteButton) {
      markObsoleteButton.disabled = !item;
      markObsoleteButton.title = item ? "Mark selected item as obsolete" : "Select an item first";
    }
    openButton.title = item ? "Edit selected item" : "Select an item to edit";
    promoteButton.title = canPromote(item)
      ? "Promote selected item"
      : "Select a request/backlog item that can be promoted";
    promoteButton.classList.toggle("btn--contextual-active", canPromote(item));
    if (readButton) {
      readButton.disabled = !item;
      readButton.title = item ? "Read selected item" : "Select an item to read";
    }
    if (resetProjectRootButton) {
      resetProjectRootButton.disabled = !canResetProjectRoot;
      resetProjectRootButton.title = canResetProjectRoot
        ? "Use workspace root"
        : "Already using workspace root";
    }
    if (bootstrapLogicsButton) {
      bootstrapLogicsButton.disabled = !canBootstrapLogics;
      bootstrapLogicsButton.title = canBootstrapLogics
        ? "Bootstrap Logics in this project"
        : "Bootstrap already completed";
    }
  }

  function updateFilterState() {
    if (!filterToggle) {
      return;
    }
    filterToggle.classList.toggle(
      "toolbar__filter--active",
      hideCompleted || hideProcessedRequests || hideSpec || showCompanionDocs || hideEmptyColumns
    );
  }

  function restoreDefaultFilters() {
    hideCompleted = defaultFilterState.hideCompleted;
    hideProcessedRequests = defaultFilterState.hideProcessedRequests;
    hideSpec = defaultFilterState.hideSpec;
    showCompanionDocs = defaultFilterState.showCompanionDocs;
    hideEmptyColumns = defaultFilterState.hideEmptyColumns;
  }

  function setFilterPanelOpen(isOpen) {
    filterPanelOpen = isOpen;
    if (filterPanel) {
      filterPanel.classList.toggle("filter-panel--open", isOpen);
      filterPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    if (filterToggle) {
      filterToggle.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function setToolsPanelOpen(isOpen) {
    toolsPanelOpen = isOpen;
    if (toolsPanel) {
      toolsPanel.classList.toggle("tools-panel--open", isOpen);
      toolsPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    if (toolsToggle) {
      toolsToggle.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function normalizeSearchValue(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getStatusValue(item) {
    return normalizeSearchValue(item && item.indicators ? item.indicators.Status : "") || "no status";
  }

  function getHealthSignals(item) {
    const signals = [];
    const statusValue = getStatusValue(item);
    const progressValue = getProgressValue(item);

    if (statusValue.includes("blocked")) {
      signals.push("blocked");
    }
    if (!isPrimaryFlowStage(item.stage) && collectPrimaryFlowItems(item).length === 0) {
      signals.push("orphaned");
    }
    if (typeof progressValue === "number" && progressValue >= 100 && !statusValue.includes("done") && !statusValue.includes("complete")) {
      signals.push("done-mismatch");
    }

    return signals;
  }

  function needsAttention(item) {
    if (item.stage === "request" && !isRequestProcessed(item)) {
      return true;
    }
    return getHealthSignals(item).length > 0;
  }

  function getSuggestedActions(item) {
    const actions = [];
    if (canPromote(item)) {
      actions.push({ key: "promote", label: "Promote", title: "This workflow item can be promoted." });
    }
    if (isPrimaryFlowStage(item.stage) && collectCompanionDocs(item).length === 0 && collectSpecs(item).length === 0) {
      actions.push({ key: "add-docs", label: "Add docs", title: "This workflow item needs companion docs or specs." });
    }
    if (!isPrimaryFlowStage(item.stage) && collectPrimaryFlowItems(item).length === 0) {
      actions.push({ key: "link-flow", label: "Link flow", title: "This supporting doc should be linked back to a primary-flow item." });
    }
    return actions.slice(0, 2);
  }

  function getActivityEntries() {
    return [...items]
      .filter((item) => Date.parse(item.updatedAt || "") > 0)
      .sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0))
      .slice(0, 12)
      .map((item) => {
        const statusValue = getStatusValue(item);
        let label = "Updated";
        if (statusValue.includes("obsolete")) {
          label = "Marked obsolete";
        } else if (statusValue.includes("done") || statusValue.includes("complete")) {
          label = "Marked done";
        } else if (item.isPromoted) {
          label = "Promoted";
        } else if (isPrimaryFlowStage(item.stage) && (collectCompanionDocs(item).length > 0 || collectSpecs(item).length > 0)) {
          label = "Linked companion docs";
        }
        return {
          id: item.id,
          title: item.title,
          stage: item.stage,
          updatedAt: item.updatedAt,
          label
        };
      });
  }

  function getHelpBannerMessage() {
    if (items.length === 0) {
      return "No Logics items are loaded yet. Use Tools > New Request or Bootstrap Logics to seed the workspace.";
    }
    if (!selectedId) {
      return "Select a card for details. Use Search to find items faster, Attention to triage, and List mode when the board gets crowded.";
    }
    return "";
  }

  function getProgressSortValue(item) {
    const value = getProgressValue(item);
    return typeof value === "number" ? value : -1;
  }

  function compareItems(left, right) {
    if (sortMode === "updated-desc") {
      const leftTime = Date.parse(left.updatedAt || "") || 0;
      const rightTime = Date.parse(right.updatedAt || "") || 0;
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
    } else if (sortMode === "progress-desc") {
      const progressDelta = getProgressSortValue(right) - getProgressSortValue(left);
      if (progressDelta !== 0) {
        return progressDelta;
      }
    } else if (sortMode === "status-asc") {
      const statusDelta = getStatusValue(left).localeCompare(getStatusValue(right));
      if (statusDelta !== 0) {
        return statusDelta;
      }
    } else {
      return 0;
    }

    return normalizeSearchValue(left.title).localeCompare(normalizeSearchValue(right.title));
  }

  function sortItems(allItems) {
    if (sortMode === "default") {
      return [...allItems];
    }
    return [...allItems].sort(compareItems);
  }

  function groupByStage(allItems) {
    const grouped = allItems.reduce((acc, item) => {
      acc[item.stage] = acc[item.stage] || [];
      acc[item.stage].push(item);
      return acc;
    }, {});
    Object.keys(grouped).forEach((stage) => {
      grouped[stage] = sortItems(grouped[stage]);
    });
    return grouped;
  }

  function collectSearchText(value) {
    if (Array.isArray(value)) {
      return value.map((entry) => collectSearchText(entry)).join(" ");
    }
    if (value && typeof value === "object") {
      return Object.values(value)
        .map((entry) => collectSearchText(entry))
        .join(" ");
    }
    return String(value || "");
  }

  function matchesSearch(item) {
    const normalizedQuery = normalizeSearchValue(searchQuery);
    if (!normalizedQuery) {
      return true;
    }
    const haystack = normalizeSearchValue(
      [
        item.title,
        item.id,
        item.stage,
        getStageLabel(item.stage),
        collectSearchText(item.references),
        collectSearchText(item.usedBy),
        collectSearchText(item.indicators)
      ].join(" ")
    );
    return haystack.includes(normalizedQuery);
  }

  function isVisible(item) {
    if (attentionOnly && !needsAttention(item)) {
      return false;
    }
    if (hideCompleted && isComplete(item)) {
      return false;
    }
    if (hideProcessedRequests && item.stage === "request" && isRequestProcessed(item)) {
      return false;
    }
    if (hideSpec && item.stage === "spec") {
      return false;
    }
    if (!showCompanionDocs && isCompanionStage(item.stage)) {
      return false;
    }
    return matchesSearch(item);
  }

  function getListGroups() {
    const visibleItems = items.filter((item) => isVisible(item));
    if (groupMode === "status") {
      const grouped = visibleItems.reduce((acc, item) => {
        const heading = item && item.indicators && item.indicators.Status ? String(item.indicators.Status) : "No status";
        const key = `status:${normalizeSearchValue(heading) || "no-status"}`;
        acc[key] = acc[key] || { key, heading, items: [] };
        acc[key].items.push(item);
        return acc;
      }, {});
      return Object.values(grouped)
        .map((group) => ({ ...group, items: sortItems(group.items) }))
        .sort((left, right) => normalizeSearchValue(left.heading).localeCompare(normalizeSearchValue(right.heading)));
    }

    const grouped = groupByStage(visibleItems);
    return getVisibleStages().map((stage) => ({
      key: stage,
      stage,
      heading: getStageHeading(stage),
      items: grouped[stage] || [],
      emptyLabel: isPrimaryFlowStage(stage) ? "No items" : "No linked docs"
    }));
  }

  function isPrimaryFlowStage(stage) {
    return typeof modelApi.isPrimaryFlowStage === "function" ? modelApi.isPrimaryFlowStage(stage) : false;
  }

  function isCompanionStage(stage) {
    return typeof modelApi.isCompanionStage === "function" ? modelApi.isCompanionStage(stage) : false;
  }

  function collectCompanionDocs(item) {
    return typeof modelApi.collectCompanionDocs === "function" ? modelApi.collectCompanionDocs(item, items) : [];
  }

  function collectSpecs(item) {
    return typeof modelApi.collectSpecs === "function" ? modelApi.collectSpecs(item, items) : [];
  }

  function collectPrimaryFlowItems(item) {
    return typeof modelApi.collectPrimaryFlowItems === "function" ? modelApi.collectPrimaryFlowItems(item, items) : [];
  }

  function findManagedItemByReference(rawValue, fallbackUsage) {
    return typeof modelApi.findManagedItemByReference === "function"
      ? modelApi.findManagedItemByReference(rawValue, items, fallbackUsage)
      : null;
  }

  function normalizeManagedDocValue(value) {
    return typeof modelApi.normalizeManagedDocValue === "function" ? modelApi.normalizeManagedDocValue(value) : String(value || "");
  }

  function getVisibleStages() {
    const visibleStages = [...primaryStageOrder];
    if (showCompanionDocs) {
      visibleStages.push(...companionStageOrder);
    }
    if (!hideSpec) {
      visibleStages.push("spec");
    }
    return visibleStages;
  }

  function isComplete(item) {
    const value = getProgressValue(item);
    return value !== null && value >= 100;
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  function normalizeStatus(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function isProcessedWorkflowStatus(value) {
    const normalized = normalizeStatus(value);
    return normalized === "ready" || normalized === "in progress" || normalized === "blocked" || normalized === "done";
  }

  function collectLinkedWorkflowItems(item) {
    if (!item || item.stage !== "request") {
      return [];
    }
    const linkedPaths = new Set();
    if (Array.isArray(item.references)) {
      item.references.forEach((ref) => {
        if (ref && typeof ref.path === "string") {
          linkedPaths.add(ref.path.replace(/\\/g, "/"));
        }
      });
    }
    if (Array.isArray(item.usedBy)) {
      item.usedBy.forEach((usage) => {
        if (usage && typeof usage.relPath === "string") {
          linkedPaths.add(usage.relPath.replace(/\\/g, "/"));
        }
      });
    }
    return items.filter(
      (candidate) =>
        linkedPaths.has(String(candidate.relPath || "").replace(/\\/g, "/")) &&
        (candidate.stage === "backlog" || candidate.stage === "task")
    );
  }

  function isRequestProcessed(item) {
    return typeof modelApi.isRequestProcessed === "function" ? modelApi.isRequestProcessed(item, items) : false;
  }

  function progressState(item) {
    const value = getProgressValue(item);
    if (value === null) {
      return "";
    }
    if (value <= 0) {
      return "card--progress-zero";
    }
    if (value >= 100) {
      return "card--progress-done";
    }
    return "card--progress-active";
  }

  function getProgressValue(item) {
    const indicators = item && item.indicators ? item.indicators : {};
    const progressKey = Object.keys(indicators).find((key) => key.toLowerCase().includes("progress"));
    if (!progressKey) {
      return null;
    }
    const progressRaw = indicators[progressKey];
    const match = String(progressRaw).match(/(\d+(?:\.\d+)?)/);
    if (!match) {
      return null;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  function setControlDescription(element, label) {
    if (!element || !label) {
      return;
    }
    if (!element.getAttribute("aria-label")) {
      element.setAttribute("aria-label", label);
    }
    element.title = label;
  }

  const markdownApi = typeof markdownApiFactory === "function" ? markdownApiFactory() : null;

  function escapeHtml(value) {
    if (markdownApi && typeof markdownApi.escapeHtml === "function") {
      return markdownApi.escapeHtml(value);
    }
    return String(value ?? "");
  }
  const uiStatus = typeof uiStatusFactory === "function"
    ? uiStatusFactory({
        documentRef: document,
        layout,
        harnessBridge
      })
    : null;
  const showStatus =
    uiStatus && typeof uiStatus.showStatus === "function"
      ? (message, tone) => uiStatus.showStatus(message, tone)
      : () => undefined;
  const harnessApi = typeof harnessApiFactory === "function"
    ? harnessApiFactory({
        isHarnessMode,
        harnessBridge,
        markdownApi,
        escapeHtml,
        showStatus,
        projectGithubUrl
      })
    : null;

  const hostApi = hostApiFactory({
    vscode,
    debugLog,
    showStatus,
    isHarnessMode,
    handleHarnessChangeProjectRoot: () =>
      harnessApi && typeof harnessApi.handleHarnessChangeProjectRoot === "function"
        ? harnessApi.handleHarnessChangeProjectRoot()
        : Promise.resolve(),
    applyHarnessRoot: (rootLabel) => {
      if (harnessApi && typeof harnessApi.applyHarnessRoot === "function") {
        harnessApi.applyHarnessRoot(rootLabel);
      }
    },
    openHarnessItem: (item, mode) => {
      if (harnessApi && typeof harnessApi.openHarnessItem === "function") {
        harnessApi.openHarnessItem(item, mode);
      }
    },
    harnessBridge,
    setCanResetProjectRoot(value) {
      canResetProjectRoot = value;
      if (harnessApi && typeof harnessApi.setCanResetProjectRoot === "function") {
        harnessApi.setCanResetProjectRoot(value);
      }
    },
    projectGithubUrl
  });

  const boardRenderer = typeof boardRendererFactory === "function"
    ? boardRendererFactory({
        board,
        hostApi,
        getItems: () => items,
        getTotalItemCount: () => items.length,
        getSelectedId: () => selectedId,
        setSelectedId(value) {
          selectedId = value;
        },
        isListMode,
        getVisibleStages,
        groupByStage,
        getListGroups,
        isVisible,
        isPrimaryFlowStage,
        isRequestProcessed,
        getStageHeading,
        getStageLabel,
        collectCompanionDocs,
        collectSpecs,
        collectPrimaryFlowItems,
        getHealthSignals,
        getSuggestedActions,
        progressState,
        getProgressValue,
        isComplete,
        render,
        openSelectedItem,
        closeColumnMenu,
        toggleColumnMenu,
        persistState,
        getCollapsedListStages: () => collapsedListStages,
        getHideCompleted: () => hideCompleted,
        getHideProcessedRequests: () => hideProcessedRequests,
        getHideSpec: () => hideSpec,
        getShowCompanionDocs: () => showCompanionDocs,
        getHideEmptyColumns: () => hideEmptyColumns,
        getSearchQuery: () => searchQuery,
        getAttentionOnly: () => attentionOnly
      })
    : null;

  const detailsRenderer = typeof detailsRendererFactory === "function"
    ? detailsRendererFactory({
        detailsBody,
        detailsTitle,
        detailsEyebrow,
        hostApi,
        getItems: () => items,
        getSelectedId: () => selectedId,
        getCollapsedDetailSections: () => collapsedDetailSections,
        persistState,
        getStageLabel,
        isPrimaryFlowStage,
        collectCompanionDocs,
        collectSpecs,
        collectPrimaryFlowItems,
        findManagedItemByReference,
        formatDate
      })
    : null;

  function openSelectedItem(mode) {
    if (!selectedId) {
      return;
    }
    const item = items.find((entry) => entry.id === selectedId);
    if (!item) {
      return;
    }
    hostApi.openItem(item, mode);
  }

  async function handleChangeProjectRoot() {
    await hostApi.changeProjectRoot();
  }

  function handleResetProjectRoot() {
    hostApi.resetProjectRoot();
  }

  function handleBootstrapLogics() {
    hostApi.bootstrapLogics();
  }

  function handleAbout() {
    hostApi.about();
  }
  const layoutController = typeof layoutControllerFactory === "function"
    ? layoutControllerFactory({
        layout,
        board,
        details,
        splitter,
        stackedQuery,
        uiState,
        persistState,
        debugLog,
        isDetailsCollapsed: () => uiState.detailsCollapsed
      })
    : null;

  if (refreshButton) {
    refreshButton.addEventListener("click", () => hostApi.refresh());
  }
  if (viewModeToggleButton) {
    viewModeToggleButton.addEventListener("click", () => {
      if (isCompactListForced()) {
        return;
      }
      uiState.viewMode = isListMode() ? "board" : "list";
      debugLog("view-mode:toggle", { nextMode: uiState.viewMode });
      persistState();
      render();
    });
  }
  if (bootstrapLogicsButton) {
    bootstrapLogicsButton.addEventListener("click", () => {
      handleBootstrapLogics();
      setToolsPanelOpen(false);
    });
  }
  if (newRequestToolButton) {
    newRequestToolButton.addEventListener("click", () => {
      hostApi.newGuidedRequest();
      setToolsPanelOpen(false);
    });
  }
  if (createCompanionDocToolButton) {
    createCompanionDocToolButton.addEventListener("click", () => {
      hostApi.createCompanionDoc(selectedId || undefined);
      setToolsPanelOpen(false);
    });
  }
  if (selectAgentButton) {
    selectAgentButton.addEventListener("click", () => {
      hostApi.selectAgent();
      setToolsPanelOpen(false);
    });
  }
  if (changeProjectRootButton) {
    changeProjectRootButton.addEventListener("click", async () => {
      await handleChangeProjectRoot();
      setToolsPanelOpen(false);
    });
  }
  if (resetProjectRootButton) {
    resetProjectRootButton.addEventListener("click", () => {
      handleResetProjectRoot();
      setToolsPanelOpen(false);
    });
  }
  if (fixDocsButton) {
    fixDocsButton.addEventListener("click", () => {
      hostApi.fixDocs();
      setToolsPanelOpen(false);
    });
  }
  if (aboutButton) {
    aboutButton.addEventListener("click", () => {
      handleAbout();
      setToolsPanelOpen(false);
    });
  }
  if (filterToggle) {
    filterToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (toolsPanelOpen) {
        setToolsPanelOpen(false);
      }
      setFilterPanelOpen(!filterPanelOpen);
    });
  }
  if (toolsToggle) {
    toolsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (filterPanelOpen) {
        setFilterPanelOpen(false);
      }
      setToolsPanelOpen(!toolsPanelOpen);
    });
  }
  function persistState() {
    captureScrollState();
    vscode.setState({
      workspaceRoot: activeWorkspaceRoot,
      selectedId,
      hideCompleted,
      hideProcessedRequests,
      hideSpec,
      showCompanionDocs,
      hideEmptyColumns,
      searchQuery,
      groupMode,
      sortMode,
      activityPanelOpen,
      attentionOnly,
      helpDismissed,
      collapsedListStages: Array.from(collapsedListStages),
      detailsCollapsed: uiState.detailsCollapsed,
      collapsedDetailSections: Array.from(collapsedDetailSections),
      viewMode: uiState.viewMode,
      splitRatio: uiState.splitRatio,
      boardScrollLeft: scrollState.boardLeft,
      boardScrollTop: scrollState.boardTop,
      detailsScrollTop: scrollState.detailsTop
    });
  }

  if (hideCompleteToggle) {
    hideCompleteToggle.addEventListener("change", (event) => {
      hideCompleted = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (hideProcessedRequestsToggle) {
    hideProcessedRequestsToggle.addEventListener("change", (event) => {
      hideProcessedRequests = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (hideSpecToggle) {
    hideSpecToggle.addEventListener("change", (event) => {
      hideSpec = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (showCompanionDocsToggle) {
    showCompanionDocsToggle.addEventListener("change", (event) => {
      showCompanionDocs = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (hideEmptyColumnsToggle) {
    hideEmptyColumnsToggle.addEventListener("change", (event) => {
      hideEmptyColumns = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (filterResetButton) {
    filterResetButton.addEventListener("click", () => {
      restoreDefaultFilters();
      persistState();
      updateFilterState();
      render();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchQuery = event.target ? String(event.target.value || "") : "";
      persistState();
      render();
    });
  }
  if (groupBySelect) {
    groupBySelect.addEventListener("change", (event) => {
      groupMode = event.target ? String(event.target.value || "stage") : "stage";
      persistState();
      render();
    });
  }
  if (sortBySelect) {
    sortBySelect.addEventListener("change", (event) => {
      sortMode = event.target ? String(event.target.value || "default") : "default";
      persistState();
      render();
    });
  }
  if (attentionToggle) {
    attentionToggle.addEventListener("click", () => {
      attentionOnly = !attentionOnly;
      persistState();
      render();
    });
  }
  if (activityToggle) {
    activityToggle.addEventListener("click", () => {
      activityPanelOpen = !activityPanelOpen;
      persistState();
      render();
    });
  }
  if (helpBannerDismiss) {
    helpBannerDismiss.addEventListener("click", () => {
      helpDismissed = true;
      persistState();
      render();
    });
  }
  if (board) {
    board.addEventListener("scroll", () => {
      captureScrollState();
      schedulePersistState();
    });
  }
  if (detailsBody) {
    detailsBody.addEventListener("scroll", () => {
      captureScrollState();
      schedulePersistState();
    });
  }
  if (detailsToggle) {
    detailsToggle.addEventListener("click", () => {
      uiState.detailsCollapsed = !uiState.detailsCollapsed;
      debugLog("details:toggle", { collapsed: uiState.detailsCollapsed });
      persistState();
      render();
    });
  }
  openButton.addEventListener("click", () => {
    openSelectedItem("open");
  });
  if (readButton) {
    readButton.addEventListener("click", () => {
      openSelectedItem("read");
    });
  }
  promoteButton.addEventListener("click", () => {
    if (!selectedId) return;
    hostApi.promote(selectedId);
  });
  if (markDoneButton) {
    markDoneButton.addEventListener("click", () => {
      const item = items.find((entry) => entry.id === selectedId);
      if (!item) return;
      hostApi.markDone(item);
    });
  }
  if (markObsoleteButton) {
    markObsoleteButton.addEventListener("click", () => {
      const item = items.find((entry) => entry.id === selectedId);
      if (!item) return;
      hostApi.markObsolete(item);
    });
  }

  window.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "data") {
      debugLog("host:data", {
        hasError: Boolean(payload && payload.error),
        itemCount: Array.isArray(payload && payload.items) ? payload.items.length : 0,
        selectedId: payload ? payload.selectedId : undefined
      });
      if (payload && typeof payload.root === "string") {
        activeWorkspaceRoot = payload.root;
        if (harnessApi && typeof harnessApi.setCurrentRoot === "function") {
          harnessApi.setCurrentRoot(payload.root);
        }
        if (persistedWorkspaceRoot && persistedWorkspaceRoot !== payload.root) {
          resetPersistedUiState();
        }
      }
      if (payload && typeof payload.canResetProjectRoot === "boolean") {
        canResetProjectRoot = payload.canResetProjectRoot;
        if (harnessApi && typeof harnessApi.setCanResetProjectRoot === "function") {
          harnessApi.setCanResetProjectRoot(payload.canResetProjectRoot);
        }
      }
      if (payload && typeof payload.canBootstrapLogics === "boolean") {
        canBootstrapLogics = payload.canBootstrapLogics;
      }
      if (payload && payload.error) {
        debugLog("host:data:error", { error: payload.error });
        board.innerHTML = `<div class="state-message">${payload.error}</div>`;
        detailsBody.innerHTML = "";
        if (detailsTitle) {
          detailsTitle.textContent = "Details";
        }
        selectedId = null;
        updateButtons();
        updateViewModeToggle();
        return;
      }
      const nextItems = payload && payload.items ? payload.items : [];
      const nextSelected = payload ? payload.selectedId : undefined;
      setState(nextItems, nextSelected);
    }
  });

  if (previousState && typeof previousState.hideCompleted === "boolean") {
    hideCompleted = previousState.hideCompleted;
  }
  if (previousState && typeof previousState.hideProcessedRequests === "boolean") {
    hideProcessedRequests = previousState.hideProcessedRequests;
  } else if (previousState && typeof previousState.hideUsedRequests === "boolean") {
    hideProcessedRequests = previousState.hideUsedRequests;
  }
  if (previousState && typeof previousState.hideSpec === "boolean") {
    hideSpec = previousState.hideSpec;
  }
  if (previousState && typeof previousState.showCompanionDocs === "boolean") {
    showCompanionDocs = previousState.showCompanionDocs;
  }
  if (previousState && typeof previousState.hideEmptyColumns === "boolean") {
    hideEmptyColumns = previousState.hideEmptyColumns;
  }
  if (previousState && typeof previousState.searchQuery === "string") {
    searchQuery = previousState.searchQuery;
  }
  if (previousState && typeof previousState.groupMode === "string") {
    groupMode = previousState.groupMode;
  }
  if (previousState && typeof previousState.sortMode === "string") {
    sortMode = previousState.sortMode;
  }
  if (previousState && typeof previousState.activityPanelOpen === "boolean") {
    activityPanelOpen = previousState.activityPanelOpen;
  }
  if (previousState && typeof previousState.attentionOnly === "boolean") {
    attentionOnly = previousState.attentionOnly;
  }
  if (previousState && typeof previousState.helpDismissed === "boolean") {
    helpDismissed = previousState.helpDismissed;
  }
  if (previousState && typeof previousState.selectedId === "string") {
    selectedId = previousState.selectedId;
  }
  if (previousState && typeof previousState.workspaceRoot === "string") {
    persistedWorkspaceRoot = previousState.workspaceRoot;
  }
  if (previousState && Array.isArray(previousState.collapsedListStages)) {
    collapsedListStages = new Set(previousState.collapsedListStages);
  }
  if (previousState && typeof previousState.detailsCollapsed === "boolean") {
    uiState.detailsCollapsed = previousState.detailsCollapsed;
  }
  if (previousState && Array.isArray(previousState.collapsedDetailSections)) {
    collapsedDetailSections = new Set(previousState.collapsedDetailSections);
  }
  if (previousState && (previousState.viewMode === "board" || previousState.viewMode === "list")) {
    uiState.viewMode = previousState.viewMode;
  }
  if (previousState && typeof previousState.splitRatio === "number") {
    uiState.splitRatio = previousState.splitRatio;
  }
  if (previousState && typeof previousState.boardScrollLeft === "number") {
    scrollState.boardLeft = previousState.boardScrollLeft;
  }
  if (previousState && typeof previousState.boardScrollTop === "number") {
    scrollState.boardTop = previousState.boardScrollTop;
  }
  if (previousState && typeof previousState.detailsScrollTop === "number") {
    scrollState.detailsTop = previousState.detailsScrollTop;
  }

  document.addEventListener("click", (event) => {
    if (filterPanelOpen && filterPanel && filterToggle) {
      const target = event.target;
      if (!filterPanel.contains(target) && !filterToggle.contains(target)) {
        setFilterPanelOpen(false);
      }
    }
    if (toolsPanelOpen && toolsPanel && toolsToggle) {
      const target = event.target;
      if (!toolsPanel.contains(target) && !toolsToggle.contains(target)) {
        setToolsPanelOpen(false);
      }
    }
    if (!activeColumnMenu) {
      return;
    }
    const target = event.target;
    if (activeColumnMenu.contains(target)) {
      return;
    }
    if (activeColumnMenuButton && activeColumnMenuButton.contains(target)) {
      return;
    }
    closeColumnMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && filterPanelOpen) {
      setFilterPanelOpen(false);
    }
    if (event.key === "Escape" && toolsPanelOpen) {
      setToolsPanelOpen(false);
    }
    if (event.key === "Escape" && activeColumnMenu) {
      closeColumnMenu();
    }
  });

  if (splitter) {
    splitter.addEventListener("pointerdown", (event) => {
      if (layoutController && typeof layoutController.startSplitDrag === "function") {
        layoutController.startSplitDrag(event);
      }
    });
    splitter.addEventListener("pointermove", (event) => {
      if (layoutController && typeof layoutController.updateSplitDrag === "function") {
        layoutController.updateSplitDrag(event);
      }
    });
    splitter.addEventListener("pointerup", (event) => {
      if (layoutController && typeof layoutController.endSplitDrag === "function") {
        layoutController.endSplitDrag(event);
      }
    });
    splitter.addEventListener("pointercancel", (event) => {
      if (layoutController && typeof layoutController.endSplitDrag === "function") {
        layoutController.endSplitDrag(event);
      }
    });
    splitter.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (layoutController && typeof layoutController.nudgeSplitFromKeyboard === "function") {
          layoutController.nudgeSplitFromKeyboard(0.03);
        }
        render();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (layoutController && typeof layoutController.nudgeSplitFromKeyboard === "function") {
          layoutController.nudgeSplitFromKeyboard(-0.03);
        }
        render();
      } else if (event.key === "Home") {
        event.preventDefault();
        if (layoutController && typeof layoutController.persistAndApplySplitRatio === "function") {
          layoutController.persistAndApplySplitRatio(0.9);
        }
        render();
      } else if (event.key === "End") {
        event.preventDefault();
        if (layoutController && typeof layoutController.persistAndApplySplitRatio === "function") {
          layoutController.persistAndApplySplitRatio(0.1);
        }
        render();
      }
    });
  }

  const handleLayoutMediaChange = () => {
    if (layoutController && typeof layoutController.updateLayoutMode === "function") {
      layoutController.updateLayoutMode();
    }
    if (layoutController && typeof layoutController.updateSplitterA11y === "function") {
      layoutController.updateSplitterA11y();
    }
    render();
  };
  if (stackedQuery && typeof stackedQuery.addEventListener === "function") {
    stackedQuery.addEventListener("change", handleLayoutMediaChange);
  } else if (stackedQuery && typeof stackedQuery.addListener === "function") {
    stackedQuery.addListener(handleLayoutMediaChange);
  }
  if (compactListQuery && typeof compactListQuery.addEventListener === "function") {
    compactListQuery.addEventListener("change", handleLayoutMediaChange);
  } else if (compactListQuery && typeof compactListQuery.addListener === "function") {
    compactListQuery.addListener(handleLayoutMediaChange);
  }
  window.addEventListener("resize", () => {
    if (
      layoutController &&
      typeof layoutController.isStackedLayout === "function" &&
      layoutController.isStackedLayout() &&
      typeof layoutController.applySplitRatio === "function"
    ) {
      layoutController.applySplitRatio(uiState.splitRatio, false);
    }
  });

  setControlDescription(filterToggle, "Filter options");
  setControlDescription(toolsToggle, "Tools");
  setControlDescription(viewModeToggleButton, "Switch display mode");
  setControlDescription(refreshButton, "Refresh");
  setControlDescription(selectAgentButton, "Select active agent");
  setControlDescription(newRequestToolButton, "Start a guided new request in Codex");
  setControlDescription(bootstrapLogicsButton, "Bootstrap Logics");
  setControlDescription(changeProjectRootButton, "Change project root");
  setControlDescription(resetProjectRootButton, "Use workspace root");
  setControlDescription(fixDocsButton, "Fix Logics");
  setControlDescription(aboutButton, "About this extension");
  setControlDescription(detailsToggle, uiState.detailsCollapsed ? "Expand details" : "Collapse details");
  setControlDescription(markDoneButton, "Mark selected item as done");
  setControlDescription(markObsoleteButton, "Mark selected item as obsolete");
  setControlDescription(openButton, "Edit selected item");
  setControlDescription(readButton, "Read selected item");
  setControlDescription(promoteButton, "Promote selected item");
  if (toolsPanel) {
    toolsPanel.setAttribute("role", "menu");
  }
  if (filterPanel) {
    filterPanel.setAttribute("role", "group");
    filterPanel.setAttribute("aria-label", "Filter options");
  }
  if (filterToggle && filterPanel && filterPanel.id) {
    filterToggle.setAttribute("aria-controls", filterPanel.id);
  }
  if (toolsToggle && toolsPanel && toolsPanel.id) {
    toolsToggle.setAttribute("aria-controls", toolsPanel.id);
  }

  if (layoutController && typeof layoutController.updateLayoutMode === "function") {
    layoutController.updateLayoutMode();
  }
  debugLog("webview:init", { mode: isHarnessMode ? "harness" : "vscode" });
  hostApi.ready();
})();
