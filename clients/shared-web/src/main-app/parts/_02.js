
  const chrome =
    typeof chromeFactory === "function"
      ? chromeFactory({
          activityPanel,
          activityToggle,
          headerLogicsInsightsButton,
          attentionToggle,
          bootstrapLogicsButton,
          repairLogicsKitButton,
          assistPublishReleaseButton,
          filterPanel,
          filterToggle,
          toolsToggle,
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
          getToolsPanelView: () => toolsPanelView,
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
        getGroupMode: () => groupMode,
        getSortMode: () => sortMode,
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
          toolsToggle,
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
