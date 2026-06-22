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
        ensureGroupRenderLimit(nextStage, targetIndex + 1);
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
        ensureGroupRenderLimit(currentGroup.key, itemIndex);
        selectItemAndFocus(stageItems[itemIndex - 1].id);
        return;
      }

      if (direction === "down" && itemIndex < stageItems.length - 1) {
        ensureGroupRenderLimit(currentGroup.key, itemIndex + 2);
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
        return "No Logics items found. Use New Request or Bootstrap Logics to populate the board.";
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
      return "No Logics items found. Use New Request or Bootstrap Logics to populate the board.";
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

    function createCardBadgeStrip(item, activeTasks) {
      const badgeStrip = document.createElement("div");
      badgeStrip.className = "card__badges card__badges--strip";

      const badgeGroups = [
        createProgressComplexityBadge(item),
        createCompanionBadges(item),
        createHealthBadges(item),
        createSuggestedBadges(item),
      ];

      badgeGroups.forEach((group) => {
        if (group) {
          badgeStrip.appendChild(group);
        }
      });

      return badgeStrip.childElementCount > 0 ? badgeStrip : null;
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
