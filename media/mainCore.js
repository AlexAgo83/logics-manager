(() => {
  function normalizeWorkspacePath(value) {
    if (!value) {
      return "";
    }
    const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
    return normalized.toLowerCase();
  }

  function areSameWorkspacePath(left, right) {
    return normalizeWorkspacePath(left) === normalizeWorkspacePath(right);
  }

  window.createCdxLogicsMainCore = function createCdxLogicsMainCore(options) {
    const {
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
      applyToolsPanelOpen,
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
      isListMode,
      isVisible,
      getVisibleStages,
      groupByStage,
      getListGroups,
      getAttentionReasons,
      getStageLabel,
      isPrimaryFlowStage,
      isRequestProcessed,
      getSelectedItem,
      buildContextPack,
      buildDependencyMap,
      findManagedItemByReference,
      formatDate,
      collectCompanionDocs,
      collectSpecs,
      collectPrimaryFlowItems,
      getCanResetProjectRoot,
      setCanResetProjectRoot,
      getCanBootstrapLogics,
      setCanBootstrapLogics,
      setBootstrapLogicsTitle,
      getCanLaunchCodex,
      setCanLaunchCodex,
      setLaunchCodexTitle,
      getCanLaunchClaude,
      setCanLaunchClaude,
      setLaunchClaudeTitle,
      getCanRepairLogicsKit,
      setCanRepairLogicsKit,
      setRepairLogicsKitTitle,
      getCanPublishRelease,
      setCanPublishRelease,
      setPublishReleaseTitle,
      getShouldRecommendCheckEnvironment,
      setShouldRecommendCheckEnvironment
    } = options;

    const defaultCollapsedDetailSections = new Set([
      "attentionExplain",
      "contextPack",
      "dependencyMap",
      "companionDocs",
      "specs",
      "primaryFlow",
      "references",
      "usedBy"
    ]);

    function getSnapshot(scrollValues = { boardLeft: 0, boardTop: 0, detailsTop: 0 }) {
      return {
        workspaceRoot: state.activeWorkspaceRoot,
        selectedId: state.selectedId,
        hideCompleted: state.hideCompleted,
        hideProcessedRequests: state.hideProcessedRequests,
        hideSpec: state.hideSpec,
        showCompanionDocs: state.showCompanionDocs,
        hideEmptyColumns: state.hideEmptyColumns,
        searchQuery: state.searchQuery,
        groupMode: state.groupMode,
        sortMode: state.sortMode,
        secondaryToolbarOpen: state.secondaryToolbarOpen,
        activityPanelOpen: state.activityPanelOpen,
        attentionOnly: state.attentionOnly,
        helpDismissed: state.helpDismissed,
        collapsedListStages: Array.from(state.collapsedListStages),
        detailsCollapsed: state.uiState.detailsCollapsed,
        collapsedDetailSections: Array.from(state.collapsedDetailSections),
        viewMode: state.uiState.viewMode,
        splitRatio: state.uiState.splitRatio,
        boardScrollLeft: scrollValues.boardLeft,
        boardScrollTop: scrollValues.boardTop,
        detailsScrollTop: scrollValues.detailsTop
      };
    }

    function applyResetState({ defaultFilterState, uiDefaults }) {
      state.hideCompleted = defaultFilterState.hideCompleted;
      state.hideProcessedRequests = defaultFilterState.hideProcessedRequests;
      state.hideSpec = defaultFilterState.hideSpec;
      state.showCompanionDocs = defaultFilterState.showCompanionDocs;
      state.hideEmptyColumns = defaultFilterState.hideEmptyColumns;
      state.searchQuery = "";
      state.groupMode = "stage";
      state.sortMode = "default";
      state.activityPanelOpen = false;
      state.attentionOnly = false;
      state.helpDismissed = false;
      state.collapsedListStages = new Set();
      state.collapsedDetailSections = new Set(defaultCollapsedDetailSections);
      state.selectedId = null;
      state.secondaryToolbarOpen = false;
      state.toolsPanelOpen = false;
      state.uiState.detailsCollapsed = uiDefaults.detailsCollapsed;
      state.uiState.viewMode = uiDefaults.viewMode;
      state.uiState.splitRatio = uiDefaults.splitRatio;
      state.activeColumnMenu = null;
      state.activeColumnMenuButton = null;
    }

    function applyPersistedState(nextState, nextScrollState) {
      if (nextState && typeof nextState.hideCompleted === "boolean") {
        state.hideCompleted = nextState.hideCompleted;
      }
      if (nextState && typeof nextState.hideProcessedRequests === "boolean") {
        state.hideProcessedRequests = nextState.hideProcessedRequests;
      } else if (nextState && typeof nextState.hideUsedRequests === "boolean") {
        state.hideProcessedRequests = nextState.hideUsedRequests;
      }
      if (nextState && typeof nextState.hideSpec === "boolean") {
        state.hideSpec = nextState.hideSpec;
      }
      if (nextState && typeof nextState.showCompanionDocs === "boolean") {
        state.showCompanionDocs = nextState.showCompanionDocs;
      }
      if (nextState && typeof nextState.hideEmptyColumns === "boolean") {
        state.hideEmptyColumns = nextState.hideEmptyColumns;
      }
      if (nextState && typeof nextState.searchQuery === "string") {
        state.searchQuery = nextState.searchQuery;
      }
      if (nextState && typeof nextState.groupMode === "string") {
        state.groupMode = nextState.groupMode;
      }
      if (nextState && typeof nextState.sortMode === "string") {
        state.sortMode = nextState.sortMode;
      }
      if (nextState && typeof nextState.activityPanelOpen === "boolean") {
        state.activityPanelOpen = nextState.activityPanelOpen;
      }
      if (nextState && typeof nextState.attentionOnly === "boolean") {
        state.attentionOnly = nextState.attentionOnly;
      }
      if (nextState && typeof nextState.helpDismissed === "boolean") {
        state.helpDismissed = nextState.helpDismissed;
      }
      if (nextState && typeof nextState.secondaryToolbarOpen === "boolean") {
        state.secondaryToolbarOpen = nextState.secondaryToolbarOpen;
      }
      if (nextState && typeof nextState.detailsCollapsed === "boolean") {
        state.uiState.detailsCollapsed = nextState.detailsCollapsed;
      }
      if (nextState && typeof nextState.viewMode === "string") {
        state.uiState.viewMode = nextState.viewMode;
      }
      if (nextState && typeof nextState.splitRatio === "number") {
        state.uiState.splitRatio = nextState.splitRatio;
      }
      if (nextState && Array.isArray(nextState.collapsedListStages)) {
        state.collapsedListStages = new Set(nextState.collapsedListStages);
      }
      if (nextState && Array.isArray(nextState.collapsedDetailSections)) {
        state.collapsedDetailSections = new Set(nextState.collapsedDetailSections);
      }
      if (nextState && typeof nextState.selectedId === "string") {
        state.selectedId = nextState.selectedId;
      }
      if (nextScrollState && typeof nextScrollState.boardLeft === "number") {
        state.scrollState.boardLeft = nextScrollState.boardLeft;
      }
      if (nextScrollState && typeof nextScrollState.boardTop === "number") {
        state.scrollState.boardTop = nextScrollState.boardTop;
      }
      if (nextScrollState && typeof nextScrollState.detailsTop === "number") {
        state.scrollState.detailsTop = nextScrollState.detailsTop;
      }
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
          hostApi[option.action](state.selectedItem);
          closeColumnMenu();
        });
        menu.appendChild(item);
      }
      return menu;
    }

    function closeColumnMenu() {
      if (state.activeColumnMenu) {
        state.activeColumnMenu.remove();
      }
      if (state.activeColumnMenuButton) {
        state.activeColumnMenuButton.setAttribute("aria-expanded", "false");
      }
      state.activeColumnMenu = null;
      state.activeColumnMenuButton = null;
    }

    function toggleColumnMenu(button) {
      if (state.activeColumnMenuButton === button) {
        closeColumnMenu();
        return;
      }
      closeColumnMenu();
      const menu = buildColumnMenu();
      state.activeColumnMenu = menu;
      state.activeColumnMenuButton = button;
      button.setAttribute("aria-expanded", "true");
      button.parentElement?.appendChild(menu);
    }

    function setState(nextItems, nextSelectedId) {
      state.items = Array.isArray(nextItems) ? nextItems : [];
      if (typeof nextSelectedId === "string") {
        state.selectedId = nextSelectedId;
      } else if (!state.items.find((item) => item.id === state.selectedId)) {
        state.selectedId = null;
      }
      render();
    }

    function restoreDefaultFilters() {
      state.hideCompleted = options.defaultFilterState.hideCompleted;
      state.hideProcessedRequests = options.defaultFilterState.hideProcessedRequests;
      state.hideSpec = options.defaultFilterState.hideSpec;
      state.showCompanionDocs = options.defaultFilterState.showCompanionDocs;
      state.hideEmptyColumns = options.defaultFilterState.hideEmptyColumns;
    }

    function setFilterPanelOpen(isOpen) {
      state.secondaryToolbarOpen = isOpen;
      if (filterPanel) {
        filterPanel.hidden = !isOpen;
        filterPanel.setAttribute("aria-hidden", String(!isOpen));
      }
      updateFilterState();
      persistState();
    }

    function setToolsPanelOpen(viewName, isOpen) {
      state.toolsPanelOpen = isOpen;
      if (isOpen && typeof viewName === "string" && viewName) {
        state.toolsPanelView = viewName;
      }
      if (typeof applyToolsPanelOpen === "function") {
        applyToolsPanelOpen(viewName, isOpen);
      }
      if (toolsPanel) {
        toolsPanel.hidden = !isOpen;
        toolsPanel.setAttribute("aria-hidden", String(!isOpen));
      }
    }

    function openSelectedItem(mode) {
      if (!state.selectedId) {
        return;
      }
      const item = state.items.find((entry) => entry.id === state.selectedId);
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
      const selectedItem = state.items.find((item) => item.id === state.selectedId);
      if (selectedItem && !isVisible(selectedItem) && !state.activityPanelOpen) {
        state.selectedId = null;
      }
      if (details) {
        details.classList.toggle("details--collapsed", state.uiState.detailsCollapsed);
      }
      if (detailsToggle) {
        detailsToggle.setAttribute("aria-expanded", String(!state.uiState.detailsCollapsed));
        detailsToggle.setAttribute("aria-label", state.uiState.detailsCollapsed ? "Expand details" : "Collapse details");
        detailsToggle.title = state.uiState.detailsCollapsed ? "Expand details" : "Collapse details";
      }
      if (layoutController && typeof layoutController.updateSplitterA11y === "function") {
        layoutController.updateSplitterA11y();
      }
      if (board) {
        board.classList.toggle("board--list", isListMode());
        board.hidden = state.activityPanelOpen;
      }
      if (mainPane) {
        mainPane.classList.toggle("layout__main--activity", state.activityPanelOpen);
      }
      updateViewModeToggle();
      boardRenderer.renderBoard();
      detailsRenderer.renderDetails();
      renderActivityPanel();
      renderHelpBanner();
      updateButtons();
      updateFilterState();
      syncChromeInputs();
      restoreScrollState();
    }

    function handleHostMessage(event) {
      const { type, payload, action } = event.data || {};
      if (type === "trigger-tool-action" && typeof action === "string") {
        const toolButton = document.querySelector(`[data-action="${action}"]`);
        if (toolButton instanceof HTMLElement) {
          toolButton.click();
        }
        return;
      }
      if (type === "data") {
        if (payload && typeof payload.root === "string") {
          state.activeWorkspaceRoot = payload.root;
          if (options.harnessApi && typeof options.harnessApi.setCurrentRoot === "function") {
            options.harnessApi.setCurrentRoot(payload.root);
          }
          if (state.persistedWorkspaceRoot && !areSameWorkspacePath(state.persistedWorkspaceRoot, payload.root)) {
            resetPersistedUiState();
          }
        }
        if (payload && typeof payload.canResetProjectRoot === "boolean") {
          state.canResetProjectRoot = payload.canResetProjectRoot;
        }
        if (payload && typeof payload.canBootstrapLogics === "boolean") {
          state.canBootstrapLogics = payload.canBootstrapLogics;
        }
        if (payload && typeof payload.bootstrapLogicsTitle === "string") {
          state.bootstrapLogicsTitle = payload.bootstrapLogicsTitle;
        }
        if (payload && typeof payload.canLaunchCodex === "boolean") {
          state.canLaunchCodex = payload.canLaunchCodex;
        }
        if (payload && typeof payload.launchCodexTitle === "string") {
          state.launchCodexTitle = payload.launchCodexTitle;
        }
        if (payload && typeof payload.canLaunchClaude === "boolean") {
          state.canLaunchClaude = payload.canLaunchClaude;
        }
        if (payload && typeof payload.launchClaudeTitle === "string") {
          state.launchClaudeTitle = payload.launchClaudeTitle;
        }
        if (payload && typeof payload.canRepairLogicsKit === "boolean") {
          state.canRepairLogicsKit = payload.canRepairLogicsKit;
        }
        if (payload && typeof payload.repairLogicsKitTitle === "string") {
          state.repairLogicsKitTitle = payload.repairLogicsKitTitle;
        }
        if (payload && typeof payload.canPublishRelease === "boolean") {
          state.canPublishRelease = payload.canPublishRelease;
        }
        if (payload && typeof payload.publishReleaseTitle === "string") {
          state.publishReleaseTitle = payload.publishReleaseTitle;
        }
        if (payload && typeof payload.shouldRecommendCheckEnvironment === "boolean") {
          state.shouldRecommendCheckEnvironment = payload.shouldRecommendCheckEnvironment;
        }
        state.changedPaths = Array.isArray(payload && payload.changedPaths) ? payload.changedPaths : [];
        state.activeAgent = payload && payload.activeAgent ? payload.activeAgent : null;
        if (payload && payload.error) {
          renderBoardErrorState(payload.error);
          detailsBody.innerHTML = "";
          if (detailsTitle) {
            detailsTitle.textContent = "Details";
          }
          state.selectedId = null;
          updateButtons();
          updateViewModeToggle();
          return;
        }
        const nextItems = payload && payload.items ? payload.items : [];
        const nextSelected = payload ? payload.selectedId : undefined;
        setState(nextItems, nextSelected);
      }
    }

    function handleDocumentClick(event) {
      if (state.toolsPanelOpen && toolsPanel) {
        const target = event.target;
        const toolbarButtons = [workflowToggle, assistToggle, systemToggle].filter(Boolean);
        const clickedToolbarButton = toolbarButtons.some((button) => button && button.contains(target));
        if (!toolsPanel.contains(target) && !clickedToolbarButton) {
          setToolsPanelOpen(undefined, false);
        }
      }
      if (!state.activeColumnMenu) {
        return;
      }
      const target = event.target;
      if (state.activeColumnMenu.contains(target)) {
        return;
      }
      if (state.activeColumnMenuButton && state.activeColumnMenuButton.contains(target)) {
        return;
      }
      closeColumnMenu();
    }

    function handleDocumentKeydown(event) {
      if (event.key === "Escape" && state.secondaryToolbarOpen) {
        setFilterPanelOpen(false);
      }
      if (event.key === "Escape" && state.toolsPanelOpen) {
        setToolsPanelOpen(undefined, false);
      }
      if (event.key === "Escape" && state.activeColumnMenu) {
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
        layoutController.applySplitRatio(state.uiState.splitRatio, false);
      }
      render();
    }

    function triggerPersistState() {
      if (typeof options.persistState === "function") {
        options.persistState();
      }
    }

    function hydratePersistedState(previousState) {
      if (typeof options.hydratePersistedState === "function") {
        options.hydratePersistedState(previousState);
      }
    }

    return {
      getSnapshot,
      applyResetState,
      applyPersistedState,
      normalizeWorkspacePath,
      areSameWorkspacePath,
      buildColumnMenu,
      closeColumnMenu,
      toggleColumnMenu,
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
      hydratePersistedState,
      persistState: triggerPersistState,
      captureScrollState,
      restoreScrollState,
      schedulePersistState,
      resetPersistedUiState
    };
  };
})();
