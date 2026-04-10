(() => {
  window.createCdxLogicsMainInteractions = function createCdxLogicsMainInteractions(options) {
    const {
      activityToggle,
      attentionToggle,
      headerLogicsInsightsButton,
      board,
      assistToggle,
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
      onNewRequest,
      onAbout,
      onActivityToggle,
      onBoardScroll,
      onBootstrapLogics,
      onCheckHybridRuntime,
      onCheckEnvironment,
      onOpenHybridInsights,
      onOpenLogicsInsights,
      onOpenOnboarding,
      onChangeProjectRoot,
      onAssistCommitAll,
      onAssistNextStep,
      onAssistTriage,
      onAssistDiffRisk,
      onAssistSummarizeChangelog,
      onAssistPrepareRelease,
      onAssistPublishRelease,
      onAssistSummarizeValidation,
      onAssistValidationChecklist,
      onAssistDocConsistency,
      onCreateCompanionDoc,
      onDetailsScroll,
      onDetailsToggle,
      onDocumentClick,
      onDocumentKeydown,
      onFilterPanelToggle,
      onFilterReset,
      onGroupChange,
      onHelpDismiss,
      onHideCompleteChange,
      onHideEmptyColumnsChange,
      onHideProcessedRequestsChange,
      onHideSpecChange,
      onMarkDone,
      onMarkObsolete,
      onChangeStatus,
      onOpenSelectedItem,
      onPromoteSelectedItem,
      onReadSelectedItem,
      onResetProjectRoot,
      onSearchInput,
      onSelectAgent,
      onShowCompanionDocsChange,
      onSortChange,
      onSplitterKeydown,
      onToggleViewMode,
      onToggleAttention,
      onToolsPanelToggle,
      onUpdateLogicsKit,
      onRepairLogicsKit,
      onWindowMessage,
      onWindowResize,
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
      aboutButton
    } = options;

    function attachMediaQueryListener(query, callback) {
      if (!query || typeof callback !== "function") {
        return;
      }
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", callback);
        return;
      }
      if (typeof query.addListener === "function") {
        query.addListener(callback);
      }
    }

    function attach() {
      if (headerLogicsInsightsButton) {
        headerLogicsInsightsButton.addEventListener("click", () => onOpenLogicsInsights());
      }
      if (viewModeToggleButton) {
        viewModeToggleButton.addEventListener("click", () => onToggleViewMode());
      }
      if (bootstrapLogicsButton) {
        bootstrapLogicsButton.addEventListener("click", () => onBootstrapLogics());
      }
      if (updateLogicsKitButton) {
        updateLogicsKitButton.addEventListener("click", () => onUpdateLogicsKit());
      }
      if (repairLogicsKitButton) {
        repairLogicsKitButton.addEventListener("click", () => onRepairLogicsKit());
      }
      if (checkEnvironmentButton) {
        checkEnvironmentButton.addEventListener("click", () => onCheckEnvironment());
      }
      if (checkHybridRuntimeButton) {
        checkHybridRuntimeButton.addEventListener("click", () => onCheckHybridRuntime());
      }
      if (openHybridInsightsButton) {
        openHybridInsightsButton.addEventListener("click", () => onOpenHybridInsights());
      }
      if (openLogicsInsightsButton) {
        openLogicsInsightsButton.addEventListener("click", () => onOpenLogicsInsights());
      }
      if (openOnboardingButton) {
        openOnboardingButton.addEventListener("click", () => onOpenOnboarding());
      }
      if (assistCommitAllButton) {
        assistCommitAllButton.addEventListener("click", () => onAssistCommitAll());
      }
      if (assistNextStepButton) {
        assistNextStepButton.addEventListener("click", () => onAssistNextStep());
      }
      if (assistTriageButton) {
        assistTriageButton.addEventListener("click", () => onAssistTriage());
      }
      if (assistDiffRiskButton) {
        assistDiffRiskButton.addEventListener("click", () => onAssistDiffRisk());
      }
      if (assistSummarizeChangelogButton) {
        assistSummarizeChangelogButton.addEventListener("click", () => onAssistSummarizeChangelog());
      }
      if (assistPrepareReleaseButton) {
        assistPrepareReleaseButton.addEventListener("click", () => onAssistPrepareRelease());
      }
      if (assistPublishReleaseButton) {
        assistPublishReleaseButton.addEventListener("click", () => onAssistPublishRelease());
      }
      if (assistSummarizeValidationButton) {
        assistSummarizeValidationButton.addEventListener("click", () => onAssistSummarizeValidation());
      }
      if (assistValidationChecklistButton) {
        assistValidationChecklistButton.addEventListener("click", () => onAssistValidationChecklist());
      }
      if (assistDocConsistencyButton) {
        assistDocConsistencyButton.addEventListener("click", () => onAssistDocConsistency());
      }
      if (newRequestToolButton) {
        newRequestToolButton.addEventListener("click", () => onNewRequest());
      }
      if (createCompanionDocToolButton) {
        createCompanionDocToolButton.addEventListener("click", () => onCreateCompanionDoc("create-companion-doc"));
      }
      if (selectAgentButton) {
        selectAgentButton.addEventListener("click", () => onSelectAgent());
      }
      if (changeProjectRootButton) {
        changeProjectRootButton.addEventListener("click", () => onChangeProjectRoot());
      }
      if (resetProjectRootButton) {
        resetProjectRootButton.addEventListener("click", () => onResetProjectRoot());
      }
      if (aboutButton) {
        aboutButton.addEventListener("click", () => onAbout());
      }
      if (filterToggle) {
        filterToggle.addEventListener("click", (event) => onFilterPanelToggle(event));
      }
      if (workflowToggle) {
        workflowToggle.addEventListener("click", (event) => onToolsPanelToggle("workflow", event));
      }
      if (assistToggle) {
        assistToggle.addEventListener("click", (event) => onToolsPanelToggle("assist", event));
      }
      if (systemToggle) {
        systemToggle.addEventListener("click", (event) => onToolsPanelToggle("system", event));
      }
      if (hideCompleteToggle) {
        hideCompleteToggle.addEventListener("change", (event) => onHideCompleteChange(event));
      }
      if (hideProcessedRequestsToggle) {
        hideProcessedRequestsToggle.addEventListener("change", (event) => onHideProcessedRequestsChange(event));
      }
      if (hideSpecToggle) {
        hideSpecToggle.addEventListener("change", (event) => onHideSpecChange(event));
      }
      if (showCompanionDocsToggle) {
        showCompanionDocsToggle.addEventListener("change", (event) => onShowCompanionDocsChange(event));
      }
      if (hideEmptyColumnsToggle) {
        hideEmptyColumnsToggle.addEventListener("change", (event) => onHideEmptyColumnsChange(event));
      }
      if (filterResetButton) {
        filterResetButton.addEventListener("click", () => onFilterReset());
      }
      if (searchInput) {
        searchInput.addEventListener("input", (event) => onSearchInput(event));
      }
      if (groupBySelect) {
        groupBySelect.addEventListener("change", (event) => onGroupChange(event));
      }
      if (sortBySelect) {
        sortBySelect.addEventListener("change", (event) => onSortChange(event));
      }
      if (attentionToggle) {
        attentionToggle.addEventListener("click", () => onToggleAttention());
      }
      if (activityToggle) {
        activityToggle.addEventListener("click", () => onActivityToggle());
      }
      if (helpBannerDismiss) {
        helpBannerDismiss.addEventListener("click", () => onHelpDismiss());
      }
      if (board) {
        board.addEventListener("scroll", () => onBoardScroll());
      }
      if (detailsBody) {
        detailsBody.addEventListener("scroll", () => onDetailsScroll());
      }
      if (detailsToggle) {
        detailsToggle.addEventListener("click", () => onDetailsToggle());
      }
      if (openButton) {
        openButton.addEventListener("click", () => onOpenSelectedItem());
      }
      if (readButton) {
        readButton.addEventListener("click", () => onReadSelectedItem());
      }
      if (promoteButton) {
        promoteButton.addEventListener("click", () => onPromoteSelectedItem());
      }
      if (markDoneButton) {
        markDoneButton.addEventListener("click", () => onMarkDone());
      }
      if (markObsoleteButton) {
        markObsoleteButton.addEventListener("click", () => onMarkObsolete());
      }
      if (changeStatusButton) {
        changeStatusButton.addEventListener("click", () => onChangeStatus());
      }

      window.addEventListener("message", (event) => onWindowMessage(event));
      document.addEventListener("click", (event) => onDocumentClick(event));
      document.addEventListener("keydown", (event) => onDocumentKeydown(event));

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
        splitter.addEventListener("keydown", (event) => onSplitterKeydown(event));
      }

      attachMediaQueryListener(stackedQuery, onWindowResize);
      attachMediaQueryListener(compactListQuery, onWindowResize);
      window.addEventListener("resize", () => onWindowResize());

      setControlDescription(filterToggle, "Show view controls");
      setControlDescription(workflowToggle, "Open workflow menu");
      setControlDescription(assistToggle, "Open assist menu");
      setControlDescription(systemToggle, "Open system menu");
      setControlDescription(viewModeToggleButton, "Switch display mode");
      setControlDescription(selectAgentButton, "Select active agent");
      setControlDescription(newRequestToolButton, "Create a new request document");
      setControlDescription(bootstrapLogicsButton, "Bootstrap Logics");
      setControlDescription(checkEnvironmentButton, "Review environment health and recommended fixes");
      setControlDescription(checkHybridRuntimeButton, "Check hybrid assist runtime health");
      setControlDescription(openHybridInsightsButton, "Open the hybrid assist ROI insights panel");
      setControlDescription(openLogicsInsightsButton, "Open repository-level Logics stats and relationship signals");
      setControlDescription(assistCommitAllButton, "Suggest or execute a bounded commit plan");
      setControlDescription(assistNextStepButton, "Suggest the next bounded workflow step");
      setControlDescription(assistTriageButton, "Classify a workflow doc through the shared runtime");
      setControlDescription(assistDiffRiskButton, "Assess the current diff risk through the shared runtime");
      setControlDescription(assistSummarizeChangelogButton, "Generate bounded changelog entries through the shared runtime");
      setControlDescription(assistPrepareReleaseButton, "Generate changelog via AI if missing, update README badge, and commit prep changes");
      setControlDescription(assistPublishReleaseButton, "Create the release tag, push, and publish the GitHub release");
      setControlDescription(assistSummarizeValidationButton, "Summarize validation status");
      setControlDescription(assistValidationChecklistButton, "Build a bounded validation checklist through the shared runtime");
      setControlDescription(assistDocConsistencyButton, "Review workflow doc consistency through the shared runtime");
      setControlDescription(changeProjectRootButton, "Change project root");
      setControlDescription(resetProjectRootButton, "Use workspace root");
      setControlDescription(repairLogicsKitButton, "Check current Logics runtime state and repair the shared kit publication or bridge files.");
      setControlDescription(aboutButton, "About this extension");
      setControlDescription(detailsToggle, detailsToggle?.getAttribute("aria-label") || "Collapse details");
      setControlDescription(markDoneButton, "Mark selected item as done");
      setControlDescription(markObsoleteButton, "Mark selected item as obsolete");
      setControlDescription(changeStatusButton, "Change selected item status");
      setControlDescription(openButton, "Edit selected item");
      setControlDescription(readButton, "Read selected item");
      setControlDescription(promoteButton, "Promote selected item");
      if (toolsPanel) {
        toolsPanel.setAttribute("role", "menu");
      }
      if (filterPanel) {
        filterPanel.setAttribute("role", "group");
        filterPanel.setAttribute("aria-label", "View controls");
      }
      if (filterToggle && filterPanel && filterPanel.id) {
        filterToggle.setAttribute("aria-controls", filterPanel.id);
      }
      if (workflowToggle && toolsPanel && toolsPanel.id) {
        workflowToggle.setAttribute("aria-controls", toolsPanel.id);
      }
      if (assistToggle && toolsPanel && toolsPanel.id) {
        assistToggle.setAttribute("aria-controls", toolsPanel.id);
      }
      if (systemToggle && toolsPanel && toolsPanel.id) {
        systemToggle.setAttribute("aria-controls", toolsPanel.id);
      }
      if (mainPane) {
        mainPane.classList.toggle("layout__main--activity", false);
      }
    }

    return { attach };
  };
})();
