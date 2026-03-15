(() => {
  window.createCdxLogicsWebviewChrome = function createCdxLogicsWebviewChrome(options) {
    const {
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
      getAttentionOnly,
      getCanBootstrapLogics,
      getCanResetProjectRoot,
      getEffectiveViewMode,
      getGroupMode,
      getHelpBannerMessage,
      getHideCompleted,
      getHideEmptyColumns,
      getHideProcessedRequests,
      getHideSpec,
      getIsListMode,
      getSearchQuery,
      getSecondaryToolbarOpen,
      getShowCompanionDocs,
      getSortMode,
      getStageLabel,
      getToolsPanelOpen,
      getSelectedItem,
      isCompactListForced,
      selectItemAndRender
    } = options;

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

    function renderActivityPanel() {
      if (!activityPanel) {
        return;
      }
      const isOpen = options.getActivityPanelOpen();
      activityPanel.hidden = !isOpen;
      if (!isOpen) {
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
            selectItemAndRender(entry.id);
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
      const message = options.getHelpDismissed() ? "" : getHelpBannerMessage();
      helpBanner.hidden = !message;
      helpBannerCopy.textContent = message;
    }

    function updateButtons() {
      const item = getSelectedItem();
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
        resetProjectRootButton.disabled = !getCanResetProjectRoot();
        resetProjectRootButton.title = getCanResetProjectRoot() ? "Use workspace root" : "Already using workspace root";
      }
      if (bootstrapLogicsButton) {
        bootstrapLogicsButton.disabled = !getCanBootstrapLogics();
        bootstrapLogicsButton.title = getCanBootstrapLogics()
          ? "Bootstrap Logics in this project"
          : "Bootstrap already completed";
      }
    }

    function hasNonDefaultSecondaryControls() {
      return (
        getHideCompleted() !== defaultFilterState.hideCompleted ||
        getHideProcessedRequests() !== defaultFilterState.hideProcessedRequests ||
        getHideSpec() !== defaultFilterState.hideSpec ||
        getShowCompanionDocs() !== defaultFilterState.showCompanionDocs ||
        getHideEmptyColumns() !== defaultFilterState.hideEmptyColumns ||
        options.normalizeSearchValue(getSearchQuery()) !== "" ||
        getGroupMode() !== "stage" ||
        getSortMode() !== "default"
      );
    }

    function updateFilterState() {
      if (filterPanel) {
        filterPanel.hidden = !getSecondaryToolbarOpen();
        filterPanel.setAttribute("aria-hidden", String(!getSecondaryToolbarOpen()));
      }
      if (!filterToggle) {
        return;
      }
      const hasNonDefaultControls = hasNonDefaultSecondaryControls();
      filterToggle.classList.toggle("toolbar__filter--open", getSecondaryToolbarOpen());
      filterToggle.classList.toggle("toolbar__filter--active", !getSecondaryToolbarOpen() && hasNonDefaultControls);
      filterToggle.setAttribute("aria-expanded", String(getSecondaryToolbarOpen()));
      filterToggle.setAttribute("data-has-active-controls", String(hasNonDefaultControls));
      const label = getSecondaryToolbarOpen()
        ? "Hide view controls"
        : hasNonDefaultControls
          ? "Show view controls (non-default controls active)"
          : "Show view controls";
      filterToggle.setAttribute("aria-label", label);
      filterToggle.title = label;
    }

    function syncInputs() {
      if (hideCompleteToggle) {
        hideCompleteToggle.checked = getHideCompleted();
      }
      if (hideProcessedRequestsToggle) {
        hideProcessedRequestsToggle.checked = getHideProcessedRequests();
      }
      if (hideSpecToggle) {
        hideSpecToggle.checked = getHideSpec();
      }
      if (showCompanionDocsToggle) {
        showCompanionDocsToggle.checked = getShowCompanionDocs();
      }
      if (hideEmptyColumnsToggle) {
        hideEmptyColumnsToggle.checked = getHideEmptyColumns();
      }
      if (searchInput) {
        searchInput.value = getSearchQuery();
      }
      if (groupBySelect) {
        groupBySelect.value = getGroupMode();
        groupBySelect.disabled = !getIsListMode();
        groupBySelect.title = getIsListMode() ? "Group visible list items" : "Grouping modes apply in list mode";
      }
      if (sortBySelect) {
        sortBySelect.value = getSortMode();
        sortBySelect.title = "Sort visible items";
      }
      if (attentionToggle) {
        attentionToggle.classList.toggle("btn--active", getAttentionOnly());
        attentionToggle.setAttribute("aria-pressed", String(getAttentionOnly()));
        attentionToggle.title = getAttentionOnly()
          ? "Showing blocked, orphaned, unprocessed, or inconsistent items"
          : "Show blocked, orphaned, unprocessed, or inconsistent items";
      }
      if (activityToggle) {
        activityToggle.classList.toggle("btn--active", options.getActivityPanelOpen());
        activityToggle.setAttribute("aria-pressed", String(options.getActivityPanelOpen()));
        activityToggle.title = options.getActivityPanelOpen() ? "Hide recent activity" : "Show recent activity";
      }
    }

    function setToolsPanelOpen(isOpen) {
      if (toolsPanel) {
        toolsPanel.classList.toggle("tools-panel--open", isOpen);
        toolsPanel.setAttribute("aria-hidden", String(!isOpen));
      }
      if (toolsToggle) {
        toolsToggle.setAttribute("aria-expanded", String(isOpen));
      }
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

    return {
      updateViewModeToggle,
      renderActivityPanel,
      renderHelpBanner,
      updateButtons,
      hasNonDefaultSecondaryControls,
      updateFilterState,
      syncInputs,
      setToolsPanelOpen,
      setControlDescription
    };
  };
})();
