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
      getTotalItemCount,
      getSelectedId,
      setSelectedId,
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
      getSearchQuery,
      getAttentionOnly
    } = options;

    function findCardById(id) {
      if (!board || !id) {
        return null;
      }
      return Array.from(board.querySelectorAll(".card")).find((card) => card.dataset.id === id) || null;
    }

    function findListHeaderByKey(groupKey) {
      if (!board || !groupKey) {
        return null;
      }
      return (
        Array.from(board.querySelectorAll(".list-view__section .list-view__header")).find(
          (header) => header.closest(".list-view__section")?.dataset.group === groupKey
        ) || null
      );
    }

    function findListSectionByKey(groupKey) {
      if (!board || !groupKey) {
        return null;
      }
      return (
        Array.from(board.querySelectorAll(".list-view__section")).find((section) => section.dataset.group === groupKey) || null
      );
    }

    function focusCardById(id) {
      const card = findCardById(id);
      if (card && typeof card.focus === "function") {
        card.focus();
      }
    }

    function focusListHeader(groupKey) {
      const header = findListHeaderByKey(groupKey);
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

    function toggleListStageCollapsed(groupKey, collapsed) {
      const collapsedStages = getCollapsedListStages();
      if (collapsed) {
        collapsedStages.add(groupKey);
      } else {
        collapsedStages.delete(groupKey);
      }
      persistState();
      const section = findListSectionByKey(groupKey);
      const header = findListHeaderByKey(groupKey);
      const chevron = header ? header.querySelector(".list-view__header-icon") : null;
      const body = section ? section.querySelector(".list-view__body") : null;
      if (header) {
        header.setAttribute("aria-expanded", String(!collapsed));
      }
      if (chevron) {
        chevron.textContent = chevronIcon(collapsed);
      }
      if (body) {
        body.hidden = collapsed;
      }
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
      const groups = typeof getListGroups === "function" ? getListGroups() : [];
      const currentGroup = groups.find((group) => (group.items || []).some((entry) => entry.id === item.id));
      const stageItems = currentGroup ? currentGroup.items || [] : [];
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

      if (direction === "left" && currentGroup && !getCollapsedListStages().has(currentGroup.key)) {
        toggleListStageCollapsed(currentGroup.key, true);
        focusListHeader(currentGroup.key);
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
      if (typeof getTotalItemCount === "function" && getTotalItemCount() === 0) {
        return "No Logics items found. Use Tools > New Request or Bootstrap Logics to populate the board.";
      }
      if (typeof getAttentionOnly === "function" && getAttentionOnly()) {
        return "No items currently match the attention view. This view only shows blocked, orphaned, unprocessed, or inconsistent items.";
      }
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
      return "No Logics items found. Use Tools > New Request or Bootstrap Logics to populate the board.";
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

    function createSuggestedBadges(item) {
      if (typeof getSuggestedActions !== "function") {
        return null;
      }
      const actions = getSuggestedActions(item).filter((action) => action.key !== "promote" && action.key !== "add-docs");
      if (!actions || actions.length === 0) {
        return null;
      }

      const badges = document.createElement("div");
      badges.className = "card__badges card__badges--suggested";
      actions.forEach((action) => {
        const badge = document.createElement("span");
        badge.className = "card__badge card__badge--suggested";
        badge.textContent = action.label;
        badge.title = action.title;
        badges.appendChild(badge);
      });
      return badges;
    }

    function createHealthBadges(item) {
      if (typeof getAttentionReasons !== "function") {
        return null;
      }
      const reasons = getAttentionReasons(item);
      if (!reasons || reasons.length === 0) {
        return null;
      }

      const badges = document.createElement("div");
      badges.className = "card__badges card__badges--health";
      reasons.slice(0, 2).forEach((reason) => {
        const badge = document.createElement("span");
        badge.className = `card__badge card__badge--health card__badge--health-${reason.key}`;
        badge.textContent = reason.shortLabel || reason.label;
        badge.title = reason.description || reason.label;
        badges.appendChild(badge);
      });
      return badges;
    }

    function createMetricSegment(prefix, value) {
      const segment = document.createElement("span");
      segment.className = "card__badge-metric-segment";

      const prefixEl = document.createElement("span");
      prefixEl.className = "card__badge-metric-prefix";
      prefixEl.textContent = prefix;
      segment.appendChild(prefixEl);

      const valueEl = document.createElement("span");
      valueEl.className = "card__badge-metric-value";
      valueEl.textContent = value;
      segment.appendChild(valueEl);

      return segment;
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

    function formatPreviewDate(value) {
      const timestamp = Date.parse(value || "");
      if (!timestamp) {
        return "Unknown";
      }
      const date = new Date(timestamp);
      const diffMs = Date.now() - date.getTime();
      if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
        const totalMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const relativeLabel =
          hours > 0
            ? minutes > 0
              ? `${hours}h ${minutes}m ago`
              : `${hours}h ago`
            : `${totalMinutes}m ago`;
        const preciseTime = new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit"
        }).format(date);
        return `${relativeLabel} • ${preciseTime}`;
      }
      return date.toLocaleDateString("en-CA");
    }

    function createPreviewRow(label, value) {
      const row = document.createElement("div");
      row.className = "card__preview-row";

      const term = document.createElement("span");
      term.className = "card__preview-label";
      term.textContent = label;
      row.appendChild(term);

      const description = document.createElement("span");
      description.className = "card__preview-value";
      description.textContent = value;
      row.appendChild(description);

      return row;
    }

    function normalizeComplexityLabel(value) {
      const raw = String(value || "").trim();
      if (!raw) {
        return "";
      }
      const normalized = raw.toLowerCase();
      if (normalized === "very low") {
        return "VL";
      }
      if (normalized === "low") {
        return "L";
      }
      if (normalized === "medium") {
        return "M";
      }
      if (normalized === "high") {
        return "H";
      }
      if (normalized === "very high") {
        return "VH";
      }
      if (raw.length <= 3) {
        return raw.toUpperCase();
      }
      return raw.slice(0, 1).toUpperCase();
    }

    function getDocumentPrefix(item) {
      const stage = String(item?.stage || "").trim();
      const prefixByStage = {
        request: "R",
        backlog: "I",
        task: "T",
        product: "P",
        architecture: "A",
        spec: "S"
      };
      const prefix = prefixByStage[stage] || (stage ? stage.slice(0, 1).toUpperCase() : "");
      const match = String(item?.id || "").match(/^[a-z]+_(\d+)/i) || String(item?.id || "").match(/(\d+)/);
      if (!prefix || !match) {
        return "";
      }
      return `${prefix}${String(match[1] || "").padStart(3, "0")}`;
    }

    function createProgressComplexityBadge(item) {
      const badge = document.createElement("div");
      badge.className = "card__badges card__badges--metrics";

      const stage = String(item?.stage || "").trim();
      const indicators = item?.indicators || {};
      const understandingValue = String(indicators.Understanding || "").trim();
      const confidenceValue = String(indicators.Confidence || "").trim();
      const complexityValue = String(indicators.Complexity || "").trim();
      const progressValue = getProgressValue(item);
      const showUnderstandingConfidence = Boolean(understandingValue || confidenceValue);
      const useUnderstandingConfidence = showUnderstandingConfidence || stage === "request";

      const normalizedPrimary =
        useUnderstandingConfidence && understandingValue
          ? understandingValue.match(/(\d+(?:\.\d+)?)/)
          : typeof progressValue === "number"
            ? [String(Math.max(0, Math.min(100, Math.round(progressValue))))]
            : null;
      const normalizedSecondary =
        useUnderstandingConfidence && confidenceValue
          ? confidenceValue.match(/(\d+(?:\.\d+)?)/)
          : complexityValue
            ? complexityValue.match(/(\d+(?:\.\d+)?)/)
            : null;
      const complexityLabel = useUnderstandingConfidence ? complexityValue : complexityValue;

      if (!normalizedPrimary && !normalizedSecondary && !complexityLabel) {
        return null;
      }

      const pill = document.createElement("span");
      pill.className = "card__badge card__badge--metric";
      const primaryText = normalizedPrimary ? `${Math.max(0, Math.min(100, Math.round(Number(normalizedPrimary[1] || normalizedPrimary[0]))))}%` : "—";
      const secondaryText = normalizedSecondary ? `${Math.max(0, Math.min(100, Math.round(Number(normalizedSecondary[1] || normalizedSecondary[0]))))}%` : "—";
      const complexityText = complexityLabel ? normalizeComplexityLabel(complexityLabel) : "—";

      if (useUnderstandingConfidence) {
        pill.appendChild(createMetricSegment("U", primaryText));
        const separatorOne = document.createElement("span");
        separatorOne.className = "card__badge-metric-separator";
        separatorOne.textContent = "/";
        pill.appendChild(separatorOne);
        pill.appendChild(createMetricSegment("C", secondaryText));
        if (complexityValue) {
          const separatorTwo = document.createElement("span");
          separatorTwo.className = "card__badge-metric-separator";
          separatorTwo.textContent = "/";
          pill.appendChild(separatorTwo);
          const complexitySegment = document.createElement("span");
          complexitySegment.className = "card__badge-metric-value card__badge-metric-value--complexity";
          complexitySegment.textContent = complexityText;
          pill.appendChild(complexitySegment);
        }
        pill.title = [
          understandingValue ? `Understanding: ${understandingValue}` : null,
          confidenceValue ? `Confidence: ${confidenceValue}` : null,
          complexityValue ? `Complexity: ${complexityValue}` : null
        ]
          .filter(Boolean)
          .join(" • ");
      } else {
        pill.appendChild(createMetricSegment("P", primaryText));
        const separator = document.createElement("span");
        separator.className = "card__badge-metric-separator";
        separator.textContent = "/";
        pill.appendChild(separator);
        const complexitySegment = document.createElement("span");
        complexitySegment.className = "card__badge-metric-value card__badge-metric-value--complexity";
        complexitySegment.textContent = complexityText;
        pill.appendChild(complexitySegment);
        const titleParts = [];
        if (typeof progressValue === "number") {
          titleParts.push(`Progress: ${Math.max(0, Math.min(100, Math.round(progressValue)))}%`);
        }
        if (complexityValue) {
          titleParts.push(`Complexity: ${complexityValue}`);
        }
        pill.title = titleParts.join(" • ");
      }

      badge.appendChild(pill);
      return badge;
    }

    function createCardTitle(item) {
      const titleEl = document.createElement("div");
      titleEl.className = "card__title";

      const prefix = getDocumentPrefix(item);
      if (prefix) {
        const prefixEl = document.createElement("span");
        prefixEl.className = "card__title-prefix";
        prefixEl.textContent = prefix;
        titleEl.appendChild(prefixEl);
      }

      const textEl = document.createElement("span");
      textEl.className = "card__title-text";
      textEl.textContent = item.title;
      titleEl.appendChild(textEl);
      return titleEl;
    }

    function createCardPreview(item) {
      const preview = document.createElement("div");
      preview.className = "card__preview";
      preview.hidden = true;
      preview.appendChild(createPreviewRow("Status", item?.indicators?.Status || "No status"));
      preview.appendChild(createPreviewRow("Updated", formatPreviewDate(item.updatedAt)));

      const linkage = createPrimaryFlowSummary(item);
      if (linkage) {
        preview.appendChild(createPreviewRow("Flow", linkage));
      }
      return preview;
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
      const healthSignals = typeof getHealthSignals === "function" ? getHealthSignals(item) : [];
      if (healthSignals.length > 0) {
        card.classList.add("card--health-alert");
      }
      const preview = createCardPreview(item);

      function setPreviewOpen(isOpen) {
        preview.hidden = !isOpen;
        card.classList.toggle("card--preview-open", isOpen);
      }

      card.appendChild(createCardTitle(item));

      const companionBadges = createCompanionBadges(item);
      if (companionBadges) {
        card.appendChild(companionBadges);
      }

      const healthBadges = createHealthBadges(item);
      if (healthBadges) {
        card.appendChild(healthBadges);
      }

      const progressComplexityBadge = createProgressComplexityBadge(item);
      if (progressComplexityBadge) {
        card.appendChild(progressComplexityBadge);
      }

      const suggestedBadges = createSuggestedBadges(item);
      if (suggestedBadges) {
        card.appendChild(suggestedBadges);
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

      card.appendChild(preview);

      card.addEventListener("click", () => {
        setSelectedId(item.id);
        render();
      });
      card.addEventListener("dblclick", () => {
        setSelectedId(item.id);
        render();
        openSelectedItem("read");
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !preview.hidden) {
          event.preventDefault();
          setPreviewOpen(false);
          return;
        }
        handleCardKeydown(event, item);
      });
      card.addEventListener("mouseenter", () => setPreviewOpen(true));
      card.addEventListener("mouseleave", () => setPreviewOpen(false));
      card.addEventListener("focus", () => setPreviewOpen(true));
      card.addEventListener("blur", () => setPreviewOpen(false));
      return card;
    }

    function renderBoardColumns(grouped, totalVisibleItems) {
      const totalCount = Math.max(0, totalVisibleItems || 0);
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
        const titleLabel = document.createElement("span");
        titleLabel.className = "column__title-label";
        titleLabel.textContent = getStageHeading(stage);
        title.appendChild(titleLabel);

        const titleCount = document.createElement("span");
        titleCount.className = "column__title-count";
        titleCount.textContent = `${stageItems.length}/${totalCount}`;
        title.appendChild(titleCount);
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

    function renderListView(groups) {
      const listView = document.createElement("div");
      listView.className = "list-view";
      groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "list-view__section";
        section.dataset.group = group.key;
        if (group.stage) {
          section.dataset.stage = group.stage;
        }

        const stageItems = group.items || [];
        const isCollapsed = getCollapsedListStages().has(group.key);

        const header = document.createElement("button");
        header.type = "button";
        header.className = "list-view__header";
        header.setAttribute("aria-expanded", String(!isCollapsed));
        header.setAttribute("aria-controls", `list-section-${group.key}`);

        const chevron = document.createElement("span");
        chevron.className = "list-view__header-icon";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = chevronIcon(isCollapsed);
        header.appendChild(chevron);

        const label = document.createElement("span");
        label.className = "list-view__header-label";
        label.textContent = group.heading;
        header.appendChild(label);

        const count = document.createElement("span");
        count.className = "list-view__header-count";
        count.textContent = `${stageItems.length}/${Math.max(0, group.totalCount || 0)}`;
        header.appendChild(count);
        header.addEventListener("click", () => {
          toggleListStageCollapsed(group.key, !getCollapsedListStages().has(group.key));
          focusListHeader(group.key);
        });
        header.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft" && !getCollapsedListStages().has(group.key)) {
            event.preventDefault();
            toggleListStageCollapsed(group.key, true);
            focusListHeader(group.key);
            return;
          }
          if (event.key === "ArrowRight" && getCollapsedListStages().has(group.key)) {
            event.preventDefault();
            toggleListStageCollapsed(group.key, false);
            focusListHeader(group.key);
            return;
          }
          if (event.key === "ArrowDown" && !getCollapsedListStages().has(group.key) && stageItems.length > 0) {
            event.preventDefault();
            selectItemAndFocus(stageItems[0].id);
          }
        });
        section.appendChild(header);

        const body = document.createElement("div");
        body.className = "list-view__body";
        body.id = `list-section-${group.key}`;
        body.hidden = isCollapsed;
        if (!stageItems.length) {
          const empty = document.createElement("div");
          empty.className = "list-view__empty";
          empty.textContent = group.emptyLabel || "No items";
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
        renderListView(typeof getListGroups === "function" ? getListGroups() : []);
      } else {
        renderBoardColumns(grouped, visibleItems.length);
      }
      restoreBoardScroll(scrollState);
    }

    return {
      renderBoard
    };
  };
})();
