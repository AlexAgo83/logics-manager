(() => {
  const GROUP_RENDER_PAGE_SIZE = 10;
  // Human-readable stage names for the compact id prefix shown on cards.
  const stageLabelByStage = {
    request: "Request",
    backlog: "Backlog item",
    task: "Task",
    product: "Product brief",
    architecture: "Architecture decision",
    spec: "Spec"
  };
  const TASK_COLORS = ["#14b8a6", "#2563eb", "#8b5cf6", "#22c55e", "#06b6d4", "#84cc16", "#0ea5e9", "#7c3aed", "#3b82f6", "#0f766e"];
  const REQUEST_COLORS = ["#f97316", "#f59e0b", "#f43f5e", "#fb7185", "#ef4444", "#d97706", "#ec4899", "#be123c", "#fca5a5", "#fdba74"];
  const CLOSED_TASK_STATUSES = new Set(["done", "archived", "obsolete"]);

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
