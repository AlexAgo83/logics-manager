(() => {
  window.createCdxLogicsWebviewChrome = function createCdxLogicsWebviewChrome(options) {
    const {
      activityPanel,
      activityToggle,
      attentionToggle,
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
      toolsToggle,
      viewModeToggleButton,
      defaultFilterState,
      canPromote,
      getActivityEntries,
      getItems,
      getAttentionOnly,
      getCanBootstrapLogics,
      getBootstrapLogicsTitle,
      getCanResetProjectRoot,
      getCanRepairLogicsKit,
      getRepairLogicsKitTitle,
      getCanPublishRelease,
      getPublishReleaseTitle,
      getShouldRecommendCheckEnvironment,
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
      readItemAndRender,
      selectItemAndRender
    } = options;
    const toolsPanelLayoutFactory = window.createCdxLogicsToolsPanelLayoutApi;
    const toolsPanelLayout =
      typeof toolsPanelLayoutFactory === "function"
        ? toolsPanelLayoutFactory({
            toolsPanel,
            getCanBootstrapLogics,
            getBootstrapLogicsTitle,
            getShouldRecommendCheckEnvironment
          })
        : null;
    let visibleActivityLimit = 10;

    function setButtonIcon(button, svgMarkup) {
      if (!button) {
        return;
      }
      button.innerHTML = svgMarkup;
    }

    function formatToolsViewLabel(viewName) {
      if (!viewName) {
        return "Tools";
      }
      return String(viewName).replace(/^[a-z]/, (value) => value.toUpperCase());
    }

    function listModeIcon() {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M8 7h12M8 12h12M8 17h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <circle cx="5" cy="7" r="1.5" fill="currentColor" />
          <circle cx="5" cy="12" r="1.5" fill="currentColor" />
          <circle cx="5" cy="17" r="1.5" fill="currentColor" />
        </svg>
      `;
    }

    function boardModeIcon() {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="4" y="5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="5" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="4" y="13" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
          <rect x="14" y="13" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      `;
    }

    function updateViewModeToggle() {
      if (!viewModeToggleButton) {
        return;
      }
      const currentMode = getEffectiveViewMode();
      if (isCompactListForced()) {
        setButtonIcon(viewModeToggleButton, listModeIcon());
        viewModeToggleButton.dataset.currentMode = currentMode;
        viewModeToggleButton.setAttribute("aria-pressed", "true");
        viewModeToggleButton.setAttribute("aria-label", "Current mode: list. List mode is required below 500px");
        viewModeToggleButton.title = "Current mode: list. List mode is required below 500px";
        viewModeToggleButton.disabled = true;
        viewModeToggleButton.hidden = true;
        viewModeToggleButton.style.display = "none";
        viewModeToggleButton.setAttribute("aria-hidden", "true");
        return;
      }
      const switchToList = currentMode !== "list";
      setButtonIcon(viewModeToggleButton, switchToList ? listModeIcon() : boardModeIcon());
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
      viewModeToggleButton.hidden = false;
      viewModeToggleButton.style.display = "";
      viewModeToggleButton.removeAttribute("aria-hidden");
    }

    const activityFilterToggle = document.getElementById("activity-filter-toggle");
    const activityFilterMenu = document.getElementById("activity-filter-menu");
    const activityFilterCorpus = document.getElementById("activity-filter-corpus");
    const activityFilterGit = document.getElementById("activity-filter-git");
    const activityFilterCi = document.getElementById("activity-filter-ci");

    function getActivityShowCorpus() {
      return typeof options.getActivityShowCorpus === "function" ? options.getActivityShowCorpus() !== false : true;
    }

    function getActivityShowGit() {
      return typeof options.getActivityShowGit === "function" ? options.getActivityShowGit() !== false : true;
    }

    function getActivityShowCi() {
      return typeof options.getActivityShowCi === "function" ? options.getActivityShowCi() !== false : true;
    }

    function setActivityFilterMenuOpen(open) {
      if (!activityFilterMenu || !activityFilterToggle) {
        return;
      }
      activityFilterMenu.hidden = !open;
      activityFilterToggle.setAttribute("aria-expanded", String(open));
    }

    function updateActivityFilterToggle() {
      if (!activityFilterToggle) {
        return;
      }
      const showCorpus = getActivityShowCorpus();
      const showGit = getActivityShowGit();
      const showCi = getActivityShowCi();
      if (activityFilterCorpus) activityFilterCorpus.checked = showCorpus;
      if (activityFilterGit) activityFilterGit.checked = showGit;
      if (activityFilterCi) activityFilterCi.checked = showCi;
      activityFilterToggle.classList.toggle("toolbar__filter--active", !showCorpus || !showGit || !showCi);
    }

    if (activityFilterToggle) {
      activityFilterToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        setActivityFilterMenuOpen(activityFilterMenu ? activityFilterMenu.hidden : false);
      });
      if (activityFilterCorpus) {
        activityFilterCorpus.addEventListener("change", () => {
          if (typeof options.setActivityShowCorpus === "function") options.setActivityShowCorpus(activityFilterCorpus.checked);
          updateActivityFilterToggle();
          renderActivityPanel();
        });
      }
      if (activityFilterGit) {
        activityFilterGit.addEventListener("change", () => {
          if (typeof options.setActivityShowGit === "function") options.setActivityShowGit(activityFilterGit.checked);
          updateActivityFilterToggle();
          renderActivityPanel();
        });
      }
      if (activityFilterCi) {
        activityFilterCi.addEventListener("change", () => {
          if (typeof options.setActivityShowCi === "function") options.setActivityShowCi(activityFilterCi.checked);
          updateActivityFilterToggle();
          renderActivityPanel();
        });
      }
      document.addEventListener("click", (event) => {
        if (!activityFilterMenu || activityFilterMenu.hidden) {
          return;
        }
        const target = event.target;
        if (activityFilterMenu.contains(target) || activityFilterToggle.contains(target)) {
          return;
        }
        setActivityFilterMenuOpen(false);
      });
    }

    // req_284/item_516: distinct unicode glyph per activity kind. Git uses the
    // branch symbol; CI uses check/cross by run health and a neutral dot for
    // pending/unknown. Returns "" for non-git/ci kinds so the caller keeps the
    // stage letter.
    function activityMarkerGlyph(activityKind, badgeState) {
      if (activityKind === "git") return "⎇";
      if (activityKind !== "ci") return "";
      if (badgeState === "success") return "✓";
      if (badgeState === "failure" || badgeState === "failed" || badgeState === "error") return "✗";
      return "•";
    }

    // req_284/item_517: relative-time part of the shared time bucket, reused so
    // the meta line carries "Nm ago" with no new date code.
    function activityRelativeTime(updatedAt) {
      if (!toolsPanelLayout || typeof toolsPanelLayout.formatActivityTimeBucket !== "function") {
        return "";
      }
      const bucket = toolsPanelLayout.formatActivityTimeBucket(updatedAt);
      if (!bucket || bucket === "Unknown") return "";
      return String(bucket).split(" • ")[0];
    }

    // item_724: one scaffold wrote ten documents and produced ten peer rows that pushed
    // everything else off the screen. It was one action and the documents are its detail --
    // but item_716 established that nothing in the payload records which command wrote a
    // document, so the run cannot be recovered. What can be recovered is the workflow chain,
    // from references and usedBy. Consecutive same-chain events collapse into one entry that
    // names the chain and counts what it touched, and the entry says it grouped by chain.
    const expandedActivityChains = new Set();

    function activityChainKey(entry) {
      const model = window.CdxLogicsModel;
      if (!model || typeof model.resolveChainKey !== "function" || typeof getItems !== "function") return "";
      if (entry && entry.activityKind && entry.activityKind !== "corpus") return "";
      const items = getItems() || [];
      const match = items.find((candidate) => String(candidate && candidate.id) === String(entry && entry.id));
      if (!match) return "";
      return model.resolveChainKey(match, items);
    }

    /** Consecutive runs only. A chain touched this morning and again tonight is two moments
     *  in its life, not one; merging them across the day would invent an operation exactly
     *  where item_716 said one cannot be recovered. */
    function groupActivityByChain(entries) {
      const groups = [];
      entries.forEach((entry) => {
        const chainKey = activityChainKey(entry);
        const last = groups[groups.length - 1];
        if (chainKey && last && last.chainKey === chainKey) {
          last.entries.push(entry);
          return;
        }
        groups.push({ chainKey, entries: [entry] });
      });
      return groups;
    }

    function activityPreciseTime(updatedAt) {
      if (!toolsPanelLayout || typeof toolsPanelLayout.formatActivityTimeBucket !== "function") return "";
      const bucket = toolsPanelLayout.formatActivityTimeBucket(updatedAt);
      if (!bucket || bucket === "Unknown") return "";
      const parts = String(bucket).split(" \u2022 ");
      return parts.length > 1 ? parts[1] : parts[0];
    }

    /** item_723: the kind was carried by an undecoded letter in the marker, so telling a
     *  status change from a promotion from a commit meant learning the alphabet. The row
     *  names it, and the marker's colour agrees with the name rather than replacing it. */
    function activityKindLabel(entry) {
      const named = String((entry && (entry.label || entry.action)) || "").trim();
      if (named) return named;
      const type = String((entry && entry.type) || "").trim();
      if (type === "status-change") return "Status changed";
      if (type === "updated") return "Updated";
      const kind = String((entry && entry.activityKind) || "").trim();
      if (kind === "git") return "Git";
      if (kind === "ci") return "CI";
      return "Changed";
    }

    // req_284/item_517: human summary for git/CI activity. CI reads
    // "workflow · outcome · Nm ago"; git reads "action · branch @ shortsha · Nm ago".
    // Missing parts drop out. Non-git/ci entries keep the document-flow meta.
    function recomposeActivityMeta(entry, stageTitle) {
      // item_723: the fallback appended the id, which is the title again as a slug on the
      // same row. The id stays reachable from the marker's tooltip and accessible label.
      const fallback = entry.meta || stageTitle;
      const time = activityRelativeTime(entry.updatedAt);
      if (entry.activityKind === "ci") {
        // Only recompose CI runs that expose workflow/outcome; other ci events
        // keep their host-provided message (graceful degradation).
        if (!entry.workflow && !entry.outcome) return fallback;
        return [entry.workflow, entry.outcome, time].filter(Boolean).join(" · ");
      }
      if (entry.activityKind === "git") {
        // Recompose commit-style events (branch/sha present). git-action events
        // (push/pull/workshop) carry their own descriptive message — keep it.
        const ref = [entry.branch, entry.sha].filter(Boolean).join(" @ ");
        if (!ref) return fallback;
        return [entry.action, ref, time].filter(Boolean).join(" · ");
      }
      return fallback;
    }

    function createActivityEntryButton(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "activity-panel__entry";
    if (entry.activityKind) {
      button.classList.add(`activity-panel__entry--${String(entry.activityKind).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}`);
    }
    button.dataset.id = entry.id;
    if (entry.selectable === false) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      // item_725: the campaign's "a disabled action says why" check caught these -- four
      // dead buttons in the feed with nothing saying why they were dead. A git or CI event
      // has no document in this corpus to open.
      const disabledReason = "No document in this corpus to open for this event.";
      button.title = disabledReason;
      button.setAttribute("aria-description", disabledReason);
    }

    const stageLabel = getStageLabel(entry.stage);
    const stageTitle = stageLabel ? stageLabel.charAt(0).toUpperCase() + stageLabel.slice(1) : "Item";

    const marker = document.createElement("span");
    marker.className = "activity-panel__marker";
    // req_284/item_516: git/CI markers get a distinct unicode glyph (branch
    // for git, check/cross/dot for CI by health) instead of a bare letter;
    // the kind/id stay in the tooltip + accessible label. Corpus entries keep
    // their stage letter.
    const badgeState = String(entry.badgeState || "").toLowerCase();
    marker.textContent = activityMarkerGlyph(entry.activityKind, badgeState)
      || entry.marker || stageTitle.slice(0, 1) || "?";
    // Make the single-letter pill self-explanatory: the stage name and id
    // are reachable via tooltip / accessible label, and a per-stage colour
    // distinguishes request/backlog/task/product/architecture/spec.
    marker.title = `${stageTitle} · ${entry.id}`;
    marker.setAttribute("aria-label", `${stageTitle} (${entry.id})`);
    if (entry.stage) {
      marker.dataset.stage = entry.stage;
    }
    if (entry.activityKind) {
      marker.dataset.activityKind = entry.activityKind;
    }
    if (entry.activityKind === "ci" && badgeState) {
      marker.dataset.badgeState = badgeState;
    }
    button.appendChild(marker);

    const body = document.createElement("span");
    body.className = "activity-panel__body";

    const titleRow = document.createElement("span");
    titleRow.className = "activity-panel__title-row";
    const title = document.createElement("span");
    title.className = "activity-panel__title";
    title.textContent = entry.title;
    titleRow.appendChild(title);

    // The time sits on the row, in width the row already had. One header per batch
    // timed the batch; this times the work.
    const preciseTime = activityPreciseTime(entry.updatedAt);
    if (preciseTime) {
      const time = document.createElement("time");
      time.className = "activity-panel__time";
      time.textContent = preciseTime;
      if (entry.updatedAt) time.dateTime = String(entry.updatedAt);
      titleRow.appendChild(time);
    }
    body.appendChild(titleRow);

    const meta = document.createElement("span");
    meta.className = "activity-panel__meta";
    const kind = document.createElement("span");
    kind.className = "activity-panel__kind";
    if (entry.stage) kind.dataset.stage = entry.stage;
    if (entry.activityKind) kind.dataset.activityKind = entry.activityKind;
    kind.textContent = activityKindLabel(entry);
    meta.appendChild(kind);
    // Readable cell: what changed, the stage name, then the id.
    // req_284/item_517: git/CI events recompose into a human summary with a
    // relative time. The time reuses formatActivityTimeBucket (no new date
    // code), taking its relative part ("Nm ago"); each part degrades out
    // gracefully when its data is absent.
    const metaText = recomposeActivityMeta(entry, stageTitle);
    if (metaText) {
      const detail = document.createElement("span");
      detail.className = "activity-panel__meta-text";
      detail.textContent = metaText;
      meta.appendChild(detail);
    }
    body.appendChild(meta);

    button.appendChild(body);

    if (entry.selectable !== false) {
      button.addEventListener("click", () => {
        selectItemAndRender(entry.id);
      });
      button.addEventListener("dblclick", () => {
        readItemAndRender(entry.id);
      });
    }

      return button;
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

      const showCorpus = getActivityShowCorpus();
      const showGit = getActivityShowGit();
      const showCi = getActivityShowCi();
      // req_275: each toggle governs one activity kind. git/ci gate their event
      // entries; the corpus toggle gates document changes (every other kind), so
      // the operator can show everything or hide a whole class at will.
      const entries = getActivityEntries().filter((entry) => {
        if (entry.activityKind === "git") return showGit;
        if (entry.activityKind === "ci") return showCi;
        return showCorpus;
      });
      // item_724: the limit used to count events, and a chain that collapses ten events into
      // one row then spent the whole allowance on a single line -- the collapse made the feed
      // shorter instead of denser, which is the opposite of what it is for. It counts rows.
      const allGroups = groupActivityByChain(entries);
      const visibleGroups = allGroups.slice(0, visibleActivityLimit);
      const visibleEntries = visibleGroups.flatMap((group) => group.entries);
      // Preserve the feed scroll position across re-renders (auto-refresh, filter
      // toggles, "show next"): the list is rebuilt from scratch each time, which
      // would otherwise snap the user back to the top mid-read.
      const previousList = activityPanel.querySelector(".activity-panel__list");
      const previousScrollTop = previousList ? previousList.scrollTop : 0;
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
        // item_723: the feed grouped by floored minute, so one scaffold's eleven documents
        // produced a single header timing the batch rather than the work, and nothing said
        // which day anything happened on. A day per marker, the minute on the row.
        let currentGroupLabel = "";
        let previousEntry = null;
        visibleGroups.forEach((group) => {
          const groupLabel =
            toolsPanelLayout && typeof toolsPanelLayout.formatActivityDayBucket === "function"
              ? toolsPanelLayout.formatActivityDayBucket(group.entries[0].updatedAt)
              : "Unknown";
          if (groupLabel !== currentGroupLabel) {
            // A quiet stretch is drawn, not inferred: two dated headers leave the operator
            // subtracting them to find out whether anything happened in between.
            const gap =
              previousEntry && toolsPanelLayout && typeof toolsPanelLayout.activityDayGap === "function"
                ? toolsPanelLayout.activityDayGap(previousEntry.updatedAt, group.entries[0].updatedAt)
                : 0;
            if (gap > 1) {
              const quiet = document.createElement("div");
              quiet.className = "activity-panel__quiet";
              quiet.dataset.days = String(gap - 1);
              quiet.textContent = `${gap - 1} day${gap - 1 === 1 ? "" : "s"} with no recorded activity`;
              list.appendChild(quiet);
            }
            currentGroupLabel = groupLabel;
            const groupHeader = document.createElement("div");
            groupHeader.className = "activity-panel__group-label";
            groupHeader.textContent = groupLabel;
            list.appendChild(groupHeader);
          }
          previousEntry = group.entries[group.entries.length - 1];
          const chainKey = group.chainKey;
          if (chainKey && group.entries.length > 1) {
            const open = expandedActivityChains.has(chainKey);
            const model = window.CdxLogicsModel;
            const title =
              model && typeof model.chainTitle === "function"
                ? model.chainTitle(chainKey, getItems ? getItems() : [])
                : chainKey;
            const chainRow = document.createElement("button");
            chainRow.type = "button";
            chainRow.className = "activity-panel__chain";
            chainRow.dataset.chain = chainKey;
            chainRow.dataset.count = String(group.entries.length);
            chainRow.setAttribute("aria-expanded", open ? "true" : "false");
            // It says `in one chain`, not `in one run`: item_716 established the run is not
            // recoverable from a snapshot diff, and a count that implied otherwise would be
            // the screen asserting something the data cannot support.
            chainRow.textContent = `${open ? "\u25be" : "\u25b8"} ${group.entries.length} documents in one chain \u2014 ${title}`;
            chainRow.addEventListener("click", () => {
              if (expandedActivityChains.has(chainKey)) expandedActivityChains.delete(chainKey);
              else expandedActivityChains.add(chainKey);
              renderActivityPanel();
            });
            list.appendChild(chainRow);
            if (!open) return;
          }
          group.entries.forEach((entry) => {
            const button = createActivityEntryButton(entry);
            if (chainKey && group.entries.length > 1) {
              button.classList.add("activity-panel__entry--in-chain");
            }
            list.appendChild(button);
          });
        });
        if (allGroups.length > visibleGroups.length) {
          const reveal = document.createElement("button");
          reveal.type = "button";
          reveal.className = "activity-panel__reveal";
          reveal.textContent = `Show next ${Math.min(10, allGroups.length - visibleGroups.length)}`;
          reveal.addEventListener("click", () => {
            visibleActivityLimit += 10;
            renderActivityPanel();
          });
          list.appendChild(reveal);
        }
      }

      activityPanel.appendChild(list);
      if (previousScrollTop > 0) {
        // Clamp happens automatically: assigning beyond scrollHeight settles at max.
        list.scrollTop = previousScrollTop;
      }
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
      if (changeStatusButton) {
        changeStatusButton.disabled = !item;
        changeStatusButton.title = item ? "Change status of selected item" : "Select an item first";
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
        bootstrapLogicsButton.title = getBootstrapLogicsTitle();
      }
      if (repairLogicsKitButton) {
        repairLogicsKitButton.disabled = !getCanRepairLogicsKit();
        repairLogicsKitButton.title = getRepairLogicsKitTitle();
      }
      if (assistPublishReleaseButton) {
        assistPublishReleaseButton.disabled = !getCanPublishRelease();
        assistPublishReleaseButton.title = getPublishReleaseTitle();
      }
      if (toolsPanelLayout && typeof toolsPanelLayout.renderToolsPanelStructure === "function") {
        toolsPanelLayout.renderToolsPanelStructure();
      }
    }

    function getActiveToolsView() {
      if (toolsPanelLayout && typeof toolsPanelLayout.getActiveToolsView === "function") {
        return toolsPanelLayout.getActiveToolsView();
      }
      return "workflow";
    }

    function hasNonDefaultSecondaryControls() {
      const ignoreHideTogglesForLocalViewer = typeof window.__CDX_LOGICS_VIEWER_FILTER__ === "function";
      return (
        (!ignoreHideTogglesForLocalViewer && (
          getHideCompleted() !== defaultFilterState.hideCompleted ||
          getHideProcessedRequests() !== defaultFilterState.hideProcessedRequests ||
          getHideSpec() !== defaultFilterState.hideSpec ||
          getShowCompanionDocs() !== defaultFilterState.showCompanionDocs ||
          getHideEmptyColumns() !== defaultFilterState.hideEmptyColumns
        )) ||
        options.normalizeSearchValue(getSearchQuery()) !== "" ||
        getGroupMode() !== "stage" ||
        (getSortMode() !== "updated-desc" && getSortMode() !== "default")
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
        attentionToggle.setAttribute(
          "aria-label",
          getAttentionOnly()
            ? "Showing blocked, orphaned, unprocessed, or inconsistent items"
            : "Show blocked, orphaned, unprocessed, or inconsistent items"
        );
        attentionToggle.title = getAttentionOnly()
          ? "Showing blocked, orphaned, unprocessed, or inconsistent items"
          : "Show blocked, orphaned, unprocessed, or inconsistent items";
      }
      if (activityToggle) {
        const activityOpen = options.getActivityPanelOpen();
        document.body?.classList.toggle("viewer-screen-activity", activityOpen);
        document.body?.classList.toggle("viewer-screen-project", !activityOpen);
        activityToggle.classList.toggle("btn--active", activityOpen);
        activityToggle.dataset.currentMode = activityOpen ? "activity" : "project";
        activityToggle.setAttribute("aria-pressed", String(activityOpen));
        activityToggle.setAttribute(
          "aria-label",
          activityOpen ? "Hide recent activity" : "Show recent activity"
        );
        activityToggle.title = activityOpen ? "Hide recent activity" : "Show recent activity";
      }
      updateActivityFilterToggle();
    }

    function setToolsPanelOpen(viewName, isOpen) {
      if (toolsPanel) {
        toolsPanel.classList.toggle("tools-panel--open", isOpen);
        toolsPanel.setAttribute("aria-hidden", String(!isOpen));
      }
      if (viewName && toolsPanelLayout && typeof toolsPanelLayout.setActiveToolsView === "function") {
        toolsPanelLayout.setActiveToolsView(viewName);
      }
      const activeToolsView = getActiveToolsView();
      if (toolsToggle) {
        toolsToggle.classList.toggle("toolbar__filter--active", isOpen);
        toolsToggle.setAttribute("aria-expanded", String(isOpen));
        toolsToggle.setAttribute(
          "aria-label",
          isOpen ? `Close tools menu (${formatToolsViewLabel(activeToolsView)})` : `Open tools menu (${formatToolsViewLabel(activeToolsView)})`
        );
        toolsToggle.title = isOpen
          ? `Close tools menu (${formatToolsViewLabel(activeToolsView)})`
          : `Open tools menu (${formatToolsViewLabel(activeToolsView)})`;
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
