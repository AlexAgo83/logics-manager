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
  const workflowToggle = document.getElementById("workflow-toggle");
  const assistToggle = document.getElementById("assist-toggle");
  const systemToggle = document.getElementById("system-toggle");
  const toolsPanel = document.getElementById("tools-panel");
  const searchInput = document.getElementById("search-input");
  const groupBySelect = document.getElementById("group-by");
  const sortBySelect = document.getElementById("sort-by");
  const headerLogicsInsightsButton = document.getElementById("header-logics-insights");
  const activityToggle = document.getElementById("activity-toggle");
  const attentionToggle = document.getElementById("attention-toggle");
  const activityPanel = document.getElementById("activity-panel");
  const helpBanner = document.getElementById("help-banner");
  const helpBannerCopy = document.getElementById("help-banner-copy");
  const helpBannerDismiss = document.getElementById("help-banner-dismiss");
  const viewModeToggleButton = document.querySelector('[data-action="toggle-view-mode"]');
  const selectAgentButton = document.querySelector('[data-action="select-agent"]');
  const newRequestToolButton = document.querySelector('[data-action="new-request"]');
  const createCompanionDocToolButton = document.querySelector('[data-action="create-companion-doc"]');
  const bootstrapLogicsButton = document.querySelector('[data-action="bootstrap-logics"]');
  const updateLogicsKitButton = document.querySelector('[data-action="update-logics-kit"]');
  const repairLogicsKitButton = document.querySelector('[data-action="repair-logics-kit"]');
  const checkEnvironmentButton = document.querySelector('[data-action="check-environment"]');
  const checkHybridRuntimeButton = document.querySelector('[data-action="check-hybrid-runtime"]');
  const openHybridInsightsButton = document.querySelector('[data-action="open-hybrid-insights"]');
  const openLogicsInsightsButton = document.querySelector('[data-action="open-logics-insights"]');
  const openOnboardingButton = document.querySelector('[data-action="open-onboarding"]');
  const assistCommitAllButton = document.querySelector('[data-action="assist-commit-all"]');
  const assistNextStepButton = document.querySelector('[data-action="assist-next-step"]');
  const assistTriageButton = document.querySelector('[data-action="assist-triage"]');
  const assistDiffRiskButton = document.querySelector('[data-action="assist-diff-risk"]');
  const assistSummarizeChangelogButton = document.querySelector('[data-action="assist-summarize-changelog"]');
  const assistPrepareReleaseButton = document.querySelector('[data-action="assist-prepare-release"]');
  const assistPublishReleaseButton = document.querySelector('[data-action="assist-publish-release"]');
  const assistSummarizeValidationButton = document.querySelector('[data-action="assist-summarize-validation"]');
  const assistValidationChecklistButton = document.querySelector('[data-action="assist-validation-checklist"]');
  const assistDocConsistencyButton = document.querySelector('[data-action="assist-doc-consistency"]');
  const changeProjectRootButton = document.querySelector('[data-action="change-project-root"]');
  const resetProjectRootButton = document.querySelector('[data-action="reset-project-root"]');
  const aboutButton = document.querySelector('[data-action="about"]');
  const promoteButton = document.querySelector('[data-action="promote"]');
  const markDoneButton = document.querySelector('[data-action="mark-done"]');
  const markObsoleteButton = document.querySelector('[data-action="mark-obsolete"]');
  const changeStatusButton = document.querySelector('[data-action="change-status"]');
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
  let sortMode = "updated-desc";
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
  let toolsPanelView = "workflow";
  let canResetProjectRoot = false;
  let canBootstrapLogics = false;
  let bootstrapLogicsTitle = "Bootstrap Logics in this project";
  let canLaunchCodex = false;
  let launchCodexTitle = "Launch Codex with the globally published Logics kit";
  let canLaunchClaude = false;
  let launchClaudeTitle = "Launch Claude with the globally published Logics kit";
  let canRepairLogicsKit = false;
  let repairLogicsKitTitle = "Check current Logics runtime state and repair the shared kit publication or bridge files.";
  let canPublishRelease = false;
  let publishReleaseTitle = "Publish Release requires a GitHub-compatible repository.";
  let shouldRecommendCheckEnvironment = false;
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
  const mainInteractionHandlersFactory = window.createCdxLogicsMainInteractionHandlers;
  const mainInteractionsFactory = window.createCdxLogicsMainInteractions;
  const mainCoreFactory = window.createCdxLogicsMainCore;

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
    sortMode = "updated-desc";
    activityPanelOpen = false;
    attentionOnly = false;
    helpDismissed = false;
    collapsedListStages = new Set();
    collapsedDetailSections = new Set(defaultCollapsedDetailSections);
    selectedId = null;
    secondaryToolbarOpen = false;
    toolsPanelOpen = false;
    toolsPanelView = "workflow";
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
    if (nextState && typeof nextState.toolsPanelView === "string") {
      toolsPanelView = nextState.toolsPanelView;
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
  const persistenceHydratePersistedState =
    persistence && typeof persistence.hydrate === "function"
      ? (state) => persistence.hydrate(state)
      : () => undefined;

  const state = {};
  Object.defineProperties(state, {
    items: { get: () => items, set: (value) => { items = value; } },
    selectedId: { get: () => selectedId, set: (value) => { selectedId = value; } },
    changedPaths: { get: () => changedPaths, set: (value) => { changedPaths = value; } },
    activeAgent: { get: () => activeAgent, set: (value) => { activeAgent = value; } },
    lastInjectedContext: { get: () => lastInjectedContext, set: (value) => { lastInjectedContext = value; } },
    hideCompleted: { get: () => hideCompleted, set: (value) => { hideCompleted = value; } },
    hideProcessedRequests: { get: () => hideProcessedRequests, set: (value) => { hideProcessedRequests = value; } },
    hideSpec: { get: () => hideSpec, set: (value) => { hideSpec = value; } },
    showCompanionDocs: { get: () => showCompanionDocs, set: (value) => { showCompanionDocs = value; } },
    hideEmptyColumns: { get: () => hideEmptyColumns, set: (value) => { hideEmptyColumns = value; } },
    searchQuery: { get: () => searchQuery, set: (value) => { searchQuery = value; } },
    groupMode: { get: () => groupMode, set: (value) => { groupMode = value; } },
    sortMode: { get: () => sortMode, set: (value) => { sortMode = value; } },
    activityPanelOpen: { get: () => activityPanelOpen, set: (value) => { activityPanelOpen = value; } },
    attentionOnly: { get: () => attentionOnly, set: (value) => { attentionOnly = value; } },
    helpDismissed: { get: () => helpDismissed, set: (value) => { helpDismissed = value; } },
    collapsedListStages: { get: () => collapsedListStages, set: (value) => { collapsedListStages = value; } },
    collapsedDetailSections: { get: () => collapsedDetailSections, set: (value) => { collapsedDetailSections = value; } },
    activeColumnMenu: { get: () => activeColumnMenu, set: (value) => { activeColumnMenu = value; } },
    activeColumnMenuButton: { get: () => activeColumnMenuButton, set: (value) => { activeColumnMenuButton = value; } },
    secondaryToolbarOpen: { get: () => secondaryToolbarOpen, set: (value) => { secondaryToolbarOpen = value; } },
    toolsPanelOpen: { get: () => toolsPanelOpen, set: (value) => { toolsPanelOpen = value; } },
    toolsPanelView: { get: () => toolsPanelView, set: (value) => { toolsPanelView = value; } },
    canResetProjectRoot: { get: () => canResetProjectRoot, set: (value) => { canResetProjectRoot = value; } },
    canBootstrapLogics: { get: () => canBootstrapLogics, set: (value) => { canBootstrapLogics = value; } },
    bootstrapLogicsTitle: { get: () => bootstrapLogicsTitle, set: (value) => { bootstrapLogicsTitle = value; } },
    canLaunchCodex: { get: () => canLaunchCodex, set: (value) => { canLaunchCodex = value; } },
    launchCodexTitle: { get: () => launchCodexTitle, set: (value) => { launchCodexTitle = value; } },
    canLaunchClaude: { get: () => canLaunchClaude, set: (value) => { canLaunchClaude = value; } },
    launchClaudeTitle: { get: () => launchClaudeTitle, set: (value) => { launchClaudeTitle = value; } },
    canRepairLogicsKit: { get: () => canRepairLogicsKit, set: (value) => { canRepairLogicsKit = value; } },
    repairLogicsKitTitle: { get: () => repairLogicsKitTitle, set: (value) => { repairLogicsKitTitle = value; } },
    canPublishRelease: { get: () => canPublishRelease, set: (value) => { canPublishRelease = value; } },
    publishReleaseTitle: { get: () => publishReleaseTitle, set: (value) => { publishReleaseTitle = value; } },
    shouldRecommendCheckEnvironment: { get: () => shouldRecommendCheckEnvironment, set: (value) => { shouldRecommendCheckEnvironment = value; } },
    activeWorkspaceRoot: { get: () => activeWorkspaceRoot, set: (value) => { activeWorkspaceRoot = value; } },
    persistedWorkspaceRoot: { get: () => persistedWorkspaceRoot, set: (value) => { persistedWorkspaceRoot = value; } },
    uiState: { get: () => uiState },
    scrollState: { get: () => ({ boardLeft: 0, boardTop: 0, detailsTop: 0 }), set: () => undefined }
  });

  let mainCore;

  const chrome =
    typeof chromeFactory === "function"
      ? chromeFactory({
          activityPanel,
          activityToggle,
          headerLogicsInsightsButton,
          attentionToggle,
          assistToggle,
          bootstrapLogicsButton,
          repairLogicsKitButton,
          assistPublishReleaseButton,
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
          changeStatusButton,
          openButton,
          promoteButton,
          readButton,
          resetProjectRootButton,
          searchInput,
          showCompanionDocsToggle,
          sortBySelect,
          toolsPanel,
          workflowToggle,
          systemToggle,
          viewModeToggleButton,
          defaultFilterState,
          canPromote,
          getActivityEntries,
          getAttentionOnly: () => attentionOnly,
          getActivityPanelOpen: () => activityPanelOpen,
          getCanBootstrapLogics: () => canBootstrapLogics,
          getBootstrapLogicsTitle: () => bootstrapLogicsTitle,
          getCanResetProjectRoot: () => canResetProjectRoot,
          getCanLaunchCodex: () => canLaunchCodex,
          getLaunchCodexTitle: () => launchCodexTitle,
          getCanLaunchClaude: () => canLaunchClaude,
          getLaunchClaudeTitle: () => launchClaudeTitle,
          getCanRepairLogicsKit: () => canRepairLogicsKit,
          getRepairLogicsKitTitle: () => repairLogicsKitTitle,
          getCanPublishRelease: () => canPublishRelease,
          getPublishReleaseTitle: () => publishReleaseTitle,
          getShouldRecommendCheckEnvironment: () => shouldRecommendCheckEnvironment,
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
    chrome && typeof chrome.setToolsPanelOpen === "function"
      ? (viewName, isOpen) => chrome.setToolsPanelOpen(viewName, isOpen)
      : () => undefined;
  const setControlDescription =
    chrome && typeof chrome.setControlDescription === "function"
      ? (element, label) => chrome.setControlDescription(element, label)
      : () => undefined;

  function getSelectedItem() {
    return items.find((item) => item.id === selectedId) || null;
  }

  function buildColumnMenu() {
    const menu = document.createElement("div");
    menu.className = "column__menu";
    menu.setAttribute("role", "menu");
    const options = [
      { label: "Open", action: "open" },
      { label: "Read", action: "read" },
      { label: "Promote", action: "promote" }
    ];
    for (const option of options) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "column__menu-item";
      item.textContent = option.label;
      item.setAttribute("role", "menuitem");
      item.addEventListener("click", () => {
        const selectedItem = getSelectedItem();
        if (selectedItem) {
          hostApi[option.action](selectedItem);
        }
        closeColumnMenu();
      });
      menu.appendChild(item);
    }
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
    if (activeColumnMenuButton === button) {
      closeColumnMenu();
      return;
    }
    closeColumnMenu();
    const menu = buildColumnMenu();
    activeColumnMenu = menu;
    activeColumnMenuButton = button;
    button.setAttribute("aria-expanded", "true");
    button.parentElement?.appendChild(menu);
  }

  let setState = () => undefined;
  let render = () => undefined;
  let restoreDefaultFilters = () => undefined;
  let setFilterPanelOpen = () => undefined;
  let setToolsPanelOpen = () => undefined;
  let openSelectedItem = () => undefined;
  let handleChangeProjectRoot = async () => undefined;
  let handleResetProjectRoot = () => undefined;
  let handleBootstrapLogics = () => undefined;
  let handleAbout = () => undefined;
  let handleHostMessage = () => undefined;
  let renderBoardErrorState = () => undefined;
  let handleDocumentClick = () => undefined;
  let handleDocumentKeydown = () => undefined;
  let handleSplitterKeydown = () => undefined;
  let handleResponsiveLayoutChange = () => undefined;
  let hydratePersistedState = () => undefined;

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
        render: () => render(),
        openSelectedItem: (mode) => openSelectedItem(mode),
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

  mainCore =
    typeof mainCoreFactory === "function"
      ? mainCoreFactory({
          state,
          board,
          mainPane,
          layout,
          splitter,
          details,
          detailsBody,
          detailsToggle,
          detailsTitle,
          filterPanel,
          toolsPanel,
          filterToggle,
          workflowToggle,
          assistToggle,
          systemToggle,
          viewModeToggleButton,
          projectGithubUrl,
          stackedQuery,
          compactListQuery,
          hostApi,
          layoutController,
          boardRenderer,
          detailsRenderer,
          chrome,
          renderActivityPanel,
          renderHelpBanner,
          updateButtons,
          updateViewModeToggle,
          updateFilterState,
          syncChromeInputs,
          captureScrollState,
          restoreScrollState,
          schedulePersistState,
          resetPersistedUiState,
          persistState,
          applyToolsPanelOpen,
          isListMode,
          isVisible,
          getVisibleStages,
          groupByStage,
          getListGroups,
          getAttentionReasons,
          getStageLabel,
          isPrimaryFlowStage,
          isRequestProcessed,
          buildContextPack,
          buildDependencyMap,
          findManagedItemByReference,
          formatDate,
          collectCompanionDocs,
          collectSpecs,
          collectPrimaryFlowItems,
          getCanResetProjectRoot: () => canResetProjectRoot,
          setCanResetProjectRoot(value) {
            canResetProjectRoot = value;
          },
          getCanBootstrapLogics: () => canBootstrapLogics,
          setCanBootstrapLogics(value) {
            canBootstrapLogics = value;
          },
          setBootstrapLogicsTitle(value) {
            bootstrapLogicsTitle = value;
          },
          getCanLaunchCodex: () => canLaunchCodex,
          setCanLaunchCodex(value) {
            canLaunchCodex = value;
          },
          setLaunchCodexTitle(value) {
            launchCodexTitle = value;
          },
          getCanLaunchClaude: () => canLaunchClaude,
          setCanLaunchClaude(value) {
            canLaunchClaude = value;
          },
          setLaunchClaudeTitle(value) {
            launchClaudeTitle = value;
          },
          getCanRepairLogicsKit: () => canRepairLogicsKit,
          setCanRepairLogicsKit(value) {
            canRepairLogicsKit = value;
          },
          setRepairLogicsKitTitle(value) {
            repairLogicsKitTitle = value;
          },
          getCanPublishRelease: () => canPublishRelease,
          setCanPublishRelease(value) {
            canPublishRelease = value;
          },
          setPublishReleaseTitle(value) {
            publishReleaseTitle = value;
          },
          getShouldRecommendCheckEnvironment: () => shouldRecommendCheckEnvironment,
          setShouldRecommendCheckEnvironment(value) {
            shouldRecommendCheckEnvironment = value;
          },
          defaultFilterState,
          hydratePersistedState: persistenceHydratePersistedState,
          harnessApi
        })
      : null;

  ({
    setState,
    render,
    restoreDefaultFilters,
    setFilterPanelOpen,
    setToolsPanelOpen,
    openSelectedItem,
    handleChangeProjectRoot,
    handleResetProjectRoot,
    handleBootstrapLogics,
    handleAbout,
    handleHostMessage,
    renderBoardErrorState,
    handleDocumentClick,
    handleDocumentKeydown,
    handleSplitterKeydown,
    handleResponsiveLayoutChange,
    hydratePersistedState
  } = mainCore || {});

  hydratePersistedState(previousState);

  const interactionHandlers =
    typeof mainInteractionHandlersFactory === "function"
      ? mainInteractionHandlersFactory({
          core: mainCore,
          hostApi,
          layoutController,
          stackedQuery,
          compactListQuery,
          state
        })
      : {};

  const interactions =
    typeof mainInteractionsFactory === "function"
      ? mainInteractionsFactory({
          activityToggle,
          headerLogicsInsightsButton,
          attentionToggle,
          board,
          assistCommitAllButton,
          assistNextStepButton,
          assistTriageButton,
          assistDiffRiskButton,
          assistSummarizeChangelogButton,
          assistPrepareReleaseButton,
          assistPublishReleaseButton,
          assistSummarizeValidationButton,
          assistValidationChecklistButton,
          assistDocConsistencyButton,
          bootstrapLogicsButton,
          checkHybridRuntimeButton,
          checkEnvironmentButton,
          openHybridInsightsButton,
          openLogicsInsightsButton,
          openOnboardingButton,
          changeProjectRootButton,
          compactListQuery,
          createCompanionDocToolButton,
          detailsBody,
          detailsToggle,
          filterPanel,
          filterResetButton,
          filterToggle,
          assistToggle,
          groupBySelect,
          helpBannerDismiss,
          hideCompleteToggle,
          hideEmptyColumnsToggle,
          hideProcessedRequestsToggle,
          hideSpecToggle,
          layoutController,
          repairLogicsKitButton,
          mainPane,
          markDoneButton,
          markObsoleteButton,
          changeStatusButton,
          newRequestToolButton,
          openButton,
          promoteButton,
          readButton,
          resetProjectRootButton,
          searchInput,
          selectAgentButton,
          setControlDescription,
          showCompanionDocsToggle,
          sortBySelect,
          splitter,
          stackedQuery,
          toolsPanel,
          workflowToggle,
          systemToggle,
          updateLogicsKitButton,
          viewModeToggleButton,
          aboutButton,
          ...interactionHandlers
        })
      : null;

  if (interactions && typeof interactions.attach === "function") {
    interactions.attach();
  }

  if (typeof setToolsPanelOpen === "function") {
    setToolsPanelOpen(toolsPanelView, toolsPanelOpen);
  }

  if (layoutController && typeof layoutController.updateLayoutMode === "function") {
    layoutController.updateLayoutMode();
  }
  debugLog("webview:init", { mode: isHarnessMode ? "harness" : "vscode" });
  hostApi.ready();
})();
