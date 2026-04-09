(() => {
  window.createCdxLogicsMainInteractionHandlers = function createCdxLogicsMainInteractionHandlers(options) {
    const { core, hostApi, layoutController, stackedQuery, compactListQuery, state } = options;

    const render = core && typeof core.render === "function" ? () => core.render() : () => undefined;
    const persistState = core && typeof core.persistState === "function" ? () => core.persistState() : () => undefined;
    const captureScrollState =
      core && typeof core.captureScrollState === "function" ? () => core.captureScrollState() : () => undefined;
    const schedulePersistState =
      core && typeof core.schedulePersistState === "function"
        ? () => core.schedulePersistState()
        : () => undefined;
    const resetPersistedUiState =
      core && typeof core.resetPersistedUiState === "function"
        ? () => core.resetPersistedUiState()
        : () => undefined;
    const setFilterPanelOpen =
      core && typeof core.setFilterPanelOpen === "function" ? (isOpen) => core.setFilterPanelOpen(isOpen) : () => undefined;
    const setToolsPanelOpen =
      core && typeof core.setToolsPanelOpen === "function"
        ? (viewNameOrOpen, maybeOpen) => {
            if (typeof maybeOpen === "boolean") {
              return core.setToolsPanelOpen(viewNameOrOpen, maybeOpen);
            }
            return core.setToolsPanelOpen(undefined, Boolean(viewNameOrOpen));
          }
        : () => undefined;
    const restoreDefaultFilters =
      core && typeof core.restoreDefaultFilters === "function" ? () => core.restoreDefaultFilters() : () => undefined;
    const openSelectedItem =
      core && typeof core.openSelectedItem === "function" ? (mode) => core.openSelectedItem(mode) : () => undefined;
    const handleChangeProjectRoot =
      core && typeof core.handleChangeProjectRoot === "function"
        ? () => core.handleChangeProjectRoot()
        : async () => undefined;
    const handleResetProjectRoot =
      core && typeof core.handleResetProjectRoot === "function"
        ? () => core.handleResetProjectRoot()
        : () => undefined;
    const handleBootstrapLogics =
      core && typeof core.handleBootstrapLogics === "function" ? () => core.handleBootstrapLogics() : () => undefined;
    const handleAbout = core && typeof core.handleAbout === "function" ? () => core.handleAbout() : () => undefined;
    const handleHostMessage =
      core && typeof core.handleHostMessage === "function" ? (event) => core.handleHostMessage(event) : () => undefined;
    const renderBoardErrorState =
      core && typeof core.renderBoardErrorState === "function"
        ? (message) => core.renderBoardErrorState(message)
        : () => undefined;
    const handleDocumentClick =
      core && typeof core.handleDocumentClick === "function"
        ? (event) => core.handleDocumentClick(event)
        : () => undefined;
    const handleDocumentKeydown =
      core && typeof core.handleDocumentKeydown === "function"
        ? (event) => core.handleDocumentKeydown(event)
        : () => undefined;
    const handleSplitterKeydown =
      core && typeof core.handleSplitterKeydown === "function"
        ? (event) => core.handleSplitterKeydown(event)
        : () => undefined;
    const handleResponsiveLayoutChange =
      core && typeof core.handleResponsiveLayoutChange === "function"
        ? () => core.handleResponsiveLayoutChange()
        : () => undefined;

    return {
      onNewRequest() {
        hostApi.newRequest();
        setToolsPanelOpen(false);
      },
      onAbout() {
        handleAbout();
        setToolsPanelOpen(false);
      },
      onActivityToggle() {
        const nextOpen = !state.activityPanelOpen;
        const shouldCollapseForStackedLayout =
          nextOpen &&
          ((stackedQuery && stackedQuery.matches) ||
            (layoutController &&
              typeof layoutController.isStackedLayout === "function" &&
              layoutController.isStackedLayout()));
        if (shouldCollapseForStackedLayout) {
          state.uiState.detailsCollapsed = true;
        }
        state.activityPanelOpen = !state.activityPanelOpen;
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
      onRepairLogicsKit() {
        hostApi.repairLogicsKit();
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
      onOpenLogicsInsights() {
        hostApi.openLogicsInsights();
        setToolsPanelOpen(false);
      },
      onOpenOnboarding() {
        hostApi.openOnboarding();
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
        hostApi.assistTriage(state.selectedId || undefined);
        setToolsPanelOpen(false);
      },
      onAssistDiffRisk() {
        hostApi.assistDiffRisk();
        setToolsPanelOpen(false);
      },
      onAssistSummarizeChangelog() {
        hostApi.assistSummarizeChangelog();
        setToolsPanelOpen(false);
      },
      onAssistPrepareRelease() {
        hostApi.assistPrepareRelease();
        setToolsPanelOpen(false);
      },
      onAssistPublishRelease() {
        hostApi.assistPublishRelease();
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
      onChangeProjectRoot() {
        return handleChangeProjectRoot();
      },
      onCreateCompanionDoc(action) {
        if (action === "new-request-guided") {
          hostApi.newGuidedRequest();
        } else {
          hostApi.createCompanionDoc(state.selectedId || undefined);
        }
        setToolsPanelOpen(false);
      },
      onDetailsScroll() {
        captureScrollState();
        schedulePersistState();
      },
      onDetailsToggle() {
        state.uiState.detailsCollapsed = !state.uiState.detailsCollapsed;
        persistState();
        render();
      },
      onDocumentClick(event) {
        handleDocumentClick(event);
      },
      onDocumentKeydown(event) {
        handleDocumentKeydown(event);
      },
      onFilterPanelToggle(event) {
        event.stopPropagation();
        if (state.toolsPanelOpen) {
          setToolsPanelOpen(false);
        }
        setFilterPanelOpen(!state.secondaryToolbarOpen);
      },
      onFilterReset() {
        restoreDefaultFilters();
        persistState();
        render();
      },
      onGroupChange(event) {
        state.groupMode = event.target ? String(event.target.value || "stage") : "stage";
        persistState();
        render();
      },
      onHelpDismiss() {
        state.helpDismissed = true;
        persistState();
        render();
      },
      onHideCompleteChange(event) {
        state.hideCompleted = Boolean(event.target && event.target.checked);
        persistState();
        render();
      },
      onHideEmptyColumnsChange(event) {
        state.hideEmptyColumns = Boolean(event.target && event.target.checked);
        persistState();
        render();
      },
      onHideProcessedRequestsChange(event) {
        state.hideProcessedRequests = Boolean(event.target && event.target.checked);
        persistState();
        render();
      },
      onHideSpecChange(event) {
        state.hideSpec = Boolean(event.target && event.target.checked);
        persistState();
        render();
      },
      onMarkDone() {
        const item = state.items.find((entry) => entry.id === state.selectedId);
        if (!item) {
          return;
        }
        hostApi.markDone(item);
      },
      onMarkObsolete() {
        const item = state.items.find((entry) => entry.id === state.selectedId);
        if (!item) {
          return;
        }
        hostApi.markObsolete(item);
      },
      onOpenSelectedItem() {
        openSelectedItem("open");
      },
      onPromoteSelectedItem() {
        if (!state.selectedId) {
          return;
        }
        hostApi.promote(state.selectedId);
      },
      onReadSelectedItem() {
        openSelectedItem("read");
      },
      onResetProjectRoot() {
        handleResetProjectRoot();
        setToolsPanelOpen(false);
      },
      onSearchInput(event) {
        state.searchQuery = event.target ? String(event.target.value || "") : "";
        persistState();
        render();
      },
      onSelectAgent() {
        hostApi.selectAgent();
        setToolsPanelOpen(false);
      },
      onShowCompanionDocsChange(event) {
        state.showCompanionDocs = Boolean(event.target && event.target.checked);
        persistState();
        render();
      },
      onSortChange(event) {
        state.sortMode = event.target ? String(event.target.value || "default") : "default";
        persistState();
        render();
      },
      onSplitterKeydown(event) {
        handleSplitterKeydown(event);
      },
      onToggleAttention() {
        state.attentionOnly = !state.attentionOnly;
        persistState();
        render();
      },
      onToggleViewMode() {
        if (compactListQuery && compactListQuery.matches) {
          return;
        }
        state.uiState.viewMode = state.uiState.viewMode === "list" ? "board" : "list";
        persistState();
        render();
      },
      onToolsPanelToggle(viewName, event) {
        const activeView = typeof viewName === "string" && viewName ? viewName : "workflow";
        const nativeEvent = event && typeof event === "object" && "stopPropagation" in event ? event : null;
        if (nativeEvent && typeof nativeEvent.stopPropagation === "function") {
          nativeEvent.stopPropagation();
        }
        const shouldOpen = !state.toolsPanelOpen || state.toolsPanelView !== activeView;
        state.toolsPanelView = shouldOpen ? activeView : state.toolsPanelView;
        setToolsPanelOpen(activeView, shouldOpen);
      },
      onWindowMessage(event) {
        handleHostMessage(event);
      },
      onWindowResize() {
        handleResponsiveLayoutChange();
      }
    };
  };
})();
