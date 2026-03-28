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
  const mainPane = document.getElementById("layout-main");
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
  const launchCodexOverlayButton = document.querySelector('[data-action="launch-codex-overlay"]');
  const selectAgentButton = document.querySelector('[data-action="select-agent"]');
  const newRequestToolButton = document.querySelector('[data-action="new-request-guided"]');
  const createCompanionDocToolButton = document.querySelector('[data-action="create-companion-doc"]');
  const bootstrapLogicsButton = document.querySelector('[data-action="bootstrap-logics"]');
  const updateLogicsKitButton = document.querySelector('[data-action="update-logics-kit"]');
  const syncCodexOverlayButton = document.querySelector('[data-action="sync-codex-overlay"]');
  const checkEnvironmentButton = document.querySelector('[data-action="check-environment"]');
  const checkHybridRuntimeButton = document.querySelector('[data-action="check-hybrid-runtime"]');
  const openHybridInsightsButton = document.querySelector('[data-action="open-hybrid-insights"]');
  const assistCommitAllButton = document.querySelector('[data-action="assist-commit-all"]');
  const assistNextStepButton = document.querySelector('[data-action="assist-next-step"]');
  const assistTriageButton = document.querySelector('[data-action="assist-triage"]');
  const assistDiffRiskButton = document.querySelector('[data-action="assist-diff-risk"]');
  const assistSummarizeValidationButton = document.querySelector('[data-action="assist-summarize-validation"]');
  const assistValidationChecklistButton = document.querySelector('[data-action="assist-validation-checklist"]');
  const assistDocConsistencyButton = document.querySelector('[data-action="assist-doc-consistency"]');
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
  let changedPaths = [];
  let activeAgent = null;
  let lastInjectedContext = null;
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
  const defaultCollapsedDetailSections = [
    "attentionExplain",
    "contextPack",
    "dependencyMap",
    "companionDocs",
    "specs",
    "primaryFlow",
    "references",
    "usedBy"
  ];
  let collapsedDetailSections = new Set(defaultCollapsedDetailSections);
  let activeColumnMenu = null;
  let activeColumnMenuButton = null;
  let secondaryToolbarOpen = false;
  let toolsPanelOpen = false;
  let canResetProjectRoot = false;
  let canBootstrapLogics = false;
  let bootstrapLogicsTitle = "Bootstrap Logics in this project";
  let activeWorkspaceRoot = null;
  let persistedWorkspaceRoot = null;
  const previousState = vscode.getState() || null;

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
  const selectorFactory = window.createCdxLogicsWebviewSelectors;
  const persistenceFactory = window.createCdxLogicsWebviewPersistence;
  const chromeFactory = window.createCdxLogicsWebviewChrome;
  const boardRendererFactory = window.createCdxLogicsBoardRenderer;
  const detailsRendererFactory = window.createCdxLogicsDetailsRenderer;
  const markdownApiFactory = window.createCdxLogicsMarkdownApi;
  const mainInteractionsFactory = window.createCdxLogicsMainInteractions;

  function debugLog(eventName, payload = {}) {
    if (!debugUi) {
      return;
    }
    console.debug("[cdx-logics-webview]", eventName, payload);
  }

  function getSnapshot(scrollValues = { boardLeft: 0, boardTop: 0, detailsTop: 0 }) {
    return {
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
      secondaryToolbarOpen,
      activityPanelOpen,
      attentionOnly,
      helpDismissed,
      collapsedListStages: Array.from(collapsedListStages),
      detailsCollapsed: uiState.detailsCollapsed,
      collapsedDetailSections: Array.from(collapsedDetailSections),
      viewMode: uiState.viewMode,
      splitRatio: uiState.splitRatio,
      boardScrollLeft: scrollValues.boardLeft,
      boardScrollTop: scrollValues.boardTop,
      detailsScrollTop: scrollValues.detailsTop
    };
  }

  function applyResetState({ defaultFilterState: nextDefaultFilterState, uiDefaults }) {
    hideCompleted = nextDefaultFilterState.hideCompleted;
    hideProcessedRequests = nextDefaultFilterState.hideProcessedRequests;
    hideSpec = nextDefaultFilterState.hideSpec;
    showCompanionDocs = nextDefaultFilterState.showCompanionDocs;
    hideEmptyColumns = nextDefaultFilterState.hideEmptyColumns;
    searchQuery = "";
    groupMode = "stage";
    sortMode = "default";
    activityPanelOpen = false;
    attentionOnly = false;
    helpDismissed = false;
    collapsedListStages = new Set();
    collapsedDetailSections = new Set(defaultCollapsedDetailSections);
    selectedId = null;
    secondaryToolbarOpen = false;
    toolsPanelOpen = false;
    uiState.detailsCollapsed = uiDefaults.detailsCollapsed;
    uiState.viewMode = uiDefaults.viewMode;
    uiState.splitRatio = uiDefaults.splitRatio;
    activeColumnMenu = null;
    activeColumnMenuButton = null;
  }

  function applyPersistedState(nextState, nextScrollState) {
    if (nextState && typeof nextState.hideCompleted === "boolean") {
      hideCompleted = nextState.hideCompleted;
    }
    if (nextState && typeof nextState.hideProcessedRequests === "boolean") {
      hideProcessedRequests = nextState.hideProcessedRequests;
    } else if (nextState && typeof nextState.hideUsedRequests === "boolean") {
      hideProcessedRequests = nextState.hideUsedRequests;
    }
    if (nextState && typeof nextState.hideSpec === "boolean") {
      hideSpec = nextState.hideSpec;
    }
    if (nextState && typeof nextState.showCompanionDocs === "boolean") {
      showCompanionDocs = nextState.showCompanionDocs;
    }
    if (nextState && typeof nextState.hideEmptyColumns === "boolean") {
      hideEmptyColumns = nextState.hideEmptyColumns;
    }
    if (nextState && typeof nextState.searchQuery === "string") {
      searchQuery = nextState.searchQuery;
    }
    if (nextState && typeof nextState.groupMode === "string") {
      groupMode = nextState.groupMode;
    }
    if (nextState && typeof nextState.sortMode === "string") {
      sortMode = nextState.sortMode;
    }
    if (nextState && typeof nextState.activityPanelOpen === "boolean") {
      activityPanelOpen = nextState.activityPanelOpen;
    }
    if (nextState && typeof nextState.attentionOnly === "boolean") {
      attentionOnly = nextState.attentionOnly;
    }
    if (nextState && typeof nextState.helpDismissed === "boolean") {
      helpDismissed = nextState.helpDismissed;
    }
    if (nextState && typeof nextState.secondaryToolbarOpen === "boolean") {
      secondaryToolbarOpen = nextState.secondaryToolbarOpen;
    }
    if (nextState && typeof nextState.selectedId === "string") {
      selectedId = nextState.selectedId;
    }
    if (nextState && typeof nextState.workspaceRoot === "string") {
      persistedWorkspaceRoot = nextState.workspaceRoot;
    }
    if (nextState && Array.isArray(nextState.collapsedListStages)) {
      collapsedListStages = new Set(nextState.collapsedListStages);
    }
    if (nextState && typeof nextState.detailsCollapsed === "boolean") {
      uiState.detailsCollapsed = nextState.detailsCollapsed;
    }
    if (nextState && Array.isArray(nextState.collapsedDetailSections)) {
      collapsedDetailSections = new Set(nextState.collapsedDetailSections);
    }
    if (nextState && (nextState.viewMode === "board" || nextState.viewMode === "list")) {
      uiState.viewMode = nextState.viewMode;
    }
    if (nextState && typeof nextState.splitRatio === "number") {
      uiState.splitRatio = nextState.splitRatio;
    }
    if (nextState && typeof nextState.boardScrollLeft === "number") {
      nextScrollState.boardLeft = nextState.boardScrollLeft;
    }
    if (nextState && typeof nextState.boardScrollTop === "number") {
      nextScrollState.boardTop = nextState.boardScrollTop;
    }
    if (nextState && typeof nextState.detailsScrollTop === "number") {
      nextScrollState.detailsTop = nextState.detailsScrollTop;
    }
  }

  const selectors =
    typeof selectorFactory === "function"
      ? selectorFactory({
          modelApi,
          primaryStageOrder,
          companionStageOrder,
          compactListQuery,
          getItems: () => items,
          getSelectedId: () => selectedId,
          getActiveWorkspaceRoot: () => activeWorkspaceRoot,
          getChangedPaths: () => changedPaths,
          getActiveAgent: () => activeAgent,
          getLastInjectedContext: () => lastInjectedContext,
          getHideCompleted: () => hideCompleted,
          getHideProcessedRequests: () => hideProcessedRequests,
          getHideSpec: () => hideSpec,
          getShowCompanionDocs: () => showCompanionDocs,
          getHideEmptyColumns: () => hideEmptyColumns,
          getSearchQuery: () => searchQuery,
          getGroupMode: () => groupMode,
          getSortMode: () => sortMode,
          getAttentionOnly: () => attentionOnly,
          getUiState: () => uiState
        })
      : null;

  const {
    canPromote,
    isCompactListForced,
    getEffectiveViewMode,
    isListMode,
    getStageLabel,
    getStageHeading,
    normalizeSearchValue,
    getStatusValue,
    getAttentionReasons,
    getHealthSignals,
    buildContextPack,
    buildDependencyMap,
    needsAttention,
    getSuggestedActions,
    getActivityEntries,
    getHelpBannerMessage,
    groupByStage,
    getListGroups,
    isVisible,
    isPrimaryFlowStage,
    isCompanionStage,
    collectCompanionDocs,
    collectSpecs,
    collectPrimaryFlowItems,
    findManagedItemByReference,
    normalizeManagedDocValue,
    getVisibleStages,
    isComplete,
    formatDate,
    isProcessedWorkflowStatus,
    collectLinkedWorkflowItems,
    isRequestProcessed,
    progressState,
    getProgressValue
  } = selectors || {};

  const persistence =
    typeof persistenceFactory === "function"
      ? persistenceFactory({
          vscode,
          board,
          detailsBody,
          defaultFilterState,
          getUiState: () => uiState,
          getSnapshot,
          applyResetState,
          applyPersistedState
        })
      : null;

  const captureScrollState =
    persistence && typeof persistence.captureScrollState === "function"
      ? () => persistence.captureScrollState()
      : () => undefined;
  const restoreScrollState =
    persistence && typeof persistence.restoreScrollState === "function"
      ? () => persistence.restoreScrollState()
      : () => undefined;
  const schedulePersistState =
    persistence && typeof persistence.schedulePersistState === "function"
      ? () => persistence.schedulePersistState()
      : () => undefined;
  const resetPersistedUiState =
    persistence && typeof persistence.resetPersistedUiState === "function"
      ? () => persistence.resetPersistedUiState()
      : () => undefined;
  const persistState =
    persistence && typeof persistence.persistState === "function"
      ? () => persistence.persistState()
      : () => undefined;
  const hydratePersistedState =
    persistence && typeof persistence.hydrate === "function"
      ? (state) => persistence.hydrate(state)
      : () => undefined;

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

  function getSelectedItem() {
    return items.find((item) => item.id === selectedId) || null;
  }

  const chrome =
    typeof chromeFactory === "function"
      ? chromeFactory({
          activityPanel,
          activityToggle,
          attentionToggle,
          bootstrapLogicsButton,
          filterPanel,
          filterToggle,
          groupBySelect,
          helpBanner,
          helpBannerCopy,
          hideCompleteToggle,
          hideEmptyColumnsToggle,
          hideProcessedRequestsToggle,
          hideSpecToggle,
          markDoneButton,
          markObsoleteButton,
          openButton,
          promoteButton,
          readButton,
          resetProjectRootButton,
          searchInput,
          showCompanionDocsToggle,
          sortBySelect,
          toolsPanel,
          toolsToggle,
          viewModeToggleButton,
          defaultFilterState,
          canPromote,
          getActivityEntries,
          getAttentionOnly: () => attentionOnly,
          getActivityPanelOpen: () => activityPanelOpen,
          getCanBootstrapLogics: () => canBootstrapLogics,
          getBootstrapLogicsTitle: () => bootstrapLogicsTitle,
          getCanResetProjectRoot: () => canResetProjectRoot,
          getEffectiveViewMode,
          getGroupMode: () => groupMode,
          getHelpBannerMessage,
          getHelpDismissed: () => helpDismissed,
          getHideCompleted: () => hideCompleted,
          getHideEmptyColumns: () => hideEmptyColumns,
          getHideProcessedRequests: () => hideProcessedRequests,
          getHideSpec: () => hideSpec,
          getIsListMode: () => isListMode(),
          getSearchQuery: () => searchQuery,
          getSecondaryToolbarOpen: () => secondaryToolbarOpen,
          getShowCompanionDocs: () => showCompanionDocs,
          getSortMode: () => sortMode,
          getStageLabel,
          getToolsPanelOpen: () => toolsPanelOpen,
          getSelectedItem,
          isCompactListForced,
          normalizeSearchValue,
          readItemAndRender(nextId) {
            selectedId = nextId;
            render();
            openSelectedItem("read");
          },
          selectItemAndRender(nextId) {
            selectedId = nextId;
            render();
          }
        })
      : null;

  const updateViewModeToggle =
    chrome && typeof chrome.updateViewModeToggle === "function" ? () => chrome.updateViewModeToggle() : () => undefined;
  const renderActivityPanel =
    chrome && typeof chrome.renderActivityPanel === "function" ? () => chrome.renderActivityPanel() : () => undefined;
  const renderHelpBanner =
    chrome && typeof chrome.renderHelpBanner === "function" ? () => chrome.renderHelpBanner() : () => undefined;
  const updateButtons =
    chrome && typeof chrome.updateButtons === "function" ? () => chrome.updateButtons() : () => undefined;
  const hasNonDefaultSecondaryControls =
    chrome && typeof chrome.hasNonDefaultSecondaryControls === "function"
      ? () => chrome.hasNonDefaultSecondaryControls()
      : () => false;
  const updateFilterState =
    chrome && typeof chrome.updateFilterState === "function" ? () => chrome.updateFilterState() : () => undefined;
  const syncChromeInputs =
    chrome && typeof chrome.syncInputs === "function" ? () => chrome.syncInputs() : () => undefined;
  const applyToolsPanelOpen =
    chrome && typeof chrome.setToolsPanelOpen === "function" ? (isOpen) => chrome.setToolsPanelOpen(isOpen) : () => undefined;
  const setControlDescription =
    chrome && typeof chrome.setControlDescription === "function"
      ? (element, label) => chrome.setControlDescription(element, label)
      : () => undefined;

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
    if (selectedItem && !isVisible(selectedItem) && !activityPanelOpen) {
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
      board.hidden = activityPanelOpen;
    }
    if (mainPane) {
      mainPane.classList.toggle("layout__main--activity", activityPanelOpen);
    }
    updateViewModeToggle();
    renderBoard();
    renderDetails();
    renderActivityPanel();
    renderHelpBanner();
    updateButtons();
    updateFilterState();
    syncChromeInputs();
    if (layoutController && typeof layoutController.updateLayoutMode === "function") {
      layoutController.updateLayoutMode();
    }
    if (layoutController && typeof layoutController.syncStackedAnchoredLayout === "function") {
      layoutController.syncStackedAnchoredLayout();
    }
    if (layoutController && typeof layoutController.updateSplitterA11y === "function") {
      layoutController.updateSplitterA11y();
    }
    restoreScrollState();
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

  function restoreDefaultFilters() {
    hideCompleted = defaultFilterState.hideCompleted;
    hideProcessedRequests = defaultFilterState.hideProcessedRequests;
    hideSpec = defaultFilterState.hideSpec;
    showCompanionDocs = defaultFilterState.showCompanionDocs;
    hideEmptyColumns = defaultFilterState.hideEmptyColumns;
  }

  function setFilterPanelOpen(isOpen) {
    secondaryToolbarOpen = isOpen;
    if (filterPanel) {
      filterPanel.hidden = !isOpen;
      filterPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    updateFilterState();
    persistState();
  }

  function setToolsPanelOpen(isOpen) {
    toolsPanelOpen = isOpen;
    applyToolsPanelOpen(isOpen);
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
        getAttentionReasons,
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
        getActiveWorkspaceRoot: () => activeWorkspaceRoot,
        getChangedPaths: () => changedPaths,
        getActiveAgent: () => activeAgent,
        getLastInjectedContext: () => lastInjectedContext,
        getCollapsedDetailSections: () => collapsedDetailSections,
        persistState,
        getStageLabel,
        isPrimaryFlowStage,
        collectCompanionDocs,
        collectSpecs,
        collectPrimaryFlowItems,
        getAttentionReasons,
        buildContextPack,
        buildDependencyMap,
        findManagedItemByReference,
        formatDate,
        setLastInjectedContext(nextValue) {
          lastInjectedContext = nextValue;
        },
        selectItem(nextId) {
          selectedId = nextId;
          render();
        }
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
        mainPane,
        board,
        activityPanel,
        details,
        splitter,
        stackedQuery,
        uiState,
        persistState,
        debugLog,
        isDetailsCollapsed: () => uiState.detailsCollapsed,
        getPrimaryPaneScrollHeight: () => {
          if (activityPanelOpen && activityPanel) {
            return activityPanel.scrollHeight || 0;
          }
          return board ? board.scrollHeight || 0 : 0;
        }
      })
    : null;

  function handleHostMessage(event) {
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
      if (payload && typeof payload.bootstrapLogicsTitle === "string") {
        bootstrapLogicsTitle = payload.bootstrapLogicsTitle;
      }
      changedPaths = Array.isArray(payload && payload.changedPaths) ? payload.changedPaths : [];
      activeAgent = payload && payload.activeAgent ? payload.activeAgent : null;
      if (payload && payload.error) {
        debugLog("host:data:error", { error: payload.error });
        renderBoardErrorState(payload.error);
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
  }

  function renderBoardErrorState(message) {
    if (!board) {
      return;
    }
    board.replaceChildren();
    const container = document.createElement("div");
    container.className = "state-message";
    container.textContent = String(message || "");
    board.appendChild(container);
  }

  function handleDocumentClick(event) {
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
  }

  function handleDocumentKeydown(event) {
    if (event.key === "Escape" && secondaryToolbarOpen) {
      setFilterPanelOpen(false);
    }
    if (event.key === "Escape" && toolsPanelOpen) {
      setToolsPanelOpen(false);
    }
    if (event.key === "Escape" && activeColumnMenu) {
      closeColumnMenu();
    }
  }

  function handleSplitterKeydown(event) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (layoutController && typeof layoutController.nudgeSplitFromKeyboard === "function") {
        layoutController.nudgeSplitFromKeyboard(0.03);
      }
      render();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (layoutController && typeof layoutController.nudgeSplitFromKeyboard === "function") {
        layoutController.nudgeSplitFromKeyboard(-0.03);
      }
      render();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      if (layoutController && typeof layoutController.persistAndApplySplitRatio === "function") {
        layoutController.persistAndApplySplitRatio(0.9);
      }
      render();
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      if (layoutController && typeof layoutController.persistAndApplySplitRatio === "function") {
        layoutController.persistAndApplySplitRatio(0.1);
      }
      render();
    }
  }

  function handleResponsiveLayoutChange() {
    if (layoutController && typeof layoutController.updateLayoutMode === "function") {
      layoutController.updateLayoutMode();
    }
    if (layoutController && typeof layoutController.updateSplitterA11y === "function") {
      layoutController.updateSplitterA11y();
    }
    if (
      layoutController &&
      typeof layoutController.isStackedLayout === "function" &&
      layoutController.isStackedLayout() &&
      typeof layoutController.applySplitRatio === "function"
    ) {
      layoutController.applySplitRatio(uiState.splitRatio, false);
    }
    render();
  }

  hydratePersistedState(previousState);

  const interactions = typeof mainInteractionsFactory === "function"
    ? mainInteractionsFactory({
        activityToggle,
        attentionToggle,
        board,
        bootstrapLogicsButton,
        checkHybridRuntimeButton,
        checkEnvironmentButton,
        openHybridInsightsButton,
        changeProjectRootButton,
        assistCommitAllButton,
        assistNextStepButton,
        assistTriageButton,
        assistDiffRiskButton,
        assistSummarizeValidationButton,
        assistValidationChecklistButton,
        assistDocConsistencyButton,
        compactListQuery,
        createCompanionDocToolButton,
        detailsBody,
        detailsToggle,
        filterPanel,
        filterResetButton,
        filterToggle,
        fixDocsButton,
        groupBySelect,
        helpBannerDismiss,
        hideCompleteToggle,
        hideEmptyColumnsToggle,
        hideProcessedRequestsToggle,
        hideSpecToggle,
        layoutController,
        launchCodexOverlayButton,
        mainPane,
        markDoneButton,
        markObsoleteButton,
        newRequestToolButton,
        onAbout() {
          handleAbout();
          setToolsPanelOpen(false);
        },
        onActivityToggle() {
          const nextOpen = !activityPanelOpen;
          const shouldCollapseForStackedLayout =
            nextOpen &&
            ((stackedQuery && stackedQuery.matches) ||
              (layoutController &&
                typeof layoutController.isStackedLayout === "function" &&
                layoutController.isStackedLayout()));
          if (shouldCollapseForStackedLayout) {
            uiState.detailsCollapsed = true;
          }
          activityPanelOpen = !activityPanelOpen;
          persistState();
          render();
        },
        onBoardScroll() {
          captureScrollState();
          schedulePersistState();
        },
        onBootstrapLogics() {
          handleBootstrapLogics();
          setToolsPanelOpen(false);
        },
        onUpdateLogicsKit() {
          hostApi.updateLogicsKit();
          setToolsPanelOpen(false);
        },
        onSyncCodexOverlay() {
          hostApi.syncCodexOverlay();
          setToolsPanelOpen(false);
        },
        onCheckEnvironment() {
          hostApi.checkEnvironment();
          setToolsPanelOpen(false);
        },
        onCheckHybridRuntime() {
          hostApi.checkHybridRuntime();
          setToolsPanelOpen(false);
        },
        onOpenHybridInsights() {
          hostApi.openHybridInsights();
          setToolsPanelOpen(false);
        },
        onAssistCommitAll() {
          hostApi.assistCommitAll();
          setToolsPanelOpen(false);
        },
        onAssistNextStep() {
          hostApi.assistNextStep();
          setToolsPanelOpen(false);
        },
        onAssistTriage() {
          hostApi.assistTriage();
          setToolsPanelOpen(false);
        },
        onAssistDiffRisk() {
          hostApi.assistDiffRisk();
          setToolsPanelOpen(false);
        },
        onAssistSummarizeValidation() {
          hostApi.assistSummarizeValidation();
          setToolsPanelOpen(false);
        },
        onAssistValidationChecklist() {
          hostApi.assistValidationChecklist();
          setToolsPanelOpen(false);
        },
        onAssistDocConsistency() {
          hostApi.assistDocConsistency();
          setToolsPanelOpen(false);
        },
        onLaunchCodexOverlay() {
          hostApi.launchCodexOverlay();
          setToolsPanelOpen(false);
        },
        onChangeProjectRoot() {
          void (async () => {
            await handleChangeProjectRoot();
            setToolsPanelOpen(false);
          })();
        },
        onCreateCompanionDoc(action) {
          if (action === "new-request-guided") {
            hostApi.newGuidedRequest();
          } else {
            hostApi.createCompanionDoc(selectedId || undefined);
          }
          setToolsPanelOpen(false);
        },
        onDetailsScroll() {
          captureScrollState();
          schedulePersistState();
        },
        onDetailsToggle() {
          uiState.detailsCollapsed = !uiState.detailsCollapsed;
          debugLog("details:toggle", { collapsed: uiState.detailsCollapsed });
          persistState();
          render();
        },
        onDocumentClick: handleDocumentClick,
        onDocumentKeydown: handleDocumentKeydown,
        onFilterPanelToggle(event) {
          event.stopPropagation();
          if (toolsPanelOpen) {
            setToolsPanelOpen(false);
          }
          setFilterPanelOpen(!secondaryToolbarOpen);
        },
        onFilterReset() {
          restoreDefaultFilters();
          persistState();
          updateFilterState();
          render();
        },
        onFixDocs() {
          hostApi.fixDocs();
          setToolsPanelOpen(false);
        },
        onGroupChange(event) {
          groupMode = event.target ? String(event.target.value || "stage") : "stage";
          persistState();
          render();
        },
        onHelpDismiss() {
          helpDismissed = true;
          persistState();
          render();
        },
        onHideCompleteChange(event) {
          hideCompleted = Boolean(event.target && event.target.checked);
          persistState();
          updateFilterState();
          render();
        },
        onHideEmptyColumnsChange(event) {
          hideEmptyColumns = Boolean(event.target && event.target.checked);
          persistState();
          updateFilterState();
          render();
        },
        onHideProcessedRequestsChange(event) {
          hideProcessedRequests = Boolean(event.target && event.target.checked);
          persistState();
          updateFilterState();
          render();
        },
        onHideSpecChange(event) {
          hideSpec = Boolean(event.target && event.target.checked);
          persistState();
          updateFilterState();
          render();
        },
        onMarkDone() {
          const item = items.find((entry) => entry.id === selectedId);
          if (!item) {
            return;
          }
          hostApi.markDone(item);
        },
        onMarkObsolete() {
          const item = items.find((entry) => entry.id === selectedId);
          if (!item) {
            return;
          }
          hostApi.markObsolete(item);
        },
        onOpenSelectedItem() {
          openSelectedItem("open");
        },
        onPromoteSelectedItem() {
          if (!selectedId) {
            return;
          }
          hostApi.promote(selectedId);
        },
        onReadSelectedItem() {
          openSelectedItem("read");
        },
        onRefresh() {
          hostApi.refresh();
        },
        onResetProjectRoot() {
          handleResetProjectRoot();
          setToolsPanelOpen(false);
        },
        onSearchInput(event) {
          searchQuery = event.target ? String(event.target.value || "") : "";
          persistState();
          render();
        },
        onSelectAgent() {
          hostApi.selectAgent();
          setToolsPanelOpen(false);
        },
        onShowCompanionDocsChange(event) {
          showCompanionDocs = Boolean(event.target && event.target.checked);
          persistState();
          updateFilterState();
          render();
        },
        onSortChange(event) {
          sortMode = event.target ? String(event.target.value || "default") : "default";
          persistState();
          render();
        },
        onSplitterKeydown: handleSplitterKeydown,
        onToggleAttention() {
          attentionOnly = !attentionOnly;
          persistState();
          render();
        },
        onToggleViewMode() {
          if (isCompactListForced()) {
            return;
          }
          uiState.viewMode = isListMode() ? "board" : "list";
          debugLog("view-mode:toggle", { nextMode: uiState.viewMode });
          persistState();
          render();
        },
        onToolsPanelToggle(event) {
          event.stopPropagation();
          setToolsPanelOpen(!toolsPanelOpen);
        },
        onWindowMessage: handleHostMessage,
        onWindowResize: handleResponsiveLayoutChange,
        openButton,
        promoteButton,
        readButton,
        refreshButton,
        resetProjectRootButton,
        searchInput,
        selectAgentButton,
        setControlDescription,
        showCompanionDocsToggle,
        sortBySelect,
        splitter,
        stackedQuery,
        syncCodexOverlayButton,
        toolsPanel,
        toolsToggle,
        updateLogicsKitButton,
        viewModeToggleButton,
        aboutButton
      })
    : null;

  if (interactions && typeof interactions.attach === "function") {
    interactions.attach();
  }

  if (layoutController && typeof layoutController.updateLayoutMode === "function") {
    layoutController.updateLayoutMode();
  }
  debugLog("webview:init", { mode: isHarnessMode ? "harness" : "vscode" });
  hostApi.ready();
})();
