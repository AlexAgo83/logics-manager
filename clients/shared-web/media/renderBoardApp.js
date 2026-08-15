(() => {
  const GROUP_RENDER_PAGE_SIZE = 10;
  // Human-readable stage names for the compact id prefix shown on cards.
  const stageLabelByStage = {
    request: "Request",
    backlog: "Backlog item",
    task: "Task",
    product: "Product brief",
    roadmap: "Roadmap",
    architecture: "Architecture decision",
    spec: "Spec"
  };
  const TASK_COLORS = ["#14b8a6", "#2563eb", "#8b5cf6", "#22c55e", "#06b6d4", "#84cc16", "#0ea5e9", "#7c3aed", "#3b82f6", "#0f766e"];
  const REQUEST_COLORS = ["#f97316", "#f59e0b", "#f43f5e", "#fb7185", "#ef4444", "#d97706", "#ec4899", "#be123c", "#fca5a5", "#fdba74"];
  const CLOSED_TASK_STATUSES = new Set(["done", "archived", "obsolete"]);

  function chevronIcon(isCollapsed) {
    return isCollapsed ? "▸" : "▾";
  }

  function normalizeTaskStatus(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function isClosedTaskStatus(value) {
    return CLOSED_TASK_STATUSES.has(normalizeTaskStatus(value));
  }

  function getTaskColor(id) {
    const match = String(id || "").match(/(\d+)$/);
    const n = parseInt(match?.[1] ?? "0", 10);
    return TASK_COLORS[n % TASK_COLORS.length];
  }

  function getRequestColor(id) {
    const match = String(id || "").match(/(\d+)$/);
    const n = parseInt(match?.[1] ?? "0", 10);
    return REQUEST_COLORS[n % REQUEST_COLORS.length];
  }

  function isActiveTaskCandidate(item) {
    return Boolean(item && String(item.stage || "").trim() === "task" && !isClosedTaskStatus(item?.indicators?.Status));
  }

  function buildTaskColorMap(items) {
    const activeTasks = (items || []).filter(isActiveTaskCandidate).sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const assignedColors = new Set();
    const colorMap = new Map();

    for (const task of activeTasks) {
      const preferredIndex = parseInt(String(task.id || "").match(/(\d+)$/)?.[1] ?? "0", 10) % TASK_COLORS.length;
      let assignedColor = TASK_COLORS[preferredIndex];
      for (let offset = 0; offset < TASK_COLORS.length; offset += 1) {
        const candidateColor = TASK_COLORS[(preferredIndex + offset) % TASK_COLORS.length];
        if (!assignedColors.has(candidateColor)) {
          assignedColor = candidateColor;
          break;
        }
      }
      assignedColors.add(assignedColor);
      colorMap.set(task.id, assignedColor);
    }

    return colorMap;
  }

  function buildRequestColorMap(items) {
    const requests = (items || [])
      .filter((item) => item && String(item.stage || "").trim() === "request")
      .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const assignedColors = new Set();
    const colorMap = new Map();

    for (const request of requests) {
      const preferredIndex = parseInt(String(request.id || "").match(/(\d+)$/)?.[1] ?? "0", 10) % REQUEST_COLORS.length;
      let assignedColor = REQUEST_COLORS[preferredIndex];
      for (let offset = 0; offset < REQUEST_COLORS.length; offset += 1) {
        const candidateColor = REQUEST_COLORS[(preferredIndex + offset) % REQUEST_COLORS.length];
        if (!assignedColors.has(candidateColor)) {
          assignedColor = candidateColor;
          break;
        }
      }
      assignedColors.add(assignedColor);
      colorMap.set(request.id, assignedColor);
    }

    return colorMap;
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
      persistState,
      getCollapsedListStages,
      getHideCompleted,
      getHideProcessedRequests,
      getHideSpec,
      getShowCompanionDocs,
      getHideEmptyColumns,
      getSearchQuery,
      getGroupMode,
      getSortMode,
      getAttentionOnly
    } = options;
    let activeTaskColorMap = new Map();
    let activeRequestColorMap = new Map();
    let groupRenderLimits = new Map();
    let previousRenderContextKey = "";

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

    let sentinelObserver = null;
    let sentinelWrapper = null;
    let sentinelTop = null;
    let sentinelBottom = null;

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

    function normalizeGroupKey(groupKey) {
      return String(groupKey || "group");
    }

    function hasActiveSearch() {
      return String(getSearchQuery && getSearchQuery() ? getSearchQuery() : "").trim() !== "";
    }

    function getRenderContextKey() {
      return [
        isListMode() ? "list" : "board",
        typeof getGroupMode === "function" ? getGroupMode() : "stage",
        typeof getSortMode === "function" ? getSortMode() : "updated-desc",
        getSearchQuery(),
        getHideCompleted(),
        getHideProcessedRequests(),
        getHideSpec(),
        getShowCompanionDocs(),
        getAttentionOnly()
      ].join("|");
    }

    function reconcileGroupRenderLimits() {
      const nextContextKey = getRenderContextKey();
      if (nextContextKey !== previousRenderContextKey) {
        groupRenderLimits = new Map();
        previousRenderContextKey = nextContextKey;
      }
    }

    function visibleSliceForGroup(groupKey, items) {
      const allItems = Array.isArray(items) ? items : [];
      if (hasActiveSearch() || allItems.length <= GROUP_RENDER_PAGE_SIZE) {
        return {
          items: allItems,
          limit: allItems.length,
          remaining: 0,
          total: allItems.length,
          truncated: false
        };
      }
      const key = normalizeGroupKey(groupKey);
      const limit = Math.max(GROUP_RENDER_PAGE_SIZE, groupRenderLimits.get(key) || GROUP_RENDER_PAGE_SIZE);
      const visibleLimit = Math.min(limit, allItems.length);
      return {
        items: allItems.slice(0, visibleLimit),
        limit: visibleLimit,
        remaining: allItems.length - visibleLimit,
        total: allItems.length,
        truncated: visibleLimit < allItems.length
      };
    }

    function ensureGroupRenderLimit(groupKey, minVisibleCount) {
      if (hasActiveSearch()) {
        return;
      }
      const key = normalizeGroupKey(groupKey);
      const currentLimit = Math.max(GROUP_RENDER_PAGE_SIZE, groupRenderLimits.get(key) || GROUP_RENDER_PAGE_SIZE);
      if (minVisibleCount > currentLimit) {
        groupRenderLimits.set(key, minVisibleCount);
      }
    }

    function createShowMoreControl(groupKey, remaining, total) {
      const revealCount = Math.min(GROUP_RENDER_PAGE_SIZE, Math.max(0, remaining));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "group-show-more";
      button.dataset.group = normalizeGroupKey(groupKey);
      button.textContent = `Show ${revealCount} more`;
      button.title = `${remaining} of ${total} items hidden in this group`;
      button.setAttribute("aria-label", `Show ${revealCount} more items in this group, ${remaining} remaining`);
      button.addEventListener("click", () => {
        const key = normalizeGroupKey(groupKey);
        const currentLimit = Math.max(GROUP_RENDER_PAGE_SIZE, groupRenderLimits.get(key) || GROUP_RENDER_PAGE_SIZE);
        groupRenderLimits.set(key, currentLimit + GROUP_RENDER_PAGE_SIZE);
        render();
      });
      return button;
    }

    function formatRenderedCount(visibleCount, totalCount) {
      const normalizedTotal = Math.max(0, totalCount || 0);
      return `${visibleCount}/${normalizedTotal}`;
    }

    function disconnectSentinels() {
      if (sentinelObserver) {
        sentinelObserver.disconnect();
        sentinelObserver = null;
      }
      if (sentinelTop) {
        sentinelTop.remove();
        sentinelTop = null;
      }
      if (sentinelBottom) {
        sentinelBottom.remove();
        sentinelBottom = null;
      }
      if (sentinelWrapper) {
        sentinelWrapper.remove();
        sentinelWrapper = null;
      }
    }

    function boardGroupMode() {
      return typeof getGroupMode === "function" ? getGroupMode() : "stage";
    }

    // item_795: `status` was the only alternative to `stage`, as an inverted special case.
    // The mockup's segmented control offers Type / Status / Theme / None, and the last three
    // are the same operation over a different key -- so they are one function keyed by the
    // mode rather than three branches.
    const BOARD_GROUP_KEYS = {
      status: (item) => String((item && item.indicators && item.indicators.Status) || "No status"),
      theme: (item) => String((item && item.indicators && item.indicators.Theme) || "No theme"),
      none: () => "All documents"
    };

    function groupBoardItems(visibleItems) {
      const key = BOARD_GROUP_KEYS[boardGroupMode()];
      if (!key) {
        return groupByStage(visibleItems);
      }
      return visibleItems.reduce((acc, item) => {
        const bucket = key(item);
        acc[bucket] = acc[bucket] || [];
        acc[bucket].push(item);
        return acc;
      }, {});
    }

    function getVisibleBoardStages(grouped) {
      if (BOARD_GROUP_KEYS[boardGroupMode()]) {
        // Columns are whatever the corpus actually holds, in a stable order -- for `none`
        // that is the single bucket the key function returns for every document.
        return Object.keys(grouped).sort();
      }
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

    function createSentinelElement(variant) {
      const sentinel = document.createElement("div");
      sentinel.className = `list-view__sentinel list-view__sentinel--${variant}`;
      sentinel.hidden = true;

      const icon = document.createElement("span");
      icon.className = "list-view__sentinel-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = chevronIcon(variant === "bottom");
      sentinel.appendChild(icon);

      const label = document.createElement("span");
      label.className = "list-view__sentinel-label";
      sentinel.appendChild(label);

      const count = document.createElement("span");
      count.className = "list-view__sentinel-count";
      sentinel.appendChild(count);

      return sentinel;
    }

    function updateSentinelFromHeader(sentinel, header) {
      if (!sentinel) {
        return;
      }
      const label = sentinel.querySelector(".list-view__sentinel-label");
      const count = sentinel.querySelector(".list-view__sentinel-count");
      if (!header || !label || !count) {
        sentinel.hidden = true;
        if (label) {
          label.textContent = "";
        }
        if (count) {
          count.textContent = "";
        }
        return;
      }
      label.textContent = header.querySelector(".list-view__header-label")?.textContent?.trim() || "";
      count.textContent = header.querySelector(".list-view__header-count")?.textContent?.trim() || "";
      sentinel.hidden = false;
    }

    function attachSentinelObserver(wrapperEl, boardListEl, topSentinel, bottomSentinel) {
      if (typeof IntersectionObserver === "undefined") {
        return;
      }
      const headers = Array.from(wrapperEl.querySelectorAll(".list-view__header"));
      if (headers.length === 0) {
        return;
      }
      const headerStates = new Map();
      const refreshSentinels = () => {
        const aboveHeaders = headers.filter((header) => headerStates.get(header) === "above");
        const belowHeaders = headers.filter((header) => headerStates.get(header) === "below");
        updateSentinelFromHeader(topSentinel, aboveHeaders.length > 0 ? aboveHeaders[aboveHeaders.length - 1] : null);
        updateSentinelFromHeader(bottomSentinel, belowHeaders.length > 0 ? belowHeaders[0] : null);
      };
      sentinelObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              headerStates.set(entry.target, "visible");
              return;
            }
            if (entry.rootBounds && entry.boundingClientRect.bottom < entry.rootBounds.top) {
              headerStates.set(entry.target, "above");
              return;
            }
            if (entry.rootBounds && entry.boundingClientRect.top > entry.rootBounds.bottom) {
              headerStates.set(entry.target, "below");
              return;
            }
            headerStates.set(entry.target, "below");
          });
          refreshSentinels();
        },
        {
          root: boardListEl,
          threshold: [0, 1]
        }
      );
      headers.forEach((header) => sentinelObserver.observe(header));
      refreshSentinels();
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
        ensureGroupRenderLimit(item.stage, itemIndex);
        selectItemAndFocus(stageItems[itemIndex - 1].id);
        return;
      }

      if (direction === "down" && itemIndex < stageItems.length - 1) {
        ensureGroupRenderLimit(item.stage, itemIndex + 2);
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

    function createCardBadgeStrip(item, activeTasks) {
      const badgeStrip = document.createElement("div");
      badgeStrip.className = "card__badges card__badges--strip";

      const badgeGroups = [
        createPriorityBadge(item),
        createProgressComplexityBadge(item),
      ];

      badgeGroups.forEach((group) => {
        if (group) {
          badgeStrip.appendChild(group);
        }
      });

      return badgeStrip.childElementCount > 0 ? badgeStrip : null;
    }

    function createPriorityBadge(item) {
      if (String(item?.stage || "").trim() !== "backlog") {
        return null;
      }
      const priority = String(item?.indicators?.Priority || "Medium").trim() || "Medium";
      const level = priority.toLowerCase();
      const knownLevel = level === "low" || level === "high" ? level : "medium";
      const filled = knownLevel === "high" ? 3 : knownLevel === "low" ? 1 : 2;
      const badges = document.createElement("div");
      badges.className = "card__badges card__badges--priority";
      const meter = document.createElement("span");
      meter.className = `card__priority-meter card__priority-meter--${knownLevel}`;
      meter.title = `Priority: ${priority}`;
      meter.setAttribute("role", "img");
      meter.setAttribute("aria-label", `Priority: ${priority}`);
      for (let i = 1; i <= 3; i += 1) {
        const bar = document.createElement("span");
        bar.className = i <= filled ? "card__priority-bar card__priority-bar--on" : "card__priority-bar";
        meter.appendChild(bar);
      }
      badges.appendChild(meter);
      return badges;
    }

    function formatCardAge(days) {
      if (days === 0) return "today";
      if (days === 1) return "1d";
      if (days < 30) return `${days}d`;
      if (days < 365) return `${Math.round(days / 30)}mo`;
      return `${Math.round(days / 365)}y`;
    }

    /** Age is the fact the card was missing: nothing on it said whether the document
     *  moved this week or has sat for six. Absent an `ageDays`, show nothing rather than
     *  a zero that would read as "today". */
    function createCardAgeSegment(item) {
      let days = Number(item && item.ageDays);
      if (!Number.isFinite(days) || days < 0) {
        // Both surfaces send ageDays, but a card that carries updatedAt already knows how
        // old it is, and showing nothing there would be a blank where a fact exists.
        const stamp = Date.parse(String((item && item.updatedAt) || ""));
        if (!Number.isFinite(stamp)) return null;
        days = Math.max(0, (Date.now() - stamp) / 86400000);
      }
      const segment = document.createElement("span");
      segment.className = "card__badge-metric-segment card__badge-age";
      if (days >= 30) segment.classList.add("is-stale");
      segment.textContent = formatCardAge(Math.round(days));
      segment.title = `Last moved ${Math.round(days)} day(s) ago`;
      return segment;
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
        roadmap: "M",
        architecture: "A",
        spec: "S",
        // item_817: runbooks are on the board now, and `run_002` fell through to its own
        // first letter -- the same "R" a request already uses, so R002 and R365 read as the
        // same kind. Roadmap solved this the same way when it could not have "R" either.
        runbook: "N"
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

      // item_719: age is a fact every card has, so it must not be gated behind an indicator
      // it has nothing to do with. A card carrying no metric at all still gets the pill if
      // it knows how old it is; a card with neither shows nothing, as before.
      const ageSegment = createCardAgeSegment(item);
      if (!normalizedPrimary && !normalizedSecondary && !complexityLabel && !ageSegment) {
        return null;
      }

      const pill = document.createElement("span");
      pill.className = "card__badge card__badge--metric";
      const primaryText = normalizedPrimary ? `${Math.max(0, Math.min(100, Math.round(Number(normalizedPrimary[1] || normalizedPrimary[0]))))}%` : "—";
      const secondaryText = normalizedSecondary ? `${Math.max(0, Math.min(100, Math.round(Number(normalizedSecondary[1] || normalizedSecondary[0]))))}%` : "—";
      const complexityText = complexityLabel ? normalizeComplexityLabel(complexityLabel) : "—";

      if (useUnderstandingConfidence) {
        // item_719: measured across all 1 393 workflow docs in this corpus, the
        // `U __% / C __%` pair takes 91 distinct values, of which `U 90% / C 85%` alone
        // covers 34%; Understanding runs 75 to 100 with a median of 95 and every document
        // sits at 85 or above. It was the loudest element after the title and very nearly
        // a constant. It moves to the card's detail, and the line it occupied carries what
        // does vary: how long since the document moved.
        const age = ageSegment;
        if (age) pill.appendChild(age);
        if (complexityValue) {
          // Only separate things that are both there. Removing the U/C pair left a leading
          // `/` with nothing before it -- the pill read `/H`.
          if (age) {
            const separatorTwo = document.createElement("span");
            separatorTwo.className = "card__badge-metric-separator";
            separatorTwo.textContent = "/";
            pill.appendChild(separatorTwo);
          }
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
        // item_719: a companion document carries neither progress nor complexity, so this
        // branch drew `P \u2014 / \u2014` -- a pill of two em-dashes, which is the opposite of a
        // fact that varies. When there is nothing to report, the pill reports the age.
        const hasProgress = typeof progressValue === "number";
        if (!hasProgress && !complexityValue && ageSegment) {
          pill.appendChild(ageSegment);
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
        }
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
        // Make the compact id prefix (e.g. "P001") self-explanatory: expose the
        // full stage name via tooltip / accessible label and a per-stage colour.
        const stage = String(item?.stage || "").trim();
        const stageLabel = stageLabelByStage[stage] || (stage ? stage.charAt(0).toUpperCase() + stage.slice(1) : "");
        if (stageLabel) {
          prefixEl.title = `${stageLabel} · ${prefix}`;
          prefixEl.setAttribute("aria-label", `${stageLabel} (${prefix})`);
        }
        if (stage) {
          prefixEl.dataset.stage = stage;
        }
        titleEl.appendChild(prefixEl);
      }

      const textEl = document.createElement("span");
      textEl.className = "card__title-text";
      textEl.textContent = item.title;
      titleEl.appendChild(textEl);
      return titleEl;
    }

    function normalizeLinkLookupValue(value) {
      return String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\.?\//, "");
    }

    function resolveTaskItem(usage) {
      const items = getItems();
      const normalizedId = String(usage?.id || "").trim();
      const normalizedRelPath = normalizeLinkLookupValue(usage?.relPath || usage?.path);
      const normalizedBase = normalizedRelPath ? normalizedRelPath.split("/").pop()?.replace(/\.md$/i, "") || "" : "";
      return (
        items.find((candidate) => {
          const candidateRelPath = normalizeLinkLookupValue(candidate?.relPath || candidate?.path);
          const candidateBase = candidateRelPath ? candidateRelPath.split("/").pop()?.replace(/\.md$/i, "") || "" : "";
          return (
            candidate?.id === normalizedId ||
            candidateRelPath === normalizedRelPath ||
            candidate?.id === normalizedBase ||
            candidateBase === normalizedBase
          );
        }) || null
      );
    }

    function getResolvedRequestItem(item) {
      if (!item) {
        return null;
      }
      if (String(item.stage || "").trim() === "request") {
        return item;
      }
      const linkedRequests = typeof collectPrimaryFlowItems === "function" ? collectPrimaryFlowItems(item).filter((candidate) => candidate && String(candidate.stage || "").trim() === "request") : [];
      return linkedRequests.length > 0 ? linkedRequests[0] : null;
    }

    function getActiveTaskUsages(item) {
      const activeTasks = [];
      const seen = new Set();
      for (const usage of item?.usedBy || []) {
        const taskItem = resolveTaskItem(usage);
        if (!isActiveTaskCandidate(taskItem) || !taskItem?.id || seen.has(taskItem.id)) {
          continue;
        }
        seen.add(taskItem.id);
        activeTasks.push(taskItem);
      }
      return activeTasks;
    }

    function createLinkageBadges(item, activeTasks) {
      const requestItem = getResolvedRequestItem(item);
      if (!requestItem && activeTasks.length === 0) {
        return null;
      }

      const badges = document.createElement("div");
      badges.className = "card__linkage-indicators";
      badges.setAttribute("aria-hidden", "true");

      if (requestItem) {
        const requestBadge = document.createElement("span");
        requestBadge.className = "card__request-badge";
        requestBadge.style.background = activeRequestColorMap.get(requestItem.id) || getRequestColor(requestItem.id);
        requestBadge.title = `Request ${requestItem.id}`;
        badges.appendChild(requestBadge);
      }

      if (activeTasks.length > 0) {
        const taskDotContainer = document.createElement("div");
        taskDotContainer.className = "card__task-dot-container";

        const visibleTaskCount = activeTasks.length > 2 ? 1 : activeTasks.length;
        for (let index = 0; index < visibleTaskCount; index += 1) {
          const task = activeTasks[index];
          const taskDot = document.createElement("span");
          taskDot.className = "card__task-dot";
          taskDot.style.background = activeTaskColorMap.get(task.id) || getTaskColor(task.id);
          taskDot.title = `Task ${task.id}`;
          taskDotContainer.appendChild(taskDot);
        }

        if (activeTasks.length > 2) {
          const overflow = document.createElement("span");
          overflow.className = "card__task-dot-overflow";
          overflow.textContent = `+${activeTasks.length - 1}`;
          taskDotContainer.appendChild(overflow);
        }

        badges.appendChild(taskDotContainer);
      }

      return badges;
    }

    /** The status vocabulary reduced to what the accent can show. Blocked first: it is the
     *  only one an operator has to act on, and the payload carries no reason for it, so the
     *  card says the state and the detail carries the rest. */
    function cardStatusKey(item) {
      const status = String(item && item.indicators && item.indicators.Status ? item.indicators.Status : "")
        .trim()
        .toLowerCase();
      if (!status) return "";
      if (status === "blocked") return "blocked";
      if (status === "in progress") return "progress";
      if (status === "ready") return "ready";
      if (status === "draft" || status === "proposed") return "draft";
      if (isFinishedForBoard(item)) return "done";
      return "";
    }

    function createItemCard(item, compact = false) {
      const card = document.createElement("div");
      const doneClass = isComplete(item) ? " card--done" : "";
      const progressClass = progressState(item);
      const usedClass = isRequestProcessed(item) ? " card--used" : "";
      const progressValue = getProgressValue(item);
      const hasProgressBar = typeof progressValue === "number" && progressValue > 0 && progressValue < 100;
      // item_719/item_767: the card fill encoded the stage, which the column it sits in
      // already states. Status -- what varies inside a column -- had only the done-dimming.
      // The accent carries it, and carries it by shape as well as colour so the ordering
      // survives greyscale, per the decision recorded in item_767.
      const statusKey = cardStatusKey(item);
      card.className =
        "card" +
        (statusKey ? ` card--status-${statusKey}` : "") +
        (compact ? " card--compact" : "") +
        (item.id === getSelectedId() ? " card--selected" : "") +
        doneClass +
        (progressClass ? ` ${progressClass}` : "") +
        usedClass +
        (hasProgressBar ? " card--progress-bar" : "");
      if (hasProgressBar) {
        const clamped = Math.max(0, Math.min(100, progressValue));
        card.style.setProperty("--progress", `${clamped}%`);
        // item_740: the bar has a fixed length, so it is filled by a ratio rather than by a
        // percentage of whatever the element happens to be wide.
        card.style.setProperty("--progress-ratio", String(clamped / 100));
        card.style.setProperty("--progress-value", String(Math.round(clamped)));
      }
      card.dataset.id = item.id;
      card.dataset.stage = item.stage;
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      // item_719/AC6: the status accent is a colour and a border shape on the card's edge.
      // Both are explained here rather than left to be learned, so nothing the card displays
      // is a marker the screen never names.
      const statusText = String((item.indicators && item.indicators.Status) || "").trim();
      card.setAttribute(
        "aria-label",
        `${getStageLabel(item.stage)} item ${item.id}: ${item.title}${statusText ? `. Status ${statusText}` : ""}`
      );
      card.title = statusText ? `${item.title}\n${statusText}` : item.title;
      const healthSignals = typeof getHealthSignals === "function" ? getHealthSignals(item) : [];
      if (healthSignals.length > 0) {
        card.classList.add("card--health-alert");
      }
      const activeTasks = item.stage === "task" ? (isActiveTaskCandidate(item) ? [item] : []) : getActiveTaskUsages(item);

      card.appendChild(createCardTitle(item));

      const badgeStrip = createCardBadgeStrip(item, activeTasks);
      if (badgeStrip) {
        card.appendChild(badgeStrip);
      }

      const linkageBadges = createLinkageBadges(item, activeTasks);
      if (linkageBadges) {
        card.appendChild(linkageBadges);
      }

      // item_720: a click used to do three things -- select, expand an inline preview that
      // repeated the panel's own header, and grow the card so every card below it moved
      // under the pointer. It now selects, and selecting is what opens the panel. The panel
      // already renders every indicator the preview was copying, so nothing is lost.
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
        handleCardKeydown(event, item);
      });
      return card;
    }

    // item_718: measured on this corpus -- 1 382 of 1 511 documents are Done or Settled,
    // 91.5%, and what is live is 13 items. The board opened on all of them newest-first,
    // so 13 live items sat under 1 382 finished ones. Finished work stays reachable; it
    // stops setting the scale of the screen.
    const expandedDoneGroups = new Set();
    // Open by default: the index is what the freed column width is for, and folding it
    // would trade a clipped sixth column for an empty right half. The control is there for
    // an operator who wants the queue alone.
    let companionIndexOpen = true;

    // Deliberately status, not progress. `isComplete` reads Progress >= 100 and is right
    // for the card's progress wash -- but requests carry no Progress indicator at all, so
    // splitting on it left the Requests column reporting `10/353` while Backlog and Tasks
    // reported live-versus-done correctly. Caught by looking at the screen, not the code.
    function isFinishedForBoard(item) {
      const status = String(item && item.indicators && item.indicators.Status ? item.indicators.Status : "")
        .trim()
        .toLowerCase();
      return status === "done" || status === "complete" || status === "completed"
        || status === "archived" || status === "obsolete" || status === "superseded"
        || status === "settled" || status === "closed";
    }

    // Folding is a default, not a filter. When the operator has said what they want to
    // see -- a search, or a filter that selects finished work -- the board shows it. The
    // filter-authority tests caught this: they assert the board renders what the panel
    // allows, and an unconditional fold made the board disagree with its own filters.
    // Same shape as `visibleSliceForGroup`, which already stops paging during a search.
    function shouldFoldFinished(items) {
      if (hasActiveSearch()) return false;
      // Every item in this group is finished: there is no live work to lead with, so a
      // fold would hide the whole column behind a control.
      return items.some((item) => !isFinishedForBoard(item));
    }

    function splitLiveAndDone(items) {
      if (!shouldFoldFinished(items)) return { live: items, done: [] };
      const live = [];
      const done = [];
      for (const item of items) (isFinishedForBoard(item) ? done : live).push(item);
      return { live, done };
    }

    function createDoneFoldControl(groupKey, doneItems) {
      const key = normalizeGroupKey(groupKey);
      const open = expandedDoneGroups.has(key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "group-show-more column__done-fold";
      button.dataset.group = key;
      button.setAttribute("aria-expanded", open ? "true" : "false");
      // The fold says how many it is holding: a control that hides work without saying
      // how much reads as a truncation rather than a choice.
      button.textContent = `${open ? "\u25be" : "\u25b8"} Done \u2014 ${doneItems.length} item${doneItems.length === 1 ? "" : "s"}`;
      button.addEventListener("click", () => {
        if (expandedDoneGroups.has(key)) expandedDoneGroups.delete(key);
        else expandedDoneGroups.add(key);
        render();
      });
      return button;
    }

    // item_717: found while splitting this function. It took its columns from
    // getVisibleStages(), which returns stage names, while `grouped` is keyed by status
    // whenever the Group by control says status -- so every lookup missed and the board
    // rendered no columns at all in that mode. getVisibleBoardStages() already answers this
    // correctly for both modes; only keyboard navigation was asking it.
    function renderBoardColumns(grouped, totalVisibleItems) {
      const stages = getVisibleBoardStages(grouped);
      const byStage = boardGroupMode() !== "status";
      // item_717: seven stages rendered as peer columns, so the sixth clipped mid-word at
      // 1440 and a third of the board went to 118 companion documents that are all Settled.
      // A settled document is an index entry, not a queue entry. logicsModel.js already
      // draws this line; the board never used it.
      const columnStages = byStage ? stages.filter((stage) => isPrimaryFlowStage(stage)) : stages;
      const companionStages = byStage ? stages.filter((stage) => !isPrimaryFlowStage(stage)) : [];
      columnStages.forEach((stage) => {
        const stageItems = grouped[stage] || [];
        if (getHideEmptyColumns() && stageItems.length === 0) {
          return;
        }
        const totalCount = Math.max(0, stageItems.length || 0);
        const split = splitLiveAndDone(stageItems);
        const visibleSlice = visibleSliceForGroup(stage, split.live);
        const column = document.createElement("div");
        column.className = "column";
        column.dataset.stage = stage;

        const header = document.createElement("div");
        header.className = "column__header";

        // A heading element, not a styled div: the interface carried no h1-h6 at all, so a
        // screen reader had regions to move between and nothing inside them. The class is
        // unchanged, so nothing moves visually.
        const title = document.createElement("h2");
        title.className = "column__title";
        const titleLabel = document.createElement("span");
        titleLabel.className = "column__title-label";
        // In status mode the key is the status itself, and there is no stage heading for it.
        titleLabel.textContent = boardGroupMode() === "status" ? stage : getStageHeading(stage);
        title.appendChild(titleLabel);

        const titleCount = document.createElement("span");
        titleCount.className = "column__title-count";
        // `10/343` said how much was hidden but not what state the column was in.
        titleCount.textContent = split.done.length
          ? `${split.live.length} live \u00b7 ${split.done.length} done`
          : formatRenderedCount(visibleSlice.items.length, totalCount);
        title.appendChild(titleCount);
        header.appendChild(title);

        const actions = document.createElement("div");
        actions.className = "column__actions";

        header.appendChild(actions);
        column.appendChild(header);

        const body = document.createElement("div");
        body.className = "column__body";
        if (!stageItems.length) {
          const empty = document.createElement("div");
          empty.className = "column__empty";
          empty.textContent = isPrimaryFlowStage(stage) ? "No items" : "No linked docs";
          body.appendChild(empty);
        } else {
          visibleSlice.items.forEach((item) => body.appendChild(createItemCard(item)));
          if (visibleSlice.truncated) {
            body.appendChild(createShowMoreControl(stage, visibleSlice.remaining, visibleSlice.total));
          }
          if (!split.live.length && split.done.length) {
            const clear = document.createElement("div");
            clear.className = "column__empty";
            clear.textContent = "Nothing live here";
            body.appendChild(clear);
          }
          if (split.done.length) {
            body.appendChild(createDoneFoldControl(stage, split.done));
            if (expandedDoneGroups.has(normalizeGroupKey(stage))) {
              const doneSlice = visibleSliceForGroup(`${stage}::done`, split.done);
              doneSlice.items.forEach((item) => body.appendChild(createItemCard(item)));
              if (doneSlice.truncated) {
                body.appendChild(createShowMoreControl(`${stage}::done`, doneSlice.remaining, doneSlice.total));
              }
            }
          }
        }

        column.appendChild(body);
        board.appendChild(column);
      });
      if (companionStages.length) {
        board.appendChild(createCompanionIndex(companionStages, grouped));
      }
    }

    /** The index is searchable through the board's own search rather than a second box
     *  beside it: its entries are the same filtered items the columns draw from, so typing
     *  in Search docs narrows it too. It starts folded and states its count, the same
     *  shape as the Done fold, because 118 settled documents are a reference, not work. */
    function createCompanionIndex(companionStages, grouped) {
      const section = document.createElement("section");
      section.className = "companion-index";
      const total = companionStages.reduce((sum, stage) => sum + (grouped[stage] || []).length, 0);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "group-show-more companion-index__toggle";
      toggle.setAttribute("aria-expanded", companionIndexOpen ? "true" : "false");
      toggle.setAttribute("aria-controls", "companion-index-body");
      toggle.textContent = `${companionIndexOpen ? "\u25be" : "\u25b8"} Reference \u2014 ${total} document${total === 1 ? "" : "s"}`;
      toggle.addEventListener("click", () => {
        companionIndexOpen = !companionIndexOpen;
        render();
      });
      section.appendChild(toggle);

      const body = document.createElement("div");
      body.className = "companion-index__body";
      body.id = "companion-index-body";
      body.hidden = !companionIndexOpen;
      companionStages.forEach((stage) => {
        const stageItems = grouped[stage] || [];
        if (!stageItems.length) return;
        const group = document.createElement("div");
        group.className = "companion-index__group";
        group.dataset.stage = stage;
        const heading = document.createElement("h3");
        heading.className = "companion-index__heading";
        heading.textContent = `${getStageHeading(stage)} (${stageItems.length})`;
        group.appendChild(heading);
        const list = document.createElement("div");
        list.className = "companion-index__list";
        const slice = visibleSliceForGroup(`companion::${stage}`, stageItems);
        slice.items.forEach((item) => list.appendChild(createItemCard(item, true)));
        if (slice.truncated) {
          list.appendChild(createShowMoreControl(`companion::${stage}`, slice.remaining, slice.total));
        }
        group.appendChild(list);
        body.appendChild(group);
      });
      section.appendChild(body);
      return section;
    }

    /** item_739: list mode rendered a compact card stretched to full width -- an 82px row
     *  carrying one line of text, the title in the left third, the middle half empty, and the
     *  near-constant U/C chip pinned about 1 500px from the title it described. A list is a
     *  table. These are the columns, and each carries a fact the card face carries too, in
     *  the same encoding, so switching mode changes the shape and not the meaning. */
    function createListRow(item) {
      const row = document.createElement("div");
      const statusKey = cardStatusKey(item);
      // It keeps the `card` class: selection, focus and keyboard navigation all find a
      // document through `findCardById`, which queries `.card`. Dropping it turned the list
      // into rows the keyboard could not reach, which the existing tests caught.
      row.className = "card list-row" + (statusKey ? ` card--status-${statusKey}` : "") + (item.id === getSelectedId() ? " card--selected" : "");
      row.dataset.id = item.id;
      row.dataset.stage = item.stage;
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      const statusText = String((item.indicators && item.indicators.Status) || "").trim();
      row.setAttribute(
        "aria-label",
        `${getStageLabel(item.stage)} item ${item.id}: ${item.title}${statusText ? `. Status ${statusText}` : ""}`
      );

      row.appendChild(createCardTitle(item));

      // AC17: both modes encode the same facts the same way. The task-coverage dots are one
      // of them, so the list reuses the card's builder rather than drawing its own version
      // that would drift -- the existing coverage test caught their absence here.
      const activeTasks = item.stage === "task" ? (isActiveTaskCandidate(item) ? [item] : []) : getActiveTaskUsages(item);
      const linkage = createLinkageBadges(item, activeTasks);
      if (linkage) {
        linkage.classList.add("list-row__linkage");
        row.appendChild(linkage);
      }

      const status = document.createElement("span");
      status.className = "list-row__cell list-row__cell--status";
      status.textContent = statusText || "No status";
      row.appendChild(status);

      const links = document.createElement("span");
      links.className = "list-row__cell list-row__cell--links";
      const companions = typeof collectCompanionDocs === "function" ? collectCompanionDocs(item, getItems()) : [];
      const specs = typeof collectSpecs === "function" ? collectSpecs(item, getItems()) : [];
      const linkCount = (companions ? companions.length : 0) + (specs ? specs.length : 0);
      // A dash, not a zero: nothing linked is a different statement from a count of none,
      // and a column of zeroes reads as loudly as a column of counts.
      links.textContent = linkCount ? `${linkCount} linked` : "\u2014";
      row.appendChild(links);

      // AC17/AC18: the same progress encoding as a card, set the same way. The list row
      // previously carried none at all.
      const progressValue = typeof getProgressValue === "function" ? getProgressValue(item) : null;
      if (typeof progressValue === "number") {
        const clamped = Math.max(0, Math.min(100, progressValue));
        row.classList.add("card--progress-bar");
        row.style.setProperty("--progress", `${clamped}%`);
        row.style.setProperty("--progress-ratio", String(clamped / 100));
        row.title = `${item.title}${statusText ? `\n${statusText}` : ""}\nProgress ${Math.round(clamped)}%`;
      }

      const age = document.createElement("span");
      age.className = "list-row__cell list-row__cell--age";
      const ageSegment = createCardAgeSegment(item);
      if (ageSegment) age.appendChild(ageSegment);
      else age.textContent = "\u2014";
      row.appendChild(age);

      row.addEventListener("click", () => {
        setSelectedId(item.id);
        render();
      });
      row.addEventListener("dblclick", () => {
        setSelectedId(item.id);
        render();
        openSelectedItem("read");
      });
      row.addEventListener("keydown", (event) => handleCardKeydown(event, item));
      return row;
    }

    function renderListView(groups) {
      disconnectSentinels();
      const listView = document.createElement("div");
      listView.className = "list-view";
      const wrapper = document.createElement("div");
      wrapper.className = "list-view__wrapper";
      sentinelTop = createSentinelElement("top");
      sentinelBottom = createSentinelElement("bottom");
      wrapper.appendChild(sentinelTop);
      wrapper.appendChild(listView);
      wrapper.appendChild(sentinelBottom);
      groups.forEach((group) => {
        const section = document.createElement("section");
        section.className = "list-view__section";
        section.dataset.group = group.key;
        if (group.stage) {
          section.dataset.stage = group.stage;
        }

        const stageItems = group.items || [];
        const visibleSlice = visibleSliceForGroup(group.key, stageItems);
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
        count.textContent = formatRenderedCount(visibleSlice.items.length, Math.max(0, group.totalCount || 0));
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
          if (event.key === "ArrowDown" && !getCollapsedListStages().has(group.key) && visibleSlice.items.length > 0) {
            event.preventDefault();
            selectItemAndFocus(visibleSlice.items[0].id);
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
          visibleSlice.items.forEach((item) => body.appendChild(createListRow(item)));
          if (visibleSlice.truncated) {
            body.appendChild(createShowMoreControl(group.key, visibleSlice.remaining, visibleSlice.total));
          }
        }
        section.appendChild(body);
        listView.appendChild(section);
      });

      board.appendChild(wrapper);
      sentinelWrapper = wrapper;
      attachSentinelObserver(wrapper, board, sentinelTop, sentinelBottom);
    }

    function renderBoard() {
      const scrollState = captureBoardScroll();
      if (typeof closeColumnMenu === "function") {
        closeColumnMenu();
      }
      disconnectSentinels();
      reconcileGroupRenderLimits();
      board.innerHTML = "";
      const visibleItems = getItems().filter((item) => isVisible(item));
      activeTaskColorMap = buildTaskColorMap(visibleItems);
      activeRequestColorMap = buildRequestColorMap(visibleItems);
      if (!visibleItems.length) {
        const empty = document.createElement("div");
        empty.className = "state-message";
        empty.textContent = getEmptyBoardMessage();
        board.appendChild(empty);
        return;
      }
      // The board used to group by stage whatever the control said, so choosing Status
      // moved nothing while the paging reset made it look as if it had. The list view
      // already knew how to group by status; the board simply never asked.
      const grouped = groupBoardItems(visibleItems);
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
