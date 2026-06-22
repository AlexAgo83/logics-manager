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
  if (!previousState || typeof previousState.detailsCollapsed !== "boolean") {
    uiState.detailsCollapsed = uiState.viewMode === "list" || compactListQuery.matches;
  }

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
          toolsToggle,
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
