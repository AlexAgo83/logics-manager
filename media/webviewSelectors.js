(() => {
  window.createCdxLogicsWebviewSelectors = function createCdxLogicsWebviewSelectors(options) {
    const {
      modelApi,
      primaryStageOrder,
      companionStageOrder,
      compactListQuery,
      getItems,
      getSelectedId,
      getActiveWorkspaceRoot,
      getChangedPaths,
      getActiveAgent,
      getLastInjectedContext,
      getHideCompleted,
      getHideProcessedRequests,
      getHideSpec,
      getShowCompanionDocs,
      getHideEmptyColumns,
      getSearchQuery,
      getGroupMode,
      getSortMode,
      getAttentionOnly,
      getUiState
    } = options;

    function getStageLabel(stage) {
      return typeof modelApi.getStageLabel === "function" ? modelApi.getStageLabel(stage) : String(stage || "item");
    }

    function getStageHeading(stage) {
      return typeof modelApi.getStageHeading === "function" ? modelApi.getStageHeading(stage) : String(stage || "").trim();
    }

    function isCompactListForced() {
      return Boolean(compactListQuery && compactListQuery.matches);
    }

    function getEffectiveViewMode() {
      return isCompactListForced() ? "list" : getUiState().viewMode;
    }

    function isListMode() {
      return getEffectiveViewMode() === "list";
    }

    function normalizeSearchValue(value) {
      return String(value || "").trim().toLowerCase();
    }

    function getStatusValue(item) {
      return normalizeSearchValue(item && item.indicators ? item.indicators.Status : "") || "no status";
    }

    function isPrimaryFlowStage(stage) {
      return typeof modelApi.isPrimaryFlowStage === "function" ? modelApi.isPrimaryFlowStage(stage) : false;
    }

    function isCompanionStage(stage) {
      return typeof modelApi.isCompanionStage === "function" ? modelApi.isCompanionStage(stage) : false;
    }

    function collectCompanionDocs(item) {
      return typeof modelApi.collectCompanionDocs === "function" ? modelApi.collectCompanionDocs(item, getItems()) : [];
    }

    function collectSpecs(item) {
      return typeof modelApi.collectSpecs === "function" ? modelApi.collectSpecs(item, getItems()) : [];
    }

    function collectPrimaryFlowItems(item) {
      return typeof modelApi.collectPrimaryFlowItems === "function" ? modelApi.collectPrimaryFlowItems(item, getItems()) : [];
    }

    function getAttentionReasons(item) {
      return typeof modelApi.getAttentionReasons === "function" ? modelApi.getAttentionReasons(item, getItems()) : [];
    }

    function buildContextPack(item, options = {}) {
      return typeof modelApi.buildContextPack === "function"
        ? modelApi.buildContextPack(item, getItems(), {
            changedPaths: typeof getChangedPaths === "function" ? getChangedPaths() : [],
            activeAgent: typeof getActiveAgent === "function" ? getActiveAgent() : null,
            lastInjectedContext: typeof getLastInjectedContext === "function" ? getLastInjectedContext() : null,
            currentRoot: typeof getActiveWorkspaceRoot === "function" ? getActiveWorkspaceRoot() : null,
            ...options
          })
        : null;
    }

    function buildDependencyMap(item) {
      return typeof modelApi.buildDependencyMap === "function" ? modelApi.buildDependencyMap(item, getItems()) : null;
    }

    function findManagedItemByReference(rawValue, fallbackUsage) {
      return typeof modelApi.findManagedItemByReference === "function"
        ? modelApi.findManagedItemByReference(rawValue, getItems(), fallbackUsage)
        : null;
    }

    function normalizeManagedDocValue(value) {
      return typeof modelApi.normalizeManagedDocValue === "function" ? modelApi.normalizeManagedDocValue(value) : String(value || "");
    }

    function getVisibleStages() {
      const visibleStages = [...primaryStageOrder];
      if (getShowCompanionDocs()) {
        visibleStages.push(...companionStageOrder);
      }
      if (!getHideSpec()) {
        visibleStages.push("spec");
      }
      return visibleStages;
    }

    function getProgressValue(item) {
      const indicators = item && item.indicators ? item.indicators : {};
      const progressKey = Object.keys(indicators).find((key) => key.toLowerCase().includes("progress"));
      if (!progressKey) {
        return null;
      }
      const progressRaw = indicators[progressKey];
      const match = String(progressRaw).match(/(\d+(?:\.\d+)?)/);
      if (!match) {
        return null;
      }
      const value = Number(match[1]);
      return Number.isFinite(value) ? value : null;
    }

    function isComplete(item) {
      const value = getProgressValue(item);
      return value !== null && value >= 100;
    }

    function normalizeStatus(value) {
      return String(value || "")
        .trim()
        .toLowerCase();
    }

    function isProcessedWorkflowStatus(value) {
      const normalized = normalizeStatus(value);
      return normalized === "ready" || normalized === "in progress" || normalized === "blocked" || normalized === "done";
    }

    function collectLinkedWorkflowItems(item) {
      if (!item || item.stage !== "request") {
        return [];
      }
      const linkedPaths = new Set();
      if (Array.isArray(item.references)) {
        item.references.forEach((ref) => {
          if (ref && typeof ref.path === "string") {
            linkedPaths.add(ref.path.replace(/\\/g, "/"));
          }
        });
      }
      if (Array.isArray(item.usedBy)) {
        item.usedBy.forEach((usage) => {
          if (usage && typeof usage.relPath === "string") {
            linkedPaths.add(usage.relPath.replace(/\\/g, "/"));
          }
        });
      }
      return getItems().filter(
        (candidate) =>
          linkedPaths.has(String(candidate.relPath || "").replace(/\\/g, "/")) &&
          (candidate.stage === "backlog" || candidate.stage === "task")
      );
    }

    function isRequestProcessed(item) {
      return typeof modelApi.isRequestProcessed === "function" ? modelApi.isRequestProcessed(item, getItems()) : false;
    }

    function progressState(item) {
      const value = getProgressValue(item);
      if (value === null) {
        return "";
      }
      if (value <= 0) {
        return "card--progress-zero";
      }
      if (value >= 100) {
        return "card--progress-done";
      }
      return "card--progress-active";
    }

    function canPromote(item) {
      if (!item) {
        return false;
      }
      if (item.isPromoted) {
        return false;
      }
      if (isRequestProcessed(item)) {
        return false;
      }
      return item.stage === "request" || item.stage === "backlog";
    }

    function getHealthSignals(item) {
      return getAttentionReasons(item).map((reason) => reason.key);
    }

    function needsAttention(item) {
      return getAttentionReasons(item).length > 0;
    }

    function getSuggestedActions(item) {
      const actions = [];
      if (canPromote(item)) {
        actions.push({ key: "promote", label: "Promote", title: "This workflow item can be promoted." });
      }
      if (isPrimaryFlowStage(item.stage) && collectCompanionDocs(item).length === 0 && collectSpecs(item).length === 0) {
        actions.push({ key: "add-docs", label: "Add docs", title: "This workflow item needs companion docs or specs." });
      }
      if (!isPrimaryFlowStage(item.stage) && collectPrimaryFlowItems(item).length === 0) {
        actions.push({
          key: "link-flow",
          label: "Link flow",
          title: "This supporting doc should be linked back to a primary-flow item."
        });
      }
      return actions.slice(0, 2);
    }

    function getActivityEntries() {
      return [...getItems()]
        .filter((item) => Date.parse(item.updatedAt || "") > 0)
        .sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0))
        .slice(0, 12)
        .map((item) => {
          const statusValue = getStatusValue(item);
          let label = "Updated";
          if (statusValue.includes("obsolete")) {
            label = "Marked obsolete";
          } else if (statusValue.includes("done") || statusValue.includes("complete")) {
            label = "Marked done";
          } else if (item.isPromoted) {
            label = "Promoted";
          } else if (isPrimaryFlowStage(item.stage) && (collectCompanionDocs(item).length > 0 || collectSpecs(item).length > 0)) {
            label = "Linked companion docs";
          }
          return {
            id: item.id,
            title: item.title,
            stage: item.stage,
            updatedAt: item.updatedAt,
            label
          };
        });
    }

    function getHelpBannerMessage() {
      if (getItems().length === 0) {
        return "No Logics items are loaded yet. Use Tools > New Request or Bootstrap Logics to seed the workspace.";
      }
      if (!getSelectedId()) {
        return "Select a card for details. Use Search to find items faster, Attention to triage, and List mode when the board gets crowded.";
      }
      return "";
    }

    function getProgressSortValue(item) {
      const value = getProgressValue(item);
      return typeof value === "number" ? value : -1;
    }

    function compareItems(left, right) {
      if (getSortMode() === "updated-desc") {
        const leftTime = Date.parse(left.updatedAt || "") || 0;
        const rightTime = Date.parse(right.updatedAt || "") || 0;
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
      } else if (getSortMode() === "progress-desc") {
        const progressDelta = getProgressSortValue(right) - getProgressSortValue(left);
        if (progressDelta !== 0) {
          return progressDelta;
        }
      } else if (getSortMode() === "status-asc") {
        const statusDelta = getStatusValue(left).localeCompare(getStatusValue(right));
        if (statusDelta !== 0) {
          return statusDelta;
        }
      } else {
        return 0;
      }

      return normalizeSearchValue(left.title).localeCompare(normalizeSearchValue(right.title));
    }

    function sortItems(allItems) {
      if (getSortMode() === "default") {
        return [...allItems];
      }
      return [...allItems].sort(compareItems);
    }

    function groupByStage(allItems) {
      const grouped = allItems.reduce((acc, item) => {
        acc[item.stage] = acc[item.stage] || [];
        acc[item.stage].push(item);
        return acc;
      }, {});
      Object.keys(grouped).forEach((stage) => {
        grouped[stage] = sortItems(grouped[stage]);
      });
      return grouped;
    }

    function collectSearchText(value) {
      if (Array.isArray(value)) {
        return value.map((entry) => collectSearchText(entry)).join(" ");
      }
      if (value && typeof value === "object") {
        return Object.values(value)
          .map((entry) => collectSearchText(entry))
          .join(" ");
      }
      return String(value || "");
    }

    function matchesSearch(item) {
      const normalizedQuery = normalizeSearchValue(getSearchQuery());
      if (!normalizedQuery) {
        return true;
      }
      const haystack = normalizeSearchValue(
        [
          item.title,
          item.id,
          item.stage,
          getStageLabel(item.stage),
          collectSearchText(item.references),
          collectSearchText(item.usedBy),
          collectSearchText(item.indicators)
        ].join(" ")
      );
      return haystack.includes(normalizedQuery);
    }

    function isVisible(item) {
      if (getAttentionOnly() && !needsAttention(item)) {
        return false;
      }
      if (getHideCompleted() && isComplete(item)) {
        return false;
      }
      if (getHideProcessedRequests() && item.stage === "request" && isRequestProcessed(item)) {
        return false;
      }
      if (getHideSpec() && item.stage === "spec") {
        return false;
      }
      if (!getShowCompanionDocs() && isCompanionStage(item.stage)) {
        return false;
      }
      return matchesSearch(item);
    }

    function getListGroups() {
      const visibleItems = getItems().filter((item) => isVisible(item));
      if (getGroupMode() === "status") {
        const grouped = visibleItems.reduce((acc, item) => {
          const heading = item && item.indicators && item.indicators.Status ? String(item.indicators.Status) : "No status";
          const key = `status:${normalizeSearchValue(heading) || "no-status"}`;
          acc[key] = acc[key] || { key, heading, items: [] };
          acc[key].items.push(item);
          return acc;
        }, {});
        return Object.values(grouped)
          .map((group) => ({ ...group, items: sortItems(group.items) }))
          .sort((left, right) => normalizeSearchValue(left.heading).localeCompare(normalizeSearchValue(right.heading)));
      }

      const grouped = groupByStage(visibleItems);
      return getVisibleStages()
        .map((stage) => ({
          key: stage,
          stage,
          heading: getStageHeading(stage),
          items: grouped[stage] || [],
          emptyLabel: isPrimaryFlowStage(stage) ? "No items" : "No linked docs"
        }))
        .filter((group) => !getHideEmptyColumns() || group.items.length > 0);
    }

    function formatDate(value) {
      if (!value) {
        return "-";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
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
      return date.toLocaleString();
    }

    return {
      canPromote,
      isCompactListForced,
      getEffectiveViewMode,
      isListMode,
      getStageLabel,
      getStageHeading,
      normalizeSearchValue,
      getStatusValue,
      getAttentionReasons,
      getHealthSignals,
      buildContextPack,
      buildDependencyMap,
      needsAttention,
      getSuggestedActions,
      getActivityEntries,
      getHelpBannerMessage,
      getProgressSortValue,
      compareItems,
      sortItems,
      groupByStage,
      collectSearchText,
      matchesSearch,
      isVisible,
      getListGroups,
      isPrimaryFlowStage,
      isCompanionStage,
      collectCompanionDocs,
      collectSpecs,
      collectPrimaryFlowItems,
      findManagedItemByReference,
      normalizeManagedDocValue,
      getVisibleStages,
      isComplete,
      formatDate,
      normalizeStatus,
      isProcessedWorkflowStatus,
      collectLinkedWorkflowItems,
      isRequestProcessed,
      progressState,
      getProgressValue
    };
  };
})();
