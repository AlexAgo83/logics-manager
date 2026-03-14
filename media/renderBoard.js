(() => {
  function eyeIcon(isHidden) {
    if (isHidden) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  function plusIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function createCompanionBadge(label, count, tone) {
    const badge = document.createElement("span");
    badge.className = `card__badge card__badge--${tone}`;
    badge.textContent = count > 1 ? `${label} ${count}` : label;
    badge.title = count > 1 ? `${count} linked ${tone} companion docs` : `Linked ${tone} companion doc`;
    return badge;
  }

  window.createCdxLogicsBoardRenderer = function createCdxLogicsBoardRenderer(options) {
    const {
      board,
      hostApi,
      getItems,
      getSelectedId,
      setSelectedId,
      isListMode,
      getVisibleStages,
      groupByStage,
      isVisible,
      isPrimaryFlowStage,
      isRequestProcessed,
      getStageHeading,
      getStageLabel,
      collectCompanionDocs,
      collectSpecs,
      collectPrimaryFlowItems,
      progressState,
      getProgressValue,
      isComplete,
      render,
      openSelectedItem,
      closeColumnMenu,
      toggleColumnMenu,
      persistState,
      getCollapsedStages,
      getHideCompleted,
      getHideProcessedRequests,
      getHideSpec,
      getShowCompanionDocs
    } = options;

    function captureBoardScroll() {
      if (!board) {
        return null;
      }
      const scrollLeft = board.scrollLeft;
      const columnScroll = new Map();
      board.querySelectorAll(".column").forEach((column) => {
        const stage = column.dataset.stage;
        const body = column.querySelector(".column__body");
        if (stage && body) {
          columnScroll.set(stage, body.scrollTop);
        }
      });
      return { scrollLeft, columnScroll };
    }

    function restoreBoardScroll(state) {
      if (!board || !state) {
        return;
      }
      board.scrollLeft = state.scrollLeft;
      board.querySelectorAll(".column").forEach((column) => {
        const stage = column.dataset.stage;
        const body = column.querySelector(".column__body");
        if (!stage || !body) {
          return;
        }
        const scrollTop = state.columnScroll.get(stage);
        if (typeof scrollTop === "number") {
          body.scrollTop = scrollTop;
        }
      });
    }

    function getEmptyBoardMessage() {
      if (getHideCompleted() || getHideProcessedRequests() || getHideSpec() || getShowCompanionDocs()) {
        const filters = [];
        if (getHideCompleted()) {
          filters.push('"Hide completed"');
        }
        if (getHideProcessedRequests()) {
          filters.push('"Hide processed requests"');
        }
        if (getHideSpec()) {
          filters.push('"Hide SPEC"');
        }
        if (getShowCompanionDocs()) {
          filters.push('"Show companion docs"');
        }
        return `No items match the current filters. Adjust ${filters.join(" and ")} to change the view.`;
      }
      return "No Logics items found. Add files under logics/ to populate the board.";
    }

    function createCompanionBadges(item) {
      const companionDocs = collectCompanionDocs(item);
      const specs = collectSpecs(item);
      if (!isPrimaryFlowStage(item.stage) || (companionDocs.length === 0 && specs.length === 0)) {
        return null;
      }

      const counts = companionDocs.reduce(
        (acc, companion) => {
          if (companion.stage === "product") acc.product += 1;
          if (companion.stage === "architecture") acc.architecture += 1;
          return acc;
        },
        { product: 0, architecture: 0 }
      );

      const badges = document.createElement("div");
      badges.className = "card__badges";
      if (counts.product > 0) {
        badges.appendChild(createCompanionBadge("PROD", counts.product, "product"));
      }
      if (counts.architecture > 0) {
        badges.appendChild(createCompanionBadge("ADR", counts.architecture, "architecture"));
      }
      if (specs.length > 0) {
        badges.appendChild(createCompanionBadge("SPEC", specs.length, "spec"));
      }
      return badges.childElementCount > 0 ? badges : null;
    }

    function createPrimaryFlowSummary(item) {
      if (isPrimaryFlowStage(item.stage)) {
        return "";
      }
      const linkedItems = collectPrimaryFlowItems(item);
      if (linkedItems.length === 0) {
        return "Unlinked to primary flow";
      }
      const preview = linkedItems
        .slice(0, 2)
        .map((linkedItem) => `${getStageLabel(linkedItem.stage)} • ${linkedItem.id}`)
        .join(", ");
      if (linkedItems.length > 2) {
        return `For ${preview}, +${linkedItems.length - 2} more`;
      }
      return `For ${preview}`;
    }

    function createItemCard(item, compact = false) {
      const card = document.createElement("div");
      const doneClass = isComplete(item) ? " card--done" : "";
      const progressClass = progressState(item);
      const usedClass = isRequestProcessed(item) ? " card--used" : "";
      const progressValue = getProgressValue(item);
      const hasProgressBar = typeof progressValue === "number" && progressValue > 0 && progressValue < 100;
      card.className =
        "card" +
        (compact ? " card--compact" : "") +
        (item.id === getSelectedId() ? " card--selected" : "") +
        doneClass +
        (progressClass ? ` ${progressClass}` : "") +
        usedClass +
        (hasProgressBar ? " card--progress-bar" : "");
      if (hasProgressBar) {
        const clamped = Math.max(0, Math.min(100, progressValue));
        card.style.setProperty("--progress", `${clamped}%`);
      }
      card.dataset.id = item.id;
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.setAttribute("aria-label", `${getStageLabel(item.stage)} item ${item.id}: ${item.title}`);
      card.title = item.title;

      const titleEl = document.createElement("div");
      titleEl.className = "card__title";
      titleEl.textContent = item.title;
      card.appendChild(titleEl);

      const companionBadges = createCompanionBadges(item);
      if (companionBadges) {
        card.appendChild(companionBadges);
      }

      if (!compact && !isPrimaryFlowStage(item.stage)) {
        const supportMeta = document.createElement("div");
        supportMeta.className = "card__meta";
        supportMeta.textContent = `${getStageLabel(item.stage)} • ${item.id}`;
        card.appendChild(supportMeta);
      }

      const primaryFlowSummary = createPrimaryFlowSummary(item);
      if (primaryFlowSummary) {
        const linkage = document.createElement("div");
        linkage.className =
          "card__meta card__meta--linkage" +
          (primaryFlowSummary === "Unlinked to primary flow" ? " card__meta--orphan" : "");
        linkage.textContent = primaryFlowSummary;
        card.appendChild(linkage);
      }

      if (compact) {
        const meta = document.createElement("div");
        meta.className = "card__meta";
        meta.textContent = `${getStageLabel(item.stage)} • ${item.id}`;
        card.appendChild(meta);
      }

      card.addEventListener("click", () => {
        setSelectedId(item.id);
        render();
      });
      card.addEventListener("dblclick", () => {
        setSelectedId(item.id);
        render();
        openSelectedItem("open");
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setSelectedId(item.id);
          render();
        }
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          setSelectedId(item.id);
          render();
          openSelectedItem("open");
        }
      });
      return card;
    }

    function renderBoardColumns(grouped) {
      getVisibleStages().forEach((stage) => {
        const column = document.createElement("div");
        const isCollapsed = getCollapsedStages().has(stage);
        const canCreateFromColumn = isPrimaryFlowStage(stage);
        column.className = isCollapsed ? "column column--collapsed" : "column";
        column.dataset.stage = stage;

        const header = document.createElement("div");
        header.className = "column__header";

        const title = document.createElement("div");
        title.className = "column__title";
        title.textContent = getStageHeading(stage);
        header.appendChild(title);

        const actions = document.createElement("div");
        actions.className = "column__actions";

        if (canCreateFromColumn) {
          const addButton = document.createElement("button");
          addButton.type = "button";
          addButton.className = "column__add";
          addButton.innerHTML = plusIcon();
          addButton.setAttribute("aria-label", "Add Logics item");
          addButton.title = "Add Logics item";
          addButton.setAttribute("aria-haspopup", "menu");
          addButton.setAttribute("aria-expanded", "false");
          addButton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleColumnMenu(addButton);
          });
          actions.appendChild(addButton);
        }

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "column__toggle";
        toggle.innerHTML = eyeIcon(isCollapsed);
        toggle.setAttribute("aria-label", isCollapsed ? `Show ${getStageHeading(stage)}` : `Hide ${getStageHeading(stage)}`);
        toggle.title = isCollapsed ? `Show ${getStageHeading(stage)}` : `Hide ${getStageHeading(stage)}`;
        toggle.setAttribute("aria-pressed", String(isCollapsed));
        toggle.addEventListener("click", (event) => {
          event.stopPropagation();
          const collapsedStages = getCollapsedStages();
          if (collapsedStages.has(stage)) {
            collapsedStages.delete(stage);
          } else {
            collapsedStages.add(stage);
          }
          persistState();
          render();
        });
        actions.appendChild(toggle);
        header.appendChild(actions);
        column.appendChild(header);

        const body = document.createElement("div");
        body.className = "column__body";
        const stageItems = grouped[stage] || [];
        if (!stageItems.length) {
          const empty = document.createElement("div");
          empty.className = "column__empty";
          empty.textContent = canCreateFromColumn ? "No items" : "No linked docs";
          body.appendChild(empty);
        } else {
          stageItems.forEach((item) => body.appendChild(createItemCard(item)));
        }

        column.appendChild(body);
        board.appendChild(column);
      });
    }

    function renderListView(grouped) {
      const listView = document.createElement("div");
      listView.className = "list-view";
      getVisibleStages().forEach((stage) => {
        const section = document.createElement("section");
        section.className = "list-view__section";
        section.dataset.stage = stage;

        const header = document.createElement("div");
        header.className = "list-view__header";
        const stageItems = grouped[stage] || [];
        header.textContent = `${getStageHeading(stage)} (${stageItems.length})`;
        section.appendChild(header);

        const body = document.createElement("div");
        body.className = "list-view__body";
        if (!stageItems.length) {
          const empty = document.createElement("div");
          empty.className = "list-view__empty";
          empty.textContent = isPrimaryFlowStage(stage) ? "No items" : "No linked docs";
          body.appendChild(empty);
        } else {
          stageItems.forEach((item) => body.appendChild(createItemCard(item, true)));
        }
        section.appendChild(body);
        listView.appendChild(section);
      });

      board.appendChild(listView);
    }

    function renderBoard() {
      const scrollState = captureBoardScroll();
      if (typeof closeColumnMenu === "function") {
        closeColumnMenu();
      }
      board.innerHTML = "";
      const visibleItems = getItems().filter((item) => isVisible(item));
      if (!visibleItems.length) {
        const empty = document.createElement("div");
        empty.className = "state-message";
        empty.textContent = getEmptyBoardMessage();
        board.appendChild(empty);
        return;
      }
      const grouped = groupByStage(visibleItems);
      if (isListMode()) {
        renderListView(grouped);
      } else {
        renderBoardColumns(grouped);
      }
      restoreBoardScroll(scrollState);
    }

    return {
      renderBoard
    };
  };
})();
