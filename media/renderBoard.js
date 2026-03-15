(() => {
  function plusIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
  }

  function chevronIcon(isCollapsed) {
    return isCollapsed ? "▸" : "▾";
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
      getCollapsedListStages,
      getHideCompleted,
      getHideProcessedRequests,
      getHideSpec,
      getShowCompanionDocs,
      getHideEmptyColumns,
      getSearchQuery
    } = options;

    function findCardById(id) {
      if (!board || !id) {
        return null;
      }
      return Array.from(board.querySelectorAll(".card")).find((card) => card.dataset.id === id) || null;
    }

    function findListHeaderByStage(stage) {
      if (!board || !stage) {
        return null;
      }
      return (
        Array.from(board.querySelectorAll(".list-view__section .list-view__header")).find(
          (header) => header.closest(".list-view__section")?.dataset.stage === stage
        ) || null
      );
    }

    function focusCardById(id) {
      const card = findCardById(id);
      if (card && typeof card.focus === "function") {
        card.focus();
      }
    }

    function focusListHeader(stage) {
      const header = findListHeaderByStage(stage);
      if (header && typeof header.focus === "function") {
        header.focus();
      }
    }

    function getVisibleGroupedItems() {
      return groupByStage(getItems().filter((item) => isVisible(item)));
    }

    function getVisibleBoardStages(grouped) {
      return getVisibleStages().filter((stage) => {
        if (!getHideEmptyColumns()) {
          return true;
        }
        return (grouped[stage] || []).length > 0;
      });
    }

    function selectItemAndFocus(id) {
      if (!id) {
        return;
      }
      setSelectedId(id);
      render();
      focusCardById(id);
    }

    function toggleListStageCollapsed(stage, collapsed) {
      const collapsedStages = getCollapsedListStages();
      if (collapsed) {
        collapsedStages.add(stage);
      } else {
        collapsedStages.delete(stage);
      }
      persistState();
      render();
    }

    function moveBoardSelection(item, direction) {
      const grouped = getVisibleGroupedItems();
      const visibleStages = getVisibleBoardStages(grouped);
      const stageIndex = visibleStages.indexOf(item.stage);
      if (stageIndex === -1) {
        return;
      }

      const stageItems = grouped[item.stage] || [];
      const itemIndex = stageItems.findIndex((entry) => entry.id === item.id);
      if (itemIndex === -1) {
        return;
      }

      if (direction === "up" && itemIndex > 0) {
        selectItemAndFocus(stageItems[itemIndex - 1].id);
        return;
      }

      if (direction === "down" && itemIndex < stageItems.length - 1) {
        selectItemAndFocus(stageItems[itemIndex + 1].id);
        return;
      }

      if (direction !== "left" && direction !== "right") {
        return;
      }

      const step = direction === "left" ? -1 : 1;
      for (let nextStageIndex = stageIndex + step; nextStageIndex >= 0 && nextStageIndex < visibleStages.length; nextStageIndex += step) {
        const nextStage = visibleStages[nextStageIndex];
        const nextItems = grouped[nextStage] || [];
        if (!nextItems.length) {
          continue;
        }
        const targetIndex = Math.min(itemIndex, nextItems.length - 1);
        selectItemAndFocus(nextItems[targetIndex].id);
        return;
      }
    }

    function moveListSelection(item, direction) {
      const grouped = getVisibleGroupedItems();
      const stageItems = grouped[item.stage] || [];
      const itemIndex = stageItems.findIndex((entry) => entry.id === item.id);
      if (itemIndex === -1) {
        return;
      }

      if (direction === "up" && itemIndex > 0) {
        selectItemAndFocus(stageItems[itemIndex - 1].id);
        return;
      }

      if (direction === "down" && itemIndex < stageItems.length - 1) {
        selectItemAndFocus(stageItems[itemIndex + 1].id);
        return;
      }

      if (direction === "left" && !getCollapsedListStages().has(item.stage)) {
        toggleListStageCollapsed(item.stage, true);
        focusListHeader(item.stage);
      }
    }

    function handleCardKeydown(event, item) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (isListMode()) {
          moveListSelection(item, "up");
        } else {
          moveBoardSelection(item, "up");
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (isListMode()) {
          moveListSelection(item, "down");
        } else {
          moveBoardSelection(item, "down");
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (isListMode()) {
          moveListSelection(item, "left");
        } else {
          moveBoardSelection(item, "left");
        }
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (!isListMode()) {
          moveBoardSelection(item, "right");
        }
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        setSelectedId(item.id);
        render();
        focusCardById(item.id);
        if (event.shiftKey) {
          openSelectedItem("read");
          return;
        }
        if (event.metaKey || event.ctrlKey) {
          openSelectedItem("open");
        }
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        setSelectedId(item.id);
        render();
        focusCardById(item.id);
      }
    }

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
      const query = String(typeof getSearchQuery === "function" ? getSearchQuery() : "").trim();
      if (query) {
        return `No items match search "${query}". Clear or refine the search to widen the view.`;
      }
      if (getHideCompleted() || getHideProcessedRequests() || getHideSpec() || getShowCompanionDocs() || getHideEmptyColumns()) {
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
        if (getHideEmptyColumns()) {
          filters.push('"Hide empty columns"');
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
        handleCardKeydown(event, item);
      });
      return card;
    }

    function renderBoardColumns(grouped) {
      getVisibleStages().forEach((stage) => {
        const stageItems = grouped[stage] || [];
        if (getHideEmptyColumns() && stageItems.length === 0) {
          return;
        }
        const column = document.createElement("div");
        const canCreateFromColumn = isPrimaryFlowStage(stage);
        column.className = "column";
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

        header.appendChild(actions);
        column.appendChild(header);

        const body = document.createElement("div");
        body.className = "column__body";
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

        const stageItems = grouped[stage] || [];
        const isCollapsed = getCollapsedListStages().has(stage);

        const header = document.createElement("button");
        header.type = "button";
        header.className = "list-view__header";
        header.setAttribute("aria-expanded", String(!isCollapsed));
        header.setAttribute("aria-controls", `list-section-${stage}`);

        const chevron = document.createElement("span");
        chevron.className = "list-view__header-icon";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = chevronIcon(isCollapsed);
        header.appendChild(chevron);

        const label = document.createElement("span");
        label.textContent = `${getStageHeading(stage)} (${stageItems.length})`;
        header.appendChild(label);
        header.addEventListener("click", () => {
          toggleListStageCollapsed(stage, !getCollapsedListStages().has(stage));
          focusListHeader(stage);
        });
        header.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft" && !getCollapsedListStages().has(stage)) {
            event.preventDefault();
            toggleListStageCollapsed(stage, true);
            focusListHeader(stage);
            return;
          }
          if (event.key === "ArrowRight" && getCollapsedListStages().has(stage)) {
            event.preventDefault();
            toggleListStageCollapsed(stage, false);
            focusListHeader(stage);
            return;
          }
          if (event.key === "ArrowDown" && !getCollapsedListStages().has(stage) && stageItems.length > 0) {
            event.preventDefault();
            selectItemAndFocus(stageItems[0].id);
          }
        });
        section.appendChild(header);

        const body = document.createElement("div");
        body.className = "list-view__body";
        body.id = `list-section-${stage}`;
        body.hidden = isCollapsed;
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
