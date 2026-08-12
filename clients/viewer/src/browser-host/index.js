import {
  activeCdxInteractionMenu,
  activityPanelIsOpen,
  activityRootKey,
  applyCdxBadge,
  applyGitDomain,
  asArray,
  cdxBadgeLabel,
  cdxField,
  cdxHistoryList,
  cdxLabel,
  cdxMissionActionControls,
  cdxMissionCatalog,
  cdxMissionTerminalProgressScript,
  cdxPct,
  cdxPermissionValues,
  cdxRemainingPct,
  cdxRunStatusDetail,
  cdxRunsList,
  cdxSectionBadgeTitle,
  cdxStateClass,
  closeCdxMenus,
  closeThemedModal,
  collectHealthFindings,
  copyTextToClipboard,
  countBy,
  createThemedModal,
  cssEscape,
  currentGitViewState,
  describeDocumentScreen,
  fetchProjectPickerTree,
  fetchWorkspacePreview,
  fetchWorkspaceTree,
  findGitFileButton,
  formatCdxCredits,
  formatCdxDuration,
  formatConnectionTime,
  formatGitHistoryCount,
  gitCommitModalEntries,
  hasLinks,
  hasMissingOrAmbiguousStatus,
  isAbortError,
  isSafeLogicsDocPath,
  markdownApi,
  navMenuItem,
  normalizeCapabilities,
  normalizeFocusTarget,
  normalizeGitBadgeCounts,
  objectEntries,
  primaryActionControls,
  projectPreferenceId,
  projectStateLabel,
  releaseWorkshopTerminalObserver,
  renderCdxModeSwitcher,
  renderCiModeSwitcher,
  dismissEnvironmentWarning,
  dismissUpdateWarning,
  updateWarningIsDismissed,
  renderEnvironmentWarning,
  restoreDocumentViewState,
  setActiveGitFile,
  setButtonAvailable,
  setButtonUnavailable,
  setControlValue,
  setDocumentChromeOpen,
  setNavMenuOpen,
  showMermaidFallback,
  statusValue,
  updateDocumentHeaderNav,
  updatedWithin,
  workshopTerminalListNode,
  workshopTerminalPreferredFontSize,
  workshopTerminalStageNode,
  workspaceParentPath
} from "./util.js";
import { createViewerDiagnostics } from "./diagnostics.js";
import { createCdxScreen } from "./cdx.js";
import { createViewerState, readerFor } from "./state.js";
import { createWorkshopScreen } from "./workshop.js";
import { createGitScreen } from "./git.js";
import { createGraphScreen, renderChainGraph } from "./graph.js";
import { focusFilterLabel, matchesFilterState, updateFilterOptionCounts } from "./filters.js";
import {
  activityStateForRoot,
  captureDocumentViewState,
  captureLanTokenFromUrl,
  cdxHistorySessionName,
  cdxKnownProviders,
  cdxProviders,
  cdxRunSessionName,
  cdxSessions,
  clearNavMenuBadges,
  closeNavMenus,
  detectHljsLanguage,
  ensureWorkshopTerminalHostFor,
  escapeHtml,
  focusRequest,
  getActiveToken,
  getDeviceToken,
  gitStatusSignature,
  isClosed,
  isRecent,
  isStale,
  knownCdxHistorySessions,
  knownCdxRunSessions,
  needsPromotion,
  normalizeAutoRefreshIntervalSeconds,
  nudgeWorkshopTerminalRedraw,
  pickFirstArray,
  prependUniqueActivity,
  preserveActiveCdxMenu,
  readStoredState,
  readViewerPreferences,
  refreshLanBannerPairingState,
  renderActionRows,
  renderCiButtonBadge,
  renderCiStatus,
  renderCodeViewer,
  renderDocRows,
  renderGitBadge,
  renderGitSummaryCard,
  renderGitSummarySegments,
  renderHealthSummary,
  renderInsightRows,
  renderMetricCards,
  renderPathRows,
  renderProjectPickerModalBody,
  renderReleaseRunsButtonBadge,
  renderReleaseStatus,
  renderSignalRows,
  renderViewerOnboarding,
  renderWorkshopMenuItems,
  renderWorkshopTabs,
  renderWorkspace,
  resizeWorkshopTerminal,
  returnToProjectSurface,
  runtimeStatusSignature,
  sanitizeViewerFilterState,
  setNavMenuBadges,
  showRequestDraftModal,
  showThemedChoiceModal,
  showThemedConfirmModal,
  showThemedInputModal,
  showThemedMessageModal,
  startDevicePairing,
  syncWorkshopTerminalSize,
  updateDocumentBadge,
  viewerStateSignature,
  withLanAuthorization,
  writeActivityStateForRoot,
  writeStoredState
} from "./render.js";
import { openProjectTool, setupProjectToolInteractions, updateProjectToolControls } from "./projectTools.js";
import {
  WORKSHOP_TERMINAL_MIN_COLS,
  WORKSHOP_TERMINAL_MIN_ROWS,
  cdxHistoryColumns,
  cdxRunColumns,
  cdxStatusColumns,
  defaultAutoRefreshIntervalMs,
  defaultFilterState,
  gitHistoryPageSize,
  preferenceKey,
  preferenceVersion,
  statusOptionsByStage,
  workshopTabs
} from "./constants.js";
(() => {
  let activeProjectId = new URLSearchParams(window.location.search).get("project") || "";
  function withProjectContext(input) {
    if (!activeProjectId || typeof input !== "string" || !input.startsWith("/api/")) return input;
    const url = new URL(input, window.location.origin);
    url.searchParams.set("project", activeProjectId);
    return `${url.pathname}${url.search}`;
  }
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    const opts = init ? { ...init } : {};
    if (!opts.signal && primaryActionController) {
      opts.signal = primaryActionController.signal;
    }
    return nativeFetch(input, opts);
  };
  // Prefer the persistent per-device token over the per-session share
  // token when both exist — mutations require the device token under
  // --lan-rw, and a paired device should not lose access if the share
  // URL is regenerated.
  captureLanTokenFromUrl();
  const originalFetch = window.fetch.bind(window);
  function viewerFetch(input, init) {
    return originalFetch(input, withLanAuthorization(input, init));
  }
  window.fetch = (input, init) => {
    return viewerFetch(withProjectContext(input), init);
  };
  if (typeof window.EventSource === "function") {
    const NativeEventSource = window.EventSource;
    window.EventSource = function PatchedEventSource(url, init) {
      const token = getActiveToken();
      if (!token || typeof url !== "string") {
        return new NativeEventSource(url, init);
      }
      const separator = url.includes("?") ? "&" : "?";
      const tokenized = `${url}${separator}t=${encodeURIComponent(token)}`;
      return new NativeEventSource(tokenized, init);
    };
    window.EventSource.prototype = NativeEventSource.prototype;
  }

  window.logicsViewerModals = {
    prompt: showThemedInputModal,
    choice: showThemedChoiceModal,
    message: showThemedMessageModal,
    confirm: showThemedConfirmModal,
    requestDraft: showRequestDraftModal
  };

  window.addEventListener("DOMContentLoaded", () => {
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    if (pairButton instanceof HTMLButtonElement) {
      pairButton.addEventListener("click", () => { startDevicePairing(); });
    }
    refreshLanBannerPairingState();
  });

  const meta = () => document.getElementById("viewer-meta");
  const documentPanel = () => document.getElementById("viewer-document");
  const documentTitle = () => document.getElementById("viewer-document-title");
  const documentContent = () => document.getElementById("viewer-document-content");
  const documentStatusButton = () => document.getElementById("viewer-document-status");
  const documentMinimizeButton = () => document.getElementById("viewer-document-minimize");
  const minimizedDock = () => document.getElementById("viewer-minimized-dock");
  const editDocumentButton = () => document.querySelector('[data-viewer-action="edit-document"]');
  const updateBanner = () => document.getElementById("viewer-update");
  const updateCopy = () => document.getElementById("viewer-update-copy");
  const updateCommand = () => document.getElementById("viewer-update-command");
  const connectionBanner = () => document.getElementById("viewer-connection");
  const connectionCopy = () => document.getElementById("viewer-connection-copy");
  const connectionDetail = () => document.getElementById("viewer-connection-detail");
  const filterCount = () => document.getElementById("viewer-filter-count");
  const repoPill = () => document.getElementById("viewer-repo-pill");
  const projectMenu = () => document.getElementById("viewer-project-menu");
  // req_313: the state the core shares with its screens, named once instead of a set of
  // thunks composed by hand at each lift.
  const viewerState = createViewerState({ viewerPreferences: readViewerPreferences() });

  const {
    state: gitState,
    ciActivityEvents,
    fetchGitRemote,
    gitBadgeHtml,
    gitDiffLineKind,
    isGitCiScreenOpen,
    loadGitCommitDiff,
    loadGitDiff,
    loadGitFilePreview,
    openGitCommitModal,
    recordGitActivity,
    refreshGitBadgeCounters,
    refreshReleaseBadgeCounters,
    renderGitDiffPreview,
    renderGitStatus,
    resetReleaseState,
    setActiveGitCommit,
    setGitActionsMenuOpen,
    setGitBadgeCountsFromPayload,
    showGitStatus,
    showReleaseStatus,
    syncGitCommitActivity,
    updateMainGitBadges,
    updateMainReleaseBadge,
  } = createGitScreen({
    beginView,
    capability,
    capabilityMessage,
    dispatchViewerActivityUpdate,
    documentPanel,
    documentTitle,
    isCapabilityAvailable,
    isViewStale,
    meta,
    setDocument,
    setDropdownOpen,
    setMeta,
    updateCapabilityControls,
    shared: readerFor(viewerState),
  });

  createGraphScreen({ beginView, isViewStale, setDocument, setMeta, renderMermaidDiagrams, openDoc: (ref) => showDocumentByPath(ref) });

  const repoFolderButton = () => document.getElementById("viewer-repo-folder");
  const {
    state: workshopState,
    appendWorkshopCommandLog,
    bindWorkshopSystemTerminalControls,
    clearWorkshopTerminal,
    clearWorkshopTerminalDragState,
    closeAllInactiveWorkshopTerminalStreams,
    closeWorkshopCommandStream,
    closeWorkshopTerminalStream,
    ensureWorkshopTerminalStage,
    flushWorkshopTerminalInput,
    hasMountedWorkshopTerminals,
    hydrateWorkshopTerminals,
    loadWorkshopCommands,
    loadWorkshopExplorer,
    loadWorkshopRunbooks,
    measureWorkshopTerminalGrid,
    mountWorkshopTerminalEmulator,
    moveWorkshopTerminalBefore,
    openWorkshopCommandStream,
    openWorkshopTerminalStream,
    orderedWorkshopTerminalEntries,
    persistWorkshopTerminalOrder,
    preferredWorkshopTab,
    recomputeWorkshopBadges,
    reconcileWorkshopTerminalOrder,
    redrawWorkshopTerminals,
    refitAllWorkshopTerminals,
    refreshWorkshopTerminalUsage,
    renameWorkshopTerminal,
    renderWorkshop,
    renderWorkshopCommandList,
    renderWorkshopCommandRow,
    renderWorkshopCommandRunMenu,
    renderWorkshopCommands,
    renderWorkshopPanel,
    renderWorkshopTerminalList,
    reopenWorkshopTerminalStreamSoon,
    repaintAllWorkshopTerminals,
    resumeActiveWorkshopTerminalStream,
    setActiveWorkshopTerminal,
    setCustomTerminalBusy,
    setWorkshopActiveTab,
    showCustomTerminalModal,
    showWorkshop,
    showWorkshopRunbookGraph,
    setWorkshopRunbooksIncludeHidden,
    spawnCustomWorkshopTerminal,
    spawnSystemWorkshopTerminal,
    spawnWorkshopTerminal,
    startWorkshopCommand,
    stopWorkshopCommand,
    stopWorkshopTerminal,
    storedWorkshopTerminalOrder,
    syncWorkshopSystemTerminalControls,
    updateWorkshopBadges,
    updateWorkshopCommandSession,
    workshopTerminalOrderRootKey,
    workshopTerminalStreamWanted,
    workshopUsesSystemTerminal,
    writeWorkshopTerminalInput,
  } = createWorkshopScreen({
    beginView,
    capability,
    capabilityMessage,
    isCapabilityAvailable,
    isViewStale,
    setDocument,
    setMeta,
    updateViewerPreferences,
    meta,
    renderMermaidDiagrams,
    openDoc: (ref) => showDocumentByPath(ref),
    viewerDiagnostics: {
      breadcrumb: (...args) => viewerDiagnostics.breadcrumb(...args),
      record: (...args) => viewerDiagnostics.record(...args),
    },
    cdxSessionForTerminal: (...args) => cdxSessionForTerminal(...args),
    cdxSessionUsage: (...args) => cdxSessionUsage(...args),
    loadCdxSessionsForCustomTerminal: (...args) => loadCdxSessionsForCustomTerminal(...args),
    shared: readerFor(viewerState),
  });

  const autoRefreshControl = () => document.getElementById("viewer-auto-refresh");
  const refreshIntervalControl = () => document.getElementById("viewer-refresh-interval");
  const minimizedScreens = new Map();
  let liveMinimizedScreenId = "";
  const refreshMenuButton = () => document.getElementById("viewer-refresh-menu-button");
  const refreshMenuPanel = () => document.getElementById("viewer-refresh-menu");
  const versionLink = () => document.getElementById("viewer-version-link");
  const bootstrapLogicsButton = () => document.getElementById("viewer-bootstrap-logics");
  const activityClearControl = () => document.getElementById("activity-clear");
  let latestItems = [];
  let latestCapabilities = {};
  let latestProjects = [];
  let latestFleet = false;
  let latestCanBootstrapLogics = false;
  let latestShouldPromptBootstrapLogics = false;
  let latestBootstrapLogicsTitle = "Bootstrap Logics in this project";
  let bootstrapPromptOpen = false;
  const promptedBootstrapRoots = new Set();
  let latestMetaText = "Read-only local viewer";
  let autoRefreshIntervalMs = defaultAutoRefreshIntervalMs;
  let nextAutoRefreshAt = 0;
  let autoRefreshEnabled = true;
  let autoRefreshTimeoutId = 0;
  let autoRefreshIntervalTouched = false;
  let applyingLocalChrome = false;
  let autoRefreshStarted = false;
  let viewerEventsStarted = false;
  let viewerEventsSource = null;
  let itemsLoadInFlight = false;
  let refreshAfterVisible = false;
  let mermaidInitialized = false;
  let focusApplied = false;
  let latestUpdateInfo = {};
  const {
    state: cdxState,
    applyCdxMissionPlan,
    applyCdxSessionConfigModal,
    applyCdxSessionPermission,
    applyOptimisticCdxSessionPermission,
    applyOptimisticCdxSessionToggle,
    cdxColumnVisibilityPreference,
    cdxHistoryColumnVisibilityPreference,
    cdxHistorySessionFilterPreference,
    cdxProviderFilterPreference,
    cdxRunColumnVisibilityPreference,
    cdxRunSessionFilterPreference,
    cdxSessionForTerminal,
    cdxSessionLastUsedMs,
    cdxSessionUsage,
    cdxUsageFromStatus,
    chooseCdxHandoffSource,
    isCdxHistoryOpen,
    isCdxMissionsOpen,
    isCdxRunsOpen,
    isCdxStatusOpen,
    launchCdxMission,
    launchCdxMissionInTerminal,
    loadCdxSessionsForCustomTerminal,
    markCdxSectionSeen,
    openCdxArtifact,
    persistCdxColumnVisibility,
    persistCdxHistoryColumnVisibility,
    persistCdxHistorySessionFilter,
    persistCdxProviderFilter,
    persistCdxRunColumnVisibility,
    persistCdxRunSessionFilter,
    persistCdxSessionConfig,
    previewCdxMission,
    recordCdxDelta,
    recordCdxUnreadSnapshot,
    refreshCdxBadgeCounters,
    refreshCdxSessionUsage,
    renderCdxDisk,
    renderCdxHistory,
    renderCdxMemory,
    renderCdxMissionConfigMenu,
    renderCdxMissionInputs,
    renderCdxMissionSetup,
    renderCdxMissions,
    renderCdxRuns,
    renderCdxSessionTable,
    renderCdxStatus,
    rerenderCdxStatusFromPreferences,
    selectCdxMissionFromModal,
    selectedCdxMissionRequest,
    setCdxMissionBusy,
    showCdxDisk,
    showCdxHistory,
    showCdxMemory,
    showCdxMissions,
    showCdxReport,
    showCdxRuns,
    showCdxSessionConfigModal,
    showCdxStatus,
    updateCdxMissionsCount,
    updateCdxSessionConfigFromModal,
    updateCdxUnreadBadges,
    updateMainCdxBadge,
    withCdxMissionAction,
  } = createCdxScreen({
    applyLocalViewerChrome,
    beginView,
    capability,
    capabilityMessage,
    currentDocumentSnapshot,
    isCapabilityAvailable,
    isViewStale,
    renderWorkshopTerminalList,
    setDocument,
    setMeta,
    spawnWorkshopTerminal,
    updateCapabilityControls,
    updateViewerPreferences,
    documentPanel,
    documentTitle,
    shared: readerFor(viewerState),
  });

  let connectionState = "connected";
  let lastSuccessfulSyncAt = 0;
  let latestViewerStateSignature = "";
  // Per-section badge counters. `missions` is a live gauge (number of mission
  // runs currently in progress) and carries no seen-tracking. `runs`/`history`
  // are deltas: `seen` is the set of identifiers the user has already looked at,
  // and `count` is how many current entries are not in that set. `seen: null`
  // means "not seeded yet" so the very first snapshot doesn't flag everything.
  let latestCiStatusSignature = "";
  let currentDocumentItem = null;
  let primaryActionBusyKey = "";
  let primaryActionController = null;
  let autoRefreshIntervalForcedByLaunch = false;
  let embeddedHost = "";
  let viewSeq = 0; // bumps on every view transition (operator or silent refresh)
  let userViewSeq = 0; // bumps only on operator-initiated transitions
  let activeUserViewController = null;
  // The browser store is a cache for the first paint: it is scoped to an origin, and the
  // extension serves this page from a new port every session, so it cannot be the record.
  // The server knows both the repository and the machine, and answers both hosts.
  async function hydrateViewerPreferencesFromServer() {
    try {
      const response = await fetch("/api/preferences");
      const data = await response.json();
      if (!response.ok || !data?.ok || !data.payload || typeof data.payload !== "object") return;
      // The record wins wherever the two disagree.
      viewerState.viewerPreferences = { ...viewerState.viewerPreferences, ...data.payload, version: preferenceVersion };
      cacheViewerPreferences();
      renderProjectMenu();
      syncWorkshopSystemTerminalControls();
    } catch {
      // Offline or an older server: the cached values stay usable for this session.
    }
  }

  function persistViewerPreferencesToServer(patch, removed) {
    if (!patch && !removed) return;
    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: patch || {}, removed: removed || {} }),
    }).catch(() => {
      // A failed write leaves the cache in place; the next change retries the whole patch.
    });
  }

  function cacheViewerPreferences() {
    try {
      window.localStorage.setItem(preferenceKey, JSON.stringify(viewerState.viewerPreferences));
    } catch {
      // Keep the in-memory preference for this session when browser storage is unavailable.
    }
  }

  function writeViewerPreferences(nextPreferences) {
    viewerState.viewerPreferences = { ...nextPreferences, version: preferenceVersion };
    cacheViewerPreferences();
  }

  function updateViewerPreferences(patch, options = {}) {
    writeViewerPreferences({ ...viewerState.viewerPreferences, ...patch });
    persistViewerPreferencesToServer(patch, options.removed);
    if (patch.projectLastUsedAt && window.parent !== window) window.parent.postMessage({ type: "viewer-project-last-used", projectLastUsedAt: patch.projectLastUsedAt }, "*");
    if (patch.favoriteProjects && window.parent !== window) window.parent.postMessage({ type: "viewer-favorite-projects", favoriteProjects: patch.favoriteProjects }, "*");
    syncWorkshopSystemTerminalControls();
  }

  window.addEventListener("message", (event) => { const projectLastUsedAt = event.data?.type === "viewer-project-last-used" ? event.data.projectLastUsedAt : null; if (projectLastUsedAt && typeof projectLastUsedAt === "object" && !Array.isArray(projectLastUsedAt)) { writeViewerPreferences({ ...viewerState.viewerPreferences, projectLastUsedAt }); renderProjectMenu(); } });
  window.addEventListener("message", (event) => { const favoriteProjects = event.data?.type === "viewer-favorite-projects" ? event.data.favoriteProjects : null; if (Array.isArray(favoriteProjects)) { writeViewerPreferences({ ...viewerState.viewerPreferences, favoriteProjects: favoriteProjects.map((value) => String(value)).filter(Boolean).sort() }); renderProjectMenu(); } });

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "viewer-embed-host" || event.data.host !== "vscode" || window.parent === window) return;
    embeddedHost = "vscode";
    const section = document.getElementById("viewer-vscode-section");
    if (!(section instanceof HTMLElement)) return;
    section.hidden = false;
    document.getElementById("viewer-vscode-reload")?.addEventListener("click", () => window.location.reload());
    document.getElementById("viewer-vscode-restart")?.addEventListener("click", () => window.parent.postMessage({ type: "restart-viewer" }, "*"));
    document.getElementById("viewer-vscode-open-external")?.addEventListener("click", () => window.parent.postMessage({ type: "open-external-viewer" }, "*"));
  });



  function favoriteProjectIds() {
    const stored = Array.isArray(viewerState.viewerPreferences.favoriteProjects) ? viewerState.viewerPreferences.favoriteProjects : [];
    return new Set(stored.map((value) => String(value)).filter(Boolean));
  }

  function persistFavoriteProject(projectId, favorite) {
    if (!projectId) {
      return;
    }
    const favorites = favoriteProjectIds();
    if (favorite) {
      favorites.add(projectId);
    } else {
      favorites.delete(projectId);
    }
    // Un-starring cannot be expressed by a merge: an absent entry means "I did not see
    // it", not "drop it". Two windows starring at once must both keep their favourite,
    // so a removal has to say so explicitly.
    updateViewerPreferences(
      { favoriteProjects: Array.from(favorites).sort() },
      favorite ? {} : { removed: { favoriteProjects: [projectId] } }
    );
  }

  function preferredAutoRefreshIntervalSeconds() {
    const seconds = Number(viewerState.viewerPreferences.autoRefreshIntervalSeconds);
    return Number.isFinite(seconds) && seconds > 0 ? normalizeAutoRefreshIntervalSeconds(seconds) : null;
  }

  let transientMetaText = "";
  let latestEnvironmentWarning = null;

  function setPrimaryActionBusy(actionKey, label = "") {
    primaryActionBusyKey = actionKey || "";
    document.body?.classList.toggle("viewer-is-busy", Boolean(primaryActionBusyKey));
    document.body?.toggleAttribute("data-viewer-busy", Boolean(primaryActionBusyKey));
    if (primaryActionBusyKey) {
      document.body?.setAttribute("data-viewer-busy-action", primaryActionBusyKey);
    } else {
      document.body?.removeAttribute("data-viewer-busy-action");
    }
    primaryActionControls().forEach((control) => {
      if (!("disabled" in control)) {
        return;
      }
      control.disabled = Boolean(primaryActionBusyKey);
      control.setAttribute("aria-busy", primaryActionBusyKey ? "true" : "false");
      if (primaryActionBusyKey) {
        control.setAttribute("data-viewer-action-busy", control.getAttribute("data-viewer-action-key") === actionKey ? "active" : "blocked");
      } else {
        control.removeAttribute("data-viewer-action-busy");
      }
    });
    if (!primaryActionBusyKey) {
      updateCapabilityControls();
      applyLocalViewerChrome();
    }
    if (primaryActionBusyKey && label) {
      transientMetaText = `${label}...`;
      setMeta(transientMetaText);
    } else if (!primaryActionBusyKey && transientMetaText) {
      // The busy label used to survive the action that set it: the status bar still read
      // "Closing preview..." long after the preview had closed. Only clear it if nothing
      // else has spoken since, so a real message from the action is never overwritten.
      if ((meta()?.textContent || "") === transientMetaText) {
        setMeta("Ready.");
      }
      transientMetaText = "";
    }
  }

  function withPrimaryAction(actionKey, label, action) {
    if (primaryActionBusyKey) {
      setMeta("Action unavailable while another viewer action is running.");
      return Promise.resolve(false);
    }
    if (primaryActionController) {
      try { primaryActionController.abort(); } catch { /* noop */ }
    }
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    primaryActionController = controller;
    setPrimaryActionBusy(actionKey, label);
    return Promise.resolve()
      .then(action)
      .then(() => true)
      .catch((error) => {
        if (error && (error.name === "AbortError" || controller?.signal.aborted)) {
          return false;
        }
        setMeta(error?.message || "Viewer action failed.");
        return false;
      })
      .finally(() => {
        if (primaryActionController === controller) {
          primaryActionController = null;
          setPrimaryActionBusy("", "");
        }
      });
  }

  function hydrateViewerFilterState() {
    const storedState = readStoredState();
    viewerState.viewerFilterState = sanitizeViewerFilterState(storedState?.viewerFilterState);
  }

  function persistViewerFilterState() {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? storedState : {};
    writeStoredState({ ...nextState, viewerFilterState: { ...viewerState.viewerFilterState } });
  }

  function activityEventsFromStoredState(state = readStoredState(), root = viewerState.latestRepoRoot) {
    const scopedState = activityStateForRoot(state, root);
    return (Array.isArray(scopedState.activityHistory) ? scopedState.activityHistory : [])
      .filter((entry) => entry && typeof entry === "object" && ["git-action", "git-commit"].includes(entry.type))
      .map((entry, index) => ({
        id: String(entry.id || `git-action-${index}`),
        kind: "git",
        category: "git",
        stage: "git",
        marker: "G",
        action: String(entry.action || "Git"),
        title: String(entry.title || `Git ${entry.action || "action"}`),
        label: String(entry.label || entry.action || "Git action"),
        meta: String(entry.meta || entry.message || "Git action"),
        // req_284/item_517: branch + short SHA for the recomposed human meta line.
        branch: String(entry.branch || ""),
        sha: String(entry.sha || ""),
        at: entry.at || entry.updatedAt || "",
        updatedAt: entry.updatedAt || entry.at || ""
      }));
  }


  function dispatchViewerActivityUpdate() {
    const storedState = readStoredState();
    const payload = {
      root: viewerState.latestRepoRoot,
      items: latestItems,
      selectedId: storedState?.selectedId || "",
      activityEvents: [
        ...activityEventsFromStoredState(storedState, viewerState.latestRepoRoot),
        ...ciActivityEvents()
      ]
    };
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload } }));
    applyLocalViewerChrome();
  }

  function refreshActivityFeedForCi() {
    // Re-dispatch so newly fetched CI runs reach the feed; only while the panel is open.
    if (activityPanelIsOpen()) {
      dispatchViewerActivityUpdate();
    }
  }



  function updateStoredActivity(nextItems, root = viewerState.latestRepoRoot) {
    const storedState = readStoredState();
    const baseState = storedState && typeof storedState === "object" ? storedState : {};
    const scopedState = activityStateForRoot(baseState, root);
    const previousSnapshot = scopedState.activitySnapshot && typeof scopedState.activitySnapshot === "object" ? scopedState.activitySnapshot : {};
    const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
    const nextSnapshot = {};
    const now = new Date().toISOString();
    const decorated = nextItems.map((item) => {
      const relPath = String(item.relPath || item.path || item.id || "");
      const status = String(item?.indicators?.Status || "").trim();
      if (relPath) {
        nextSnapshot[relPath] = { status, updatedAt: item.updatedAt || "" };
      }
      const previous = relPath ? previousSnapshot[relPath] : null;
      const previousStatus = String(previous?.status || "").trim();
      const statusChanged = Boolean(previousStatus && status && previousStatus !== status);
      if (relPath && (statusChanged || !previous)) {
        prependUniqueActivity(history, { path: relPath, at: now, status, previousStatus, type: statusChanged ? "status-change" : "updated" });
      }
      return statusChanged ? { ...item, activityType: "status-change" } : item;
    });
    writeStoredState(writeActivityStateForRoot({
      ...baseState,
      viewerFilterState: { ...viewerState.viewerFilterState }
    }, root, { activitySnapshot: nextSnapshot, activityHistory: history }));
    return decorated;
  }

  function clearActivityHistory() {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? { ...storedState } : {};
    const byRoot = nextState.activityByRoot && typeof nextState.activityByRoot === "object" ? { ...nextState.activityByRoot } : {};
    delete byRoot[activityRootKey(viewerState.latestRepoRoot)];
    nextState.activityByRoot = byRoot;
    writeStoredState(nextState);
    latestItems = latestItems.map((item) => {
      const clone = { ...item };
      delete clone.activityType;
      return clone;
    });
    setMeta("Local activity history cleared.");
  }

  function setMeta(text) {
    latestMetaText = text;
    renderMeta();
  }

  const viewerDiagnostics = createViewerDiagnostics({
    getPanel: documentPanel,
    getTitle: documentTitle,
    getContent: documentContent,
    getBoard: () => document.getElementById("board"),
    setMeta,
    postDiagnostic: (path, payload, options = {}) => viewerFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: Boolean(options.keepalive)
    }),
    recoverApplication: refreshCurrentScreen,
    onCircuitOpen: (entry) => {
      setAutoRefreshEnabled(false);
      setMeta(`Stability guard paused auto-refresh after repeated ${entry.kind} failures. Refresh manually after reviewing diagnostics.`);
    },
    getMetadata: () => ({
      viewerVersion: String(latestUpdateInfo?.currentVersion || versionLink()?.textContent || "").replace(/^v/i, "")
    }),
    updateDocumentHeaderNav,
    renderMermaidDiagrams
  });

  function renderConnectionNotice() {
    const banner = connectionBanner();
    if (!(banner instanceof HTMLElement)) {
      return;
    }
    if (connectionState !== "disconnected") {
      banner.hidden = true;
      return;
    }
    const copy = connectionCopy();
    const detail = connectionDetail();
    if (copy) {
      copy.textContent = "Local viewer server disconnected. Displayed data may be stale; waiting for reconnection.";
    }
    if (detail) {
      detail.textContent = formatConnectionTime(lastSuccessfulSyncAt);
    }
    banner.hidden = false;
  }

  function markConnectionHealthy(options = {}) {
    const wasDisconnected = connectionState === "disconnected";
    connectionState = "connected";
    lastSuccessfulSyncAt = Date.now();
    renderConnectionNotice();
    if (wasDisconnected && !options.silent) {
      setMeta(`Reconnected · refreshed ${new Date(lastSuccessfulSyncAt).toLocaleTimeString()}`);
    }
  }

  function markConnectionDisconnected(error) {
    connectionState = "disconnected";
    renderConnectionNotice();
    scheduleNextAutoRefresh();
    const message = error instanceof Error && error.message
      ? error.message
      : "Unable to reach local viewer server.";
    setMeta(`Disconnected · ${message}`);
  }

  function renderMeta() {
    const node = meta();
    if (node) {
      node.textContent = latestMetaText;
    }
  }

  function updateRefreshIntervalControl() {
    const control = refreshIntervalControl();
    if (!(control instanceof HTMLSelectElement)) {
      return;
    }
    const seconds = String(Math.round(autoRefreshIntervalMs / 1000));
    if (![...control.options].some((option) => option.value === seconds)) {
      const option = document.createElement("option");
      option.value = seconds;
      option.textContent = `${seconds} sec`;
      control.appendChild(option);
    }
    control.value = seconds;
  }

  function setAutoRefreshIntervalSeconds(value, options = {}) {
    autoRefreshIntervalMs = normalizeAutoRefreshIntervalSeconds(value) * 1000;
    if (options.user) {
      autoRefreshIntervalTouched = true;
      updateViewerPreferences({ autoRefreshIntervalSeconds: Math.round(autoRefreshIntervalMs / 1000) });
    }
    updateRefreshIntervalControl();
    scheduleNextAutoRefresh();
  }

  function scheduleNextAutoRefresh() {
    if (autoRefreshTimeoutId) {
      window.clearTimeout(autoRefreshTimeoutId);
      autoRefreshTimeoutId = 0;
    }
    nextAutoRefreshAt = autoRefreshEnabled ? Date.now() + autoRefreshIntervalMs : 0;
    if (autoRefreshEnabled) {
      autoRefreshTimeoutId = window.setTimeout(autoRefreshItems, autoRefreshIntervalMs);
    }
    renderMeta();
  }

  function updateRepositoryIdentity(payload) {
    activeProjectId = String(payload.projectId || activeProjectId || "");
    if (activeProjectId) {
      const url = new URL(window.location.href);
      url.searchParams.set("project", activeProjectId);
      window.history.replaceState(null, "", url);
    }
    viewerState.latestRepoRoot = String(payload.root || viewerState.latestRepoRoot || "");
    latestProjects = Array.isArray(payload.projects) ? payload.projects : latestProjects;
    latestFleet = Boolean(payload.fleet);
    const repository = payload.repository && typeof payload.repository === "object" ? payload.repository : {};
    viewerState.latestRepository = {
      root: String(repository.root || viewerState.latestRepoRoot || ""),
      provider: String(repository.provider || ""),
      webUrl: String(repository.webUrl || repository.githubUrl || repository.gitlabUrl || ""),
      githubUrl: String(repository.githubUrl || ""),
      gitlabUrl: String(repository.gitlabUrl || "")
    };
    const pill = repoPill();
    if (pill) {
      const repoName = String(payload.repoName || viewerState.latestRepoRoot.split(/[\\/]/).filter(Boolean).pop() || "repository");
      const label = pill.querySelector("[data-viewer-project-label]");
      if (label) {
        label.textContent = repoName;
      } else {
        pill.textContent = repoName;
      }
      pill.title = viewerState.latestRepoRoot || repoName;
      if ("disabled" in pill) {
        pill.disabled = false;
      }
      pill.onclick = () => {
        const menu = projectMenu();
        setProjectMenuOpen(Boolean(menu?.hidden));
      };
    }
    updateRepositoryShortcuts();
    renderProjectMenu();
  }

  function renderProjectMenu() {
    const menu = projectMenu();
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    const favorites = favoriteProjectIds();
    const projects = latestProjects
      .filter((project) => project && typeof project === "object")
      .map((project, index) => { const stored = viewerState.viewerPreferences.projectLastUsedAt, value = stored && typeof stored === "object" ? stored[projectPreferenceId(project)] : "", time = Date.parse(String(value || "")); return { project, index, favorite: favorites.has(projectPreferenceId(project)), lastUsed: Number.isFinite(time) ? time : 0 }; })
      .sort((left, right) => Number(right.project.active) - Number(left.project.active) || Number(right.favorite) - Number(left.favorite) || (left.favorite && right.favorite ? right.lastUsed - left.lastUsed : 0) || left.index - right.index);
    const projectRows = projects.map(({ project, favorite }) => {
      const preferenceId = projectPreferenceId(project);
      return `
        <div class="viewer-project-switcher__row${project.active ? " is-active" : ""}${favorite ? " is-favorite" : ""}" role="none">
          <button class="viewer-project-switcher__favorite" type="button" aria-label="${favorite ? "Remove favorite" : "Add favorite"} ${escapeHtml(project.name || "project")}" aria-pressed="${favorite ? "true" : "false"}" data-viewer-project-favorite="${escapeHtml(preferenceId)}" title="${favorite ? "Remove favorite" : "Add favorite"}">
            <span aria-hidden="true">${favorite ? "★" : "☆"}</span>
          </button>
          <button class="viewer-project-switcher__item${project.active ? " is-active" : ""}" type="button" role="menuitem" data-viewer-project-id="${escapeHtml(project.id || "")}" title="${escapeHtml(project.root || project.name || "")}">
            <span class="viewer-project-switcher__item-name">${escapeHtml(project.name || "project")}</span>
            <span class="viewer-project-switcher__item-state">${escapeHtml(projectStateLabel(project, latestProjectState[project.id] || null))}</span>
            <span class="viewer-project-switcher__item-path">${escapeHtml(project.root || "")}</span>
          </button>
        </div>
      `;
    }).join("");
    const pickerRow = `
      <button class="viewer-project-switcher__item viewer-project-switcher__item--picker" type="button" role="menuitem" data-viewer-project-pick>
        <span class="viewer-project-switcher__item-name">Choose folder...</span>
        <span class="viewer-project-switcher__item-state">browse</span>
        <span class="viewer-project-switcher__item-path">Select another project location</span>
      </button>
    `;
    const fleetRootRow = latestFleet ? `
      <button class="viewer-project-switcher__item viewer-project-switcher__item--picker" type="button" role="menuitem" data-viewer-fleet-root-pick>
        <span class="viewer-project-switcher__item-name">Add fleet root...</span>
        <span class="viewer-project-switcher__item-state">bounded scan</span>
        <span class="viewer-project-switcher__item-path">Discover immediate project folders</span>
      </button>
    ` : "";
    menu.innerHTML = `${projectRows}${pickerRow}${fleetRootRow}`;
  }

  let latestProjectState = {};

  async function loadProjectState() {
    // On demand, when the switcher opens: scanning every listed project at
    // viewer startup would pay for all of them before the first screen renders.
    try {
      const response = await fetch("/api/projects-state");
      const data = await response.json();
      latestProjectState = data?.payload?.projects || {};
      renderProjectMenu();
    } catch {
      // the switcher still lists projects without their state
    }
  }

  function setProjectMenuOpen(open) {
    const button = repoPill();
    const menu = projectMenu();
    if (!(button instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      return;
    }
    const nextOpen = Boolean(open);
    menu.hidden = !nextOpen;
    button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
    if (nextOpen) {
      void loadProjectState();
    }
  }

  async function switchViewerProject(projectId) {
    if (!projectId) {
      return;
    }
    const target = latestProjects.find((project) => project.id === projectId);
    if (!target || target.active) {
      setProjectMenuOpen(false);
      return;
    }
    setProjectMenuOpen(false);
    returnToProjectSurface();
    setMeta(`Switching to ${target.name || "project"}...`);
    const response = await fetch("/api/switch-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to switch project.");
    }
    { const active = (Array.isArray(data.payload?.projects) ? data.payload.projects : []).find((project) => project?.active), projectId = projectPreferenceId(active), stored = viewerState.viewerPreferences.projectLastUsedAt; if (projectId) updateViewerPreferences({ projectLastUsedAt: { ...(stored && typeof stored === "object" ? stored : {}), [projectId]: new Date().toISOString() } }); } gitState.latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
    gitState.latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    gitState.latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(gitState.latestCiStatus);
    updateMainReleaseBadge(gitState.latestReleaseRunsStatus);
    updateMainCdxBadge(null);
    const panel = documentPanel();
    if (panel) {
      panel.hidden = true;
    }
    postToApp(data.payload);
  }

  async function pickViewerProjectRoot() {
    setProjectMenuOpen(false);
    returnToProjectSurface();
    setMeta("Opening project folder picker...");
    let response;
    let data = {};
    try {
      response = await fetch("/api/select-project-root", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      data = await response.json();
    } catch (error) {
      return openProjectPickerModal(error?.message || "Native folder picker is unavailable.");
    }
    if (!response.ok || !data.ok) {
      await openProjectPickerModal(String(data.error || "Native folder picker is unavailable."));
      return;
    }
    applySelectedProjectPayload(data.payload, `Switched to ${data.payload?.repoName || "selected project"}.`);
  }

  async function pickFleetRoot() {
    setProjectMenuOpen(false);
    setMeta("Opening fleet root picker...");
    const response = await fetch("/api/select-fleet-root", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to add fleet root.");
    postToApp(data.payload);
  }

  function applySelectedProjectPayload(payload, message) {
    returnToProjectSurface(); { const active = (Array.isArray(payload?.projects) ? payload.projects : []).find((project) => project?.active), projectId = projectPreferenceId(active), stored = viewerState.viewerPreferences.projectLastUsedAt; if (projectId) updateViewerPreferences({ projectLastUsedAt: { ...(stored && typeof stored === "object" ? stored : {}), [projectId]: new Date().toISOString() } }); }
    gitState.latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
    gitState.latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    gitState.latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(gitState.latestCiStatus);
    updateMainReleaseBadge(gitState.latestReleaseRunsStatus);
    updateMainCdxBadge(null);
    const panel = documentPanel();
    if (panel) {
      panel.hidden = true;
    }
    postToApp(payload, { force: true });
    setMeta(message);
  }

  async function openProjectPickerModal(reason = "") {
    const modal = createThemedModal({
      title: "Choose project folder",
      message: reason ? `${reason} Use the fallback folder browser below.` : "Use the fallback folder browser below.",
      submitLabel: "Close",
      cancelLabel: "Cancel"
    });
    const body = modal.querySelector(".viewer-themed-modal__body");
    const submit = modal.querySelector(".viewer-themed-modal__submit");
    if (submit instanceof HTMLButtonElement) submit.textContent = "Close";
    let currentPath = "";
    const load = async (path = "") => {
      currentPath = path;
      if (body instanceof HTMLElement) {
        body.innerHTML = '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span>Loading folders...</span></div>';
      }
      renderProjectPickerModalBody(body, await fetchProjectPickerTree(path));
    };
    const close = () => closeThemedModal(modal);
    modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", close);
    modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close);
    modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close);
    modal.addEventListener("click", async (event) => {
      const openTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-picker-open]") : null;
      const selectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-picker-select]") : null;
      if (openTarget instanceof HTMLElement && !openTarget.hasAttribute("disabled")) {
        event.preventDefault();
        await load(openTarget.getAttribute("data-viewer-project-picker-open") || "");
        return;
      }
      if (selectTarget instanceof HTMLElement) {
        event.preventDefault();
        const selectedPath = selectTarget.getAttribute("data-viewer-project-picker-select") || currentPath;
        const response = await fetch("/api/select-project-root-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: selectedPath })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          await showThemedMessageModal({ title: "Folder refused", message: String(data.error || response.status) });
          return;
        }
        closeThemedModal(modal);
        applySelectedProjectPayload(data.payload, `Switched to ${data.payload?.repoName || "selected project"}.`);
      }
    });
    try {
      await load("");
    } catch (error) {
      if (body instanceof HTMLElement) {
        body.innerHTML = `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable"><span>${escapeHtml(error?.message || "Unable to browse folders.")}</span></div>`;
      }
    }
  }

  async function bootstrapLogicsProject() {
    setMeta("Bootstrapping Logics...");
    const response = await fetch("/api/bootstrap-logics", { method: "POST" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to bootstrap Logics.");
    }
    postToApp(data.payload);
    const created = Array.isArray(data.bootstrap?.created_paths) ? data.bootstrap.created_paths.length : 0;
    setMeta(created > 0 ? `Logics bootstrapped · ${created} paths created.` : "Logics bootstrap checked.");
  }

  function scheduleReloadAfterServerRestart() {
    let attempts = 0;
    const maxAttempts = 24;
    const probe = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/items?restart=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
          window.location.reload();
          return;
        }
      } catch {
        // The server is expected to be briefly unavailable during restart.
      }
      if (attempts < maxAttempts) {
        window.setTimeout(probe, 800);
        return;
      }
      setMeta("Viewer server restarted. Reload this page if it did not reconnect automatically.");
    };
    window.setTimeout(probe, 1200);
  }

  async function controlViewerServer({ endpoint, title, message, submitLabel, pending, done }) {
    const confirmed = await showThemedConfirmModal({ title, message, submitLabel });
    if (!confirmed) return;
    setMeta(pending);
    const response = await fetch(endpoint, { method: "POST" });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `${submitLabel} failed.`);
    }
    done();
  }

  function restartViewerServer() {
    return controlViewerServer({
      endpoint: "/api/restart-viewer",
      title: "Restart viewer server",
      message: "The local viewer server will restart with the same command. This page will reconnect automatically when it is back.",
      submitLabel: "Restart server",
      pending: "Restarting viewer server...",
      done: () => { setMeta("Viewer server restarting..."); scheduleReloadAfterServerRestart(); },
    });
  }

  function stopViewerServer() {
    return controlViewerServer({
      endpoint: "/api/stop-viewer",
      title: "Stop viewer server",
      message: "The local viewer server will shut down. This page will stop working until you start it again from the terminal.",
      submitLabel: "Stop server",
      pending: "Stopping viewer server...",
      done: () => setMeta("Viewer server stopped. Restart it from the terminal to reconnect."),
    });
  }

  async function confirmBootstrapLogics({ automatic = false } = {}) {
    if (!latestCanBootstrapLogics || bootstrapPromptOpen) {
      return false;
    }
    bootstrapPromptOpen = true;
    try {
      const confirmed = await showThemedConfirmModal({
        title: "Bootstrap Logics",
        message: latestShouldPromptBootstrapLogics
          ? "This project does not have a Logics workflow yet. Bootstrap it now to create the local workflow structure and enable the viewer."
          : "Refresh generated Logics bootstrap files for this project, including local assistant bridge files.",
        submitLabel: latestShouldPromptBootstrapLogics ? "Bootstrap" : "Refresh",
        cancelLabel: automatic ? "Not now" : "Cancel"
      });
      if (!confirmed) {
        return false;
      }
      await bootstrapLogicsProject();
      return true;
    } finally {
      bootstrapPromptOpen = false;
    }
  }

  function maybePromptBootstrapLogics() {
    if (!latestCanBootstrapLogics || !latestShouldPromptBootstrapLogics || !viewerState.latestRepoRoot || bootstrapPromptOpen) {
      return;
    }
    if (promptedBootstrapRoots.has(viewerState.latestRepoRoot)) {
      return;
    }
    promptedBootstrapRoots.add(viewerState.latestRepoRoot);
    window.setTimeout(() => {
      confirmBootstrapLogics({ automatic: true }).catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
    }, 0);
  }

  let latestLanShareUrl = "";

  function applyLanBanner(active, shareUrl, rwMode = false) {
    const banner = document.getElementById("viewer-lan-banner");
    if (!(banner instanceof HTMLElement)) return;
    // Once a device is paired the banner has nothing left to ask the user
    // for — share URL was needed only to bootstrap, pairing is done, and
    // mutations are unlocked. Hide it to give the actual viewport back.
    const paired = Boolean(getDeviceToken());
    banner.hidden = !active || paired;
    latestLanShareUrl = active ? String(shareUrl || "") : "";
    window.__logicsLanRwEnabled = Boolean(active && rwMode);
    const urlNode = document.getElementById("viewer-lan-banner-url");
    const copyButton = document.getElementById("viewer-lan-banner-copy");
    if (urlNode instanceof HTMLElement) {
      if (latestLanShareUrl) {
        urlNode.hidden = false;
        urlNode.textContent = latestLanShareUrl;
      } else {
        urlNode.hidden = true;
        urlNode.textContent = "";
      }
    }
    if (copyButton instanceof HTMLButtonElement) {
      copyButton.hidden = !latestLanShareUrl;
    }
    refreshLanBannerPairingState();
  }

  function capability(name) {
    return latestCapabilities?.[name] || { state: "unknown", available: false, message: "" };
  }

  function isCapabilityAvailable(name) {
    return capability(name).available === true;
  }

  function capabilityMessage(name, fallback) {
    return String(capability(name).message || fallback || "");
  }

  function updateCapabilityControls() {
    const bootstrapButton = bootstrapLogicsButton();
    if (bootstrapButton instanceof HTMLButtonElement) {
      bootstrapButton.hidden = !latestCanBootstrapLogics;
      bootstrapButton.disabled = !latestCanBootstrapLogics;
      bootstrapButton.title = latestBootstrapLogicsTitle || "Bootstrap Logics in this project";
    }
    updateProjectToolControls(isCapabilityAvailable, navMenuItem);
    const workshop = workshopState.workshopButton();
    if (workshop instanceof HTMLElement) {
      // The Explorer screen now lives as a Workshop sub-tab (alongside
      // Terminals and Commands), so Workshop stays reachable whenever either
      // the workshop or the workspace capability is available.
      const workshopAvailable = isCapabilityAvailable("workshop");
      const workspaceAvailable = isCapabilityAvailable("workspace");
      const workshopVisible = workshopAvailable || workspaceAvailable || isCapabilityAvailable("i18n") || isCapabilityAvailable("theme");
      workshop.hidden = !workshopVisible;
      if (workshopVisible) {
        setButtonAvailable(workshop, "Show Workshop and project tools");
      } else {
        setButtonUnavailable(workshop, capabilityMessage("workshop", "Workshop is not available for this project."));
      }
      updateWorkshopBadges();
      hydrateWorkshopTerminals();
    }

    // Git and CI now share a single "Remote" button (Git is the first
    // section of the merged screen, before CI runs and Release). The button
    // is reachable whenever either capability is available; the git counters
    // and the CI status badge are both rendered onto it.
    const gitCi = gitState.ciButton();
    if (gitCi instanceof HTMLElement) {
      const gitAvailable = isCapabilityAvailable("git");
      const ciAvailable = isCapabilityAvailable("ci");
      gitCi.hidden = !(gitAvailable || ciAvailable);
      if (gitAvailable || ciAvailable) {
        setButtonAvailable(gitCi, "Show Git status, CI runs, and release state");
      } else {
        setButtonUnavailable(gitCi, capabilityMessage("git", "Git and CI are not available for this project."));
      }
    }

    const cdx = document.getElementById("viewer-cdx");
    if (cdx instanceof HTMLElement) {
      if (isCapabilityAvailable("cdx")) {
        setButtonAvailable(cdx, "Show CDX status");
      } else {
        setButtonUnavailable(cdx, capabilityMessage("cdx", "CDX is not available for this project."));
      }
    }
  }

  function updateRepositoryShortcuts() {
    const github = gitState.repoGithubLink();
    const folder = repoFolderButton();
    if (github instanceof HTMLAnchorElement) {
      if (viewerState.latestRepository.webUrl) {
        github.hidden = false;
        github.href = viewerState.latestRepository.webUrl;
        github.onclick = (event) => {
          if (embeddedHost !== "vscode" || window.parent === window) return;
          event.preventDefault();
          window.parent.postMessage({ type: "open-external-link", target: viewerState.latestRepository.webUrl }, "*");
        };
        const providerLabel = viewerState.latestRepository.provider === "gitlab" ? "GitLab" : viewerState.latestRepository.provider === "github" ? "GitHub" : "remote";
        github.title = `Open ${providerLabel} repository`;
        github.setAttribute("aria-label", `Open ${providerLabel} repository`);
      } else {
        github.hidden = true;
        github.removeAttribute("href");
        github.onclick = null;
      }
    }
    if (folder instanceof HTMLButtonElement) {
      folder.hidden = !viewerState.latestRepository.root;
    }
  }

  function updateVersionLink(updateInfo = latestUpdateInfo) {
    latestUpdateInfo = updateInfo && typeof updateInfo === "object" ? updateInfo : {};
    const link = versionLink();
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    const currentVersion = String(latestUpdateInfo.currentVersion || "").trim();
    link.textContent = currentVersion ? `v${currentVersion.replace(/^v/i, "")}` : "v0.0.0";
    link.href = "https://github.com/AlexAgo83/logics-manager";
    link.title = "Open Logics Manager on GitHub";
  }

  async function openRepositoryFolder() {
    if (!viewerState.latestRepository.root) {
      setMeta("Repository folder is unavailable.");
      return;
    }
    try {
      const response = await fetch("/api/open-repo-folder", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to open repository folder.");
      }
      setMeta("Repository folder opened.");
    } catch (error) {
      await openProjectPickerModal(error instanceof Error ? error.message : "Unable to open repository folder.");
    }
  }






  function updateMainCiBadge(payload = gitState.latestCiStatus) {
    gitState.latestCiStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
    const button = gitState.ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    // Only manage the CI status badge here. Button visibility now belongs to
    // updateCapabilityControls (git OR ci available), since the button is
    // shared with Git and must stay visible when only git is available.
    button.querySelector("[data-viewer-ci-badge]")?.remove();
    clearNavMenuBadges(["remote:runs"]);
    if (!gitState.latestCiStatus.visible) {
      return;
    }
    // Surface the latest CI message in the shared button tooltip when CI is live.
    button.title = gitState.latestCiStatus.message || "Show Git status, CI runs, and release state";
    const badge = renderCiButtonBadge(gitState.latestCiStatus);
    button.insertAdjacentHTML("beforeend", badge);
    setNavMenuBadges("remote:runs", badge);
  }

  async function refreshCiBadgeCounters() {
    if (!isCapabilityAvailable("ci")) {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "CI is not available for this project.") });
      return;
    }
    try {
      const response = await fetch("/api/ci-status");
      if (response.status === 404) {
        updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status endpoint unavailable." });
        return;
      }
      const data = await response.json();
      if (response.ok && data.ok) {
        latestCiStatusSignature = runtimeStatusSignature(data.payload);
        updateMainCiBadge(data.payload);
        refreshActivityFeedForCi();
      }
    } catch {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status unavailable." });
    }
  }



  // Shared rule: 0 hides the badge, 1 shows "!", and anything above shows the
  // number itself.
  // Identity helpers used to diff "new since last seen" sections. Runs expose a
  // stable run id; history entries don't, so we synthesise one from the fields
  // that uniquely pin a launch.
  // Apply a badge without repainting when the value is unchanged (honours "si
  // pas de changement de valeur, pas la peine de le ré-afficher"). Reading the
  // current DOM also makes us resilient to other code that wipes the nav badges:
  // when the element is gone we always re-add it.


  // Update the CI, CDX and Git badges from a single consolidated /api/status
  // request instead of firing ci-status + cdx-status + cdx-runs (+ git-status)
  // separately on every auto-refresh tick. Falls back to the legacy per-badge
  // refreshers when talking to an older backend without /api/status.
  async function refreshBadgeCounters() {
    let payload;
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (response.status === 404) {
        refreshCiBadgeCounters();
        refreshReleaseBadgeCounters();
        refreshCdxBadgeCounters();
        refreshGitBadgeCounters();
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.ok) {
        return;
      }
      payload = data.payload || {};
    } catch {
      return; // leave badges as-is on network/parse failure
    }
    if (isCapabilityAvailable("ci")) {
      if (payload.ci) {
        latestCiStatusSignature = runtimeStatusSignature(payload.ci);
        updateMainCiBadge(payload.ci);
        refreshActivityFeedForCi();
      }
      if (payload.releaseRuns) {
        gitState.latestReleaseRunsStatusSignature = runtimeStatusSignature(payload.releaseRuns);
        updateMainReleaseBadge(payload.releaseRuns);
      }
    } else {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "CI is not available for this project.") });
      updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "Release runs are not available for this project.") });
    }
    if (isCapabilityAvailable("cdx")) {
      if (payload.cdx) {
        const runsPayload = payload.cdxRuns || null;
        const historyPayload = payload.cdxHistory || null;
        // Keep the full CDX status payload fresh from the lightweight badge
        // poll (same shape as /api/cdx-status), so consumers like the Workshop
        // terminal usage gauge have current data without opening the CDX screen.
        cdxState.latestCdxStatusPayload = payload.cdx;
        cdxState.latestCdxStatusSignature = runtimeStatusSignature({ status: payload.cdx, runs: runsPayload });
        if (runsPayload) {
          cdxState.latestCdxRunsPayload = runsPayload;
          // Missions = running runs (live gauge); Reports = new runs since seen.
          updateCdxMissionsCount(runsPayload);
          recordCdxUnreadSnapshot("runs", runsPayload);
        }
        if (historyPayload) {
          cdxState.latestCdxHistoryPayload = historyPayload;
          recordCdxUnreadSnapshot("history", historyPayload);
        }
        updateMainCdxBadge(payload.cdx, runsPayload);
        rerenderCdxStatusFromPreferences();
        refreshWorkshopTerminalUsage();
      }
    } else {
      updateMainCdxBadge(null);
    }
    if (isCapabilityAvailable("git")) {
      if (payload.git && payload.git.state === "ok") {
        gitState.latestGitStatusPayload = payload.git;
        gitState.latestGitStatusSignature = gitStatusSignature(payload.git);
        syncGitCommitActivity(payload.git);
        setGitBadgeCountsFromPayload(payload.git);
      }
    } else {
      gitState.latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
    }
  }
  function activeDocumentTitle() {
    // A closed document panel keeps its last title text, so callers that drive
    // SSE-triggered re-renders must treat a hidden panel as "no active document"
    // — otherwise a background "cdx" change event would reopen a panel the user
    // just closed.
    const panel = documentPanel();
    if (!panel || panel.hidden) {
      return "";
    }
    return documentTitle()?.textContent || "";
  }

  async function handleViewerEventChange(components) {
    const changed = new Set(Array.isArray(components) ? components.map(String) : []);
    if (!changed.size) {
      return;
    }
    if (changed.has("corpus")) {
      await refreshViewer("POST", { silent: true });
      return;
    }
    if (changed.has("git") && activeDocumentTitle() === "Remote") {
      await showGitStatus({ silent: true, preserve: true });
      return;
    }
    if (changed.has("ci") && activeDocumentTitle() === "Remote" && gitState.latestCiScreenMode === "runs") {
      await showCiStatus({ silent: true });
      return;
    }
    if (changed.has("releaseRuns") && activeDocumentTitle() === "Remote" && gitState.latestCiScreenMode === "release") {
      await showReleaseStatus({ silent: true });
      return;
    }
    if (changed.has("cdx")) {
      const title = activeDocumentTitle();
      if (title === "CDX status") {
        await showCdxStatus({ silent: true });
        return;
      }
      if (title === "CDX reports") {
        await showCdxRuns({ silent: true });
        return;
      }
      if (title === "CDX history") {
        await showCdxHistory({ silent: true });
        return;
      }
    }
    await refreshBadgeCounters();
  }

  function startViewerEvents() {
    if (viewerEventsStarted || typeof window.EventSource !== "function") {
      return;
    }
    viewerEventsStarted = true;
    try {
      viewerEventsSource = new EventSource("/api/events");
      viewerEventsSource.addEventListener("changed", (event) => {
        try {
          const payload = JSON.parse(event.data || "{}");
          handleViewerEventChange(payload.components).catch(() => {});
        } catch {
          // Ignore malformed event payloads; polling remains active.
        }
      });
      viewerEventsSource.onerror = () => {
        if (viewerEventsSource && typeof viewerEventsSource.close === "function") {
          viewerEventsSource.close();
        }
        viewerEventsSource = null;
        viewerEventsStarted = false;
        scheduleNextAutoRefresh();
      };
    } catch {
      viewerEventsSource = null;
      viewerEventsStarted = false;
    }
  }

  function findItemByPath(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\//, "");
    return latestItems.find((entry) => entry.relPath === normalized || entry.path === normalized) || null;
  }

  function findFocusItem(target) {
    const normalized = normalizeFocusTarget(target);
    if (!normalized) {
      return null;
    }
    const bare = normalized.endsWith(".md") ? normalized.slice(0, -3).split("/").pop() : normalized;
    return latestItems.find((entry) => {
      const relPath = String(entry.relPath || "").replace(/\\/g, "/");
      const fullPath = String(entry.path || "").replace(/\\/g, "/");
      return entry.id === normalized ||
        entry.id === bare ||
        entry.filename === normalized ||
        relPath === normalized ||
        fullPath.endsWith(`/${normalized}`);
    }) || null;
  }

  function persistSelectedItem(id) {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? { ...storedState } : {};
    writeStoredState({ ...nextState, selectedId: id, viewerFilterState: { ...viewerState.viewerFilterState } });
  }

  function revealFocusedCard(item) {
    window.setTimeout(() => {
      const escapedId = cssEscape(item.id);
      const selector = `.card[data-id="${escapedId}"], [data-id="${escapedId}"]`;
      const card = document.querySelector(selector);
      if (card instanceof HTMLElement && typeof card.scrollIntoView === "function") {
        card.scrollIntoView({ block: "center", inline: "nearest" });
        card.focus?.({ preventScroll: true });
      }
      applyLocalViewerChrome();
    }, 0);
  }

  function applyFocusRequest(payload, options = {}) {
    const request = focusRequest();
    if (!request.focus) {
      if (!focusApplied && !options.silent && window.location.search.includes("focus=")) {
        window.setTimeout(() => setMeta("Invalid focus target. Loaded corpus without changing selection."), 0);
      }
      focusApplied = true;
      return payload;
    }
    const item = findFocusItem(request.focus);
    if (!item) {
      if (!focusApplied && !options.silent) {
        window.setTimeout(() => setMeta(`Focus target not found: ${request.focus}`), 0);
      }
      focusApplied = true;
      return payload;
    }
    const nextPayload = { ...payload, selectedId: item.id };
    if (focusApplied) {
      persistSelectedItem(item.id);
      return nextPayload;
    }
    viewerState.viewerFilterState = { ...viewerState.viewerFilterState, focus: "all", type: "all", status: "any", relation: "any", activity: "any" };
    persistSelectedItem(item.id);
    focusApplied = true;
    window.setTimeout(() => {
      revealFocusedCard(item);
      if (request.read) {
        showDocument(item).catch((error) => setMeta(error.message));
      } else {
        setMeta(`Focused ${item.relPath || item.id}.`);
      }
    }, 0);
    return nextPayload;
  }

  function selectedItem() {
    const selectedCard = document.querySelector(".card--selected[data-id]");
    const selectedCardId = selectedCard instanceof HTMLElement ? selectedCard.dataset.id : "";
    if (selectedCardId) {
      return latestItems.find((entry) => entry.id === selectedCardId) || null;
    }
    try {
      const state = readStoredState();
      const selectedId = typeof state?.selectedId === "string" ? state.selectedId : "";
      return latestItems.find((entry) => entry.id === selectedId) || null;
    } catch {
      return null;
    }
  }

  // Map a setDocument title to the short subtitle shown in the document
  // header. Replaces the old static "Read-only preview" label; the goal
  // is one line describing what the user is currently looking at.
  function showGettingStarted() {
    setDocument("Getting Started", renderViewerOnboarding());
    setMeta("Getting Started opened.");
  }

  async function createNewRequest(draft) {
    const response = await fetch("/api/new-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: draft || {} })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to create request.");
    }
    postToApp(data.payload, { force: true });
    if (data.created?.id) {
      selectItem(data.created.id);
    }
    setMeta(`Created ${data.created?.path || "request"}.`);
  }

  async function startNewRequest() {
    const modals = window.logicsViewerModals;
    const draft = modals && typeof modals.requestDraft === "function" ? await modals.requestDraft() : null;
    if (!draft) {
      return;
    }
    await createNewRequest(draft);
  }

  function runOnboardingAction(action) {
    const key = String(action || "");
    if (key === "open-logics-insights") {
      withPrimaryAction("insights", "Loading insights", showCorpusInsights);
      return;
    }
    if (key === "health") {
      withPrimaryAction("health", "Checking health", showHealth);
      return;
    }
    if (key === "workshop-explorer") {
      withPrimaryAction("workshop-explorer", "Opening Explorer", () => showWorkshop({ tab: "explorer" }));
      return;
    }
    if (key === "cdx-missions") {
      withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
      return;
    }
    if (key === "new-request") {
      startNewRequest().catch((error) => setMeta(error.message));
      return;
    }
    if (key === "assist-triage") {
      setMeta("Triage assistance is available from the VS Code extension tools.");
      return;
    }
    setMeta("This onboarding action is not available in the local viewer.");
  }

  function documentScreenId(titleText) {
    return String(titleText || "Document").trim() || "Document";
  }

  function desktopScreensCanMinimize() {
    return typeof window.matchMedia !== "function"
      || window.matchMedia("(min-width: 901px)").matches;
  }

  function refitRestoredScreen() {
    requestAnimationFrame(() => {
      refitAllWorkshopTerminals();
      repaintAllWorkshopTerminals();
      resumeActiveWorkshopTerminalStream();
    });
  }

  function minimizedScreenSnapshot() {
    const snapshot = currentDocumentSnapshot();
    const eyebrow = document.getElementById("viewer-document-eyebrow");
    const badge = document.getElementById("viewer-document-badge");
    return {
      id: documentScreenId(snapshot.title),
      title: snapshot.title,
      html: snapshot.html,
      item: currentDocumentItem,
      eyebrow: eyebrow instanceof HTMLElement && !eyebrow.hidden ? eyebrow.textContent || "" : "",
      badgeStage: badge instanceof HTMLElement && !badge.hidden ? badge.dataset.stage || "" : ""
    };
  }

  function renderMinimizedDock() {
    const dock = minimizedDock();
    if (!dock) return;
    dock.innerHTML = "";
    dock.hidden = minimizedScreens.size === 0;
    for (const entry of minimizedScreens.values()) {
      const pill = document.createElement("div");
      pill.className = "viewer-minimized-dock__pill";
      pill.setAttribute("role", "listitem");

      const restore = document.createElement("button");
      restore.className = "viewer-minimized-dock__restore";
      restore.type = "button";
      restore.textContent = entry.title || "Document";
      restore.title = `Restore ${entry.title || "Document"}`;
      restore.setAttribute("data-viewer-minimized-restore", entry.id);

      const close = document.createElement("button");
      close.className = "viewer-minimized-dock__close";
      close.type = "button";
      close.textContent = "×";
      close.title = `Close ${entry.title || "Document"}`;
      close.setAttribute("aria-label", `Close ${entry.title || "Document"}`);
      close.setAttribute("data-viewer-minimized-close", entry.id);

      pill.append(restore, close);
      dock.appendChild(pill);
    }
  }

  function minimizeDocumentPanel() {
    if (!desktopScreensCanMinimize()) return;
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    if (!panel || panel.hidden || !title || !content) return;
    const entry = minimizedScreenSnapshot();
    minimizedScreens.set(entry.id, entry);
    liveMinimizedScreenId = entry.id;
    invalidatePendingViews();
    panel.hidden = true;
    setDocumentChromeOpen(false);
    updateScreenActions("");
    renderMinimizedDock();
    setMeta(`${entry.title} minimized.`);
  }

  function restoreMinimizedScreen(id) {
    const entry = minimizedScreens.get(id);
    if (!entry) return;
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    const stillLive = id === liveMinimizedScreenId
      && panel
      && panel.hidden
      && title?.textContent === entry.title
      && content?.innerHTML === entry.html;
    minimizedScreens.delete(id);
    renderMinimizedDock();
    if (stillLive && panel) {
      panel.hidden = false;
      setDocumentChromeOpen(true);
      updateScreenActions(entry.title);
    } else {
      setDocument(entry.title, entry.html, {
        item: entry.item,
        eyebrow: entry.eyebrow,
        badgeStage: entry.badgeStage,
        forceReset: true
      });
    }
    liveMinimizedScreenId = "";
    refitRestoredScreen();
    setMeta(`${entry.title} restored.`);
  }

  function closeMinimizedScreen(id) {
    const entry = minimizedScreens.get(id);
    if (!entry) return;
    minimizedScreens.delete(id);
    if (id === liveMinimizedScreenId) {
      liveMinimizedScreenId = "";
      const title = documentTitle();
      const content = documentContent();
      viewerDiagnostics.breadcrumb(`closeMinimizedScreen:clear ${entry.title || id}`);
      if (title) title.textContent = "";
      if (content) content.innerHTML = "";
    }
    renderMinimizedDock();
    setMeta(`${entry.title} closed.`);
  }

  function updateScreenActions(titleText) {
    const isGit = titleText === "Remote" && gitState.latestCiScreenMode === "git";
    const isRelease = titleText === "Remote" && gitState.latestCiScreenMode === "release";
    const gitActions = document.getElementById("viewer-git-actions");
    const releaseReset = document.getElementById("viewer-release-reset");
    const status = documentStatusButton();
    const minimize = documentMinimizeButton();
    if (gitActions) gitActions.hidden = !isGit;
    if (!isGit) setGitActionsMenuOpen(false);
    if (releaseReset) releaseReset.hidden = !isRelease;
    if (minimize instanceof HTMLButtonElement) {
      minimize.hidden = !titleText || !desktopScreensCanMinimize();
      minimize.disabled = minimize.hidden;
    }
    if (status instanceof HTMLButtonElement) {
      const options = statusOptionsByStage[currentDocumentItem?.stage] || [];
      const currentStatus = String(currentDocumentItem?.indicators?.Status || currentDocumentItem?.status || "").trim();
      status.hidden = !(currentDocumentItem && currentDocumentItem.relPath && options.length);
      status.disabled = status.hidden;
      status.title = currentStatus ? `Change status from ${currentStatus}` : "Change status";
    }
  }

  function renderDocumentMeta(item) {
    const indicators = item?.indicators && typeof item.indicators === "object" ? item.indicators : {};
    const ordered = ["Status", "Progress", "Understanding", "Confidence", "Complexity", "Theme", "Owner", "From version"];
    const hidden = new Set(["Priority", "Reminder"]);
    const keys = [...ordered, ...Object.keys(indicators).filter((key) => !ordered.includes(key))].filter((key) => !hidden.has(key));
    const chips = keys
      .map((key) => [key, indicators[key]])
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
      .map(([key, value]) => `<span class="viewer-document-meta__chip"><span>${escapeHtml(key)}</span><strong>${renderDocumentMetaValue(key, value)}</strong></span>`);
    return chips.length ? `<section class="viewer-document-meta" aria-label="Document metadata">${chips.join("")}</section>` : "";
  }

  function renderDocumentMetaValue(key, value) {
    if (/^Related /.test(String(key || ""))) {
      const refs = String(value || "").split(",").map((part) => workflowRefInfo(part)).filter(Boolean);
      if (refs.length) {
        return refs
          .map((ref) => `<button class="markdown-preview__doc-ref markdown-preview__doc-ref--${escapeHtml(ref.kind)}" type="button" data-viewer-doc-path="${escapeHtml(ref.target)}" title="${escapeHtml(ref.target)}"><code>${escapeHtml(ref.label)}</code></button>`)
          .join("");
      }
    }
    return escapeHtml(value);
  }

  function roadmapMilestones(markdown) {
    const milestones = [];
    String(markdown || "").split(/\r?\n/).forEach((line) => {
      const match = line.match(/^##\s+(\d+(?:\.\d+){1,2})\s+-\s+(.+?)\s*$/);
      if (match) milestones.push({ version: match[1], title: match[2] });
    });
    return milestones;
  }

  function renderRoadmapMilestones(markdown) {
    const milestones = roadmapMilestones(markdown);
    if (!milestones.length) return "";
    return `<section class="viewer-roadmap" aria-label="Roadmap milestones">
      ${milestones.map((milestone, index) => `
        <div class="viewer-roadmap__milestone">
          <span class="viewer-roadmap__version">${escapeHtml(milestone.version)}</span>
          <span class="viewer-roadmap__dot" aria-hidden="true"></span>
          <span class="viewer-roadmap__title">${escapeHtml(milestone.title)}</span>
          ${index < milestones.length - 1 ? '<span class="viewer-roadmap__line" aria-hidden="true"></span>' : ""}
        </div>
      `).join("")}
    </section>`;
  }

  function workflowRefInfo(value) {
    const raw = String(value || "").trim().replace(/^`|`$/g, "").replace(/\\/g, "/").replace(/^\.?\//, "");
    if (!raw || raw.startsWith("/") || raw.startsWith("~") || raw.split("/").includes("..")) return null;
    const stem = raw.replace(/\.md$/i, "").split("/").pop() || "";
    const directory = raw.split("/").slice(-2, -1)[0] || "";
    const match = stem.match(/^(req|item|task|prod|road|adr|spec)_(\d+)/i);
    if (!match) return null;
    const kindByPrefix = { req: "request", item: "backlog", task: "task", prod: "product", road: "roadmap", adr: "architecture", spec: "spec" };
    const prefixByKind = { request: "R", backlog: "I", task: "T", product: "P", roadmap: "M", architecture: "A", spec: "S" };
    const kind = directory === "specs" ? "spec" : kindByPrefix[match[1].toLowerCase()];
    const prefix = prefixByKind[kind];
    return prefix ? { label: `${prefix}${match[2]}`, target: raw, kind } : null;
  }

  function documentPriorityNode() {
    let node = document.getElementById("viewer-document-priority");
    if (node instanceof HTMLElement) return node;
    const title = documentTitle();
    if (!(title instanceof HTMLElement) || !(title.parentElement instanceof HTMLElement)) return null;
    node = document.createElement("span");
    node.id = "viewer-document-priority";
    node.className = "viewer-document__priority";
    node.hidden = true;
    title.parentElement.insertBefore(node, title);
    return node;
  }

  function updateDocumentPriority(item) {
    const node = documentPriorityNode();
    if (!(node instanceof HTMLElement)) return;
    const priority = String(item?.indicators?.Priority || "").trim();
    if (!priority) {
      node.innerHTML = "";
      node.hidden = true;
      return;
    }
    const level = priority.toLowerCase();
    const knownLevel = level === "low" || level === "high" ? level : "medium";
    const filled = knownLevel === "high" ? 3 : knownLevel === "low" ? 1 : 2;
    const bars = [1, 2, 3]
      .map((index) => `<span class="${index <= filled ? "card__priority-bar card__priority-bar--on" : "card__priority-bar"}"></span>`)
      .join("");
    node.innerHTML = `<span class="card__priority-meter card__priority-meter--${knownLevel}" title="Priority: ${escapeHtml(priority)}" role="img" aria-label="Priority: ${escapeHtml(priority)}">${bars}</span>`;
    node.hidden = false;
  }

  function parseDocumentIndicators(markdown) {
    const indicators = {};
    String(markdown || "").split(/\r?\n/).some((line) => {
      if (!line.trim()) return false;
      const match = line.match(/^>\s*([^:]+):\s*(.+?)\s*$/);
      if (!match) return false;
      indicators[match[1].trim()] = match[2].trim();
      return false;
    });
    return indicators;
  }

  function documentItemWithIndicators(item, markdown, relPath) {
    return {
      ...item,
      relPath,
      indicators: { ...parseDocumentIndicators(markdown), ...(item?.indicators || {}) }
    };
  }

  // Open a new view transition. `silent` transitions (auto-refresh) are
  // subordinate: they never abort an operator's in-flight fetch and never
  // commit once the operator has navigated elsewhere. Operator transitions
  // abort the previous operator fetch so the latest navigation always wins.
  function beginView(options = {}) {
    const silent = Boolean(options.silent);
    const seq = ++viewSeq;
    let userSeq = userViewSeq;
    let signal;
    if (!silent) {
      userSeq = ++userViewSeq;
      if (activeUserViewController) {
        activeUserViewController.abort();
      }
      activeUserViewController = new AbortController();
      signal = activeUserViewController.signal;
    }
    return { seq, userSeq, silent, signal };
  }

  function invalidatePendingViews() {
    viewSeq += 1;
    userViewSeq += 1;
  }

  // True when a newer transition has superseded `view` and it must not commit.
  function isViewStale(view) {
    if (!view) {
      return false; // untracked callers always commit
    }
    if (view.silent) {
      // Subordinate: yield to any later transition, and to any operator nav.
      return view.userSeq !== userViewSeq || view.seq !== viewSeq;
    }
    // Operator transition: superseded only by a later operator transition.
    // A silent auto-refresh must never suppress the operator's own commit.
    return view.userSeq !== userViewSeq;
  }

  // Find the nearest scrollable ancestor so we can preserve scroll position
  // across an in-place re-render. Falls back to the page scrolling element.
  // Capture scroll position, open <details> (keyed by summary text), and the
  // focused element (keyed by id / data-viewer-focus-key) so an auto-refresh
  // repaint of the same screen does not jump the user back to the top or
  // collapse what they had open. Mirrors the state-preservation the Git screen
  // already does, generalized to every screen.
  // Human label for the corpus-type pill shown in the document header.
  function setDocument(titleText, html, options = {}) {
    invalidatePendingViews();
    cdxState.cdxCloseTarget = null;
    const screenId = documentScreenId(titleText);
    if (minimizedScreens.delete(screenId)) {
      if (liveMinimizedScreenId === screenId) liveMinimizedScreenId = "";
      renderMinimizedDock();
    }
    currentDocumentItem = options.item || null;
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    const eyebrow = document.getElementById("viewer-document-eyebrow");
    // A same-screen repaint (e.g. an auto-refresh tick re-rendering the screen
    // already shown) should preserve the user's scroll / open sections / focus
    // instead of resetting to the top. Navigations to a different screen, or an
    // explicit options.forceReset, render fresh.
    const previousTitle = title ? title.textContent : "";
    const sameScreenRepaint = Boolean(content)
      && content.childNodes.length > 0
      && !options.forceReset
      && previousTitle === (titleText || "Document");
    const preserved = sameScreenRepaint ? captureDocumentViewState(content) : null;
    const previousDocument = content && content.childNodes.length > 0
      ? { title: previousTitle || "Document", html: content.innerHTML }
      : viewerDiagnostics.healthyDocument();
    viewerDiagnostics.breadcrumb(`setDocument:start ${titleText || "Document"}`);
    try {
      if (title) {
        title.textContent = titleText || "Document";
      }
      if (eyebrow instanceof HTMLElement) {
        // For corpus docs the title is the object name and the pill carries the
        // type, so surface the file path as the subtitle instead of the derived
        // "Logics request" label; other screens keep the derived description.
        const description = options.eyebrow !== undefined ? String(options.eyebrow || "") : describeDocumentScreen(titleText);
        eyebrow.textContent = description;
        eyebrow.hidden = !description;
      }
      updateDocumentBadge(options.badgeStage);
      updateDocumentPriority(currentDocumentItem);
      updateScreenActions(titleText);
      if (content) {
        content.innerHTML = html || "";
        updateDocumentHeaderNav(content);
      }
      if (panel) {
        panel.hidden = false;
        setDocumentChromeOpen(true);
        if (!sameScreenRepaint && typeof panel.scrollIntoView === "function") {
          panel.scrollIntoView({ block: "nearest" });
        }
      }
      renderMermaidDiagrams();
      if (preserved) restoreDocumentViewState(content, preserved);
      viewerDiagnostics.rememberHealthyDocument();
      if (content && content.childNodes.length === 0) viewerDiagnostics.recoverBlankDocument();
      viewerDiagnostics.breadcrumb(`setDocument:end ${titleText || "Document"}`);
    } catch (error) {
      viewerDiagnostics.recordError(error, { kind: "render-error", screen: titleText || "Document" });
      if (previousDocument && content) {
        void viewerDiagnostics.recoverDocument(previousDocument, "render-error-recovery");
        if (panel) panel.hidden = false;
      }
    }
  }
  function currentDocumentSnapshot(fallbackTitle = "Document") {
    const title = documentTitle();
    const content = documentContent();
    return {
      title: title?.textContent || fallbackTitle,
      html: content?.innerHTML || ""
    };
  }

  async function closeDocumentPanel() {
    const target = cdxState.cdxCloseTarget;
    cdxState.cdxCloseTarget = null;
    if (target?.type === "cdx-report") {
      setDocument(target.title || "CDX run report", target.html || "");
      cdxState.cdxCloseTarget = { type: "cdx-runs" };
      setMeta("Returned to CDX run report.");
      return;
    }
    if (target?.type === "cdx-runs") {
      await showCdxRuns({ silent: true });
      setMeta("Returned to CDX reports.");
      return;
    }
    const panel = documentPanel();
    if (panel) {
      invalidatePendingViews();
      const screenId = documentScreenId(documentTitle()?.textContent || "");
      if (screenId && minimizedScreens.delete(screenId)) renderMinimizedDock();
      if (liveMinimizedScreenId === screenId) liveMinimizedScreenId = "";
      panel.hidden = true;
      setDocumentChromeOpen(false);
    }
    updateScreenActions("");
  }
  function renderMermaidDiagrams() {
    const nodes = Array.from(document.querySelectorAll(".mermaid"));
    if (nodes.length === 0) {
      return;
    }
    if (!window.mermaid) {
      showMermaidFallback("Mermaid preview unavailable. Raw diagram source shown below.");
      return;
    }
    try {
      if (!mermaidInitialized && typeof window.mermaid.initialize === "function") {
        window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "dark" });
        mermaidInitialized = true;
      }
      if (typeof window.mermaid.run !== "function") {
        showMermaidFallback("Mermaid preview unavailable. Raw diagram source shown below.");
        return;
      }
      Promise.resolve(window.mermaid.run({ nodes })).catch((error) => {
        const detail = error instanceof Error ? error.message : String(error);
        showMermaidFallback(`Mermaid preview unavailable. Raw diagram source shown below. (${detail})`);
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      showMermaidFallback(`Mermaid preview unavailable. Raw diagram source shown below. (${detail})`);
    }
  }

  function applyLocalViewerChrome() {
    if (applyingLocalChrome) {
      return;
    }
    applyingLocalChrome = true;
    try {
      const hiddenActions = ["promote", "mark-done", "mark-obsolete", "change-status"];
      hiddenActions.forEach((action) => {
        document.querySelectorAll(`[data-action="${action}"]`).forEach((element) => {
          if (!(element instanceof HTMLElement)) {
            return;
          }
          element.hidden = true;
          element.setAttribute("aria-hidden", "true");
          if ("disabled" in element) {
            element.disabled = true;
          }
        });
      });

      document.querySelectorAll('[data-action="open"]').forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        element.hidden = true;
        element.setAttribute("aria-hidden", "true");
        if ("disabled" in element) {
          element.disabled = true;
        }
      });

      document.querySelectorAll('[data-action="read"]').forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        element.textContent = "Read document";
        element.title = "Read selected document";
      });

      const editButton = editDocumentButton();
      if (editButton instanceof HTMLButtonElement) {
        const item = selectedItem();
        editButton.disabled = !item;
        editButton.title = item ? "Open selected document in the system editor" : "Select a document to edit";
      }

      document.querySelectorAll(".column__menu-item").forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        const label = (element.textContent || "").trim().toLowerCase();
        if (label === "promote" || label === "open") {
          element.hidden = true;
          element.setAttribute("aria-hidden", "true");
        }
        if (label === "read") {
          element.textContent = "Read document";
        }
      });
    } finally {
      applyingLocalChrome = false;
    }
  }

  function postToApp(payload, options = {}) {
    markConnectionHealthy({ silent: Boolean(options.silent) });
    const nextSignature = viewerStateSignature(payload);
    if (!options.force && latestViewerStateSignature && nextSignature === latestViewerStateSignature) {
      if (!options.silent) {
        setMeta(`Checked just now · no viewer changes (${new Date().toLocaleTimeString()})`);
      }
      scheduleNextAutoRefresh();
      return false;
    }
    latestViewerStateSignature = nextSignature;
    const payloadRoot = String(payload?.root || viewerState.latestRepoRoot || "");
    latestItems = updateStoredActivity(Array.isArray(payload.items) ? payload.items : [], payloadRoot);
    if (!autoRefreshIntervalTouched) {
      const launchSeconds = Number(payload.autoRefreshIntervalSeconds);
      const preferredSeconds = preferredAutoRefreshIntervalSeconds();
      autoRefreshIntervalForcedByLaunch = Boolean(payload.autoRefreshIntervalForced);
      const nextSeconds = autoRefreshIntervalForcedByLaunch || preferredSeconds === null
        ? launchSeconds
        : preferredSeconds;
      autoRefreshIntervalMs = normalizeAutoRefreshIntervalSeconds(nextSeconds) * 1000;
      updateRefreshIntervalControl();
    }
    updateRepositoryIdentity(payload);
    latestCapabilities = normalizeCapabilities(payload);
    latestCanBootstrapLogics = Boolean(payload?.canBootstrapLogics);
    latestShouldPromptBootstrapLogics = typeof payload?.shouldPromptBootstrapLogics === "boolean"
      ? payload.shouldPromptBootstrapLogics
      : latestCapabilities.logics?.available === false;
    latestBootstrapLogicsTitle = String(payload?.bootstrapLogicsTitle || "Bootstrap Logics in this project");
    applyLanBanner(Boolean(payload?.lanMode), String(payload?.lanShareUrl || ""), Boolean(payload?.lanRwMode));
    updateCapabilityControls();
    const payloadWithActivity = { ...payload, items: latestItems, activityEvents: activityEventsFromStoredState(readStoredState(), payloadRoot) };
    const nextPayload = applyFocusRequest(payloadWithActivity, { silent: Boolean(options.silent) });
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload: nextPayload } }));
    const rootName = payload.root ? payload.root.split(/[\\/]/).filter(Boolean).pop() : "repository";
    if (!options.silent) {
      setMeta(`${rootName} · ${payload.items.length} docs · refreshed ${new Date().toLocaleTimeString()}`);
    }
    scheduleNextAutoRefresh();
    updateVersionLink(payload.updateInfo);
    renderUpdateNotice(payload.updateInfo, payload.cdxUpdateInfo);
    latestEnvironmentWarning = payload.bootstrapWarning || payload.environmentWarning || null;
    renderEnvironmentWarning(latestEnvironmentWarning);
    refreshBadgeCounters();
    maybePromptBootstrapLogics();
    updateFilterSummary();
    applyLocalViewerChrome();
    bindRefreshMenuControls();
    bindFocusMenuControls();
    if (activityPanelIsOpen()) {
      dispatchViewerActivityUpdate();
    }
    return true;
  }

  function renderUpdateNotice(updateInfo, cdxUpdateInfo) {
    const banner = updateBanner();
    if (!(banner instanceof HTMLElement)) {
      return;
    }
    const notices = [
      { name: "logics-manager", fallbackCommand: "logics-manager self-update", info: updateInfo },
      { name: "cdx", fallbackCommand: "cdx update", info: cdxUpdateInfo }
    ].filter(({ info }) => info && info.updateAvailable === true && info.latestVersion);
    if (notices.length === 0) {
      banner.hidden = true;
      return;
    }
    const copy = updateCopy();
    const command = updateCommand();
    if (copy) {
      const messages = notices
        .map(({ name, info }) => `${name} ${info.latestVersion} is available. Current version: ${info.currentVersion || "unknown"}.`);
      copy.textContent = messages.join(" ");
    }
    if (command) {
      command.textContent = notices.length
        ? notices.map(({ fallbackCommand, info }) => info.updateCommand || fallbackCommand).join(" && ")
        : "";
    }
    banner.hidden = false;
  }

  async function loadItems(method = "GET", options = {}) {
    if (itemsLoadInFlight) {
      return false;
    }
    itemsLoadInFlight = true;
    try {
      if (!options.silent) {
        setMeta("Refreshing...");
      }
      const response = await fetch(method === "POST" ? "/api/refresh" : "/api/items", { method });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to load viewer data.");
      }
      const changed = postToApp(data.payload, { silent: Boolean(options.silent), force: Boolean(options.force) });
      if (method !== "POST") {
        await refreshGitBadgeCounters();
      }
      return changed;
    } catch (error) {
      markConnectionDisconnected(error);
      throw error;
    } finally {
      itemsLoadInFlight = false;
    }
  }

  // Git and CI render into a single merged screen titled "Remote"; the
  // active section (git / runs / release) is tracked by gitState.latestCiScreenMode.

  function isWorkspaceOpen() {
    // Explorer is now a Workshop sub-tab; it's "open" when its panel is mounted.
    const panel = documentPanel();
    return Boolean(panel && !panel.hidden && document.querySelector("[data-viewer-workshop-explorer]"));
  }

  async function refreshViewer(method = "POST", options = {}) {
    const changed = await loadItems(method, options);
    if (isWorkspaceOpen()) {
      if (changed || options.force) {
        await showWorkspace({ silent: Boolean(options.silent) });
      }
    } else if (isGitCiScreenOpen()) {
      if (gitState.latestCiScreenMode === "release") {
        await showReleaseStatus({ silent: Boolean(options.silent), force: Boolean(options.force) });
      } else if (gitState.latestCiScreenMode === "runs") {
        await showCiStatus({ silent: Boolean(options.silent), skipUnchanged: !changed && !options.force, force: Boolean(options.force) });
      } else {
        await showGitStatus({ preserve: true, silent: Boolean(options.silent), skipUnchanged: !changed && !options.force, force: Boolean(options.force) });
      }
    } else if (isCdxStatusOpen()) {
      await showCdxStatus({ silent: Boolean(options.silent), skipUnchanged: !changed && !options.force, force: Boolean(options.force) });
    } else if (isCdxRunsOpen()) {
      if (changed || options.force) {
        await showCdxRuns({ silent: Boolean(options.silent) });
      }
    } else if (isCdxHistoryOpen()) {
      if (changed || options.force) {
        await showCdxHistory({ silent: Boolean(options.silent) });
      }
    } else if (method === "POST") {
      // Background tick with no screen open: refresh the unified status badges
      // (git + CI + CDX) rather than git alone, so the CI/CDX badges no longer
      // go stale until their screen is opened.
      await refreshBadgeCounters();
    }
    if (!changed && !options.silent && !options.force) {
      setMeta(`Checked just now · no viewer changes (${new Date().toLocaleTimeString()})`);
    }
  }

  // Manual GIT-screen refresh only: pull remote-tracking refs up to date so the
  // ahead/behind badges reflect the real remote. Best-effort — a failed fetch
  // (offline, auth-required remote) still falls through to a status refresh.

  // req_313: a screen is declared once, with its title and how it refreshes, instead of
  // being recognised by a chain of comparisons against the title string. Adding a screen
  // used to mean editing a router, a wiring block and a conditional chain, with nothing
  // failing if one of the three was forgotten.
  const screenRegistry = [
    { title: "Getting Started", refresh: () => showGettingStarted() },
    { title: "CDX status", refresh: (opts) => showCdxStatus(opts) },
    { title: "CDX missions", refresh: (opts) => showCdxMissions(opts) },
    { title: "CDX reports", refresh: (opts) => showCdxRuns(opts) },
    { title: "CDX history", refresh: (opts) => showCdxHistory(opts) },
    { title: "CDX memory", refresh: (opts) => showCdxMemory(opts) },
    { title: "CDX disk", refresh: (opts) => showCdxDisk(opts) },
    { title: "Corpus insights", refresh: () => showCorpusInsights() },
    { title: "Validation health", refresh: () => showHealth() },
    {
      title: "Remote",
      // Remote is three sub-screens behind one title; the mode decides which refreshes.
      refresh: async (opts) => {
        if (gitState.latestCiScreenMode === "release") return showReleaseStatus(opts);
        if (gitState.latestCiScreenMode === "runs") return showCiStatus(opts);
        setMeta("Fetching from remote...");
        await fetchGitRemote();
        return showGitStatus({ preserve: true, ...opts });
      }
    },
    {
      title: "Workshop",
      refresh: (opts) => {
        // For mounted terminals, Refresh should redraw in place (SIGWINCH nudge)
        // rather than tear down and replay the whole server buffer.
        if (preferredWorkshopTab() === "terminals" && hasMountedWorkshopTerminals()) {
          const count = redrawWorkshopTerminals();
          setMeta(count === 1 ? "Redrew 1 terminal." : `Redrew ${count} terminals.`);
          return undefined;
        }
        return showWorkshop(opts);
      }
    }
  ];

  function screenFor(title) {
    return screenRegistry.find((screen) => screen.title === title) || null;
  }

  async function refreshCurrentScreen() {
    const panel = documentPanel();
    const title = documentTitle();
    if (!panel || panel.hidden || !title) return;
    const screen = title.textContent || "";
    viewerDiagnostics.breadcrumb(`refreshCurrentScreen ${screen}`);
    const declared = screenFor(screen);
    // Anything not declared is a workflow document, addressed by its path.
    return declared ? declared.refresh({ force: true }) : showDocumentByPath(screen);
  }

  function autoRefreshItems() {
    if (!autoRefreshEnabled) {
      return;
    }
    if (document.hidden) {
      refreshAfterVisible = true;
      return;
    }
    refreshViewer("POST", { silent: true }).catch((error) => setMeta(error.message));
  }

  function startAutoRefresh() {
    if (autoRefreshStarted) {
      return;
    }
    autoRefreshStarted = true;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && refreshAfterVisible) {
        refreshAfterVisible = false;
        autoRefreshItems();
      }
    });
  }

  function setAutoRefreshEnabled(enabled) {
    autoRefreshEnabled = Boolean(enabled);
    if (autoRefreshEnabled) viewerDiagnostics.resetCircuit();
    const control = autoRefreshControl();
    if (control instanceof HTMLInputElement) {
      control.checked = autoRefreshEnabled;
    }
    scheduleNextAutoRefresh();
  }

  function setDropdownOpen(panel, button, open) {
    if (!panel) return;
    panel.hidden = !open;
    if (button instanceof HTMLElement) button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  async function copyViewerDiagnostics() {
    const response = await fetch("/api/viewer-diagnostics?limit=50");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || "Unable to load viewer diagnostics.");
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      current: window.logicsViewer?.diagnostics?.().state || {},
      ...data.payload
    };
    const copied = await copyTextToClipboard(JSON.stringify(exportPayload, null, 2));
    if (!copied) throw new Error("Clipboard access was refused.");
    setMeta(`Copied ${data.payload?.entries?.length || 0} viewer diagnostic entries.`);
  }

  function setRefreshMenuOpen(open) {
    setDropdownOpen(refreshMenuPanel(), refreshMenuButton(), open);
  }

  function renderSettingsScreen() {
    const vscode = Boolean(document.getElementById("viewer-vscode-section") && !document.getElementById("viewer-vscode-section").hidden);
    return `<div class="viewer-settings-screen">
      <section class="viewer-settings-screen__hero"><p class="viewer-settings-screen__eyebrow">Viewer controls</p><h2>Settings</h2><p>Controls are scoped to this viewer and project.</p></section>
      <div class="viewer-settings-screen__grid">
        <section class="viewer-settings-card"><h3>Refresh</h3><label class="viewer-auto-refresh"><input type="checkbox" data-viewer-settings-auto-refresh ${autoRefreshEnabled ? "checked" : ""} /><span>Automatic refresh</span></label><label class="viewer-refresh-menu__interval"><span>Interval</span><select data-viewer-settings-interval aria-label="Automatic refresh interval"><option value="5">5 sec</option><option value="10">10 sec</option><option value="15">15 sec</option><option value="30">30 sec</option><option value="60">60 sec</option></select></label><button class="btn" type="button" data-viewer-settings-action="refresh">Refresh now</button></section>
        <section class="viewer-settings-card"><h3>Corpus</h3><button class="btn" type="button" data-viewer-settings-action="insights">Insights</button><button class="btn" type="button" data-viewer-settings-action="health">Health</button><button class="btn" type="button" data-viewer-settings-action="getting-started">Getting Started</button></section>
        <section class="viewer-settings-card"><h3>ChatGPT Developer Mode</h3><p>Start a temporary HTTPS MCP connector only when you choose ON.</p><button class="btn" type="button" data-viewer-settings-action="mcp">Open MCP controls</button></section>
        <section class="viewer-settings-card"><h3>Server</h3><button class="btn" type="button" data-viewer-settings-action="copy-diagnostics">Copy diagnostics</button><button class="btn" type="button" data-viewer-settings-action="restart">Restart viewer</button><button class="btn" type="button" data-viewer-settings-action="stop">Stop viewer</button></section>
        ${vscode ? '<section class="viewer-settings-card"><h3>VS Code panel</h3><button class="btn" type="button" data-viewer-settings-action="vscode-reload">Reload</button><button class="btn" type="button" data-viewer-settings-action="vscode-restart">Restart panel</button><button class="btn" type="button" data-viewer-settings-action="vscode-external">Open externally</button></section>' : ""}
      </div>
    </div>`;
  }

  function showSettings() {
    setDocument("Settings", renderSettingsScreen(), { eyebrow: "Viewer controls" });
    const interval = document.querySelector("[data-viewer-settings-interval]");
    if (interval instanceof HTMLSelectElement) interval.value = String(Math.round(autoRefreshIntervalMs / 1000));
    setMeta("Settings loaded.");
  }

  async function showChatgptMcp() {
    const response = await fetch("/api/mcp-connector");
    const data = await response.json().catch(() => ({}));
    const state = data.payload || {};
    const ready = state.running && state.url;
    const token = String(state.token || "");
    setDocument("ChatGPT Developer Mode", `<div class="viewer-settings-screen"><section class="viewer-settings-screen__hero"><p class="viewer-settings-screen__eyebrow">Per-project MCP connector</p><h2>${state.running ? "Connector ON" : "Connector OFF"}</h2><p>${ready ? "Copy the HTTPS /mcp URL and bearer token into ChatGPT developer mode. Stop it when you are done." : state.running ? "Starting the secure tunnel… the URL will appear here shortly." : "Nothing is exposed until you turn this connector on."}</p></section><section class="viewer-settings-card"><h3>ChatGPT connection</h3>${ready ? `<code class="viewer-mcp-url">${escapeHtml(state.url)}</code><button class="btn" type="button" data-viewer-mcp-copy="${escapeHtml(state.url)}">Copy URL</button>${token ? `<button class="btn" type="button" data-viewer-mcp-copy="${escapeHtml(token)}" data-viewer-mcp-copy-kind="token">Copy token</button>` : ""}` : ""}${state.error ? `<p>${escapeHtml(state.error)}</p>` : ""}<button class="btn" type="button" data-viewer-mcp-action="${state.running ? "stop" : "start"}">${state.running ? "OFF — stop connector" : "ON — start connector"}</button>${state.running && !ready ? '<button class="btn" type="button" data-viewer-mcp-action="refresh">Refresh status</button>' : ""}</section></div>`, { eyebrow: "Settings / ChatGPT Developer Mode" });
    setMeta(ready ? "MCP connector ready." : state.running ? "MCP connector starting." : "MCP connector is off.");
  }


  // Open/close a topbar sub-section menu. Opening one closes the others so at
  // most one nav menu is visible at a time.
  function bindRefreshMenuControls() {
    const button = refreshMenuButton();
    if (button) {
      button.onclick = (event) => {
        event.stopPropagation();
        withPrimaryAction("settings", "Opening settings", showSettings);
      };
    }
    const panel = refreshMenuPanel();
    if (panel) {
      panel.onclick = (event) => {
        event.stopPropagation();
      };
    }
  }

  function matchesViewerFilter(item) {
    return matchesFilterState(item, viewerState.viewerFilterState);
  }

  function applyViewerFilter(group, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultFilterState, group)) {
      return;
    }
    viewerState.viewerFilterState = { ...viewerState.viewerFilterState, [group]: value || defaultFilterState[group] };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    // The inherited hide toggles used to be re-armed here on every selection, which is
    // how filtering the board was what emptied it. They are no longer consulted while
    // this panel is installed, so setting them would only be theatre -- but their change
    // events were also the only thing redrawing the board, so the redraw is asked for.
    updateFilterSummary();
    requestBoardRender();
  }

  function setFocusMenuOpen(open) {
    const menu = document.getElementById("focus-menu-options");
    const button = document.getElementById("focus-menu-toggle");
    if (menu) menu.hidden = !open;
    if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function updateFocusMenuState() {
    const value = viewerState.viewerFilterState.focus || defaultFilterState.focus;
    const label = focusFilterLabel(value);
    const labelNode = document.getElementById("focus-menu-label");
    const button = document.getElementById("focus-menu-toggle");
    if (labelNode) labelNode.textContent = label;
    if (button) button.title = `Corpus focus: ${label}`;
    document.querySelectorAll("[data-viewer-focus-value]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.setAttribute("aria-checked", node.getAttribute("data-viewer-focus-value") === value ? "true" : "false");
      }
    });
  }

  function bindFocusMenuControls() {
    const button = document.getElementById("focus-menu-toggle");
    const menu = document.getElementById("focus-menu-options");
    if (button) {
      button.onclick = (event) => {
        event.stopPropagation();
        setFocusMenuOpen(Boolean(menu?.hidden));
      };
    }
    if (menu) {
      menu.onclick = (event) => {
        event.stopPropagation();
      };
    }
    document.querySelectorAll("[data-viewer-focus-value]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.onclick = () => {
          applyViewerFilter("focus", node.getAttribute("data-viewer-focus-value") || "");
          setFocusMenuOpen(false);
        };
      }
    });
  }

  function clearLocalPreset() {
    viewerState.viewerFilterState = { ...defaultFilterState };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    setControlValue("search-input", "", "input");
    updateFilterSummary();
    requestBoardRender();
  }

  // Every render is a chance for the count to be wrong, so every render recomputes it --
  // whatever moved the board: the panel, the search box, or a refresh.
  window.__CDX_LOGICS_AFTER_RENDER__ = () => updateFilterSummary();

  function requestBoardRender() {
    if (typeof window.__CDX_LOGICS_RENDER__ === "function") {
      window.__CDX_LOGICS_RENDER__();
    }
  }

  function updateFilterSummary() {
    updateFocusMenuState();
    const activeLabels = Object.entries(viewerState.viewerFilterState)
      .filter(([key, value]) => value !== defaultFilterState[key])
      .map(([key, value]) => `${key}: ${String(value).replace("-", " ")}`);
    const hasActiveFilters = activeLabels.length > 0;
    const filterButton = document.getElementById("filter-toggle");
    if (filterButton instanceof HTMLElement) {
      filterButton.setAttribute("data-viewer-filter-active", String(hasActiveFilters));
      filterButton.setAttribute("data-has-active-controls", String(hasActiveFilters));
      filterButton.classList.toggle("toolbar__filter--active", hasActiveFilters);
    }
    document.querySelectorAll("[data-viewer-filter-group]").forEach((control) => {
      if (control instanceof HTMLSelectElement) {
        const group = control.getAttribute("data-viewer-filter-group") || "";
        control.value = viewerState.viewerFilterState[group] || defaultFilterState[group] || "";
        return;
      }
      if (control instanceof HTMLElement) {
        const group = control.getAttribute("data-viewer-filter-group") || "";
        const value = control.getAttribute("data-viewer-filter-value") || "";
        control.setAttribute("aria-pressed", viewerState.viewerFilterState[group] === value ? "true" : "false");
      }
    });
    updateFilterOptionCounts({ items: latestItems, filterState: viewerState.viewerFilterState });
    const count = filterCount();
    if (!count) {
      return;
    }
    // Ask the board's own predicate when it is available: the panel predicate alone was
    // only half the filtering the board applied, which is how this number came to
    // contradict the screen underneath it.
    const visibleCount = typeof window.__CDX_LOGICS_VISIBLE_COUNT__ === "function"
      ? window.__CDX_LOGICS_VISIBLE_COUNT__()
      : latestItems.filter(matchesViewerFilter).length;
    const suffix = activeLabels.length > 0 ? ` · ${activeLabels.join(" · ")}` : " · All docs";
    count.textContent = `${visibleCount} of ${latestItems.length} docs shown${suffix}`;
  }

  function renderInsightBars(entries, total) {
    const denominator = Math.max(1, Number(total) || 0);
    if (!entries.length) {
      return '<li class="viewer-insights__bar-row">No corpus shape available</li>';
    }
    return entries.map(([label, value]) => {
      const count = Number(value) || 0;
      const width = Math.max(count > 0 ? 4 : 0, Math.min(100, Math.round((count / denominator) * 100)));
      return `
        <li class="viewer-insights__bar-row">
          <div class="viewer-insights__bar-meta"><span>${escapeHtml(label)}</span><strong>${escapeHtml(count)}</strong></div>
          <div class="viewer-insights__bar-track" aria-hidden="true"><span style="width: ${width}%"></span></div>
        </li>
      `;
    }).join("");
  }

  function buildCorpusInsights(lintData = null, auditData = null) {
    const docs = latestItems;
    const itemPaths = new Set(docs.map((item) => item.relPath).filter(Boolean));
    const countsByStage = countBy(docs, (item) => item.stage);
    const closed = docs.filter(isClosed);
    const open = docs.filter((item) => !isClosed(item));
    const blocked = docs.filter((item) => statusValue(item).includes("blocked"));
    const missingStatus = docs.filter(hasMissingOrAmbiguousStatus);
    const recentlyModified = docs.filter((item) => isRecent(item, 7));
    const incompleteChains = docs.filter((item) => ["request", "backlog"].includes(item.stage) && !item.isPromoted && !isClosed(item));
    const unlinked = docs.filter((item) => (item.references || []).length === 0 && (item.usedBy || []).length === 0);
    const brokenRefs = [];
    const relationshipCounts = {};
    docs.forEach((item) => {
      relationshipCounts[item.stage] = (relationshipCounts[item.stage] || 0) + (item.references || []).length + (item.usedBy || []).length;
      (item.references || []).forEach((ref) => {
        if (ref.path && isSafeLogicsDocPath(ref.path) && !itemPaths.has(ref.path)) {
          brokenRefs.push(`${item.id} -> ${ref.path}`);
        }
      });
    });
    const mostReferenced = [...docs]
      .sort((left, right) => (right.usedBy || []).length - (left.usedBy || []).length)
      .filter((item) => (item.usedBy || []).length > 0)
      .slice(0, 8);
    const recentRows = [...docs]
      .sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0))
      .slice(0, 8);
    const staleActive = open.filter(isStale).slice(0, 8);
    const qualityFindings = lintData && auditData ? collectHealthFindings(lintData, auditData) : [];
    const qualityBySource = countBy(qualityFindings, (finding) => finding.source || finding.code || "finding");
    const qualityByDocType = countBy(qualityFindings, (finding) => {
      const path = String(finding.path || "");
      const matched = docs.find((item) => item.relPath === path);
      return matched?.stage || (path ? "unknown document" : "repository");
    });
    const concentratedIssues = Object.entries(countBy(qualityFindings, (finding) => finding.path || "repository"))
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .slice(0, 8);
    const actions = [];
    if (blocked.length) {
      actions.push({ label: "Review blocked workflow docs", value: blocked.length, filter: { group: "focus", value: "blocked" } });
    }
    if (incompleteChains.length) {
      actions.push({ label: "Promote or close incomplete workflow chains", value: incompleteChains.length, filter: { group: "focus", value: "needs-promotion" } });
    }
    if (brokenRefs.length) {
      actions.push({ label: "Repair broken references", value: brokenRefs.length, health: true });
    }
    if (qualityFindings.length) {
      actions.push({ label: "Open validation health", value: qualityFindings.length, health: true });
    }
    if (missingStatus.length) {
      actions.push({ label: "Normalize missing or ambiguous statuses", value: missingStatus.length, path: missingStatus[0]?.relPath || "" });
    }
    if (!actions.length) {
      actions.push({ label: "No immediate operator action detected", value: "OK" });
    }

    const stageRows = Object.entries(countsByStage)
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
      .map(([stage, count]) => [stage, count]);
    const qualityTotal = qualityFindings.length;
    const needsAttention = blocked.length + incompleteChains.length + brokenRefs.length + missingStatus.length + qualityTotal;
    const activeQuiet = Math.max(0, open.length - recentlyModified.length - staleActive.length);
    const primaryState = needsAttention > 0
      ? `${needsAttention} signals need attention`
      : "No immediate workflow risk detected";
    return `
      <div class="viewer-insights">
        <section class="viewer-insights__hero">
          <div>
            <h2>Overview</h2>
            <p>${escapeHtml(primaryState)} across ${escapeHtml(docs.length)} workflow docs.</p>
          </div>
          <div class="viewer-insights__summary">${renderMetricCards([
            ["Docs", docs.length],
            ["Needs attention", needsAttention, needsAttention ? "warning" : "ok"],
            ["Recent 7d", recentlyModified.length],
            ["Quality findings", qualityTotal, qualityTotal ? "warning" : "ok"]
          ])}</div>
        </section>
        <section class="viewer-insights__section">
          <h2>Operator actions</h2>
          <ul class="viewer-insights__rows viewer-insights__rows--actions">${renderActionRows(actions)}</ul>
        </section>
        <div class="viewer-insights__workspace">
          <section class="viewer-insights__section">
            <h2>Corpus shape</h2>
            <ul class="viewer-insights__bars">${renderInsightBars(stageRows, docs.length)}</ul>
            <ul class="viewer-insights__list">${renderInsightRows([
              ["Open", open.length],
              ["Closed", closed.length],
              ["Blocked", blocked.length],
              ["Missing status", missingStatus.length]
            ])}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Flow health</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
              ["Incomplete workflow chains", incompleteChains.length, incompleteChains.length ? "warning" : "ok"],
              ["Promotion gaps", incompleteChains.filter((item) => item.stage === "request" || item.stage === "backlog").length, incompleteChains.length ? "warning" : "ok"],
              ["Orphan or unlinked docs", unlinked.length, unlinked.length ? "muted" : "ok"],
              ["Broken reference risks", brokenRefs.length, brokenRefs.length ? "warning" : "ok"]
            ])}</ul>
            <ul class="viewer-insights__rows">${renderDocRows(incompleteChains, "No incomplete chains")}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Activity</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
              ["Recently active docs", recentlyModified.length],
              ["Stale active docs", staleActive.length, staleActive.length ? "warning" : "ok"],
              ["Quiet active docs", activeQuiet]
            ])}</ul>
            <ul class="viewer-insights__rows">${renderDocRows(recentRows, "No recent documents")}</ul>
          </section>
          <section class="viewer-insights__section">
            <h2>Traceability</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
              ["Broken references", brokenRefs.length, brokenRefs.length ? "warning" : "ok"],
              ["Unlinked docs", unlinked.length, unlinked.length ? "muted" : "ok"],
              ["Most referenced docs", mostReferenced.map((item) => `${item.id} (${(item.usedBy || []).length})`).join(", ") || "None"],
              ["Relationships by type", Object.entries(relationshipCounts).map(([stage, count]) => `${stage} ${count}`).join(", ") || "None"]
            ])}</ul>
            <ul class="viewer-insights__rows">${renderPathRows(brokenRefs, "No broken references")}${renderDocRows(unlinked, "No unlinked documents")}</ul>
          </section>
          <section class="viewer-insights__section viewer-insights__section--wide">
            <h2>Quality signals</h2>
            <ul class="viewer-insights__signals">${renderSignalRows([
              ["Lint/audit categories", Object.entries(qualityBySource).map(([key, count]) => `${key} ${count}`).join(", ") || "No findings loaded", qualityTotal ? "warning" : "ok"],
              ["Findings by document type", Object.entries(qualityByDocType).map(([key, count]) => `${key} ${count}`).join(", ") || "No findings loaded"],
              ["Concentrated issues", concentratedIssues.map(([key, count]) => `${key} ${count}`).join(", ") || "None"]
            ])}</ul>
            <ul class="viewer-insights__rows">${renderPathRows(concentratedIssues.map(([key, count]) => `${key} (${count})`), "No concentrated issues")}</ul>
          </section>
        </div>
      </div>
    `;
  }

  async function showCorpusInsights(options = {}) {
    const view = options.view || beginView();
    try {
      const [lintResponse, auditResponse] = await Promise.all([
        fetch("/api/lint", { signal: view.signal }),
        fetch("/api/audit", { signal: view.signal })
      ]);
      const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
      if (isViewStale(view)) {
        return;
      }
      setDocument("Corpus insights", buildCorpusInsights(lintData, auditData));
      setMeta("Corpus insights loaded.");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  async function showDocument(item, view) {
    if (!item || !item.relPath) {
      return;
    }
    const tracked = view || beginView();
    try {
      const response = await fetch(`/api/doc?path=${encodeURIComponent(item.relPath)}`, { signal: tracked.signal });
      const data = await response.json();
      if (isViewStale(tracked)) {
        return;
      }
      if (!response.ok || !data.ok) {
        setMeta(data.error || "Unable to read document.");
        return;
      }
      const api = markdownApi();
      let markdown = data.document.content || "";
      const docPath = data.document.path || item.relPath;
      const documentItem = documentItemWithIndicators(item, markdown, docPath);
      if (api && typeof api.stripLeadingDocumentFrontMatter === "function") {
        markdown = api.stripLeadingDocumentFrontMatter(markdown, item);
      }
      const bodyHtml = api && typeof api.renderMarkdownToHtml === "function"
        ? api.renderMarkdownToHtml(markdown)
        : `<pre>${escapeHtml(markdown)}</pre>`;
      const roadmapHtml = item.stage === "roadmap" ? renderRoadmapMilestones(markdown) : "";
      let chainHtml = "";
      if (["request", "backlog", "task"].includes(item.stage)) {
        try {
          const graphResponse = await fetch(`/api/chain-graph?ref=${encodeURIComponent(item.id || item.relPath)}`, { signal: tracked.signal });
          const graphData = await graphResponse?.json?.().catch(() => ({}));
          if (!isViewStale(tracked) && graphResponse?.ok && graphData?.ok) {
            window.__logicsGraphNodeClick = (nodeRef) => showDocumentByPath(nodeRef);
            chainHtml = renderChainGraph(graphData.payload, { inline: true });
          }
        } catch {
          // A document stays readable when an older viewer backend has no graph route.
        }
      }
      const html = `${renderDocumentMeta(documentItem)}${chainHtml}${roadmapHtml}${bodyHtml}`;
      // Header reads as: [type pill] Object name, with the file path as subtitle.
      const objectName = String(item.title || "").trim() || docPath;
      setDocument(objectName, html, {
        item: documentItem,
        badgeStage: item.stage,
        eyebrow: docPath
      });
      // Every other screen says "<X> loaded." once it renders; this was the one path
      // that left whatever the status line said before -- an unrelated screen's error
      // or refresh message -- displayed under a document it no longer describes.
      setMeta("Document loaded.");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  async function showDocumentByPath(relPath, view) {
    const item = findItemByPath(relPath) || findFocusItem(relPath) || { relPath, title: relPath, id: relPath };
    await showDocument(item, view);
  }

  async function editDocument(item) {
    if (!item || !item.relPath) {
      setMeta("Select a document to edit.");
      return;
    }
    setMeta("Opening document in system editor...");
    const response = await fetch(`/api/edit?path=${encodeURIComponent(item.relPath)}`, { method: "POST" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      if (response.status === 404 && data.error === "Not found") {
        throw new Error("Edit endpoint unavailable. Restart the local viewer so it loads the current logics-manager code.");
      }
      throw new Error(data.error || "Unable to open document editor.");
    }
    setMeta(`Opened ${data.document.path} in system editor.`);
  }

  async function changeCurrentDocumentStatus() {
    const item = currentDocumentItem;
    if (!item || !item.relPath) {
      setMeta("Open a Logics document before changing status.");
      return;
    }
    const options = statusOptionsByStage[item.stage] || [];
    if (!options.length) {
      setMeta("Status changes are not available for this document type.");
      return;
    }
    const currentStatus = String(item?.indicators?.Status || item?.status || "").trim();
    const requested = await showThemedChoiceModal({
      title: "Change status",
      message: currentStatus
        ? `${item.id || item.relPath} is currently ${currentStatus}.`
        : `Choose a status for ${item.id || item.relPath}.`,
      options,
      value: currentStatus || options[0],
      submitLabel: "Update status"
    });
    if (requested === null) {
      return;
    }
    const normalized = options.find((status) => status.toLowerCase() === requested.trim().toLowerCase());
    if (!normalized) {
      setMeta(`Unsupported status. Allowed: ${options.join(", ")}.`);
      return;
    }
    if (normalized === currentStatus) {
      setMeta(`${item.id || item.relPath} is already ${normalized}.`);
      return;
    }
    const response = await viewerFetch("/api/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: item.relPath, status: normalized })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to update status.");
    }
    await loadItems("POST", { force: true });
    await showDocumentByPath(data.payload?.path || item.relPath);
    setMeta(data.payload?.changed === false ? `${item.id || item.relPath} was already ${normalized}.` : `Updated ${item.id || item.relPath} to ${normalized}.`);
  }

  async function showHealth(options = {}) {
    const view = options.view || beginView();
    setMeta("Checking health...");
    try {
      const [lintResponse, auditResponse, healthResponse] = await Promise.all([
        fetch("/api/lint", { signal: view.signal }),
        fetch("/api/audit", { signal: view.signal }),
        // Workflow health is a separate report: a failure here must not blank
        // the screen, so it degrades to an "unavailable" note instead.
        fetch("/api/health", { signal: view.signal }).catch(() => null)
      ]);
      const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
      const healthData = healthResponse
        ? await healthResponse.json().catch(() => ({ ok: false, error: "unreadable response" }))
        : { ok: false, error: "unreachable" };
      if (isViewStale(view)) {
        return;
      }
      setDocument("Validation health", renderHealthSummary(lintData, auditData, healthData));
      setMeta("Health loaded.");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  // req_321/item_664: same repair CLI/MCP already expose (audit
  // --autofix-structure --autofix-ac-traceability) via a new caller, not new
  // repair logic - then re-loads the health screen so the findings list
  // reflects what actually got fixed.
  async function applyFixes() {
    setMeta("Applying fixes...");
    const response = await fetch("/api/apply-fixes", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const payload = await response.json().catch(() => ({ ok: false }));
    if (!response.ok || !payload.ok) {
      setMeta(payload?.error || "Unable to apply fixes.");
      return;
    }
    setMeta("Fixes applied.");
    await showHealth();
  }

  // Map a file path to a highlight.js language name for the main languages.
  // Highlight code to HTML when highlight.js and the language are available,
  // otherwise fall back to escaped plain text. Never throws.
  // Shared file/code viewer: a discreet line count, an optional "load anyway"
  // control when truncated, syntax highlighting, and a non-selectable line-number
  // label per rendered line. Used by the Explorer, git, and CDX preview surfaces.
  // Explorer is now a Workshop sub-tab. showWorkspace reloads the Explorer
  // panel in place when it's already mounted, otherwise it opens Workshop on
  // the Explorer tab (which mounts and loads it).
  async function showWorkspace(options = {}) {
    if (!document.querySelector("[data-viewer-workshop-explorer]")) {
      return showWorkshop({ tab: "explorer", silent: Boolean(options.silent) });
    }
    await loadWorkshopExplorer({ silent: Boolean(options.silent), view: options.view });
  }

  // Load (or reload) the workspace tree + preview into the Workshop Explorer
  // panel. Mirrors the old standalone Explorer screen, but renders into the
  // mounted sub-tab container instead of replacing the whole document.





  // Run control for a discovered command. When in-app terminals are available
  // and the command exposes a runnable argv, offer a hover menu (like the CDX
  // session launcher): run inline here, or launch in a new Workshop terminal.




















  // Detect the cdx session a terminal runs, by parsing its command label
  // (e.g. "cdx resume work2") and correlating tokens with known session names.





  // Fit the emulator to its host and push the resulting dimensions to the PTY
  // (TIOCSWINSZ) so the backend's terminal width matches what is rendered.

  // Force a running TUI to repaint its current frame without replaying the
  // server buffer or sending it any input: briefly change the PTY size so the
  // kernel raises SIGWINCH, then restore it. This is exactly what a window
  // resize does, so every terminal app (Claude, Codex, btop, vim) redraws.
  // Non-destructive redraw of every mounted terminal: repaint xterm's DOM from
  // its cell buffer and nudge each running app to re-render. Returns the count.





  // Whenever the page/tab regains visibility or the workshop becomes
  // visible again, force every mounted xterm to repaint from its cell
  // buffer. The renderer's DOM state can drift while the host is hidden
  // (display:none on parent, browser tab inactive, OS window minimised)
  // and decorations (SGR backgrounds, box-drawing glyphs) end up blanked
  // until the next full repaint.


  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestAnimationFrame(repaintAllWorkshopTerminals);
      resumeActiveWorkshopTerminalStream();
    }
  });
  window.addEventListener("focus", () => {
    requestAnimationFrame(repaintAllWorkshopTerminals);
    resumeActiveWorkshopTerminalStream();
  });

  window.addEventListener("resize", () => {
    if (workshopState.workshopTerminalResizeTimer) clearTimeout(workshopState.workshopTerminalResizeTimer);
    workshopState.workshopTerminalResizeTimer = setTimeout(() => {
      workshopState.workshopTerminalResizeTimer = null;
      refitAllWorkshopTerminals();
    }, 80);
  });


  // Best-effort grid the new PTY should be born with, so a full-screen TUI's
  // first frame matches the pane instead of the kernel's 80x24 default. Exact
  // when a terminal is already mounted (same pane); estimated from the stage
  // box + font metrics otherwise. The post-mount refit corrects any drift.




  // Public API for CDX / handoff launchers and other callers that want to
  // open a Workshop terminal pre-running a canonical command.
  window.logicsViewer = window.logicsViewer || {};
  window.logicsViewer.launchTerminal = (command, label) => spawnWorkshopTerminal({ command, label });




  // Resize hysteresis: only re-fit the PTY once the proposed grid drifts far
  // enough from the last applied size. A sub-step jitter (a one-cell wobble
  // while dragging, a scrollbar appearing) would otherwise trigger a full
  // SIGWINCH + redraw of the running TUI on the slightest movement.




  // Only the active terminal keeps a live stream (inactive ones replay on activation).




  async function openWorkspaceTree(path) {
    if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(path), fetchWorkspacePreview(path)]);
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (container instanceof HTMLElement) {
      container.innerHTML = renderWorkspace(tree, preview);
    }
    setMeta(path ? `Explorer folder ${path}` : "Explorer root.");
  }

  async function openWorkspacePreview(path, { full = false } = {}) {
    if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
    const treePath = workspaceParentPath(path);
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(treePath), fetchWorkspacePreview(path, { full })]);
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (container instanceof HTMLElement) {
      container.innerHTML = renderWorkspace(tree, preview);
    }
    setMeta(full ? `Loaded full preview of ${path}.` : `Previewing ${path || "workspace root"}.`);
  }


  // Clear the recorded release gate evidence (server-side) so every gate
  // returns to pending, then reload the Release sub-screen.

  async function showCiStatus(options = {}) {
    gitState.latestCiScreenMode = "runs";
    if (!isCapabilityAvailable("ci")) {
      const message = capabilityMessage("ci", "CI is not available for this project.");
      setDocument("Remote", renderCiStatus({ visible: false, state: capability("ci").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking CI status...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/ci-status", { signal: view.signal });
      try {
        data = await response.json();
      } catch {
        data = {};
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
    if (isViewStale(view)) {
      return;
    }
    if (response.status === 404) {
      setDocument("Remote", renderCiStatus({
        visible: true,
        state: "unavailable",
        badgeState: "unavailable",
        message: "CI status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      setMeta("Restart the local viewer to enable CI status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CI status.");
    }
    const nextCiSignature = runtimeStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestCiStatusSignature && nextCiSignature === latestCiStatusSignature) {
      updateMainCiBadge(data.payload);
      if (!options.silent) {
        setMeta(`Checked CI status just now · no changes (${new Date().toLocaleTimeString()})`);
      }
      return;
    }
    latestCiStatusSignature = nextCiSignature;
    updateMainCiBadge(data.payload);
    refreshActivityFeedForCi();
    setDocument("Remote", renderCiStatus(data.payload));
    setMeta(options.silent ? "CI status refreshed." : "CI status loaded.");
  }










  window.acquireVsCodeApi = function acquireVsCodeApi() {
    return {
      postMessage(message) {
        if (!message || typeof message.type !== "string") {
          return;
        }
        if (message.type === "ready") {
          // The cached values have already painted; the record corrects them once it answers.
          void hydrateViewerPreferencesFromServer();
          loadItems().then(() => startViewerEvents()).catch((error) => setMeta(error.message));
          return;
        }
        if (message.type === "refresh") {
          refreshViewer("POST", { force: Boolean(message.force) }).catch((error) => setMeta(error.message));
          return;
        }
        if (message.type === "bootstrap-logics") {
          bootstrapLogicsProject().catch((error) => setMeta(error.message));
          return;
        }
        if (message.type === "new-request" || message.type === "new-request-guided") {
          const draft = message.draft || {};
          const action = message.type === "new-request-guided" && draft ? createNewRequest(draft) : startNewRequest();
          action.catch((error) => setMeta(error.message));
          return;
        }
        if (message.type === "open" || message.type === "read") {
          const item = latestItems.find((entry) => entry.id === message.id);
          showDocument(item).catch((error) => setMeta(error.message));
          return;
        }
        setMeta("This action is read-only in the local viewer. Use the CLI for workflow changes.");
      },
      getState() {
        return readStoredState();
      },
      setState(value) {
        const nextState = value && typeof value === "object" ? { ...value } : null;
        if (nextState) {
          nextState.viewerFilterState = sanitizeViewerFilterState(nextState.viewerFilterState || viewerState.viewerFilterState);
        }
        writeStoredState(nextState);
      }
    };
  };
  window.addEventListener("load", () => {
    hydrateViewerFilterState();
    bindWorkshopSystemTerminalControls();
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    setControlValue("hide-complete", true, "change");
    setControlValue("hide-processed-requests", true, "change");
    setControlValue("hide-spec", false, "change");
    setControlValue("show-companion-docs", true, "change");
    setControlValue("hide-empty-columns", true, "change");
    applyLocalViewerChrome();
    [document.getElementById("viewer-insights")].forEach((button) => {
      button?.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        withPrimaryAction("insights", "Loading insights", showCorpusInsights);
      });
    });
    document.querySelectorAll("#viewer-getting-started, [data-action=\"getting-started\"]").forEach((button) => {
      button.addEventListener("click", () => {
        setRefreshMenuOpen(false);
        showGettingStarted();
      });
    });
    document.getElementById("viewer-restart-server")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      withPrimaryAction("restart-viewer", "Restarting server", restartViewerServer);
    });
    document.getElementById("viewer-copy-diagnostics")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      withPrimaryAction("copy-viewer-diagnostics", "Copying diagnostics", copyViewerDiagnostics);
    });
    document.getElementById("viewer-stop-server")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      withPrimaryAction("stop-viewer", "Stopping server", stopViewerServer);
    });
    bootstrapLogicsButton()?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      confirmBootstrapLogics().catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
    });
    document.getElementById("viewer-environment-warning-action")?.addEventListener("click", () => {
      confirmBootstrapLogics().catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
    });
    const autoControl = autoRefreshControl();
    if (autoControl instanceof HTMLInputElement) {
      autoControl.addEventListener("change", () => {
        setAutoRefreshEnabled(autoControl.checked);
      });
      setAutoRefreshEnabled(autoControl.checked);
    }
    const intervalControl = refreshIntervalControl();
    if (intervalControl instanceof HTMLSelectElement) {
      updateRefreshIntervalControl();
      intervalControl.addEventListener("change", () => {
        setAutoRefreshIntervalSeconds(intervalControl.value, { user: true });
      });
    }
    bindRefreshMenuControls();
    bindFocusMenuControls();
    document.addEventListener("click", (event) => {
      const target = event.target;
      const button = refreshMenuButton();
      const panel = refreshMenuPanel();
      const focusButton = document.getElementById("focus-menu-toggle");
      const focusPanel = document.getElementById("focus-menu-options");
      const gitActions = document.getElementById("viewer-git-actions");
      try {
        if (target && (button?.contains(target) || panel?.contains(target))) {
          return;
        }
        if (!(target && (focusButton?.contains(target) || focusPanel?.contains(target)))) {
          setFocusMenuOpen(false);
        }
        if (!(target && gitActions?.contains(target))) {
          setGitActionsMenuOpen(false);
        }
      } catch {
        // Ignore non-node event targets and close the menus below.
      }
      setRefreshMenuOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setRefreshMenuOpen(false);
        setFocusMenuOpen(false);
        setGitActionsMenuOpen(false);
        closeNavMenus();
        setProjectMenuOpen(false);
      }
    });
    document.querySelectorAll('[data-action="refresh"]').forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      element.addEventListener("click", (event) => {
        setRefreshMenuOpen(false);
        withPrimaryAction("refresh", "Refreshing", () => refreshViewer("POST", { force: Boolean(event.shiftKey) }));
      });
    });
    document.getElementById("viewer-health")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      withPrimaryAction("health", "Checking health", showHealth);
    });
    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.matches("[data-viewer-settings-auto-refresh]")) {
        setAutoRefreshEnabled(target.checked);
      }
      if (target instanceof HTMLSelectElement && target.matches("[data-viewer-settings-interval]")) {
        setAutoRefreshIntervalSeconds(target.value, { user: true });
      }
    });
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-viewer-settings-action]") : null;
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault();
      const action = target.dataset.viewerSettingsAction;
      if (action === "refresh") withPrimaryAction("settings-refresh", "Refreshing", () => refreshViewer("POST", { force: true }));
      if (action === "insights") withPrimaryAction("settings-insights", "Loading insights", showCorpusInsights);
      if (action === "health") withPrimaryAction("settings-health", "Checking health", showHealth);
      if (action === "getting-started") showGettingStarted();
      if (action === "mcp") withPrimaryAction("settings-mcp", "Loading MCP controls", showChatgptMcp);
      if (action === "copy-diagnostics") withPrimaryAction("settings-diagnostics", "Copying diagnostics", copyViewerDiagnostics);
      if (action === "restart") withPrimaryAction("settings-restart", "Restarting server", restartViewerServer);
      if (action === "stop") withPrimaryAction("settings-stop", "Stopping server", stopViewerServer);
      if (action === "vscode-reload") document.getElementById("viewer-vscode-reload")?.click();
      if (action === "vscode-restart") document.getElementById("viewer-vscode-restart")?.click();
      if (action === "vscode-external") document.getElementById("viewer-vscode-open-external")?.click();
    });
    document.addEventListener("click", (event) => {
      const copy = event.target instanceof Element ? event.target.closest("[data-viewer-mcp-copy]") : null;
      if (copy instanceof HTMLElement) copyTextToClipboard(copy.dataset.viewerMcpCopy || "").then((ok) => setMeta(ok ? `MCP ${copy.dataset.viewerMcpCopyKind === "token" ? "token" : "URL"} copied.` : "Clipboard access was refused."));
      const action = event.target instanceof Element ? event.target.closest("[data-viewer-mcp-action]") : null;
      if (!(action instanceof HTMLElement)) return;
      const value = action.dataset.viewerMcpAction;
      if (value === "refresh") return void showChatgptMcp();
      fetch("/api/mcp-connector", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: value }) }).then(() => showChatgptMcp()).catch((error) => setMeta(error.message));
    });
    document.addEventListener("toggle", (event) => {
      const current = event.target instanceof Element ? event.target.closest("#viewer-refresh-menu details.viewer-settings-menu__section") : null;
      if (!(current instanceof HTMLDetailsElement) || !current.open) return;
      document.querySelectorAll("#viewer-refresh-menu details.viewer-settings-menu__section[open]").forEach((section) => {
        if (section !== current && section instanceof HTMLDetailsElement) section.open = false;
      });
    }, true);
    document.getElementById("viewer-lan-banner-copy")?.addEventListener("click", async () => {
      const share = latestLanShareUrl;
      if (!share) return;
      const ok = await copyTextToClipboard(share);
      if (ok) {
        setMeta("LAN share URL copied to the clipboard.");
      } else {
        setMeta(`Copy failed — long-press to select: ${share}`);
      }
    });
    // The Workshop menu is the registry: hand-written markup drifted from
    // `workshopTabs` and Runbooks shipped with no entry. Generated above the
    // separator, so the project tools below keep their own markup.
    const workshopSlot = document.querySelector('[data-viewer-nav="workshop"] [data-project-tools-separator]');
    if (workshopSlot instanceof HTMLElement && workshopSlot.dataset.menuBuilt !== "1") {
      workshopSlot.dataset.menuBuilt = "1";
      workshopSlot.insertAdjacentHTML("beforebegin", renderWorkshopMenuItems());
    }
    // The Workshop / Remote / CDX buttons toggle their sub-section menu rather
    // than navigating directly: a click opens the menu so its items stay
    // clickable; choosing an item (handled below) performs the navigation.
    ["viewer-workshop", "viewer-ci", "viewer-cdx"].forEach((id) => {
      const button = document.getElementById(id);
      // Guard against the init block running more than once (the load event can
      // fire twice), which would otherwise double-bind and cancel the toggle.
      if (!(button instanceof HTMLElement) || button.dataset.navBound === "1") return;
      button.dataset.navBound = "1";
      button.addEventListener("click", () => {
        const wrapper = button.closest(".viewer-nav-menu");
        if (!(wrapper instanceof HTMLElement)) return;
        setNavMenuOpen(wrapper, !wrapper.classList.contains("is-open"));
      });
    });
    repoPill()?.addEventListener("click", () => {
      const menu = projectMenu();
      setProjectMenuOpen(Boolean(menu?.hidden));
    });
    repoFolderButton()?.addEventListener("click", () => {
      withPrimaryAction("open-repo-folder", "Opening repository folder", openRepositoryFolder);
    });
    activityClearControl()?.addEventListener("click", () => {
      clearActivityHistory();
    });
    document.getElementById("activity-toggle")?.addEventListener("click", () => {
      setTimeout(() => {
        if (activityPanelIsOpen()) {
          dispatchViewerActivityUpdate();
        }
      }, 0);
    });
    document.querySelectorAll("[data-viewer-filter-group]").forEach((element) => {
      if (element instanceof HTMLSelectElement) {
        element.addEventListener("change", () => {
          applyViewerFilter(element.getAttribute("data-viewer-filter-group") || "", element.value || "");
        });
        return;
      }
      if (!(element instanceof HTMLElement)) {
        return;
      }
      element.addEventListener("click", () => {
        applyViewerFilter(element.getAttribute("data-viewer-filter-group") || "", element.getAttribute("data-viewer-filter-value") || "");
      });
    });
    // A panel that covers the board should close on the key everyone tries first. The
    // close button stays; this is the keyboard route to the same place.
    document.getElementById("viewer-environment-warning-dismiss")?.addEventListener("click", () => {
      if (latestEnvironmentWarning) dismissEnvironmentWarning(latestEnvironmentWarning);
    });
    document.getElementById("viewer-update-dismiss")?.addEventListener("click", () => {
      dismissUpdateWarning(latestUpdateInfo?.shadowingExecutables);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const panel = documentPanel();
      if (!panel || panel.hidden) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("[data-viewer-workshop-terminal-stage], input, textarea, select")) {
        return;
      }
      event.preventDefault();
      closeDocumentPanel();
    });
    document.getElementById("filter-reset")?.addEventListener("click", () => {
      clearLocalPreset();
    });
    const editButton = editDocumentButton();
    if (editButton instanceof HTMLElement) {
      editButton.addEventListener("click", () => {
        withPrimaryAction("edit-document", "Opening document", () => editDocument(selectedItem()));
      });
    }
    setupProjectToolInteractions(setDocument, setMeta);
    document.addEventListener("change", (event) => {
      const sessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session]") : null;
      const cdxSessionConfigInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-input]") : null;
      const cdxInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-input]") : null;
      const cdxRunModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-mode]") : null;
      const cdxPromptTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-prompt]") : null;
      const cdxColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-column]") : null;
      const cdxRunColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-column]") : null;
      const cdxRunSessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-session]") : null;
      const cdxHistoryColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-column]") : null;
      const cdxHistorySessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-session]") : null;
      const cdxProviderTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider]") : null;
      if (cdxPromptTarget instanceof HTMLTextAreaElement) {
        // Store the operator-edited prompt without resetting the plan so the
        // edit survives until the next Preview or Launch run.
        cdxState.latestCdxMissionState.promptOverride = cdxPromptTarget.value || "";
        return;
      }
      if (cdxSessionConfigInputTarget instanceof HTMLElement) {
        updateCdxSessionConfigFromModal(cdxSessionConfigInputTarget.closest("[data-viewer-cdx-session-config-modal]"));
        return;
      }
      if (cdxRunModeTarget instanceof HTMLSelectElement) {
        cdxState.latestCdxMissionState.runMode = cdxRunModeTarget.value === "terminal" ? "terminal" : "background";
        setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload, cdxState.latestCdxMissionState.planPayload, cdxState.latestCdxMissionState.runPayload, cdxState.latestCdxMissionState.applyPayload));
        return;
      }
      if (sessionTarget instanceof HTMLSelectElement) {
        cdxState.latestCdxMissionState.sessionId = sessionTarget.value || "";
        delete cdxState.latestCdxMissionState.missionInputs.model;
        cdxState.latestCdxMissionState.planPayload = null;
        cdxState.latestCdxMissionState.runPayload = null;
        cdxState.latestCdxMissionState.applyPayload = null;
        cdxState.latestCdxMissionState.outputMode = "plan";
        cdxState.latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload));
      }
      if (cdxInputTarget instanceof HTMLInputElement || cdxInputTarget instanceof HTMLTextAreaElement || cdxInputTarget instanceof HTMLSelectElement) {
        const key = cdxInputTarget.getAttribute("data-viewer-cdx-input") || "";
        if (key) {
          cdxState.latestCdxMissionState.missionInputs[key] = cdxInputTarget instanceof HTMLInputElement && cdxInputTarget.type === "checkbox" ? (cdxInputTarget.checked ? "true" : "false") : (cdxInputTarget.value || "");
          cdxState.latestCdxMissionState.planPayload = null;
          cdxState.latestCdxMissionState.runPayload = null;
          cdxState.latestCdxMissionState.applyPayload = null;
          cdxState.latestCdxMissionState.outputMode = "plan";
          cdxState.latestCdxMissionState.promptOverride = "";
        }
      }
      if (cdxColumnTarget instanceof HTMLInputElement) {
        persistCdxColumnVisibility(cdxColumnTarget.getAttribute("data-viewer-cdx-column") || "", cdxColumnTarget.checked);
        rerenderCdxStatusFromPreferences();
      }
      if (cdxRunColumnTarget instanceof HTMLInputElement) {
        persistCdxRunColumnVisibility(cdxRunColumnTarget.getAttribute("data-viewer-cdx-run-column") || "", cdxRunColumnTarget.checked);
        preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(cdxState.latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
      }
      if (cdxRunSessionTarget instanceof HTMLInputElement) {
        const session = cdxRunSessionTarget.getAttribute("data-viewer-cdx-run-session") || "";
        const current = cdxRunSessionFilterPreference();
        const selected = new Set(current.mode === "subset" ? current.selected : knownCdxRunSessions(cdxState.latestCdxRunsPayload?.runs || []));
        if (cdxRunSessionTarget.checked) {
          selected.add(session);
        } else {
          selected.delete(session);
        }
        persistCdxRunSessionFilter({ mode: "subset", selected: Array.from(selected) });
        preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(cdxState.latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
      }
      if (cdxHistoryColumnTarget instanceof HTMLInputElement) {
        persistCdxHistoryColumnVisibility(cdxHistoryColumnTarget.getAttribute("data-viewer-cdx-history-column") || "", cdxHistoryColumnTarget.checked);
        preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(cdxState.latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
      }
      if (cdxHistorySessionTarget instanceof HTMLInputElement) {
        const session = cdxHistorySessionTarget.getAttribute("data-viewer-cdx-history-session") || "";
        const current = cdxHistorySessionFilterPreference();
        const selected = new Set(current.mode === "subset" ? current.selected : knownCdxHistorySessions(cdxState.latestCdxHistoryPayload?.history || []));
        if (cdxHistorySessionTarget.checked) {
          selected.add(session);
        } else {
          selected.delete(session);
        }
        persistCdxHistorySessionFilter({ mode: "subset", selected: Array.from(selected) });
        preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(cdxState.latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
      }
      if (cdxProviderTarget instanceof HTMLInputElement) {
        const provider = cdxProviderTarget.getAttribute("data-viewer-cdx-provider") || "";
        const status = cdxState.latestCdxStatusPayload?.status || {};
        const allProviders = cdxKnownProviders(status, cdxProviders(status), cdxSessions(status));
        const current = cdxProviderFilterPreference();
        const selected = new Set(current.mode === "subset" ? current.selected : allProviders);
        if (cdxProviderTarget.checked) {
          selected.add(provider);
        } else {
          selected.delete(provider);
        }
        const nextSelected = Array.from(selected).filter((entry) => allProviders.includes(entry));
        persistCdxProviderFilter(nextSelected.length === allProviders.length ? { mode: "all", selected: [] } : { mode: "subset", selected: nextSelected });
        rerenderCdxStatusFromPreferences();
      }
    });
    document.addEventListener("dragstart", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement)) return;
      if (event.target instanceof Element && event.target.closest("[data-viewer-workshop-terminal-close], [data-viewer-workshop-terminal-clear], [data-viewer-workshop-terminal-rename], [data-viewer-cdx-usage-refresh]")) {
        event.preventDefault();
        return;
      }
      const id = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (!id) return;
      workshopState.workshopTerminalState.draggingId = id;
      row.classList.add("is-dragging");
      row.setAttribute("aria-grabbed", "true");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
      }
    });
    document.addEventListener("dragover", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement) || !workshopState.workshopTerminalState.draggingId) return;
      const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (!targetId || targetId === workshopState.workshopTerminalState.draggingId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".viewer-workshop__terminal-row.is-drop-target").forEach((node) => {
        if (node !== row) node.classList.remove("is-drop-target");
      });
      row.classList.add("is-drop-target");
    });
    document.addEventListener("drop", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement)) {
        clearWorkshopTerminalDragState();
        return;
      }
      const sourceId = workshopState.workshopTerminalState.draggingId || event.dataTransfer?.getData("text/plain") || "";
      const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (sourceId && targetId && sourceId !== targetId) {
        event.preventDefault();
        moveWorkshopTerminalBefore(sourceId, targetId);
        workshopState.workshopTerminalState.suppressSelectUntil = Date.now() + 250;
      }
      clearWorkshopTerminalDragState();
    });
    document.addEventListener("dragend", () => {
      workshopState.workshopTerminalState.suppressSelectUntil = Date.now() + 250;
      clearWorkshopTerminalDragState();
    });
    document.addEventListener("click", (event) => {
      window.setTimeout(() => applyLocalViewerChrome(), 0);
      const activeCdxMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__menu, .viewer-workshop__command-run-menu") : null;
      closeCdxMenus(activeCdxMenu);
      // Close any open topbar sub-section menu when clicking outside of it.
      if (!(event.target instanceof Element) || !event.target.closest(".viewer-nav-menu")) {
        closeNavMenus();
      }
      // Close the project switcher when clicking anywhere outside the menu and
      // its toggling pill (the pill click below re-opens it as needed). Without
      // this the menu never lost focus and stayed open until a project was
      // picked.
      if (!(event.target instanceof Element)
        || (!event.target.closest("#viewer-project-menu") && !event.target.closest("#viewer-repo-pill"))) {
        setProjectMenuOpen(false);
      }
      const target = event.target instanceof Element ? event.target.closest("[data-viewer-doc-path]") : null;
      const healthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-open-health]") : null;
      const filterTarget = event.target instanceof Element ? event.target.closest("[data-viewer-filter-group][data-viewer-filter-value]") : null;
      const revealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-reveal]") : null;
      const gitHistoryRevealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-history-reveal]") : null;
      const gitDomainTarget = event.target instanceof Element ? event.target.closest(".viewer-git__domain[data-viewer-git-domain]") : null;
      const gitFileTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-file]") : null;
      const gitCommitTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-commit]") : null;
      const gitPreviewFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-preview-full]") : null;
      const workspaceTreeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-tree]") : null;
      const workspacePreviewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview]") : null;
      const workspacePreviewFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview-full]") : null;
      const workshopTabTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-tab]") : null;
      const workshopRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run]") : null;
      const workshopRunbookOpenTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-runbook-open]") : null;
      const workshopRunbookGraphTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-runbook-graph]") : null;
      const workshopRunbookSearchTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-runbook-search]") : null;
      const workshopRunbookHiddenTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-runbook-hidden]") : null;
      const fleetRootPickTarget = event.target instanceof Element ? event.target.closest("[data-viewer-fleet-root-pick]") : null;
      const workshopRunTerminalTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run-terminal]") : null;
      const workshopStopTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-stop]") : null;
      const workshopTerminalNewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-new]") : null;
      const workshopTerminalCustomTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-custom]") : null;
      const workshopTerminalSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-select]") : null;
      const workshopTerminalCloseTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-close]") : null;
      const workshopExternalCloseTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-external-close]") : null;
      const workshopTerminalClearTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-clear]") : null;
      const workshopTerminalRenameTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-rename]") : null;
      const workshopCdxUsageTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-usage-refresh]") : null;
      const projectSwitcherTarget = event.target instanceof Element ? event.target.closest("#viewer-repo-pill") : null;
      const projectFavoriteTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-favorite]") : null;
      const projectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-id]") : null;
      const projectPickTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-pick]") : null;
      const ciModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-ci-mode]") : null;
      const cdxModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mode]") : null;
      const cdxMemoryScopeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-memory-scope]") : null;
      const cdxMemoryViewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-memory-view]") : null;
      const cdxBackRunsTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-back-runs]") : null;
      const cdxReportTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-report]") : null;
      const cdxArtifactTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-artifact-path]") : null;
      const cdxProviderAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider-all]") : null;
      const cdxMissionSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission-select]") : null;
      const cdxStrengthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-strength]") : null;
      const cdxPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-plan]") : null;
      const cdxRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run]") : null;
      const cdxApplyPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-apply-plan]") : null;
      const cdxMissionOutputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission-output]") : null;
      const cdxToggleTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-toggle]") : null;
      const cdxResetTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-reset]") : null;
      const cdxSessionActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-action]") : null;
      const cdxSessionConfigSubmitTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-submit]") : null;
      const cdxSessionConfigCancelTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-cancel]") : null;
      const cdxLoginTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-login]") : null;
      const navTarget = event.target instanceof Element ? event.target.closest("[data-viewer-nav-target]") : null;
      const onboardingActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-onboarding-action]") : null;
      if (onboardingActionTarget instanceof HTMLElement) {
        event.preventDefault();
        runOnboardingAction(onboardingActionTarget.getAttribute("data-viewer-onboarding-action") || "");
        return;
      }
      const applyFixesTarget = event.target instanceof Element ? event.target.closest("[data-viewer-apply-fixes]") : null;
      if (applyFixesTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("apply-fixes", "Applying fixes", applyFixes);
        return;
      }
      if (navTarget instanceof HTMLElement) {
        event.preventDefault();
        const [screen, section] = (navTarget.getAttribute("data-viewer-nav-target") || "").split(":");
        // Collapse the menu once a sub-section is chosen.
        closeNavMenus();
        if (screen === "project") {
          withPrimaryAction(`project-${section}`, `Opening project ${section}`, () => openProjectTool(section === "theme" ? "theme" : "i18n", { beginView, isViewStale, setDocument, setMeta }));
        } else if (screen === "workshop") {
          withPrimaryAction("workshop-nav", `Opening Workshop ${section}`, () => showWorkshop({ tab: section }));
        } else if (screen === "remote") {
          if (section === "release") {
            withPrimaryAction("remote-release", "Checking release workflow", showReleaseStatus);
          } else if (section === "runs") {
            withPrimaryAction("remote-runs", "Checking CI status", showCiStatus);
          } else {
            withPrimaryAction("remote-git", "Checking Git status", () => showGitStatus());
          }
        } else if (screen === "cdx") {
          if (section === "runs") {
            withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
          } else if (section === "missions") {
            withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
          } else if (section === "history") {
            withPrimaryAction("cdx-history", "Loading CDX history", showCdxHistory);
          } else if (section === "memory") {
            withPrimaryAction("cdx-memory", "Loading CDX memory", showCdxMemory);
          } else if (section === "disk") {
            withPrimaryAction("cdx-disk", "Loading CDX disk usage", showCdxDisk);
          } else {
            withPrimaryAction("cdx", "Checking CDX status", showCdxStatus);
          }
        }
        return;
      }
      if (cdxToggleTarget instanceof HTMLButtonElement) {
        event.preventDefault();
        const sessionName = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle") || "";
        const currentState = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle-state") || "on";
        const enable = currentState === "off";
        if (!sessionName) return;
        cdxState.pendingCdxSessionToggles.set(sessionName, enable);
        const rollbackCdxToggle = applyOptimisticCdxSessionToggle(sessionName, enable);
        fetch("/api/cdx-toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: sessionName, enable }),
        }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
          if (!ok || !data.ok) {
            throw new Error(data.error || "Toggle failed.");
          }
          return showCdxStatus({ silent: true, force: true }).catch(() => {});
        }).catch((error) => {
          rollbackCdxToggle();
          setMeta(`CDX toggle: ${error?.message || error}`);
        }).finally(() => {
          cdxState.pendingCdxSessionToggles.delete(sessionName);
          rerenderCdxStatusFromPreferences();
        });
        return;
      }
      if (cdxResetTarget instanceof HTMLButtonElement) {
        event.preventDefault();
        const sessionName = cdxResetTarget.getAttribute("data-viewer-cdx-reset") || "";
        if (!sessionName || cdxState.pendingCdxSessionResets.has(sessionName)) return;
        showThemedConfirmModal({
          title: "Activate banked reset",
          message: `Consume one banked Codex reset for ${sessionName}? This spends a reset credit.`,
          submitLabel: "Activate"
        }).then((confirmed) => {
          if (!confirmed) return undefined;
          cdxState.pendingCdxSessionResets.add(sessionName);
          rerenderCdxStatusFromPreferences();
          return fetch("/api/cdx-reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session: sessionName }),
          }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
            if (!ok || !data.ok) {
              throw new Error(data.error || "Reset failed.");
            }
            setMeta(data.payload?.message || `Activated banked reset for ${sessionName}.`);
            return showCdxStatus({ silent: true, force: true }).catch(() => {});
          }).catch((error) => {
            setMeta(`CDX reset: ${error?.message || error}`);
          }).finally(() => {
            cdxState.pendingCdxSessionResets.delete(sessionName);
            rerenderCdxStatusFromPreferences();
          });
        });
        return;
      }
      if (cdxSessionConfigSubmitTarget instanceof HTMLElement) {
        event.preventDefault();
        const modal = cdxSessionConfigSubmitTarget.closest("[data-viewer-cdx-session-config-modal]");
        applyCdxSessionConfigModal(modal);
        return;
      }
      if (cdxSessionConfigCancelTarget instanceof HTMLElement) {
        event.preventDefault();
        closeThemedModal(cdxSessionConfigCancelTarget.closest("[data-viewer-cdx-session-config-modal]"));
        return;
      }
      if (ciModeTarget instanceof HTMLElement) {
        const mode = ciModeTarget.getAttribute("data-viewer-ci-mode") || "git";
        if (mode === "release") {
          withPrimaryAction("ci-release", "Checking release workflow", showReleaseStatus);
        } else if (mode === "runs") {
          withPrimaryAction("ci-runs", "Checking CI status", showCiStatus);
        } else {
          withPrimaryAction("ci-git", "Checking Git status", () => showGitStatus());
        }
        return;
      }
      if (cdxSessionActionTarget instanceof HTMLElement) {
        event.preventDefault();
        const action = cdxSessionActionTarget.getAttribute("data-viewer-cdx-session-action") || "new";
        const sessionName = cdxSessionActionTarget.getAttribute("data-viewer-cdx-session") || "";
        cdxSessionActionTarget.closest("details")?.removeAttribute("open");
        if (!sessionName) {
          return;
        }
        if (action === "config") {
          showCdxSessionConfigModal(sessionName);
        } else if (action === "resume") {
          spawnWorkshopTerminal({ command: ["cdx", "resume", sessionName], label: `cdx resume ${sessionName}` });
        } else if (action === "handoff") {
          chooseCdxHandoffSource(sessionName).then((handoffSource) => {
            if (handoffSource) {
              spawnWorkshopTerminal({ command: ["cdx", "handoff", handoffSource, sessionName], label: `cdx handoff ${handoffSource} ${sessionName}` });
            }
          });
        } else if (action === "remove") {
          cdxSessionActionTarget.disabled = true;
          fetch("/api/cdx-remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session: sessionName }),
          }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
            if (!ok || !data.ok) {
              throw new Error(data.error || "Remove failed.");
            }
            setMeta(data.payload?.message || `Removed ${sessionName}.`);
            showCdxStatus({ silent: true, force: true }).catch(() => {});
          }).catch((error) => {
            setMeta(`CDX remove: ${error?.message || error}`);
          }).finally(() => { cdxSessionActionTarget.disabled = false; });
        } else {
          spawnWorkshopTerminal({ command: ["cdx", sessionName], label: `cdx ${sessionName}` });
        }
        return;
      }
      if (cdxLoginTarget instanceof HTMLElement) {
        event.preventDefault();
        const sessionName = cdxLoginTarget.getAttribute("data-viewer-cdx-login") || "";
        if (sessionName) {
          spawnWorkshopTerminal({ command: ["cdx", "login", sessionName], label: `cdx login ${sessionName}` });
        }
        return;
      }
      if (cdxMissionSelectTarget instanceof HTMLElement) {
        selectCdxMissionFromModal().catch((error) => setMeta(`Mission selection failed: ${error?.message || error}`));
        return;
      }
      if (cdxStrengthTarget instanceof HTMLElement) {
        cdxState.latestCdxMissionState.strengthId = cdxStrengthTarget.getAttribute("data-viewer-cdx-strength") || "standard";
        cdxState.latestCdxMissionState.planPayload = null;
        cdxState.latestCdxMissionState.runPayload = null;
        cdxState.latestCdxMissionState.applyPayload = null;
        cdxState.latestCdxMissionState.outputMode = "plan";
        cdxState.latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload));
        return;
      }
      if (cdxMissionOutputTarget instanceof HTMLElement) {
        cdxState.latestCdxMissionState.outputMode = cdxMissionOutputTarget.getAttribute("data-viewer-cdx-mission-output") === "run" ? "run" : "plan";
        setDocument("CDX missions", renderCdxMissions(cdxState.latestCdxMissionState.statusPayload, cdxState.latestCdxMissionState.planPayload, cdxState.latestCdxMissionState.runPayload, cdxState.latestCdxMissionState.applyPayload));
        return;
      }
      if (cdxPlanTarget instanceof HTMLElement) {
        withCdxMissionAction("cdx-plan", "Building CDX mission plan", previewCdxMission);
        return;
      }
      if (cdxRunTarget instanceof HTMLElement) {
        withCdxMissionAction("cdx-run", "Launching CDX mission", launchCdxMission);
        return;
      }
      if (cdxApplyPlanTarget instanceof HTMLElement) {
        withCdxMissionAction("cdx-apply-plan", "Applying CDX mission plan", applyCdxMissionPlan);
        return;
      }
      if (cdxProviderAllTarget instanceof HTMLElement) {
        persistCdxProviderFilter({ mode: "all", selected: [] });
        rerenderCdxStatusFromPreferences();
        return;
      }
      const cdxRunSessionAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-session-all]") : null;
      if (cdxRunSessionAllTarget instanceof HTMLElement) {
        persistCdxRunSessionFilter({ mode: "all", selected: [] });
        preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(cdxState.latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
        return;
      }
      const cdxHistorySessionAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-session-all]") : null;
      if (cdxHistorySessionAllTarget instanceof HTMLElement) {
        persistCdxHistorySessionFilter({ mode: "all", selected: [] });
        preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(cdxState.latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
        return;
      }
      if (cdxBackRunsTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
        return;
      }
      if (cdxReportTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-report", "Loading CDX report", () => showCdxReport(cdxReportTarget.getAttribute("data-viewer-cdx-report") || ""));
        return;
      }
      if (cdxArtifactTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-artifact", "Opening CDX artifact", () => openCdxArtifact(cdxArtifactTarget.getAttribute("data-viewer-cdx-artifact-path") || ""));
        return;
      }
      if (cdxMemoryScopeTarget instanceof HTMLElement) {
        const scope = cdxMemoryScopeTarget.getAttribute("data-viewer-cdx-memory-scope") || "current";
        withPrimaryAction(`cdx-memory-${scope}`, "Loading CDX memory", () => showCdxMemory({ scope }));
        return;
      }
      if (cdxMemoryViewTarget instanceof HTMLElement) {
        cdxState.latestCdxMemoryView = cdxMemoryViewTarget.getAttribute("data-viewer-cdx-memory-view") || "cleaned";
        setDocument("CDX memory", renderCdxMemory(cdxState.latestCdxMemoryPayload, cdxState.latestCdxMemoryScope, cdxState.latestCdxMemoryView));
        setMeta(`CDX memory ${cdxState.latestCdxMemoryView} view.`);
        return;
      }
      if (cdxModeTarget instanceof HTMLElement) {
        const mode = cdxModeTarget.getAttribute("data-viewer-cdx-mode") || "status";
        if (mode === "runs") {
          withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
        } else if (mode === "missions") {
          withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
        } else if (mode === "history") {
          withPrimaryAction("cdx-history", "Loading CDX history", showCdxHistory);
        } else if (mode === "memory") {
          withPrimaryAction("cdx-memory", "Loading CDX memory", showCdxMemory);
        } else if (mode === "disk") {
          withPrimaryAction("cdx-disk", "Loading CDX disk usage", showCdxDisk);
        } else {
          withPrimaryAction("cdx", "Checking CDX status", showCdxStatus);
        }
        return;
      }
      if (workshopTabTarget instanceof HTMLElement) {
        event.preventDefault();
        const tab = workshopTabTarget.getAttribute("data-viewer-workshop-tab") || "terminals";
        withPrimaryAction("workshop-tab", `Switching to ${tab}`, () => showWorkshop({ tab }));
        return;
      }
      if (workshopRunbookOpenTarget instanceof HTMLElement) {
        event.preventDefault();
        const path = workshopRunbookOpenTarget.getAttribute("data-viewer-workshop-runbook-open") || "";
        if (path) withPrimaryAction("runbook-open", "Loading runbook", () => showDocumentByPath(path));
        return;
      }
      if (workshopRunbookGraphTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("runbook-graph", "Loading runbook graph", showWorkshopRunbookGraph);
        return;
      }
      if (workshopRunbookSearchTarget instanceof HTMLElement) {
        event.preventDefault();
        const input = workshopRunbookSearchTarget.parentElement?.querySelector("[data-viewer-workshop-runbook-query]");
        const query = input instanceof HTMLInputElement ? input.value.trim() : "";
        withPrimaryAction("runbook-search", "Searching runbooks", () => loadWorkshopRunbooks(query));
        return;
      }
      if (workshopRunbookHiddenTarget instanceof HTMLInputElement) {
        const input = workshopRunbookHiddenTarget.parentElement?.parentElement?.querySelector("[data-viewer-workshop-runbook-query]");
        const query = input instanceof HTMLInputElement ? input.value.trim() : "";
        withPrimaryAction("runbook-hidden", "Loading runbooks", () => setWorkshopRunbooksIncludeHidden(workshopRunbookHiddenTarget.checked, query));
        return;
      }
      if (fleetRootPickTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("fleet-root-pick", "Adding fleet root", pickFleetRoot);
        return;
      }
      if (workshopTerminalCloseTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalCloseTarget.getAttribute("data-viewer-workshop-terminal-close") || "";
        if (id) stopWorkshopTerminal(id);
        return;
      }
      if (workshopExternalCloseTarget instanceof HTMLElement) {
        event.preventDefault(); event.stopPropagation();
        const id = workshopExternalCloseTarget.getAttribute("data-viewer-workshop-external-close") || "", index = workshopState.workshopExternalLaunches.findIndex((entry) => entry.id === id);
        if (index >= 0) workshopState.workshopExternalLaunches.splice(index, 1);
        renderWorkshopTerminalList(); return;
      }
      if (workshopTerminalClearTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalClearTarget.getAttribute("data-viewer-workshop-terminal-clear") || "";
        if (id) clearWorkshopTerminal(id);
        return;
      }
      if (workshopTerminalRenameTarget instanceof HTMLElement && event.detail >= 2) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalRenameTarget.getAttribute("data-viewer-workshop-terminal-rename") || "";
        if (id) renameWorkshopTerminal(id);
        return;
      }
      if (workshopCdxUsageTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const session = workshopCdxUsageTarget.getAttribute("data-viewer-cdx-usage-refresh") || "";
        refreshCdxSessionUsage(session);
        return;
      }
      if (workshopTerminalNewTarget instanceof HTMLElement) {
        event.preventDefault();
        spawnWorkshopTerminal();
        return;
      }
      if (workshopTerminalCustomTarget instanceof HTMLElement) {
        event.preventDefault();
        spawnCustomWorkshopTerminal(workshopTerminalCustomTarget);
        return;
      }
      if (workshopTerminalSelectTarget instanceof HTMLElement) {
        event.preventDefault();
        if (Date.now() < workshopState.workshopTerminalState.suppressSelectUntil) return;
        const id = workshopTerminalSelectTarget.getAttribute("data-viewer-workshop-terminal-select") || "";
        if (id) setActiveWorkshopTerminal(id);
        return;
      }
      if (workshopRunTarget instanceof HTMLElement) {
        event.preventDefault();
        workshopRunTarget.closest("details")?.removeAttribute("open");
        const commandId = workshopRunTarget.getAttribute("data-viewer-workshop-command-run") || "";
        if (commandId) {
          updateWorkshopCommandSession(commandId, { state: "starting", logText: "" });
          startWorkshopCommand(commandId);
        }
        return;
      }
      if (workshopRunTerminalTarget instanceof HTMLElement) {
        event.preventDefault();
        workshopRunTerminalTarget.closest("details")?.removeAttribute("open");
        const commandId = workshopRunTerminalTarget.getAttribute("data-viewer-workshop-command-run-terminal") || "";
        const commands = workshopState.workshopCommandState.catalog?.commands;
        const entry = Array.isArray(commands) ? commands.find((item) => item?.id === commandId) : null;
        if (entry && Array.isArray(entry.runner) && entry.runner.length) {
          spawnWorkshopTerminal({ command: entry.runner.map(String), label: String(entry.name || commandId) });
        }
        return;
      }
      if (workshopStopTarget instanceof HTMLElement) {
        event.preventDefault();
        const commandId = workshopStopTarget.getAttribute("data-viewer-workshop-command-stop") || "";
        if (commandId) {
          stopWorkshopCommand(commandId);
        }
        return;
      }
      if (workspaceTreeTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("workspace-tree", "Loading Explorer folder", () => openWorkspaceTree(workspaceTreeTarget.getAttribute("data-viewer-workspace-tree") || ""));
        return;
      }
      if (gitPreviewFullTarget instanceof HTMLElement) {
        event.preventDefault();
        const diffPanel = document.querySelector("[data-viewer-git-diff]");
        const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
        if (diffPanel instanceof HTMLElement) {
          withPrimaryAction("git-preview-full", "Loading full Git preview", () => loadGitFilePreview(gitPreviewFullTarget.getAttribute("data-viewer-git-preview-full") || "", diffPanel, detailTitle, { full: true }));
        }
        return;
      }
      if (workspacePreviewFullTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("workspace-preview-full", "Loading full file", () => openWorkspacePreview(workspacePreviewFullTarget.getAttribute("data-viewer-workspace-preview-full") || "", { full: true }));
        return;
      }
      if (workspacePreviewTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("workspace-preview", "Loading Explorer preview", () => openWorkspacePreview(workspacePreviewTarget.getAttribute("data-viewer-workspace-preview") || ""));
        return;
      }
      if (projectSwitcherTarget instanceof HTMLElement) {
        const menu = projectMenu();
        setProjectMenuOpen(Boolean(menu?.hidden));
        return;
      }
      if (projectFavoriteTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const projectId = projectFavoriteTarget.getAttribute("data-viewer-project-favorite") || "";
        const currentlyFavorite = projectFavoriteTarget.getAttribute("aria-pressed") === "true";
        persistFavoriteProject(projectId, !currentlyFavorite);
        renderProjectMenu();
        setProjectMenuOpen(true);
        return;
      }
      if (projectPickTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("select-project-root", "Selecting project folder", pickViewerProjectRoot);
        return;
      }
      if (projectTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("switch-project", "Switching project", () => switchViewerProject(projectTarget.getAttribute("data-viewer-project-id") || ""));
        return;
      }
      if (gitHistoryRevealTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (gitHistoryRevealTarget.dataset.viewerGitHistoryBusy === "true") {
          return;
        }
        gitHistoryRevealTarget.dataset.viewerGitHistoryBusy = "true";
        const list = gitHistoryRevealTarget.closest("ul");
        const hiddenRows = Array.from(list?.querySelectorAll("[data-viewer-git-history-hidden]") || [])
          .filter((row) => row instanceof HTMLElement);
        hiddenRows.slice(0, gitHistoryPageSize).forEach((row) => {
          if (row instanceof HTMLElement) {
            row.hidden = false;
            row.removeAttribute("data-viewer-git-history-hidden");
          }
        });
        const remaining = Array.from(list?.querySelectorAll("[data-viewer-git-history-hidden]") || []).length;
        if (remaining > 0) {
          gitHistoryRevealTarget.textContent = `Show ${Math.min(gitHistoryPageSize, remaining)} more`;
          gitHistoryRevealTarget.dataset.viewerGitHistoryBusy = "false";
        } else {
          gitHistoryRevealTarget.closest("li")?.remove();
        }
        return;
      }
      if (revealTarget instanceof HTMLElement) {
        const list = revealTarget.closest("ul");
        list?.querySelectorAll("[data-viewer-hidden-row]").forEach((row) => {
          if (row instanceof HTMLElement) {
            row.hidden = false;
            row.removeAttribute("data-viewer-hidden-row");
          }
        });
        revealTarget.closest("li")?.remove();
        return;
      }
      if (gitDomainTarget instanceof HTMLElement) {
        const domain = gitDomainTarget.getAttribute("data-viewer-git-domain") || "changes";
        applyGitDomain(domain);
        const diffPanel = document.querySelector("[data-viewer-git-diff]");
        if (domain === "history" && diffPanel instanceof HTMLElement && !document.querySelector("[data-viewer-git-commit].is-active")) {
          diffPanel.textContent = "Select a commit to preview its diff.";
        }
        return;
      }
      if (gitCommitTarget instanceof HTMLElement) {
        loadGitCommitDiff(gitCommitTarget.getAttribute("data-viewer-git-commit") || "", gitCommitTarget).catch((error) => setMeta(error.message));
        return;
      }
      if (gitFileTarget instanceof HTMLElement) {
        loadGitDiff(
          gitFileTarget.getAttribute("data-viewer-git-file") || "",
          gitFileTarget.getAttribute("data-viewer-git-cached") === "1",
          gitFileTarget
        ).catch((error) => setMeta(error.message));
        return;
      }
      if (healthTarget instanceof HTMLElement) {
        withPrimaryAction("health", "Checking health", showHealth);
        return;
      }
      if (filterTarget instanceof HTMLElement) {
        applyViewerFilter(filterTarget.getAttribute("data-viewer-filter-group") || "", filterTarget.getAttribute("data-viewer-filter-value") || "");
        setMeta("Insight filter applied. Clear filters restores the normal viewer view.");
        return;
      }
      const path = target instanceof HTMLElement ? target.getAttribute("data-viewer-doc-path") : "";
      if (path) {
        withPrimaryAction("read-document", "Loading document", () => showDocumentByPath(path));
      }
    });
    document.addEventListener("focusin", (event) => {
      const activeCdxMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__menu, .viewer-workshop__command-run-menu") : null;
      closeCdxMenus(activeCdxMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCdxMenus();
      }
    });
    document.getElementById("viewer-document-close")?.addEventListener("click", () => {
      withPrimaryAction("close-document", "Closing preview", closeDocumentPanel);
    });
    documentMinimizeButton()?.addEventListener("click", () => {
      withPrimaryAction("minimize-document", "Minimizing screen", minimizeDocumentPanel);
    });
    minimizedDock()?.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const close = target?.closest("[data-viewer-minimized-close]");
      if (close instanceof HTMLElement) {
        closeMinimizedScreen(close.getAttribute("data-viewer-minimized-close") || "");
        return;
      }
      const restore = target?.closest("[data-viewer-minimized-restore]");
      if (restore instanceof HTMLElement) {
        withPrimaryAction("restore-document", "Restoring screen", () => restoreMinimizedScreen(restore.getAttribute("data-viewer-minimized-restore") || ""));
      }
    });
    document.getElementById("viewer-document-refresh")?.addEventListener("click", () => {
      withPrimaryAction("refresh-document", "Refreshing", refreshCurrentScreen);
    });
    document.getElementById("viewer-release-reset")?.addEventListener("click", () => {
      withPrimaryAction("release-reset", "Resetting release state", resetReleaseState);
    });
    documentStatusButton()?.addEventListener("click", () => {
      withPrimaryAction("change-document-status", "Updating status", changeCurrentDocumentStatus);
    });
    document.getElementById("viewer-git-actions-button")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const panel = document.getElementById("viewer-git-actions-menu");
      setGitActionsMenuOpen(Boolean(panel?.hidden));
    });
    document.getElementById("viewer-git-pull")?.addEventListener("click", () => {
      setGitActionsMenuOpen(false);
      recordGitActivity("Pull", "Git pull started in a Workshop terminal");
      spawnWorkshopTerminal({ command: ["git", "pull"], label: "git pull" });
    });
    document.getElementById("viewer-git-commit")?.addEventListener("click", () => {
      setGitActionsMenuOpen(false);
      openGitCommitModal().catch((error) => setMeta(error?.message || "Git commit failed."));
    });
    document.getElementById("viewer-git-push")?.addEventListener("click", () => {
      setGitActionsMenuOpen(false);
      recordGitActivity("Push", "Git push started in a Workshop terminal");
      spawnWorkshopTerminal({ command: ["git", "push"], label: "git push" });
    });
    document.getElementById("viewer-git-fetch")?.addEventListener("click", () => {
      setGitActionsMenuOpen(false);
      withPrimaryAction("git-fetch", "Fetching", async () => {
        if (await fetchGitRemote()) await refreshCurrentScreen();
      });
    });
    startAutoRefresh();
  });
})();
