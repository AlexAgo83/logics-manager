(() => {
  const vscode =
    typeof acquireVsCodeApi === "function"
      ? acquireVsCodeApi()
      : {
          postMessage: () => undefined,
          getState: () => null,
          setState: () => undefined
        };
  const board = document.getElementById("board");
  const layout = document.getElementById("layout");
  const splitter = document.getElementById("splitter");
  const details = document.getElementById("details");
  const detailsBody = document.getElementById("details-body");
  const detailsToggle = document.getElementById("details-toggle");
  const detailsTitle = document.getElementById("details-title");
  const detailsEyebrow = document.getElementById("details-eyebrow");
  const filterToggle = document.getElementById("filter-toggle");
  const filterPanel = document.getElementById("filter-panel");
  const toolsToggle = document.getElementById("tools-toggle");
  const toolsPanel = document.getElementById("tools-panel");
  const viewModeToggleButton = document.querySelector('[data-action="toggle-view-mode"]');
  const refreshButton = document.querySelector('[data-action="refresh"]');
  const selectAgentButton = document.querySelector('[data-action="select-agent"]');
  const newRequestToolButton = document.querySelector('[data-action="new-request-guided"]');
  const createCompanionDocToolButton = document.querySelector('[data-action="create-companion-doc"]');
  const bootstrapLogicsButton = document.querySelector('[data-action="bootstrap-logics"]');
  const changeProjectRootButton = document.querySelector('[data-action="change-project-root"]');
  const resetProjectRootButton = document.querySelector('[data-action="reset-project-root"]');
  const fixDocsButton = document.querySelector('[data-action="fix-docs"]');
  const aboutButton = document.querySelector('[data-action="about"]');
  const promoteButton = document.querySelector('[data-action="promote"]');
  const markDoneButton = document.querySelector('[data-action="mark-done"]');
  const markObsoleteButton = document.querySelector('[data-action="mark-obsolete"]');
  const openButton = document.querySelector('[data-action="open"]');
  const readButton = document.querySelector('[data-action="read"]');
  const hideCompleteToggle = document.getElementById("hide-complete");
  const hideProcessedRequestsToggle = document.getElementById("hide-processed-requests");
  const hideSpecToggle = document.getElementById("hide-spec");
  const showCompanionDocsToggle = document.getElementById("show-companion-docs");
  const harnessBridge = window.__CDX_LOGICS_HARNESS__;
  const isHarnessMode = Boolean(harnessBridge && harnessBridge.isHarness);

  let items = [];
  let selectedId = null;
  let hideCompleted = false;
  let hideProcessedRequests = false;
  let hideSpec = true;
  let showCompanionDocs = false;
  let collapsedStages = new Set();
  let collapsedDetailSections = new Set();
  let activeColumnMenu = null;
  let activeColumnMenuButton = null;
  let filterPanelOpen = false;
  let toolsPanelOpen = false;
  let isDraggingSplit = false;
  let currentRoot = null;
  let harnessRootHandle = null;
  let canResetProjectRoot = false;
  let canBootstrapLogics = false;
  let statusBanner = null;
  let noticeTimeoutId = null;

  const primaryStageOrder = ["request", "backlog", "task"];
  const companionStageOrder = ["product", "architecture"];
  const stackedQuery = window.matchMedia("(max-width: 900px)");
  const minBoardHeight = 160;
  const minDetailsHeight = 180;
  const projectGithubUrl = "https://github.com/AlexAgo83/cdx-logics-vscode";
  const uiState = {
    layoutMode: "horizontal",
    detailsCollapsed: false,
    viewMode: "board",
    splitRatio: 0.6
  };
  const debugUi = (() => {
    const globalFlag = Boolean(window.__CDX_LOGICS_DEBUG__);
    let queryFlag = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const value = params.get("debug-ui");
      queryFlag = value === "1" || value === "true";
    } catch {
      queryFlag = false;
    }
    return globalFlag || queryFlag;
  })();
  const modelApi = window.CdxLogicsModel || {};
  const hostApiFactory = window.createCdxLogicsHostApi;
  const boardRendererFactory = window.createCdxLogicsBoardRenderer;
  const detailsRendererFactory = window.createCdxLogicsDetailsRenderer;
  const markdownApiFactory = window.createCdxLogicsMarkdownApi;

  function debugLog(eventName, payload = {}) {
    if (!debugUi) {
      return;
    }
    console.debug("[cdx-logics-webview]", eventName, payload);
  }

  function getStageLabel(stage) {
    return typeof modelApi.getStageLabel === "function" ? modelApi.getStageLabel(stage) : String(stage || "item");
  }

  function getStageHeading(stage) {
    return typeof modelApi.getStageHeading === "function" ? modelApi.getStageHeading(stage) : String(stage || "").trim();
  }

  function buildColumnMenu() {
    const menu = document.createElement("div");
    menu.className = "column__menu";
    menu.setAttribute("role", "menu");

    const options = [
      { label: "New Request", kind: "request" },
      { label: "New Backlog item", kind: "backlog" },
      { label: "New Task", kind: "task" }
    ];

    options.forEach((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "column__menu-item";
      item.textContent = option.label;
      item.setAttribute("role", "menuitem");
      item.title = option.label;
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        closeColumnMenu();
        hostApi.createItem(option.kind);
      });
      menu.appendChild(item);
    });

    return menu;
  }

  function closeColumnMenu() {
    if (activeColumnMenu) {
      activeColumnMenu.remove();
    }
    if (activeColumnMenuButton) {
      activeColumnMenuButton.setAttribute("aria-expanded", "false");
    }
    activeColumnMenu = null;
    activeColumnMenuButton = null;
  }

  function toggleColumnMenu(button) {
    if (activeColumnMenu && activeColumnMenuButton === button) {
      closeColumnMenu();
      return;
    }

    closeColumnMenu();
    const menu = buildColumnMenu();
    activeColumnMenu = menu;
    activeColumnMenuButton = button;
    button.setAttribute("aria-expanded", "true");

    const container = button.parentElement;
    if (container) {
      container.appendChild(menu);
    }
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

  function isListMode() {
    return uiState.viewMode === "list";
  }

  function updateViewModeToggle() {
    if (!viewModeToggleButton) {
      return;
    }
    const switchToList = !isListMode();
    viewModeToggleButton.textContent = switchToList ? "List" : "Board";
    viewModeToggleButton.dataset.currentMode = uiState.viewMode;
    viewModeToggleButton.setAttribute("aria-pressed", String(isListMode()));
    viewModeToggleButton.setAttribute(
      "aria-label",
      switchToList
        ? `Current mode: ${uiState.viewMode}. Switch to list mode`
        : `Current mode: ${uiState.viewMode}. Switch to board mode`
    );
    viewModeToggleButton.title = switchToList
      ? `Current mode: ${uiState.viewMode}. Switch to list mode`
      : `Current mode: ${uiState.viewMode}. Switch to board mode`;
  }

  function setState(nextItems, nextSelectedId) {
    items = Array.isArray(nextItems) ? nextItems : [];
    if (typeof nextSelectedId === "string") {
      selectedId = nextSelectedId;
    } else if (!items.find((item) => item.id === selectedId)) {
      selectedId = null;
    }
    debugLog("state:update", {
      itemCount: items.length,
      selectedId,
      layoutMode: uiState.layoutMode,
      viewMode: uiState.viewMode,
      detailsCollapsed: uiState.detailsCollapsed
    });
    render();
  }

  function render() {
    updateLayoutMode();
    if (isSplitInteractionDisabled() && isDraggingSplit) {
      isDraggingSplit = false;
      if (splitter) {
        splitter.classList.remove("splitter--dragging");
      }
      document.body.classList.remove("is-resizing");
    }
    const selectedItem = items.find((item) => item.id === selectedId);
    if (selectedItem && !isVisible(selectedItem)) {
      selectedId = null;
    }
    if (details) {
      details.classList.toggle("details--collapsed", uiState.detailsCollapsed);
    }
    if (detailsToggle) {
      detailsToggle.setAttribute("aria-expanded", String(!uiState.detailsCollapsed));
      detailsToggle.setAttribute(
        "aria-label",
        uiState.detailsCollapsed ? "Expand details" : "Collapse details"
      );
      detailsToggle.title = uiState.detailsCollapsed ? "Expand details" : "Collapse details";
    }
    updateSplitterA11y();
    if (board) {
      board.classList.toggle("board--list", isListMode());
    }
    updateViewModeToggle();
    renderBoard();
    renderDetails();
    updateButtons();
    updateFilterState();
    if (hideCompleteToggle) {
      hideCompleteToggle.checked = hideCompleted;
    }
    if (hideProcessedRequestsToggle) {
      hideProcessedRequestsToggle.checked = hideProcessedRequests;
    }
    if (hideSpecToggle) {
      hideSpecToggle.checked = hideSpec;
    }
    if (showCompanionDocsToggle) {
      showCompanionDocsToggle.checked = showCompanionDocs;
    }
  }

  function renderBoard() {
    if (boardRenderer && typeof boardRenderer.renderBoard === "function") {
      boardRenderer.renderBoard();
    }
  }

  function renderDetails() {
    if (detailsRenderer && typeof detailsRenderer.renderDetails === "function") {
      detailsRenderer.renderDetails();
    }
  }

  function updateButtons() {
    const item = items.find((entry) => entry.id === selectedId);
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
      resetProjectRootButton.disabled = !canResetProjectRoot;
      resetProjectRootButton.title = canResetProjectRoot
        ? "Use workspace root"
        : "Already using workspace root";
    }
    if (bootstrapLogicsButton) {
      bootstrapLogicsButton.disabled = !canBootstrapLogics;
      bootstrapLogicsButton.title = canBootstrapLogics
        ? "Bootstrap Logics in this project"
        : "Bootstrap already completed";
    }
  }

  function updateFilterState() {
    if (!filterToggle) {
      return;
    }
    filterToggle.classList.toggle(
      "toolbar__filter--active",
      hideCompleted || hideProcessedRequests || hideSpec || showCompanionDocs
    );
  }

  function setFilterPanelOpen(isOpen) {
    filterPanelOpen = isOpen;
    if (filterPanel) {
      filterPanel.classList.toggle("filter-panel--open", isOpen);
      filterPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    if (filterToggle) {
      filterToggle.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function setToolsPanelOpen(isOpen) {
    toolsPanelOpen = isOpen;
    if (toolsPanel) {
      toolsPanel.classList.toggle("tools-panel--open", isOpen);
      toolsPanel.setAttribute("aria-hidden", String(!isOpen));
    }
    if (toolsToggle) {
      toolsToggle.setAttribute("aria-expanded", String(isOpen));
    }
  }

  function groupByStage(allItems) {
    return allItems.reduce((acc, item) => {
      acc[item.stage] = acc[item.stage] || [];
      acc[item.stage].push(item);
      return acc;
    }, {});
  }

  function isVisible(item) {
    if (hideCompleted && isComplete(item)) {
      return false;
    }
    if (hideProcessedRequests && item.stage === "request" && isRequestProcessed(item)) {
      return false;
    }
    if (hideSpec && item.stage === "spec") {
      return false;
    }
    if (!showCompanionDocs && isCompanionStage(item.stage)) {
      return false;
    }
    return true;
  }

  function isPrimaryFlowStage(stage) {
    return typeof modelApi.isPrimaryFlowStage === "function" ? modelApi.isPrimaryFlowStage(stage) : false;
  }

  function isCompanionStage(stage) {
    return typeof modelApi.isCompanionStage === "function" ? modelApi.isCompanionStage(stage) : false;
  }

  function collectCompanionDocs(item) {
    return typeof modelApi.collectCompanionDocs === "function" ? modelApi.collectCompanionDocs(item, items) : [];
  }

  function collectSpecs(item) {
    return typeof modelApi.collectSpecs === "function" ? modelApi.collectSpecs(item, items) : [];
  }

  function collectPrimaryFlowItems(item) {
    return typeof modelApi.collectPrimaryFlowItems === "function" ? modelApi.collectPrimaryFlowItems(item, items) : [];
  }

  function findManagedItemByReference(rawValue, fallbackUsage) {
    return typeof modelApi.findManagedItemByReference === "function"
      ? modelApi.findManagedItemByReference(rawValue, items, fallbackUsage)
      : null;
  }

  function normalizeManagedDocValue(value) {
    return typeof modelApi.normalizeManagedDocValue === "function" ? modelApi.normalizeManagedDocValue(value) : String(value || "");
  }

  function getVisibleStages() {
    const visibleStages = [...primaryStageOrder];
    if (showCompanionDocs) {
      visibleStages.push(...companionStageOrder);
    }
    if (!hideSpec) {
      visibleStages.push("spec");
    }
    return visibleStages;
  }

  function isComplete(item) {
    const value = getProgressValue(item);
    return value !== null && value >= 100;
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
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
    return items.filter(
      (candidate) =>
        linkedPaths.has(String(candidate.relPath || "").replace(/\\/g, "/")) &&
        (candidate.stage === "backlog" || candidate.stage === "task")
    );
  }

  function isRequestProcessed(item) {
    return typeof modelApi.isRequestProcessed === "function" ? modelApi.isRequestProcessed(item, items) : false;
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

  function setControlDescription(element, label) {
    if (!element || !label) {
      return;
    }
    if (!element.getAttribute("aria-label")) {
      element.setAttribute("aria-label", label);
    }
    element.title = label;
  }

  const markdownApi = typeof markdownApiFactory === "function" ? markdownApiFactory() : null;

  function escapeHtml(value) {
    if (markdownApi && typeof markdownApi.escapeHtml === "function") {
      return markdownApi.escapeHtml(value);
    }
    return String(value ?? "");
  }

  function ensureStatusBanner() {
    if (statusBanner && statusBanner.isConnected) {
      return statusBanner;
    }
    const anchor = layout && layout.parentElement ? layout.parentElement : document.body;
    if (!anchor) {
      return null;
    }
    statusBanner = document.createElement("div");
    statusBanner.className = "status-banner";
    statusBanner.hidden = true;
    statusBanner.setAttribute("role", "status");
    statusBanner.setAttribute("aria-live", "polite");
    anchor.insertBefore(statusBanner, layout || anchor.firstChild);
    return statusBanner;
  }

  function showStatus(message, tone = "info") {
    if (!message) {
      return;
    }
    const banner = ensureStatusBanner();
    if (banner) {
      banner.hidden = false;
      banner.textContent = message;
      banner.dataset.tone = tone;
      if (noticeTimeoutId) {
        window.clearTimeout(noticeTimeoutId);
      }
      noticeTimeoutId = window.setTimeout(() => {
        if (!statusBanner) {
          return;
        }
        statusBanner.hidden = true;
      }, 4500);
    }
    if (harnessBridge && typeof harnessBridge.notify === "function") {
      harnessBridge.notify(message, tone);
    }
  }

  const hostApi = hostApiFactory({
    vscode,
    debugLog,
    showStatus,
    isHarnessMode,
    handleHarnessChangeProjectRoot,
    applyHarnessRoot,
    openHarnessItem(item, mode) {
      if (mode === "read") {
        void openHarnessReadTab(item);
      } else {
        void openHarnessEditTab(item);
      }
    },
    harnessBridge,
    setCanResetProjectRoot(value) {
      canResetProjectRoot = value;
    },
    projectGithubUrl
  });

  const boardRenderer = typeof boardRendererFactory === "function"
    ? boardRendererFactory({
        board,
        hostApi,
        getItems: () => items,
        getSelectedId: () => selectedId,
        setSelectedId(value) {
          selectedId = value;
        },
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
        getCollapsedStages: () => collapsedStages,
        getHideCompleted: () => hideCompleted,
        getHideProcessedRequests: () => hideProcessedRequests,
        getHideSpec: () => hideSpec,
        getShowCompanionDocs: () => showCompanionDocs
      })
    : null;

  const detailsRenderer = typeof detailsRendererFactory === "function"
    ? detailsRendererFactory({
        detailsBody,
        detailsTitle,
        detailsEyebrow,
        hostApi,
        getItems: () => items,
        getSelectedId: () => selectedId,
        getCollapsedDetailSections: () => collapsedDetailSections,
        persistState,
        getStageLabel,
        isPrimaryFlowStage,
        collectCompanionDocs,
        collectSpecs,
        collectPrimaryFlowItems,
        findManagedItemByReference,
        formatDate
      })
    : null;

  function encodePathForUrl(relativePath) {
    return relativePath
      .split("/")
      .filter((part) => part.length > 0)
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  function getItemRelativePath(item) {
    if (!item) {
      return "";
    }
    if (typeof item.relPath === "string" && item.relPath.trim()) {
      return item.relPath.trim().replace(/\\/g, "/").replace(/^\.?\//, "");
    }
    if (typeof item.path === "string" && item.path.trim()) {
      const normalizedPath = item.path.replace(/\\/g, "/");
      if (currentRoot && normalizedPath.startsWith(currentRoot)) {
        const relative = normalizedPath.slice(currentRoot.length).replace(/^\/+/, "");
        if (relative) {
          return relative;
        }
      }
      if (!normalizedPath.startsWith("/") && !normalizedPath.includes(":")) {
        return normalizedPath.replace(/^\.?\//, "");
      }
    }
    return "";
  }

  function buildHarnessDocUrl(item) {
    const relativePath = getItemRelativePath(item);
    if (!relativePath) {
      return "";
    }
    return `/${encodePathForUrl(relativePath)}`;
  }

  async function readHarnessFileFromHandle(relativePath) {
    if (!harnessRootHandle || typeof harnessRootHandle.getDirectoryHandle !== "function") {
      return null;
    }
    const segments = relativePath
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== ".");
    if (!segments.length || segments.includes("..")) {
      return null;
    }
    const filename = segments[segments.length - 1];
    if (!filename) {
      return null;
    }

    let directoryHandle = harnessRootHandle;
    for (const segment of segments.slice(0, -1)) {
      directoryHandle = await directoryHandle.getDirectoryHandle(segment, { create: false });
    }
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: false });
    const file = await fileHandle.getFile();
    return file.text();
  }

  function openHarnessContentTab(item, mode, sourceLabel, content) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
      return false;
    }
    const editMode = mode === "edit";
    const body = editMode
      ? `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${escapeHtml(
          item && item.title ? item.title : "Logics item"
        )}</title><style>body{font-family:system-ui,sans-serif;margin:20px;line-height:1.45;}code{background:#f4f4f4;padding:2px 4px;border-radius:4px;}</style></head><body><h1>${escapeHtml(
          item && item.title ? item.title : "Logics item"
        )}</h1><p>Source: <code>${escapeHtml(sourceLabel || "unknown")}</code></p><textarea style="width:100%;height:70vh;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(
          content || ""
        )}</textarea><p style="font-size:12px;opacity:0.8;">Harness edit mode is preview-only (saving is disabled).</p></body></html>`
      : markdownApi.buildReadPreviewDocument(item, sourceLabel, content);
    popup.document.open();
    popup.document.write(body);
    popup.document.close();
    return true;
  }

  async function resolveHarnessItemContent(item) {
    const relativePath = getItemRelativePath(item);
    if (!relativePath) {
      return { relativePath: "", content: "", source: "", error: "missing-path" };
    }

    if (harnessRootHandle) {
      try {
        const content = await readHarnessFileFromHandle(relativePath);
        if (typeof content === "string") {
          return { relativePath, content, source: `filesystem:${currentRoot || "selected-root"}`, error: "" };
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        showStatus(`Could not read from selected root (${reason}). Falling back to server path.`, "warn");
      }
    }

    const target = `/${encodePathForUrl(relativePath)}`;
    try {
      const response = await fetch(target);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const content = await response.text();
      return { relativePath, content, source: target, error: "" };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { relativePath, content: "", source: target, error: reason };
    }
  }

  function openHarnessInfoTab(item, heading, message) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
      return;
    }
    const safeTitle = escapeHtml(item && item.title ? item.title : "Logics item");
    const safeHeading = escapeHtml(heading);
    const safeMessage = escapeHtml(message);
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.5;}code{background:#f4f4f4;padding:2px 4px;border-radius:4px;}</style></head><body><h1>${safeHeading}</h1><p>${safeMessage}</p></body></html>`);
    popup.document.close();
  }

  async function openHarnessEditTab(item) {
    const target = buildHarnessDocUrl(item);
    if (!target) {
      openHarnessInfoTab(item, "Edit view unavailable", "No file path is available for this mocked item in harness mode.");
      showStatus("No file path available for this item in harness mode.", "warn");
      return;
    }

    const resolved = await resolveHarnessItemContent(item);
    if (!resolved.error) {
      const opened = openHarnessContentTab(item, "edit", resolved.source, resolved.content);
      if (opened) {
        showStatus(`Opened edit tab for ${resolved.relativePath} (${resolved.source}).`, "info");
      }
      return;
    }

    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (!opened) {
      showStatus("Popup blocked by the browser. Enable popups to open files from harness mode.", "warn");
      return;
    }
    showStatus(`Opened ${target} in a new tab.`, "info");
  }

  async function openHarnessReadTab(item) {
    const target = buildHarnessDocUrl(item);
    if (!target) {
      openHarnessInfoTab(item, "Read view unavailable", "No file path is available for this mocked item in harness mode.");
      showStatus("No file path available for this item in harness mode.", "warn");
      return;
    }

    const resolved = await resolveHarnessItemContent(item);
    if (!resolved.error) {
      const opened = openHarnessContentTab(item, "read", resolved.source, resolved.content);
      if (opened) {
        showStatus(`Opened read preview for ${resolved.relativePath} (${resolved.source}).`, "info");
      }
      return;
    }

    const opened = window.open(target, "_blank", "noopener,noreferrer");
    if (!opened) {
      showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
      return;
    }
    const reason = resolved.error || "preview unavailable";
    showStatus(`Preview unavailable (${reason}). Opened raw file instead.`, "warn");
  }

  function openSelectedItem(mode) {
    if (!selectedId) {
      return;
    }
    const item = items.find((entry) => entry.id === selectedId);
    if (!item) {
      return;
    }
    hostApi.openItem(item, mode);
  }

  function pickDirectoryFromInput() {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      let settled = false;
      const finalize = (value) => {
        if (settled) {
          return;
        }
        settled = true;
        window.removeEventListener("focus", onWindowFocus, true);
        input.remove();
        resolve(value);
      };
      const onWindowFocus = () => {
        window.setTimeout(() => {
          if (settled) {
            return;
          }
          const files = input.files;
          if (!files || files.length === 0) {
            finalize(null);
          }
        }, 0);
      };

      input.type = "file";
      input.multiple = true;
      input.webkitdirectory = true;
      input.style.display = "none";
      input.addEventListener("change", () => {
        const files = input.files;
        if (!files || files.length === 0) {
          finalize(null);
          return;
        }
        const first = files[0];
        const relative = typeof first.webkitRelativePath === "string" ? first.webkitRelativePath : "";
        const rootName = relative.split("/")[0] || first.name;
        finalize(rootName || null);
      });
      document.body.appendChild(input);
      window.addEventListener("focus", onWindowFocus, true);
      input.click();
    });
  }

  function applyHarnessRoot(rootLabel, nextHandle = null) {
    currentRoot = rootLabel || null;
    harnessRootHandle = nextHandle || null;
    canResetProjectRoot = Boolean(rootLabel);
    if (harnessBridge && typeof harnessBridge.setProjectRootLabel === "function") {
      harnessBridge.setProjectRootLabel(rootLabel || null);
    }
  }

  async function handleHarnessChangeProjectRoot() {
    try {
      if (typeof window.showDirectoryPicker === "function") {
        const directoryHandle = await window.showDirectoryPicker({ mode: "read" });
        const label = directoryHandle && directoryHandle.name ? directoryHandle.name : "selected-folder";
        applyHarnessRoot(label, directoryHandle);
        showStatus(`Harness project root set to "${label}".`, "info");
        return;
      }
    } catch (error) {
      if (!(error && error.name === "AbortError")) {
        const reason = error instanceof Error ? error.message : String(error);
        showStatus(`Directory picker unavailable (${reason}). Trying fallback.`, "warn");
      } else {
        showStatus("Project root selection canceled.", "warn");
        return;
      }
    }

    const fallbackRoot = await pickDirectoryFromInput();
    if (fallbackRoot) {
      applyHarnessRoot(fallbackRoot, null);
      showStatus(`Harness project root set to "${fallbackRoot}" (directory selection fallback).`, "info");
      return;
    }

    const manual = window.prompt(
      "Directory picker unavailable. Enter a root hint/path for harness mode:",
      currentRoot || ""
    );
    if (manual && manual.trim()) {
      applyHarnessRoot(manual.trim(), null);
      showStatus(`Harness project root set to "${manual.trim()}".`, "info");
      return;
    }
    showStatus("Project root selection canceled.", "warn");
  }

  async function handleChangeProjectRoot() {
    await hostApi.changeProjectRoot();
  }

  function handleResetProjectRoot() {
    hostApi.resetProjectRoot();
  }

  function handleBootstrapLogics() {
    hostApi.bootstrapLogics();
  }

  function handleAbout() {
    hostApi.about();
  }

  function updateSplitterA11y() {
    if (!splitter) {
      return;
    }
    const splitDisabled = isSplitInteractionDisabled();
    splitter.setAttribute("aria-disabled", String(splitDisabled));
    splitter.tabIndex = splitDisabled ? -1 : 0;
    if (isStackedLayout() && !splitDisabled) {
      splitter.setAttribute("aria-valuemin", "0");
      splitter.setAttribute("aria-valuemax", "100");
      splitter.setAttribute("aria-valuenow", String(Math.round(uiState.splitRatio * 100)));
    } else {
      splitter.removeAttribute("aria-valuemin");
      splitter.removeAttribute("aria-valuemax");
      splitter.removeAttribute("aria-valuenow");
    }
  }

  function nudgeSplitFromKeyboard(delta) {
    if (!isStackedLayout() || isSplitInteractionDisabled()) {
      return;
    }
    applySplitRatio(uiState.splitRatio + delta, true);
    render();
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", () => hostApi.refresh());
  }
  if (viewModeToggleButton) {
    viewModeToggleButton.addEventListener("click", () => {
      uiState.viewMode = isListMode() ? "board" : "list";
      debugLog("view-mode:toggle", { nextMode: uiState.viewMode });
      persistState();
      render();
    });
  }
  if (bootstrapLogicsButton) {
    bootstrapLogicsButton.addEventListener("click", () => {
      handleBootstrapLogics();
      setToolsPanelOpen(false);
    });
  }
  if (newRequestToolButton) {
    newRequestToolButton.addEventListener("click", () => {
      hostApi.newGuidedRequest();
      setToolsPanelOpen(false);
    });
  }
  if (createCompanionDocToolButton) {
    createCompanionDocToolButton.addEventListener("click", () => {
      hostApi.createCompanionDoc(selectedId || undefined);
      setToolsPanelOpen(false);
    });
  }
  if (selectAgentButton) {
    selectAgentButton.addEventListener("click", () => {
      hostApi.selectAgent();
      setToolsPanelOpen(false);
    });
  }
  if (changeProjectRootButton) {
    changeProjectRootButton.addEventListener("click", async () => {
      await handleChangeProjectRoot();
      setToolsPanelOpen(false);
    });
  }
  if (resetProjectRootButton) {
    resetProjectRootButton.addEventListener("click", () => {
      handleResetProjectRoot();
      setToolsPanelOpen(false);
    });
  }
  if (fixDocsButton) {
    fixDocsButton.addEventListener("click", () => {
      hostApi.fixDocs();
      setToolsPanelOpen(false);
    });
  }
  if (aboutButton) {
    aboutButton.addEventListener("click", () => {
      handleAbout();
      setToolsPanelOpen(false);
    });
  }
  if (filterToggle) {
    filterToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (toolsPanelOpen) {
        setToolsPanelOpen(false);
      }
      setFilterPanelOpen(!filterPanelOpen);
    });
  }
  if (toolsToggle) {
    toolsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      if (filterPanelOpen) {
        setFilterPanelOpen(false);
      }
      setToolsPanelOpen(!toolsPanelOpen);
    });
  }
  function persistState() {
    vscode.setState({
      hideCompleted,
      hideProcessedRequests,
      hideSpec,
      showCompanionDocs,
      collapsedStages: Array.from(collapsedStages),
      detailsCollapsed: uiState.detailsCollapsed,
      collapsedDetailSections: Array.from(collapsedDetailSections),
      viewMode: uiState.viewMode,
      splitRatio: uiState.splitRatio
    });
  }

  function detectLayoutMode() {
    return Boolean(stackedQuery && stackedQuery.matches) ? "stacked" : "horizontal";
  }

  function isStackedLayout() {
    return uiState.layoutMode === "stacked";
  }

  function isSplitInteractionDisabled() {
    return isStackedLayout() && uiState.detailsCollapsed;
  }

  function clearSplitSizing() {
    if (!board || !details) {
      return;
    }
    board.style.flex = "";
    board.style.height = "";
    details.style.flex = "";
    details.style.height = "";
  }

  function applySplitRatio(nextRatio, shouldPersist = false) {
    if (!layout || !board || !details || !isStackedLayout()) {
      return;
    }
    if (isSplitInteractionDisabled()) {
      board.style.flex = "1 1 auto";
      board.style.height = "";
      details.style.flex = "0 0 auto";
      details.style.height = "auto";
      updateSplitterA11y();
      if (shouldPersist) {
        persistState();
      }
      return;
    }
    const splitterHeight = splitter ? splitter.getBoundingClientRect().height : 0;
    const available = layout.clientHeight - splitterHeight;
    if (!Number.isFinite(available) || available <= 0) {
      return;
    }
    const minBoard = Math.min(minBoardHeight, available);
    const minDetails = Math.min(minDetailsHeight, Math.max(0, available - minBoard));
    const minRatio = minBoard / available;
    const maxRatio = (available - minDetails) / available;
    const clampedRatio = Math.min(Math.max(nextRatio, minRatio), maxRatio);
    const boardHeight = Math.round(available * clampedRatio);
    board.style.flex = `0 0 ${boardHeight}px`;
    board.style.height = `${boardHeight}px`;
    details.style.flex = "1 1 auto";
    details.style.height = "";
    uiState.splitRatio = clampedRatio;
    debugLog("split-ratio:update", { splitRatio: uiState.splitRatio });
    updateSplitterA11y();
    if (shouldPersist) {
      persistState();
    }
  }

  function updateLayoutMode() {
    if (!layout) {
      return;
    }
    const previousLayoutMode = uiState.layoutMode;
    uiState.layoutMode = detectLayoutMode();
    const stacked = isStackedLayout();
    layout.classList.toggle("layout--stacked", stacked);
    layout.classList.toggle("layout--horizontal", !stacked);
    layout.classList.toggle("layout--split-disabled", stacked && uiState.detailsCollapsed);
    if (previousLayoutMode !== uiState.layoutMode) {
      debugLog("layout-mode:change", { from: previousLayoutMode, to: uiState.layoutMode });
    }
    if (!stacked && isDraggingSplit) {
      isDraggingSplit = false;
      if (splitter) {
        splitter.classList.remove("splitter--dragging");
      }
      document.body.classList.remove("is-resizing");
      debugLog("splitter:drag-reset", { reason: "layout-not-stacked" });
    }
    if (stacked) {
      if (splitter) {
        splitter.style.display = "";
      }
      applySplitRatio(uiState.splitRatio, false);
    } else {
      if (splitter) {
        splitter.style.display = "none";
      }
      clearSplitSizing();
    }
  }

  function startSplitDrag(event) {
    if (!splitter || !layout || !isStackedLayout() || isSplitInteractionDisabled()) {
      return;
    }
    event.preventDefault();
    isDraggingSplit = true;
    splitter.classList.add("splitter--dragging");
    document.body.classList.add("is-resizing");
    if (typeof splitter.setPointerCapture === "function" && typeof event.pointerId === "number") {
      splitter.setPointerCapture(event.pointerId);
    }
  }

  function updateSplitDrag(event) {
    if (!isDraggingSplit || !layout || !isStackedLayout() || isSplitInteractionDisabled()) {
      return;
    }
    const rect = layout.getBoundingClientRect();
    const splitterHeight = splitter ? splitter.getBoundingClientRect().height : 0;
    const available = rect.height - splitterHeight;
    if (available <= 0) {
      return;
    }
    const offsetY = event.clientY - rect.top - splitterHeight / 2;
    const minBoard = Math.min(minBoardHeight, available);
    const minDetails = Math.min(minDetailsHeight, Math.max(0, available - minBoard));
    const boardHeight = Math.min(Math.max(offsetY, minBoard), available - minDetails);
    const ratio = boardHeight / available;
    applySplitRatio(ratio, false);
  }

  function endSplitDrag(event) {
    if (!isDraggingSplit) {
      return;
    }
    isDraggingSplit = false;
    if (splitter) {
      splitter.classList.remove("splitter--dragging");
      if (typeof splitter.releasePointerCapture === "function" && typeof event.pointerId === "number") {
        splitter.releasePointerCapture(event.pointerId);
      }
    }
    document.body.classList.remove("is-resizing");
    persistState();
  }

  if (hideCompleteToggle) {
    hideCompleteToggle.addEventListener("change", (event) => {
      hideCompleted = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (hideProcessedRequestsToggle) {
    hideProcessedRequestsToggle.addEventListener("change", (event) => {
      hideProcessedRequests = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (hideSpecToggle) {
    hideSpecToggle.addEventListener("change", (event) => {
      hideSpec = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (showCompanionDocsToggle) {
    showCompanionDocsToggle.addEventListener("change", (event) => {
      showCompanionDocs = Boolean(event.target && event.target.checked);
      persistState();
      updateFilterState();
      render();
    });
  }
  if (detailsToggle) {
    detailsToggle.addEventListener("click", () => {
      uiState.detailsCollapsed = !uiState.detailsCollapsed;
      debugLog("details:toggle", { collapsed: uiState.detailsCollapsed });
      persistState();
      render();
    });
  }
  openButton.addEventListener("click", () => {
    openSelectedItem("open");
  });
  if (readButton) {
    readButton.addEventListener("click", () => {
      openSelectedItem("read");
    });
  }
  promoteButton.addEventListener("click", () => {
    if (!selectedId) return;
    hostApi.promote(selectedId);
  });
  if (markDoneButton) {
    markDoneButton.addEventListener("click", () => {
      if (!selectedId) return;
      hostApi.markDone(selectedId);
    });
  }
  if (markObsoleteButton) {
    markObsoleteButton.addEventListener("click", () => {
      if (!selectedId) return;
      hostApi.markObsolete(selectedId);
    });
  }

  window.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    if (type === "data") {
      debugLog("host:data", {
        hasError: Boolean(payload && payload.error),
        itemCount: Array.isArray(payload && payload.items) ? payload.items.length : 0,
        selectedId: payload ? payload.selectedId : undefined
      });
      if (payload && typeof payload.root === "string") {
        currentRoot = payload.root;
      }
      if (payload && typeof payload.canResetProjectRoot === "boolean") {
        canResetProjectRoot = payload.canResetProjectRoot;
      }
      if (payload && typeof payload.canBootstrapLogics === "boolean") {
        canBootstrapLogics = payload.canBootstrapLogics;
      }
      if (payload && payload.error) {
        debugLog("host:data:error", { error: payload.error });
        board.innerHTML = `<div class="state-message">${payload.error}</div>`;
        detailsBody.innerHTML = "";
        if (detailsTitle) {
          detailsTitle.textContent = "Details";
        }
        selectedId = null;
        updateButtons();
        updateViewModeToggle();
        return;
      }
      const nextItems = payload && payload.items ? payload.items : [];
      const nextSelected = payload ? payload.selectedId : undefined;
      setState(nextItems, nextSelected);
    }
  });

  const previousState = vscode.getState();
  if (previousState && typeof previousState.hideCompleted === "boolean") {
    hideCompleted = previousState.hideCompleted;
  }
  if (previousState && typeof previousState.hideProcessedRequests === "boolean") {
    hideProcessedRequests = previousState.hideProcessedRequests;
  } else if (previousState && typeof previousState.hideUsedRequests === "boolean") {
    hideProcessedRequests = previousState.hideUsedRequests;
  }
  if (previousState && typeof previousState.hideSpec === "boolean") {
    hideSpec = previousState.hideSpec;
  }
  if (previousState && typeof previousState.showCompanionDocs === "boolean") {
    showCompanionDocs = previousState.showCompanionDocs;
  }
  if (previousState && Array.isArray(previousState.collapsedStages)) {
    collapsedStages = new Set(previousState.collapsedStages);
  }
  if (previousState && typeof previousState.detailsCollapsed === "boolean") {
    uiState.detailsCollapsed = previousState.detailsCollapsed;
  }
  if (previousState && Array.isArray(previousState.collapsedDetailSections)) {
    collapsedDetailSections = new Set(previousState.collapsedDetailSections);
  }
  if (previousState && (previousState.viewMode === "board" || previousState.viewMode === "list")) {
    uiState.viewMode = previousState.viewMode;
  }
  if (previousState && typeof previousState.splitRatio === "number") {
    uiState.splitRatio = previousState.splitRatio;
  }

  document.addEventListener("click", (event) => {
    if (filterPanelOpen && filterPanel && filterToggle) {
      const target = event.target;
      if (!filterPanel.contains(target) && !filterToggle.contains(target)) {
        setFilterPanelOpen(false);
      }
    }
    if (toolsPanelOpen && toolsPanel && toolsToggle) {
      const target = event.target;
      if (!toolsPanel.contains(target) && !toolsToggle.contains(target)) {
        setToolsPanelOpen(false);
      }
    }
    if (!activeColumnMenu) {
      return;
    }
    const target = event.target;
    if (activeColumnMenu.contains(target)) {
      return;
    }
    if (activeColumnMenuButton && activeColumnMenuButton.contains(target)) {
      return;
    }
    closeColumnMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && filterPanelOpen) {
      setFilterPanelOpen(false);
    }
    if (event.key === "Escape" && toolsPanelOpen) {
      setToolsPanelOpen(false);
    }
    if (event.key === "Escape" && activeColumnMenu) {
      closeColumnMenu();
    }
  });

  if (splitter) {
    splitter.addEventListener("pointerdown", (event) => startSplitDrag(event));
    splitter.addEventListener("pointermove", (event) => updateSplitDrag(event));
    splitter.addEventListener("pointerup", (event) => endSplitDrag(event));
    splitter.addEventListener("pointercancel", (event) => endSplitDrag(event));
    splitter.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSplitFromKeyboard(0.03);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSplitFromKeyboard(-0.03);
      } else if (event.key === "Home") {
        event.preventDefault();
        applySplitRatio(0.9, true);
        render();
      } else if (event.key === "End") {
        event.preventDefault();
        applySplitRatio(0.1, true);
        render();
      }
    });
  }

  const handleLayoutMediaChange = () => {
    updateLayoutMode();
    updateSplitterA11y();
  };
  if (stackedQuery && typeof stackedQuery.addEventListener === "function") {
    stackedQuery.addEventListener("change", handleLayoutMediaChange);
  } else if (stackedQuery && typeof stackedQuery.addListener === "function") {
    stackedQuery.addListener(handleLayoutMediaChange);
  }
  window.addEventListener("resize", () => {
    if (isStackedLayout()) {
      applySplitRatio(uiState.splitRatio, false);
    }
  });

  setControlDescription(filterToggle, "Filter options");
  setControlDescription(toolsToggle, "Tools");
  setControlDescription(viewModeToggleButton, "Switch display mode");
  setControlDescription(refreshButton, "Refresh");
  setControlDescription(selectAgentButton, "Select active agent");
  setControlDescription(newRequestToolButton, "Start a guided new request in Codex");
  setControlDescription(bootstrapLogicsButton, "Bootstrap Logics");
  setControlDescription(changeProjectRootButton, "Change project root");
  setControlDescription(resetProjectRootButton, "Use workspace root");
  setControlDescription(fixDocsButton, "Fix Logics");
  setControlDescription(aboutButton, "About this extension");
  setControlDescription(detailsToggle, uiState.detailsCollapsed ? "Expand details" : "Collapse details");
  setControlDescription(markDoneButton, "Mark selected item as done");
  setControlDescription(markObsoleteButton, "Mark selected item as obsolete");
  setControlDescription(openButton, "Edit selected item");
  setControlDescription(readButton, "Read selected item");
  setControlDescription(promoteButton, "Promote selected item");
  if (toolsPanel) {
    toolsPanel.setAttribute("role", "menu");
  }
  if (filterPanel) {
    filterPanel.setAttribute("role", "group");
    filterPanel.setAttribute("aria-label", "Filter options");
  }
  if (filterToggle && filterPanel && filterPanel.id) {
    filterToggle.setAttribute("aria-controls", filterPanel.id);
  }
  if (toolsToggle && toolsPanel && toolsPanel.id) {
    toolsToggle.setAttribute("aria-controls", toolsPanel.id);
  }

  updateLayoutMode();
  debugLog("webview:init", { mode: isHarnessMode ? "harness" : "vscode" });
  hostApi.ready();
})();
