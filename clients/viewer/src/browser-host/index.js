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
import { focusFilterLabel, matchesFilterState, updateFilterOptionCounts } from "./filters.js";
import {
  activeCdxAssistantCountFromPayload,
  activeCdxRunCountFromPayload,
  activityStateForRoot,
  captureDocumentViewState,
  captureLanTokenFromUrl,
  cdxHistoryIdentity,
  cdxHistorySessionName,
  cdxKnownProviders,
  cdxProviders,
  cdxReadiness,
  cdxRunIdentity,
  cdxRunSessionName,
  cdxSessionBlock,
  cdxSessionName,
  cdxSessionPermission,
  cdxSessions,
  cdxTokenUsage,
  clearNavMenuBadges,
  closeNavMenus,
  detectHljsLanguage,
  ensureWorkshopTerminalHostFor,
  escapeHtml,
  filterCdxEntriesByProvider,
  filterCdxHistoryBySession,
  filterCdxRunsBySession,
  focusRequest,
  formatCdxResetAt,
  formatCustomTerminalCdxSessionOption,
  getActiveToken,
  getDeviceToken,
  gitStatusSignature,
  isCdxSessionEnabled,
  isClosed,
  isRecent,
  isStale,
  knownCdxHistorySessions,
  knownCdxRunSessions,
  latestCdxSessionName,
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
  renderCdxActionButton,
  renderCdxBadge,
  renderCdxEntityRows,
  renderCdxHistoryControls,
  renderCdxLogPreview,
  renderCdxObjectRows,
  renderCdxRemainingPill,
  renderCdxReport,
  renderCdxRunControls,
  renderCdxSessionActionMenu,
  renderCdxStatusControls,
  renderCdxTokenUsage,
  renderCdxUnreadBadge,
  renderCdxUsageGauge,
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
  renderTextRemaining,
  renderViewerOnboarding,
  renderWorkshopTabs,
  renderWorkspace,
  resizeWorkshopTerminal,
  returnToProjectSurface,
  runtimeStatusSignature,
  sanitizeViewerFilterState,
  setNavMenuBadges,
  setupCdxImportExportHandlers,
  showRequestDraftModal,
  showThemedChoiceModal,
  showThemedConfirmModal,
  showThemedInputModal,
  showThemedMessageModal,
  startDevicePairing,
  syncWorkshopTerminalSize,
  updateCdxSessionEntry,
  updateCdxSessionPermissionEntry,
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
    return viewerFetch(input, init);
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
  const repoGithubLink = () => document.getElementById("viewer-repo-github");
  const repoFolderButton = () => document.getElementById("viewer-repo-folder");
  const workshopButton = () => document.getElementById("viewer-workshop");
  const ciButton = () => document.getElementById("viewer-ci");
  const autoRefreshControl = () => document.getElementById("viewer-auto-refresh");
  const refreshIntervalControl = () => document.getElementById("viewer-refresh-interval");
  const minimizedScreens = new Map();
  let liveMinimizedScreenId = "";
  const refreshMenuButton = () => document.getElementById("viewer-refresh-menu-button");
  const refreshMenuPanel = () => document.getElementById("viewer-refresh-menu");
  const versionLink = () => document.getElementById("viewer-version-link");
  const bootstrapLogicsButton = () => document.getElementById("viewer-bootstrap-logics");
  const activityClearControl = () => document.getElementById("activity-clear");
  let viewerFilterState = { ...defaultFilterState };
  let latestItems = [];
  let latestRepoRoot = "";
  let latestRepository = { root: "", githubUrl: "" };
  let latestCapabilities = {};
  let latestProjects = [];
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
  let latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
  let latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
  let latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
  let latestReleaseRunsStatusSignature = "";
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
    viewerPreferences: () => viewerPreferences,
  });

  let connectionState = "connected";
  let lastSuccessfulSyncAt = 0;
  let latestViewerStateSignature = "";
  let latestGitStatusSignature = "";
  let latestGitStatusPayload = null;
  // Per-section badge counters. `missions` is a live gauge (number of mission
  // runs currently in progress) and carries no seen-tracking. `runs`/`history`
  // are deltas: `seen` is the set of identifiers the user has already looked at,
  // and `count` is how many current entries are not in that set. `seen: null`
  // means "not seeded yet" so the very first snapshot doesn't flag everything.
  let latestCiStatusSignature = "";
  let latestCiScreenMode = "git";
  let currentDocumentItem = null;
  let primaryActionBusyKey = "";
  let primaryActionController = null;
  let viewerPreferences = readViewerPreferences();
  let autoRefreshIntervalForcedByLaunch = false;
  let embeddedHost = "";
  let viewSeq = 0; // bumps on every view transition (operator or silent refresh)
  let userViewSeq = 0; // bumps only on operator-initiated transitions
  let activeUserViewController = null;
  function writeViewerPreferences(nextPreferences) {
    viewerPreferences = { ...nextPreferences, version: preferenceVersion };
    try {
      window.localStorage.setItem(preferenceKey, JSON.stringify(viewerPreferences));
    } catch {
      // Keep the in-memory preference for this session when browser storage is unavailable.
    }
  }

  function updateViewerPreferences(patch) {
    writeViewerPreferences({ ...viewerPreferences, ...patch });
    if (patch.projectLastUsedAt && window.parent !== window) window.parent.postMessage({ type: "viewer-project-last-used", projectLastUsedAt: patch.projectLastUsedAt }, "*");
    if (patch.favoriteProjects && window.parent !== window) window.parent.postMessage({ type: "viewer-favorite-projects", favoriteProjects: patch.favoriteProjects }, "*");
    syncWorkshopSystemTerminalControls();
  }

  window.addEventListener("message", (event) => { const projectLastUsedAt = event.data?.type === "viewer-project-last-used" ? event.data.projectLastUsedAt : null; if (projectLastUsedAt && typeof projectLastUsedAt === "object" && !Array.isArray(projectLastUsedAt)) { writeViewerPreferences({ ...viewerPreferences, projectLastUsedAt }); renderProjectMenu(); } });
  window.addEventListener("message", (event) => { const favoriteProjects = event.data?.type === "viewer-favorite-projects" ? event.data.favoriteProjects : null; if (Array.isArray(favoriteProjects)) { writeViewerPreferences({ ...viewerPreferences, favoriteProjects: favoriteProjects.map((value) => String(value)).filter(Boolean).sort() }); renderProjectMenu(); } });

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

  function workshopUsesSystemTerminal() {
    return viewerPreferences.workshopUseSystemTerminal === true || window.parent !== window;
  }
  function syncWorkshopSystemTerminalControls() {
    document.querySelectorAll("[data-viewer-workshop-system-terminal]").forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.checked = workshopUsesSystemTerminal();
      }
    });
  }

  function bindWorkshopSystemTerminalControls() {
    document.querySelectorAll("[data-viewer-workshop-system-terminal]").forEach((node) => {
      if (!(node instanceof HTMLInputElement) || node.dataset.viewerBound === "1") return;
      node.dataset.viewerBound = "1";
      node.addEventListener("change", () => {
        updateViewerPreferences({ workshopUseSystemTerminal: node.checked });
        setMeta(node.checked ? "Workshop will open system terminals." : "Workshop will use the embedded terminal (xterm.js).");
      });
    });
    syncWorkshopSystemTerminalControls();
  }

  function favoriteProjectIds() {
    const stored = Array.isArray(viewerPreferences.favoriteProjects) ? viewerPreferences.favoriteProjects : [];
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
    updateViewerPreferences({ favoriteProjects: Array.from(favorites).sort() });
  }

  function preferredAutoRefreshIntervalSeconds() {
    const seconds = Number(viewerPreferences.autoRefreshIntervalSeconds);
    return Number.isFinite(seconds) && seconds > 0 ? normalizeAutoRefreshIntervalSeconds(seconds) : null;
  }

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
      setMeta(`${label}...`);
    }
  }

  function withPrimaryAction(actionKey, label, action) {
    if (primaryActionBusyKey) {
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
    viewerFilterState = sanitizeViewerFilterState(storedState?.viewerFilterState);
  }

  function persistViewerFilterState() {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? storedState : {};
    writeStoredState({ ...nextState, viewerFilterState: { ...viewerFilterState } });
  }

  function activityEventsFromStoredState(state = readStoredState(), root = latestRepoRoot) {
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

  function ciActivityEvents(ciStatus = latestCiStatus) {
    // req_487: reuse the recentRuns the CI badge already fetched (/api/ci-status) as
    // ci-kind activity events. No extra fetch; the shared feed + filter handle kind:"ci".
    const runs = ciStatus && Array.isArray(ciStatus.recentRuns) ? ciStatus.recentRuns : [];
    return runs
      .filter((run) => run && typeof run === "object")
      .map((run, index) => {
        const workflow = String(run.workflowName || "CI");
        const state = String(run.badgeState || "unknown");
        return {
          id: String(run.id ? `ci-${run.id}` : `ci-run-${index}`),
          kind: "ci",
          category: "ci",
          stage: "ci",
          marker: "C",
          action: "CI run",
          title: `${workflow} — ${state}`,
          label: state,
          meta: String(run.title || `${workflow} ${state}`),
          // req_284/item_516+517: discrete fields for the coloured marker and the
          // recomposed "workflow · outcome · time" meta line.
          workflow,
          outcome: state,
          badgeState: state,
          at: run.updatedAt || "",
          updatedAt: run.updatedAt || ""
        };
      });
  }

  function dispatchViewerActivityUpdate() {
    const storedState = readStoredState();
    const payload = {
      root: latestRepoRoot,
      items: latestItems,
      selectedId: storedState?.selectedId || "",
      activityEvents: [
        ...activityEventsFromStoredState(storedState, latestRepoRoot),
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

  function recordGitActivity(action, meta = "") {
    const storedState = readStoredState();
    const baseState = storedState && typeof storedState === "object" ? storedState : {};
    const scopedState = activityStateForRoot(baseState, latestRepoRoot);
    const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
    const now = new Date().toISOString();
    const safeAction = String(action || "Git").trim() || "Git";
    history.unshift({
      id: `git-action-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type: "git-action",
      action: safeAction,
      title: `Git ${safeAction}`,
      label: safeAction,
      meta: meta || `Git ${safeAction.toLowerCase()} started`,
      at: now,
      updatedAt: now
    });
    writeStoredState(writeActivityStateForRoot({
      ...baseState,
      viewerFilterState: { ...viewerFilterState }
    }, latestRepoRoot, { activitySnapshot: scopedState.activitySnapshot || {}, activityHistory: history }));
    dispatchViewerActivityUpdate();
  }

  function syncGitCommitActivity(payload) {
    const commits = Array.isArray(payload?.recentCommits) ? payload.recentCommits : [];
    if (!commits.length) {
      return;
    }
    // req_284/item_517: the repo's current branch is the best per-commit context
    // the git status payload carries; attach it (degrades to "" when absent).
    const branch = String(payload?.branch || "").trim();
    const storedState = readStoredState();
    const baseState = storedState && typeof storedState === "object" ? storedState : {};
    const scopedState = activityStateForRoot(baseState, latestRepoRoot);
    const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
    const knownIds = new Set(history.map((entry) => String(entry?.id || "")));
    const newEntries = commits
      .filter((commit) => commit && typeof commit === "object" && commit.hash)
      .map((commit) => {
        const hash = String(commit.hash || "").trim();
        const subject = String(commit.subject || "Untitled commit").trim() || "Untitled commit";
        const author = String(commit.author || "").trim();
        const date = String(commit.date || "").trim();
        return {
          id: `git-commit-${hash}`,
          type: "git-commit",
          action: "Commit",
          title: subject,
          label: "Commit",
          meta: [hash, author, date].filter(Boolean).join(" · "),
          sha: hash.slice(0, 7),
          branch,
          at: date,
          updatedAt: date
        };
      })
      .filter((entry) => entry.id && !knownIds.has(entry.id));
    if (!newEntries.length) {
      return;
    }
    writeStoredState(writeActivityStateForRoot({
      ...baseState,
      viewerFilterState: { ...viewerFilterState }
    }, latestRepoRoot, { activitySnapshot: scopedState.activitySnapshot || {}, activityHistory: [...newEntries, ...history] }));
    if (activityPanelIsOpen()) {
      dispatchViewerActivityUpdate();
    }
  }

  function updateStoredActivity(nextItems, root = latestRepoRoot) {
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
      viewerFilterState: { ...viewerFilterState }
    }, root, { activitySnapshot: nextSnapshot, activityHistory: history }));
    return decorated;
  }

  function clearActivityHistory() {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? { ...storedState } : {};
    const byRoot = nextState.activityByRoot && typeof nextState.activityByRoot === "object" ? { ...nextState.activityByRoot } : {};
    delete byRoot[activityRootKey(latestRepoRoot)];
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
    latestRepoRoot = String(payload.root || latestRepoRoot || "");
    latestProjects = Array.isArray(payload.projects) ? payload.projects : latestProjects;
    const repository = payload.repository && typeof payload.repository === "object" ? payload.repository : {};
    latestRepository = {
      root: String(repository.root || latestRepoRoot || ""),
      provider: String(repository.provider || ""),
      webUrl: String(repository.webUrl || repository.githubUrl || repository.gitlabUrl || ""),
      githubUrl: String(repository.githubUrl || ""),
      gitlabUrl: String(repository.gitlabUrl || "")
    };
    const pill = repoPill();
    if (pill) {
      const repoName = String(payload.repoName || latestRepoRoot.split(/[\\/]/).filter(Boolean).pop() || "repository");
      const label = pill.querySelector("[data-viewer-project-label]");
      if (label) {
        label.textContent = repoName;
      } else {
        pill.textContent = repoName;
      }
      pill.title = latestRepoRoot || repoName;
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
      .map((project, index) => { const stored = viewerPreferences.projectLastUsedAt, value = stored && typeof stored === "object" ? stored[projectPreferenceId(project)] : "", time = Date.parse(String(value || "")); return { project, index, favorite: favorites.has(projectPreferenceId(project)), lastUsed: Number.isFinite(time) ? time : 0 }; })
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
    menu.innerHTML = `${projectRows}${pickerRow}`;
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
    { const active = (Array.isArray(data.payload?.projects) ? data.payload.projects : []).find((project) => project?.active), projectId = projectPreferenceId(active), stored = viewerPreferences.projectLastUsedAt; if (projectId) updateViewerPreferences({ projectLastUsedAt: { ...(stored && typeof stored === "object" ? stored : {}), [projectId]: new Date().toISOString() } }); } latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
    latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(latestCiStatus);
    updateMainReleaseBadge(latestReleaseRunsStatus);
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

  function applySelectedProjectPayload(payload, message) {
    returnToProjectSurface(); { const active = (Array.isArray(payload?.projects) ? payload.projects : []).find((project) => project?.active), projectId = projectPreferenceId(active), stored = viewerPreferences.projectLastUsedAt; if (projectId) updateViewerPreferences({ projectLastUsedAt: { ...(stored && typeof stored === "object" ? stored : {}), [projectId]: new Date().toISOString() } }); }
    latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
    latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(latestCiStatus);
    updateMainReleaseBadge(latestReleaseRunsStatus);
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
    if (!latestCanBootstrapLogics || !latestShouldPromptBootstrapLogics || !latestRepoRoot || bootstrapPromptOpen) {
      return;
    }
    if (promptedBootstrapRoots.has(latestRepoRoot)) {
      return;
    }
    promptedBootstrapRoots.add(latestRepoRoot);
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
    const workshop = workshopButton();
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
    const gitCi = ciButton();
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
    const github = repoGithubLink();
    const folder = repoFolderButton();
    if (github instanceof HTMLAnchorElement) {
      if (latestRepository.webUrl) {
        github.hidden = false;
        github.href = latestRepository.webUrl;
        github.onclick = (event) => {
          if (embeddedHost !== "vscode" || window.parent === window) return;
          event.preventDefault();
          window.parent.postMessage({ type: "open-external-link", target: latestRepository.webUrl }, "*");
        };
        const providerLabel = latestRepository.provider === "gitlab" ? "GitLab" : latestRepository.provider === "github" ? "GitHub" : "remote";
        github.title = `Open ${providerLabel} repository`;
        github.setAttribute("aria-label", `Open ${providerLabel} repository`);
      } else {
        github.hidden = true;
        github.removeAttribute("href");
        github.onclick = null;
      }
    }
    if (folder instanceof HTMLButtonElement) {
      folder.hidden = !latestRepository.root;
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
    if (!latestRepository.root) {
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

  function gitBadgeHtml(scope) {
    const behindVisible = latestGitBadgeCounts.unpulledCommits > 0 && (
      scope === "main" || scope === "history"
    );
    const commitsVisible = latestGitBadgeCounts.unpushedCommits > 0 && (
      scope === "main" || scope === "history"
    );
    const filesVisible = latestGitBadgeCounts.uncommittedFiles > 0 && (
      scope === "main" || scope === "changes"
    );
    const html = [
      behindVisible ? renderGitBadge("commits-behind", latestGitBadgeCounts.unpulledCommits) : "",
      commitsVisible ? renderGitBadge("commits", latestGitBadgeCounts.unpushedCommits) : "",
      filesVisible ? renderGitBadge("files", latestGitBadgeCounts.uncommittedFiles) : ""
    ].filter(Boolean).join("");
    return html ? `<span class="viewer-git-badges" data-viewer-git-badges="${escapeHtml(scope)}">${html}</span>` : "";
  }

  let workshopBadgeCounts = { terminals: 0, commands: 0 };

  function updateWorkshopBadges() {
    const button = document.getElementById("viewer-workshop");
    if (!(button instanceof HTMLElement)) return;
    button.querySelector('[data-viewer-workshop-badges]')?.remove();
    clearNavMenuBadges(["workshop:terminals", "workshop:commands"]);
    const { terminals, commands } = workshopBadgeCounts;
    if (terminals <= 0 && commands <= 0) return;
    const html = [
      terminals > 0
        ? `<span class="viewer-git-badge viewer-git-badge--commits" title="${escapeHtml(terminals + " terminal session(s) running")}" aria-label="${escapeHtml(terminals + " terminal session(s) running")}">${escapeHtml(String(terminals))}</span>`
        : "",
      commands > 0
        ? `<span class="viewer-git-badge viewer-git-badge--files" title="${escapeHtml(commands + " command(s) running")}" aria-label="${escapeHtml(commands + " command(s) running")}">${escapeHtml(String(commands))}</span>`
        : "",
    ].filter(Boolean).join("");
    if (html) {
      button.insertAdjacentHTML("beforeend", `<span class="viewer-git-badges" data-viewer-workshop-badges>${html}</span>`);
    }
    if (terminals > 0) {
      setNavMenuBadges("workshop:terminals", renderGitBadge("commits", terminals));
    }
    if (commands > 0) {
      setNavMenuBadges("workshop:commands", renderGitBadge("files", commands));
    }
  }

  function recomputeWorkshopBadges() {
    const isRunning = (state) => state === "running" || state === "starting";
    let terminals = 0;
    for (const entry of workshopTerminalState.sessions.values()) {
      if (isRunning(entry.state)) terminals += 1;
    }
    let commands = 0;
    for (const entry of workshopCommandState.sessions.values()) {
      if (isRunning(entry.state)) commands += 1;
    }
    if (workshopBadgeCounts.terminals === terminals && workshopBadgeCounts.commands === commands) return;
    workshopBadgeCounts = { terminals, commands };
    updateWorkshopBadges();
  }

  function updateMainGitBadges() {
    // Git shares the merged "Remote" button with CI; the git counters render
    // alongside the CI status badge (each owns its own data-attr container).
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.querySelector('[data-viewer-git-badges="main"]')?.remove();
    const html = gitBadgeHtml("main");
    if (html) {
      // Insert git counters before the CI status badge so order stays stable.
      const ciBadge = button.querySelector("[data-viewer-ci-badge]");
      if (ciBadge) {
        ciBadge.insertAdjacentHTML("beforebegin", html);
      } else {
        button.insertAdjacentHTML("beforeend", html);
      }
    }
    setNavMenuBadges("remote:git", gitBadgeHtml("main"));
  }

  function updateMainCiBadge(payload = latestCiStatus) {
    latestCiStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    // Only manage the CI status badge here. Button visibility now belongs to
    // updateCapabilityControls (git OR ci available), since the button is
    // shared with Git and must stay visible when only git is available.
    button.querySelector("[data-viewer-ci-badge]")?.remove();
    clearNavMenuBadges(["remote:runs"]);
    if (!latestCiStatus.visible) {
      return;
    }
    // Surface the latest CI message in the shared button tooltip when CI is live.
    button.title = latestCiStatus.message || "Show Git status, CI runs, and release state";
    const badge = renderCiButtonBadge(latestCiStatus);
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

  function updateMainReleaseBadge(payload = latestReleaseRunsStatus) {
    latestReleaseRunsStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    // Manage only the release status badge here; the shared "Remote" button
    // visibility is owned by updateCapabilityControls. Order on the button is
    // git counters -> CI badge -> release badge.
    button.querySelector("[data-viewer-release-badge]")?.remove();
    clearNavMenuBadges(["remote:release"]);
    if (!latestReleaseRunsStatus.visible) {
      return;
    }
    const badge = renderReleaseRunsButtonBadge(latestReleaseRunsStatus);
    button.insertAdjacentHTML("beforeend", badge);
    setNavMenuBadges("remote:release", badge);
  }

  async function refreshReleaseBadgeCounters() {
    if (!isCapabilityAvailable("ci")) {
      updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "Release runs are not available for this project.") });
      return;
    }
    try {
      const response = await fetch("/api/release-runs");
      if (response.status === 404) {
        updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: "Release runs endpoint unavailable." });
        return;
      }
      const data = await response.json();
      if (response.ok && data.ok) {
        latestReleaseRunsStatusSignature = runtimeStatusSignature(data.payload);
        updateMainReleaseBadge(data.payload);
      }
    } catch {
      updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: "Release runs unavailable." });
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
  function setGitBadgeCountsFromPayload(payload, options = {}) {
    latestGitBadgeCounts = normalizeGitBadgeCounts(payload);
    if (options.updateMain !== false) {
      updateMainGitBadges();
    }
  }

  async function refreshGitBadgeCounters() {
    if (!isCapabilityAvailable("git")) {
      latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
      return;
    }
    try {
      const response = await fetch("/api/git-status");
      const data = await response.json();
      if (response.ok && data.ok && data.payload?.state === "ok") {
        latestGitStatusPayload = data.payload;
        latestGitStatusSignature = gitStatusSignature(data.payload);
        syncGitCommitActivity(data.payload);
        setGitBadgeCountsFromPayload(data.payload);
      }
    } catch {
      latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
    }
  }

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
        latestReleaseRunsStatusSignature = runtimeStatusSignature(payload.releaseRuns);
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
        latestGitStatusPayload = payload.git;
        latestGitStatusSignature = gitStatusSignature(payload.git);
        syncGitCommitActivity(payload.git);
        setGitBadgeCountsFromPayload(payload.git);
      }
    } else {
      latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
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
    if (changed.has("ci") && activeDocumentTitle() === "Remote" && latestCiScreenMode === "runs") {
      await showCiStatus({ silent: true });
      return;
    }
    if (changed.has("releaseRuns") && activeDocumentTitle() === "Remote" && latestCiScreenMode === "release") {
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
    writeStoredState({ ...nextState, selectedId: id, viewerFilterState: { ...viewerFilterState } });
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
    viewerFilterState = { ...viewerFilterState, focus: "all", type: "all", status: "any", relation: "any", activity: "any" };
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
    const isGit = titleText === "Remote" && latestCiScreenMode === "git";
    const isRelease = titleText === "Remote" && latestCiScreenMode === "release";
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
    const payloadRoot = String(payload?.root || latestRepoRoot || "");
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
    renderEnvironmentWarning(payload.bootstrapWarning || payload.environmentWarning);
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
    // A second executable on PATH shadows the first, and has broken updates
    // twice in the field. Worth saying even when nothing needs updating.
    const duplicates = Array.isArray(updateInfo?.shadowingExecutables) ? updateInfo.shadowingExecutables : [];
    if (notices.length === 0 && duplicates.length === 0) {
      banner.hidden = true;
      return;
    }
    const copy = updateCopy();
    const command = updateCommand();
    if (copy) {
      const messages = notices
        .map(({ name, info }) => `${name} ${info.latestVersion} is available. Current version: ${info.currentVersion || "unknown"}.`);
      if (duplicates.length > 0) {
        const running = updateInfo?.executablePath ? ` Running: ${updateInfo.executablePath}.` : "";
        const manager = updateInfo?.manager ? ` Resolved manager: ${updateInfo.manager}.` : "";
        messages.push(
          `Warning: ${duplicates.length} other logics-manager executable${duplicates.length === 1 ? "" : "s"} on PATH `
          + `(${duplicates.join(", ")}).${running}${manager} Updating may act on a copy you are not running.`
        );
      }
      copy.textContent = messages.join(" ");
    }
    if (command) {
      command.textContent = notices.length
        ? notices.map(({ fallbackCommand, info }) => info.updateCommand || fallbackCommand).join(" && ")
        : "logics-manager doctor";
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
  // active section (git / runs / release) is tracked by latestCiScreenMode.
  function isGitCiScreenOpen() {
    const panel = documentPanel();
    const title = documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "Remote");
  }

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
      if (latestCiScreenMode === "release") {
        await showReleaseStatus({ silent: Boolean(options.silent), force: Boolean(options.force) });
      } else if (latestCiScreenMode === "runs") {
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
  async function fetchGitRemote() {
    try {
      const response = await fetch("/api/git-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setMeta(data.error || "Git fetch failed.");
        return false;
      }
      recordGitActivity("Fetch", "Fetched remote-tracking refs");
      return true;
    } catch {
      setMeta("Git fetch failed.");
      return false;
    }
  }

  async function refreshCurrentScreen() {
    const panel = documentPanel();
    const title = documentTitle();
    if (!panel || panel.hidden || !title) return;
    const screen = title.textContent || "";
    viewerDiagnostics.breadcrumb(`refreshCurrentScreen ${screen}`);
    const opts = { force: true };
    if (screen === "Getting Started") return showGettingStarted();
    if (screen === "CDX status") return showCdxStatus(opts);
    if (screen === "CDX missions") return showCdxMissions(opts);
    if (screen === "CDX reports") return showCdxRuns(opts);
    if (screen === "CDX history") return showCdxHistory(opts);
    if (screen === "CDX memory") return showCdxMemory(opts);
    if (screen === "CDX disk") return showCdxDisk(opts);
    if (screen === "Remote") {
      if (latestCiScreenMode === "release") return showReleaseStatus(opts);
      if (latestCiScreenMode === "runs") return showCiStatus(opts);
      setMeta("Fetching from remote...");
      await fetchGitRemote();
      return showGitStatus({ preserve: true, ...opts });
    }
    if (screen === "Workshop") {
      // For mounted terminals, Refresh should redraw in place (SIGWINCH nudge)
      // rather than tear down and replay the whole server buffer.
      if (preferredWorkshopTab() === "terminals" && hasMountedWorkshopTerminals()) {
        const count = redrawWorkshopTerminals();
        setMeta(count === 1 ? "Redrew 1 terminal." : `Redrew ${count} terminals.`);
        return;
      }
      return showWorkshop(opts);
    }
    if (screen === "Corpus insights") return showCorpusInsights();
    if (screen === "Validation health") return showHealth();
    return showDocumentByPath(screen);
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

  function setGitActionsMenuOpen(open) {
    setDropdownOpen(
      document.getElementById("viewer-git-actions-menu"),
      document.getElementById("viewer-git-actions-button"),
      open,
    );
  }

  // Open/close a topbar sub-section menu. Opening one closes the others so at
  // most one nav menu is visible at a time.
  function bindRefreshMenuControls() {
    const button = refreshMenuButton();
    if (button) {
      button.onclick = (event) => {
        event.stopPropagation();
        const panel = refreshMenuPanel();
        setRefreshMenuOpen(Boolean(panel?.hidden));
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
    return matchesFilterState(item, viewerFilterState);
  }

  function applyViewerFilter(group, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultFilterState, group)) {
      return;
    }
    viewerFilterState = { ...viewerFilterState, [group]: value || defaultFilterState[group] };
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
    const value = viewerFilterState.focus || defaultFilterState.focus;
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
    viewerFilterState = { ...defaultFilterState };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    setControlValue("search-input", "", "input");
    updateFilterSummary();
    requestBoardRender();
  }

  function requestBoardRender() {
    if (typeof window.__CDX_LOGICS_RENDER__ === "function") {
      window.__CDX_LOGICS_RENDER__();
    }
  }

  function updateFilterSummary() {
    updateFocusMenuState();
    const activeLabels = Object.entries(viewerFilterState)
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
        control.value = viewerFilterState[group] || defaultFilterState[group] || "";
        return;
      }
      if (control instanceof HTMLElement) {
        const group = control.getAttribute("data-viewer-filter-group") || "";
        const value = control.getAttribute("data-viewer-filter-value") || "";
        control.setAttribute("aria-pressed", viewerFilterState[group] === value ? "true" : "false");
      }
    });
    updateFilterOptionCounts({ items: latestItems, filterState: viewerFilterState });
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
      const html = `${renderDocumentMeta(documentItem)}${roadmapHtml}${bodyHtml}`;
      // Header reads as: [type pill] Object name, with the file path as subtitle.
      const objectName = String(item.title || "").trim() || docPath;
      setDocument(objectName, html, {
        item: documentItem,
        badgeStage: item.stage,
        eyebrow: docPath
      });
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
  async function loadWorkshopExplorer(options = {}) {
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (!(container instanceof HTMLElement)) return;
    if (!isCapabilityAvailable("workspace")) {
      const message = capabilityMessage("workspace", "Explorer is not available for this project.");
      container.innerHTML = renderWorkspace({ state: "unavailable", message }, { state: "unavailable", message });
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Loading workspace...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(""), fetchWorkspacePreview("")]);
    if (isViewStale(view)) {
      return;
    }
    const fresh = document.querySelector("[data-viewer-workshop-explorer]");
    if (fresh instanceof HTMLElement) {
      fresh.innerHTML = renderWorkspace(tree, preview);
    }
    setMeta(options.silent ? "Explorer refreshed." : "Explorer loaded.");
  }

  function preferredWorkshopTab() {
    const stored = String(viewerPreferences.workshopActiveTab || "");
    return workshopTabs.some((tab) => tab.id === stored) ? stored : "terminals";
  }

  function setWorkshopActiveTab(tabId) {
    const next = workshopTabs.some((tab) => tab.id === tabId) ? tabId : "terminals";
    if (next === viewerPreferences.workshopActiveTab) return;
    updateViewerPreferences({ workshopActiveTab: next });
  }

  function renderWorkshopPanel(tabId) {
    if (tabId === "explorer") {
      return `
        <div class="viewer-workshop__panel viewer-workshop__panel--explorer" role="tabpanel" data-viewer-workshop-panel="explorer" data-viewer-workshop-explorer>
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span>
            <span>Loading workspace...</span>
          </div>
        </div>
      `;
    }
    if (tabId === "commands") {
      return `
        <div class="viewer-workshop__panel" role="tabpanel" data-viewer-workshop-panel="commands" data-viewer-workshop-commands>
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span>
            <span>Discovering commands...</span>
          </div>
        </div>
      `;
    }
    const terminalsAvailable = Boolean(capability("workshop").detail?.terminalsAvailable);
    if (!terminalsAvailable) {
      return `
        <div class="viewer-workshop__panel viewer-workshop__panel--terminals" role="tabpanel" data-viewer-workshop-panel="terminals">
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span>
            <span>In-app terminals require a Unix host with stdlib pty support (macOS or Linux). Use the Commands tab to run discovered scripts in the meantime.</span>
          </div>
        </div>
      `;
    }
    return `
      <div class="viewer-workshop__panel viewer-workshop__panel--terminals-active" role="tabpanel" data-viewer-workshop-panel="terminals">
        <div class="viewer-workshop__portrait-blocker" data-viewer-workshop-portrait-blocker aria-hidden="true">
          <span class="viewer-workshop__portrait-blocker-icon" aria-hidden="true">↻</span>
          <span class="viewer-workshop__portrait-blocker-title">Rotate your device</span>
          <span class="viewer-workshop__portrait-blocker-body">Workshop terminals need a wider viewport. Switch to landscape (or resize the window) to use them.</span>
        </div>
        <aside class="viewer-workshop__terminal-list" data-viewer-workshop-terminal-list aria-label="Terminal sessions"></aside>
        <section class="viewer-workshop__terminal-stage" data-viewer-workshop-terminal-stage>
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty" data-viewer-workshop-terminal-empty>
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span>
            <span>No terminal session yet. Click "New terminal" to spawn one.</span>
          </div>
        </section>
      </div>
    `;
  }

  const workshopCommandState = {
    catalog: null,
    sessions: new Map(),
    streams: new Map(),
  };

  // Run control for a discovered command. When in-app terminals are available
  // and the command exposes a runnable argv, offer a hover menu (like the CDX
  // session launcher): run inline here, or launch in a new Workshop terminal.
  function renderWorkshopCommandRunMenu(entry) {
    const id = escapeHtml(entry.id);
    const terminalsAvailable = Boolean(capability("workshop")?.detail?.terminalsAvailable);
    const canLaunchTerminal = terminalsAvailable && Array.isArray(entry.runner) && entry.runner.length > 0;
    if (!canLaunchTerminal) {
      return `<button class="btn" type="button" data-viewer-workshop-command-run="${id}">Run</button>`;
    }
    const name = escapeHtml(entry.name || entry.id);
    return `
      <details class="viewer-cdx__menu viewer-workshop__command-run-menu">
        <summary class="btn viewer-workshop__command-run-summary" title="Choose how to run ${name}">Run</summary>
        <div class="viewer-cdx__menu-panel viewer-workshop__command-run-panel" role="menu" aria-label="Run options for ${name}">
          <button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-workshop-command-run-terminal="${id}">New terminal</button>
          <button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-workshop-command-run="${id}">Run here</button>
        </div>
      </details>
    `;
  }

  function renderWorkshopCommandRow(entry) {
    const session = workshopCommandState.sessions.get(entry.id) || null;
    const state = session?.state || "idle";
    const running = state === "running" || state === "starting";
    const exitBadge = session && session.exitCode !== null && session.exitCode !== undefined
      ? `<span class="viewer-workshop__exit viewer-workshop__exit--${session.exitCode === 0 ? "ok" : "fail"}">exit ${escapeHtml(String(session.exitCode))}</span>`
      : "";
    return `
      <li class="viewer-workshop__command" data-viewer-workshop-command="${escapeHtml(entry.id)}">
        <div class="viewer-workshop__command-header">
          <div class="viewer-workshop__command-name">
            <strong>${escapeHtml(entry.name)}</strong>
            <span class="viewer-workshop__command-source">${escapeHtml(entry.source)}</span>
          </div>
          <div class="viewer-workshop__command-actions">
            <span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(state)}">${escapeHtml(state)}</span>
            ${exitBadge}
            ${running
              ? `<button class="btn" type="button" data-viewer-workshop-command-stop="${escapeHtml(entry.id)}">Stop</button>`
              : renderWorkshopCommandRunMenu(entry)}
          </div>
        </div>
        <div class="viewer-workshop__command-meta"><code>${escapeHtml(entry.command)}</code></div>
        <pre class="viewer-workshop__log" data-viewer-workshop-command-log="${escapeHtml(entry.id)}" aria-live="polite">${escapeHtml(session?.logText || "")}</pre>
      </li>
    `;
  }

  function renderWorkshopCommandList(catalog) {
    if (!catalog || catalog.state === "unavailable") {
      return `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span><span>${escapeHtml(catalog?.message || "Commands are unavailable.")}</span></div>`;
    }
    const commands = Array.isArray(catalog.commands) ? catalog.commands : [];
    if (commands.length === 0) {
      return `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>${escapeHtml(catalog.message || "No commands discovered.")}</span></div>`;
    }
    const groups = new Map();
    commands.forEach((entry) => {
      const group = entry.group || "Commands";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(entry);
    });
    const sections = [...groups.entries()].map(([group, entries]) => `
      <section class="viewer-workshop__group">
        <h3 class="viewer-workshop__group-title">${escapeHtml(group)}</h3>
        <ul class="viewer-workshop__commands">
          ${entries.map(renderWorkshopCommandRow).join("")}
        </ul>
      </section>
    `).join("");
    return sections;
  }

  function renderWorkshopCommands() {
    const container = document.querySelector("[data-viewer-workshop-commands]");
    if (!(container instanceof HTMLElement)) return;
    container.innerHTML = renderWorkshopCommandList(workshopCommandState.catalog);
  }

  async function loadWorkshopCommands() {
    try {
      const response = await fetch("/api/workshop-commands");
      const data = await response.json();
      workshopCommandState.catalog = data?.payload || null;
    } catch (error) {
      workshopCommandState.catalog = { state: "unavailable", commands: [], message: String(error?.message || error) };
    }
    renderWorkshopCommands();
  }

  function updateWorkshopCommandSession(commandId, patch) {
    const previous = workshopCommandState.sessions.get(commandId) || { logText: "" };
    workshopCommandState.sessions.set(commandId, { ...previous, ...patch });
    renderWorkshopCommands();
    recomputeWorkshopBadges();
  }

  function appendWorkshopCommandLog(commandId, line) {
    const previous = workshopCommandState.sessions.get(commandId) || { logText: "" };
    const next = previous.logText ? `${previous.logText}\n${line}` : line;
    workshopCommandState.sessions.set(commandId, { ...previous, logText: next });
    const node = document.querySelector(`[data-viewer-workshop-command-log="${commandId}"]`);
    if (node instanceof HTMLElement) {
      node.textContent = next;
      node.scrollTop = node.scrollHeight;
    }
  }

  function closeWorkshopCommandStream(commandId) {
    const stream = workshopCommandState.streams.get(commandId);
    if (stream) {
      try { stream.close(); } catch { /* noop */ }
      workshopCommandState.streams.delete(commandId);
    }
  }

  async function startWorkshopCommand(commandId) {
    try {
      const response = await fetch("/api/workshop-command-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to start command.");
      }
      const session = data.payload;
      updateWorkshopCommandSession(commandId, {
        sessionId: session.id,
        state: session.state,
        exitCode: session.exitCode,
        logText: "",
      });
      openWorkshopCommandStream(commandId, session.id);
    } catch (error) {
      updateWorkshopCommandSession(commandId, { state: "error", logText: `! ${error?.message || error}` });
    }
  }

  function openWorkshopCommandStream(commandId, sessionId) {
    closeWorkshopCommandStream(commandId);
    const source = new EventSource(`/api/workshop-session/${encodeURIComponent(sessionId)}/stream`);
    workshopCommandState.streams.set(commandId, source);
    source.addEventListener("line", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        appendWorkshopCommandLog(commandId, String(payload.line || ""));
      } catch { /* noop */ }
    });
    source.addEventListener("end", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        updateWorkshopCommandSession(commandId, {
          state: payload.state,
          exitCode: payload.exitCode,
        });
      } catch { /* noop */ }
      closeWorkshopCommandStream(commandId);
    });
    source.addEventListener("error", () => {
      closeWorkshopCommandStream(commandId);
    });
  }

  async function stopWorkshopCommand(commandId) {
    const session = workshopCommandState.sessions.get(commandId);
    if (!session?.sessionId) return;
    try {
      await fetch("/api/workshop-command-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });
    } catch { /* noop */ }
  }

  const workshopTerminalState = {
    sessions: new Map(),
    activeId: "",
    streams: new Map(),
    order: [],
    draggingId: "",
    suppressSelectUntil: 0,
    hydrated: false,
  };
  const workshopExternalLaunches = [];

  function workshopTerminalOrderRootKey() {
    return latestRepoRoot || latestRepository?.root || "default";
  }

  function storedWorkshopTerminalOrder() {
    const byRoot = viewerPreferences.workshopTerminalOrderByRoot;
    const rootKey = workshopTerminalOrderRootKey();
    const value = byRoot && typeof byRoot === "object" ? byRoot[rootKey] : null;
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  }

  function persistWorkshopTerminalOrder() {
    const rootKey = workshopTerminalOrderRootKey();
    const byRoot = viewerPreferences.workshopTerminalOrderByRoot && typeof viewerPreferences.workshopTerminalOrderByRoot === "object"
      ? viewerPreferences.workshopTerminalOrderByRoot
      : {};
    updateViewerPreferences({
      workshopTerminalOrderByRoot: {
        ...byRoot,
        [rootKey]: [...workshopTerminalState.order]
      }
    });
  }

  function reconcileWorkshopTerminalOrder({ persist = false } = {}) {
    const ids = [...workshopTerminalState.sessions.keys()];
    const live = new Set(ids);
    const preferred = workshopTerminalState.order.length ? workshopTerminalState.order : storedWorkshopTerminalOrder();
    const next = preferred.filter((id) => live.has(id));
    for (const id of ids) {
      if (!next.includes(id)) next.push(id);
    }
    workshopTerminalState.order = next;
    if (persist) persistWorkshopTerminalOrder();
  }

  function orderedWorkshopTerminalEntries() {
    reconcileWorkshopTerminalOrder();
    return workshopTerminalState.order
      .map((id) => workshopTerminalState.sessions.get(id))
      .filter(Boolean);
  }

  function moveWorkshopTerminalBefore(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return false;
    reconcileWorkshopTerminalOrder();
    const next = workshopTerminalState.order.filter((id) => id !== sourceId);
    const targetIndex = next.indexOf(targetId);
    if (targetIndex < 0) return false;
    next.splice(targetIndex, 0, sourceId);
    workshopTerminalState.order = next;
    persistWorkshopTerminalOrder();
    renderWorkshopTerminalList();
    setMeta("Terminal order updated.");
    return true;
  }

  function clearWorkshopTerminalDragState() {
    workshopTerminalState.draggingId = "";
    document.querySelectorAll(".viewer-workshop__terminal-row.is-dragging, .viewer-workshop__terminal-row.is-drop-target").forEach((node) => {
      node.classList.remove("is-dragging", "is-drop-target");
      node.removeAttribute("aria-grabbed");
    });
  }

  async function hydrateWorkshopTerminals() {
    if (workshopTerminalState.hydrated) return;
    if (!isCapabilityAvailable("workshop")) return;
    if (!capability("workshop").detail?.terminalsAvailable) return;
    workshopTerminalState.hydrated = true;
    try {
      const response = await fetch("/api/workshop-terminals");
      const data = await response.json();
      const sessions = Array.isArray(data?.payload?.sessions) ? data.payload.sessions : [];
      for (const remote of sessions) {
        const id = String(remote?.id || "");
        if (!id) continue;
        if (workshopTerminalState.sessions.has(id)) continue;
        const state = String(remote?.state || "");
        // Only restore live sessions; the server reaps stopped/failed ones via TTL.
        if (state !== "running" && state !== "starting") continue;
        workshopTerminalState.sessions.set(id, {
          id,
          label: String(remote?.label || "shell"),
          command: Array.isArray(remote?.command) ? remote.command.map(String) : [],
          cdxSession: String(remote?.cdxSession || ""),
          state,
          bufferedOutput: "",
        });
      }
      if (!workshopTerminalState.activeId) {
        reconcileWorkshopTerminalOrder();
        workshopTerminalState.activeId = workshopTerminalState.order[0] || "";
      }
      reconcileWorkshopTerminalOrder({ persist: true });
      recomputeWorkshopBadges();
    } catch {
      workshopTerminalState.hydrated = false;
    }
  }

  // Detect the cdx session a terminal runs, by parsing its command label
  // (e.g. "cdx resume work2") and correlating tokens with known session names.
  function refreshWorkshopTerminalUsage() {
    if (!workshopTerminalListNode()) return;
    for (const entry of workshopTerminalState.sessions.values()) {
      if (cdxSessionForTerminal(entry)) {
        renderWorkshopTerminalList();
        return;
      }
    }
  }

  function renderWorkshopTerminalList() {
    const node = workshopTerminalListNode();
    if (!(node instanceof HTMLElement)) return;
    const entries = orderedWorkshopTerminalEntries();
    const externalRows = workshopExternalLaunches.slice(-12).reverse().map((entry) => {
      const cdxSession = cdxSessionForTerminal(entry), raw = Array.isArray(entry.command) ? entry.command.join(" ") : "";
      const displayLabel = cdxSession && (!entry.label || entry.label === raw || /^cdx\s+/.test(String(entry.label))) ? cdxSession : (entry.label || cdxSession || raw || "system terminal");
      return `<div class="viewer-workshop__terminal-row" data-viewer-workshop-external="${escapeHtml(entry.id)}" title="${escapeHtml([entry.terminal, entry.nativeRef || entry.id].filter(Boolean).join(" · "))}"><span class="viewer-workshop__terminal-row-main">${cdxSession ? renderCdxUsageGauge(cdxSessionUsage(cdxSession), cdxSession) : ""}<span class="viewer-workshop__terminal-row-label">${escapeHtml(displayLabel)}</span></span><span class="viewer-workshop__state viewer-workshop__state--running">external</span><span class="viewer-workshop__terminal-row-controls"><button class="viewer-workshop__terminal-row-close" type="button" data-viewer-workshop-external-close="${escapeHtml(entry.id)}" aria-label="Remove external terminal entry">×</button></span></div>`;
    }).join("");
    const header = `<div class="viewer-workshop__terminal-list-header">
      <span>Terminals</span>
      <span class="viewer-workshop__terminal-actions">
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-new>+ Shell</button>
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-custom>+ Custom</button>
      </span>
    </div>`;
    if (entries.length === 0 && !externalRows) {
      node.innerHTML = `${header}<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>No sessions yet.</span></div>`;
      return;
    }
    const rows = entries.map((entry) => {
      const isActive = entry.id === workshopTerminalState.activeId;
      const state = String(entry.state || "");
      const stateBadge = state && state !== "running" ? `<span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(state)}">${escapeHtml(state)}</span>` : "";
      const closing = Boolean(entry.closing);
      const closeAttrs = closing
        ? `aria-busy="true" aria-label="Closing session"`
        : `data-viewer-workshop-terminal-close="${escapeHtml(entry.id)}" role="button" tabindex="0" aria-label="Close session"`;
      const closeGlyph = closing
        ? `<span class="viewer-workshop__spinner" aria-hidden="true"></span>`
        : `×`;
      const clearSpan = closing
        ? ""
        : `<span class="viewer-workshop__terminal-row-clear" data-viewer-workshop-terminal-clear="${escapeHtml(entry.id)}" role="button" tabindex="0" aria-label="Clear screen">⎚</span>`;
      // When the terminal runs a cdx session, show the session name instead of
      // the raw command and a discreet usage gauge next to it.
      const cdxSession = cdxSessionForTerminal(entry);
      const rawCommandLabel = Array.isArray(entry.command) ? entry.command.join(" ") : "";
      const isRawCdxLabel = cdxSession && (!entry.label || entry.label === rawCommandLabel || /^cdx\s+/.test(String(entry.label)));
      const displayLabel = isRawCdxLabel ? cdxSession : (entry.label || cdxSession || entry.id);
      const gauge = cdxSession ? renderCdxUsageGauge(cdxSessionUsage(cdxSession), cdxSession) : "";
      return `<button class="viewer-workshop__terminal-row${isActive ? " is-active" : ""}${closing ? " is-closing" : ""}" type="button" draggable="true" data-viewer-workshop-terminal-drag="${escapeHtml(entry.id)}" data-viewer-workshop-terminal-select="${escapeHtml(entry.id)}">
        <span class="viewer-workshop__terminal-row-main">
          ${gauge}
          <span class="viewer-workshop__terminal-row-label" data-viewer-workshop-terminal-rename="${escapeHtml(entry.id)}">${escapeHtml(displayLabel)}</span>
        </span>
        ${stateBadge}
        <span class="viewer-workshop__terminal-row-controls">
          ${clearSpan}
          <span class="viewer-workshop__terminal-row-close${closing ? " is-closing" : ""}" ${closeAttrs}>${closeGlyph}</span>
        </span>
      </button>`;
    }).join("");
    node.innerHTML = `${header}<div class="viewer-workshop__terminal-rows">${rows}${externalRows}</div>`;
  }

  function ensureWorkshopTerminalStage() {
    const stage = workshopTerminalStageNode();
    if (!(stage instanceof HTMLElement)) return null;
    const active = workshopTerminalState.activeId
      ? workshopTerminalState.sessions.get(workshopTerminalState.activeId)
      : null;
    // Clean up placeholder and host elements for sessions that no longer exist.
    const placeholder = stage.querySelector("[data-viewer-workshop-terminal-empty]");
    if (placeholder) placeholder.remove();
    stage.querySelectorAll("[data-viewer-workshop-terminal-host]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const id = node.getAttribute("data-viewer-workshop-terminal-host") || "";
      if (!workshopTerminalState.sessions.has(id)) {
        node.remove();
      }
    });
    if (!active) {
      if (!stage.querySelector("[data-viewer-workshop-terminal-empty]")) {
        const empty = document.createElement("div");
        empty.className = "viewer-workspace__placeholder viewer-workspace__placeholder--empty";
        empty.setAttribute("data-viewer-workshop-terminal-empty", "");
        empty.innerHTML = '<span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>Select or create a terminal session to start.</span>';
        stage.appendChild(empty);
      }
      // Hide every existing host while no session is active.
      stage.querySelectorAll("[data-viewer-workshop-terminal-host]").forEach((node) => {
        if (node instanceof HTMLElement) {
          node.classList.add("viewer-workshop__terminal-host--hidden");
        }
      });
      return null;
    }
    // Toggle visibility: only the active host shows, every other host stays
    // mounted in the DOM so its xterm.js instance and scrollback survive.
    let host = stage.querySelector(`[data-viewer-workshop-terminal-host="${active.id}"]`);
    stage.querySelectorAll("[data-viewer-workshop-terminal-host]").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const id = node.getAttribute("data-viewer-workshop-terminal-host") || "";
      if (id === active.id) {
        node.classList.remove("viewer-workshop__terminal-host--hidden");
      } else {
        node.classList.add("viewer-workshop__terminal-host--hidden");
      }
    });
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.className = "viewer-workshop__terminal-host";
      host.setAttribute("data-viewer-workshop-terminal-host", active.id);
      stage.appendChild(host);
    }
    return host instanceof HTMLElement ? host : null;
  }

  function mountWorkshopTerminalEmulator(entry) {
    if (typeof window.Terminal !== "function") return;
    if (entry.terminal) return;
    const host = ensureWorkshopTerminalHostFor(entry.id);
    if (!host) return;
    const term = new window.Terminal({
      fontSize: workshopTerminalPreferredFontSize(),
      fontFamily: '"Menlo", "Consolas", monospace',
      letterSpacing: 0,
      theme: { background: "#0a0a0a", foreground: "#d4d4d4" },
      cursorBlink: true,
      scrollback: 2000,
      convertEol: false,
    });
    const fitAddon = typeof window.FitAddon === "function"
      ? new window.FitAddon()
      : (window.FitAddon && typeof window.FitAddon.FitAddon === "function" ? new window.FitAddon.FitAddon() : null);
    const linksAddon = window.WebLinksAddon && typeof window.WebLinksAddon.WebLinksAddon === "function"
      ? new window.WebLinksAddon.WebLinksAddon()
      : null;
    if (fitAddon) term.loadAddon(fitAddon);
    if (linksAddon) term.loadAddon(linksAddon);
    term.open(host);
    if (fitAddon) {
      try { fitAddon.fit(); } catch { /* noop */ }
    }
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type === "keydown" && ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey && (ev.key === "c" || ev.key === "C")) {
        // Ctrl+C must always interrupt the foreground process. When an app
        // (Claude/Codex) enables the kitty keyboard protocol and exits without
        // restoring it, xterm would otherwise emit a CSI-u sequence instead of
        // the legacy ETX byte, so the program never receives SIGINT and Ctrl+C
        // appears to hang. Force the classic \x03 so the PTY always raises
        // SIGINT regardless of the terminal's current keyboard mode.
        if (typeof ev.preventDefault === "function") ev.preventDefault();
        if (typeof ev.stopPropagation === "function") ev.stopPropagation();
        writeWorkshopTerminalInput(entry.id, "\x03");
        return false;
      }
      if (ev.type === "keydown" && ev.key === "Enter" && ev.shiftKey && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        // Insert a newline instead of submitting. Claude and Codex enable the
        // kitty keyboard protocol and expect Shift+Enter as a CSI-u key event
        // (key 13 = Enter, modifier 2 = Shift). preventDefault/stopPropagation
        // keep the browser/xterm from also emitting a plain Enter (which would
        // submit), and returning false suppresses xterm's own handling.
        if (typeof ev.preventDefault === "function") ev.preventDefault();
        if (typeof ev.stopPropagation === "function") ev.stopPropagation();
        // Send the Shift+Enter newline, then a form feed (Ctrl+L) in the same
        // ordered write so the app inserts the newline and immediately
        // clears/redraws — multi-line composition otherwise redraws over the
        // same line and leaves artifacts.
        writeWorkshopTerminalInput(entry.id, "\x1b[13;2u\f");
        return false;
      }
      return true;
    });
    term.onData((data) => {
      writeWorkshopTerminalInput(entry.id, data);
    });
    term.onResize((size) => {
      resizeWorkshopTerminal(entry.id, size.rows, size.cols);
    });
    entry.terminal = term;
    entry.fitAddon = fitAddon;
    syncWorkshopTerminalSize(entry);
    // Web fonts load asynchronously: once the real monospace font replaces the
    // fallback, the cell metrics (and therefore the column count) change. Refit
    // and re-sync the PTY, otherwise the TUI keeps wrapping against stale
    // columns and redraws over the same line while you type.
    if (document.fonts && typeof document.fonts.ready?.then === "function") {
      document.fonts.ready.then(() => {
        if (entry.terminal === term) syncWorkshopTerminalSize(entry);
      }).catch(() => { /* noop */ });
    }
    // A bare window 'resize' listener misses container-only changes (sidebar
    // toggle, panel layout, font-size class swaps). Observe the host element so
    // the PTY size always tracks what is actually visible.
    if (typeof window.ResizeObserver === "function") {
      try {
        const observer = new window.ResizeObserver(() => {
          if (entry.terminal !== term) return;
          if (entry.resizeRaf) cancelAnimationFrame(entry.resizeRaf);
          entry.resizeRaf = requestAnimationFrame(() => {
            entry.resizeRaf = 0;
            syncWorkshopTerminalSize(entry, { useHysteresis: true });
          });
        });
        observer.observe(host);
        entry.resizeObserver = observer;
      } catch { /* noop */ }
    }
    if (entry.id === workshopTerminalState.activeId) {
      openWorkshopTerminalStream(entry.id);
    }
    if (entry.bufferedOutput) {
      viewerDiagnostics.breadcrumb(`terminal:replay ${entry.id} ${entry.bufferedOutput.length}b`);
      term.write(entry.bufferedOutput);
      entry.bufferedOutput = "";
    }
  }

  function setActiveWorkshopTerminal(sessionId) {
    workshopTerminalState.activeId = sessionId || "";
    closeAllInactiveWorkshopTerminalStreams();
    renderWorkshopTerminalList();
    const entry = sessionId ? workshopTerminalState.sessions.get(sessionId) : null;
    ensureWorkshopTerminalStage();
    if (entry) {
      mountWorkshopTerminalEmulator(entry);
      if (!workshopTerminalState.streams.has(entry.id)) {
        openWorkshopTerminalStream(entry.id);
      }
      try { entry.terminal?.focus(); } catch { /* noop */ }
      // The host may have been display:none (so it had zero size and the PTY
      // size is stale). Fit AND push the new dimensions to the backend, not
      // just a local fit, so the TUI stops wrapping against the old width.
      syncWorkshopTerminalSize(entry);
      // Force a full repaint from the cell buffer: while the host was
      // display:none, xterm.js's renderer cannot measure the element and
      // its DOM state can drift from the buffer — SGR backgrounds and
      // box-drawing glyphs end up stale even though the text is intact.
      requestAnimationFrame(() => {
        const term = entry.terminal;
        if (!term) return;
        try { term.refresh(0, Math.max(0, term.rows - 1)); } catch { /* noop */ }
      });
    }
  }

  // Fit the emulator to its host and push the resulting dimensions to the PTY
  // (TIOCSWINSZ) so the backend's terminal width matches what is rendered.
  function hasMountedWorkshopTerminals() {
    for (const entry of workshopTerminalState.sessions.values()) {
      if (entry.terminal) return true;
    }
    return false;
  }

  // Force a running TUI to repaint its current frame without replaying the
  // server buffer or sending it any input: briefly change the PTY size so the
  // kernel raises SIGWINCH, then restore it. This is exactly what a window
  // resize does, so every terminal app (Claude, Codex, btop, vim) redraws.
  // Non-destructive redraw of every mounted terminal: repaint xterm's DOM from
  // its cell buffer and nudge each running app to re-render. Returns the count.
  function redrawWorkshopTerminals() {
    let count = 0;
    for (const entry of workshopTerminalState.sessions.values()) {
      const term = entry.terminal;
      if (!term) continue;
      count += 1;
      try { term.refresh(0, Math.max(0, term.rows - 1)); } catch { /* noop */ }
      nudgeWorkshopTerminalRedraw(entry);
    }
    return count;
  }

  function clearWorkshopTerminal(sessionId) {
    if (!sessionId) return;
    // Ctrl+L (form feed): the running app clears/redraws its own screen. This
    // is input to the app, so the underlying PTY session is never disturbed.
    writeWorkshopTerminalInput(sessionId, "\f");
    const entry = workshopTerminalState.sessions.get(sessionId);
    if (entry?.terminal) {
      try { entry.terminal.focus(); } catch { /* noop */ }
    }
    setMeta("Sent clear (Ctrl+L) to terminal.");
  }

  async function renameWorkshopTerminal(sessionId) {
    const entry = workshopTerminalState.sessions.get(sessionId);
    if (!entry || entry.closing) return;
    const current = String(entry.label || "").trim();
    const detectedCdxSession = cdxSessionForTerminal(entry);
    const next = await showThemedInputModal({
      title: "Rename terminal",
      message: "Edit the label shown in the terminal list.",
      defaultValue: current,
      placeholder: "Terminal label",
      submitLabel: "Rename",
      maxLength: 64
    });
    if (next === null) return;
    const label = String(next || "").trim();
    if (!label || label === current) return;
    try {
      const response = await fetch("/api/workshop-terminal-rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, label }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to rename terminal.");
      }
      const payload = data.payload || {};
      entry.label = String(payload.label || label);
      entry.command = Array.isArray(payload.command) ? payload.command.map(String) : entry.command;
      entry.cdxSession = String(payload.cdxSession || entry.cdxSession || detectedCdxSession || "");
      renderWorkshopTerminalList();
      setMeta(`Renamed terminal to ${entry.label}.`);
    } catch (error) {
      setMeta(`Terminal rename: ${error?.message || error}`);
    }
  }

  async function showCustomTerminalModal() {
    const sessions = await loadCdxSessionsForCustomTerminal();
    return new Promise((resolve) => {
      const modal = createThemedModal({
        title: "Custom terminal",
        message: "Run a command or start a terminal for an available CDX session.",
        submitLabel: "Run command"
      });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const select = document.createElement("select");
      select.className = "viewer-themed-modal__select";
      select.innerHTML = `<option value="">Custom command</option>${sessions.map((session) => `<option value="${escapeHtml(session.name)}">${escapeHtml(session.label)}</option>`).join("")}`;
      const input = document.createElement("input");
      input.className = "viewer-themed-modal__input";
      input.type = "text";
      input.placeholder = "node --version";
      const external = document.createElement("label"); external.className = "viewer-cdx__field viewer-cdx__field--check";
      external.innerHTML = `<input type="checkbox" data-viewer-custom-terminal-external${workshopUsesSystemTerminal() ? " checked" : ""}> Open in system terminal`;
      body?.append(select, input, external);
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      const submit = () => {
        const sessionName = select.value.trim();
        const systemTerminal = Boolean(modal.querySelector("[data-viewer-custom-terminal-external]")?.checked);
        if (sessionName) return done({ command: ["cdx", sessionName], label: `cdx ${sessionName}`, systemTerminal });
        const command = input.value.trim();
        done(command ? { command: ["sh", "-lc", command], label: command.slice(0, 32) || "custom", systemTerminal } : null);
      };
      select.addEventListener("change", () => {
        const hasSession = Boolean(select.value.trim());
        input.disabled = hasSession;
        input.placeholder = hasSession ? "Using selected CDX session" : "node --version";
      });
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", submit);
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter" && !(event.target instanceof HTMLSelectElement)) submit();
      });
      window.setTimeout(() => input.focus(), 0);
    });
  }

  function refitAllWorkshopTerminals() {
    const fontSize = workshopTerminalPreferredFontSize();
    for (const entry of workshopTerminalState.sessions.values()) {
      if (!entry.fitAddon || !entry.terminal) continue;
      try {
        if (entry.terminal.options && entry.terminal.options.fontSize !== fontSize) {
          entry.terminal.options.fontSize = fontSize;
        }
        // Same divergence trap as syncWorkshopTerminalSize: don't let fit()
        // size xterm to the raw dims while the PTY gets the clamped floor.
        // Resize both to the identical clamped value.
        const dim = entry.fitAddon.proposeDimensions();
        if (dim && dim.cols > 0 && dim.rows > 0) {
          const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
          const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
          entry.lastSyncedCols = cols;
          entry.lastSyncedRows = rows;
          if (entry.terminal.cols !== cols || entry.terminal.rows !== rows) {
            try { entry.terminal.resize(cols, rows); } catch { /* noop */ }
          }
          resizeWorkshopTerminal(entry.id, rows, cols);
        }
      } catch { /* noop */ }
    }
  }

  // Whenever the page/tab regains visibility or the workshop becomes
  // visible again, force every mounted xterm to repaint from its cell
  // buffer. The renderer's DOM state can drift while the host is hidden
  // (display:none on parent, browser tab inactive, OS window minimised)
  // and decorations (SGR backgrounds, box-drawing glyphs) end up blanked
  // until the next full repaint.
  function repaintAllWorkshopTerminals() {
    for (const entry of workshopTerminalState.sessions.values()) {
      const term = entry.terminal;
      if (!term) continue;
      try { term.refresh(0, Math.max(0, term.rows - 1)); } catch { /* noop */ }
    }
  }

  function resumeActiveWorkshopTerminalStream() {
    // After sleep/wake the EventSource error may not have fired yet; reopen the
    // active terminal stream if it dropped (resumes from lastSeq).
    const activeId = workshopTerminalState.activeId;
    if (activeId && workshopTerminalStreamWanted(activeId)) openWorkshopTerminalStream(activeId);
  }

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

  let workshopTerminalResizeTimer = null;
  let customTerminalBusy = false;
  window.addEventListener("resize", () => {
    if (workshopTerminalResizeTimer) clearTimeout(workshopTerminalResizeTimer);
    workshopTerminalResizeTimer = setTimeout(() => {
      workshopTerminalResizeTimer = null;
      refitAllWorkshopTerminals();
    }, 80);
  });

  function setCustomTerminalBusy(trigger, busy) {
    customTerminalBusy = Boolean(busy);
    const controls = trigger instanceof HTMLElement
      ? [trigger]
      : Array.from(document.querySelectorAll("[data-viewer-workshop-terminal-custom]")).filter((node) => node instanceof HTMLElement);
    controls.forEach((control) => {
      if (!control.dataset.viewerOriginalLabel) {
        control.dataset.viewerOriginalLabel = control.textContent || "+ Custom";
      }
      if ("disabled" in control) {
        control.disabled = customTerminalBusy;
      }
      control.setAttribute("aria-busy", customTerminalBusy ? "true" : "false");
      control.classList.toggle("is-loading", customTerminalBusy);
      control.textContent = customTerminalBusy ? "Loading..." : (control.dataset.viewerOriginalLabel || "+ Custom");
    });
    if (customTerminalBusy) {
      setMeta("Loading CDX sessions...");
    }
  }

  // Best-effort grid the new PTY should be born with, so a full-screen TUI's
  // first frame matches the pane instead of the kernel's 80x24 default. Exact
  // when a terminal is already mounted (same pane); estimated from the stage
  // box + font metrics otherwise. The post-mount refit corrects any drift.
  function measureWorkshopTerminalGrid() {
    const mounted = [...workshopTerminalState.sessions.values()].find((entry) => entry.terminal && entry.terminal.cols > 0 && entry.terminal.rows > 0);
    if (mounted) {
      return { cols: mounted.terminal.cols, rows: mounted.terminal.rows };
    }
    const stage = workshopTerminalStageNode();
    const rect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null;
    if (!rect || rect.width < 1 || rect.height < 1) return null;
    const fontSize = workshopTerminalPreferredFontSize();
    const cellW = fontSize * 0.6;
    const cellH = fontSize * 1.2;
    const cols = Math.max(20, Math.min(400, Math.floor(rect.width / cellW)));
    const rows = Math.max(5, Math.min(200, Math.floor(rect.height / cellH)));
    return { cols, rows };
  }

  async function spawnWorkshopTerminal(options = {}) {
    if (options.systemTerminal === true || (options.systemTerminal !== false && workshopUsesSystemTerminal())) {
      return spawnSystemWorkshopTerminal(options);
    }
    try {
      const liveCount = [...workshopTerminalState.sessions.values()].filter((entry) => entry.state === "running" || entry.state === "starting").length;
      const WORKSHOP_TERMINAL_SOFT_CAP = 12;
      if (liveCount >= WORKSHOP_TERMINAL_SOFT_CAP) {
        setMeta(`Terminal limit reached (${WORKSHOP_TERMINAL_SOFT_CAP} live sessions). Close one before spawning another.`);
        return "";
      }
      const body = {};
      if (Array.isArray(options.command) && options.command.length) body.command = options.command;
      if (options.label) body.label = String(options.label);
      const grid = measureWorkshopTerminalGrid();
      if (grid) {
        body.cols = grid.cols;
        body.rows = grid.rows;
      }
      const response = await fetch("/api/workshop-terminal-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to start terminal.");
      const session = data.payload;
      workshopTerminalState.sessions.set(session.id, {
        id: session.id,
        label: session.label || "shell",
        command: Array.isArray(session.command) ? session.command.map(String) : [],
        cdxSession: String(session.cdxSession || ""),
        state: session.state,
        bufferedOutput: "",
      });
      reconcileWorkshopTerminalOrder({ persist: true });
      recomputeWorkshopBadges();
      // Ensure the Workshop view is mounted before activating.
      if (preferredWorkshopTab() !== "terminals") {
        await showWorkshop({ tab: "terminals" });
      } else {
        await showWorkshop({ tab: "terminals" });
      }
      setActiveWorkshopTerminal(session.id);
      return session.id;
    } catch (error) {
      setMeta(`Terminal: ${error?.message || error}`);
      return "";
    }
  }

  async function spawnSystemWorkshopTerminal(options = {}) {
    try {
      if (window.parent !== window) { const id = `vscode-terminal-${Date.now()}-${workshopExternalLaunches.length + 1}`, command = Array.isArray(options.command) ? options.command.map(String) : [], label = String(options.label || "terminal"); window.parent.postMessage({ type: "launch-workshop-terminal", command, label, cwd: latestRepoRoot || "" }, "*"); workshopExternalLaunches.push({ id, label, command, terminal: "VS Code", nativeRef: id }); renderWorkshopTerminalList(); await showWorkshop({ tab: "terminals" }); setMeta(`Opened VS Code terminal: ${label}.`); return id; }
      const body = {};
      if (Array.isArray(options.command) && options.command.length) body.command = options.command;
      if (options.label) body.label = String(options.label);
      const response = await fetch("/api/workshop-terminal-external-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to open system terminal.");
      const payload = data.payload || {};
      const id = String(payload.terminalRef || payload.id || `external-${Date.now()}-${workshopExternalLaunches.length + 1}`);
      workshopExternalLaunches.push({
        id, label: String(payload.label || options.label || "system terminal"),
        command: Array.isArray(payload.command) ? payload.command.map(String) : [],
        terminal: String(payload.terminal || ""), nativeRef: payload.nativeRef ? String(payload.nativeRef) : "",
      });
      renderWorkshopTerminalList();
      await showWorkshop({ tab: "terminals" });
      setMeta(`Opened ${payload.terminal || "system terminal"}: ${payload.label || options.label || "terminal"}.`);
      return id;
    } catch (error) {
      setMeta(`System terminal: ${error?.message || error}`);
      return "";
    }
  }

  async function spawnCustomWorkshopTerminal(trigger = null) {
    if (customTerminalBusy) return;
    setCustomTerminalBusy(trigger, true);
    try {
      const result = await showCustomTerminalModal();
      if (!result || !Array.isArray(result.command) || !result.command.length) return;
      spawnWorkshopTerminal({ command: result.command, label: result.label, systemTerminal: result.systemTerminal });
    } finally {
      setCustomTerminalBusy(trigger, false);
    }
  }

  // Public API for CDX / handoff launchers and other callers that want to
  // open a Workshop terminal pre-running a canonical command.
  window.logicsViewer = window.logicsViewer || {};
  window.logicsViewer.launchTerminal = (command, label) => spawnWorkshopTerminal({ command, label });

  const workshopTerminalInputBuffers = new Map();
  const workshopTerminalInputInFlight = new Set();

  function writeWorkshopTerminalInput(sessionId, data) {
    if (!sessionId || !data) return;
    workshopTerminalInputBuffers.set(
      sessionId,
      (workshopTerminalInputBuffers.get(sessionId) || "") + data,
    );
    flushWorkshopTerminalInput(sessionId);
  }

  function flushWorkshopTerminalInput(sessionId) {
    if (workshopTerminalInputInFlight.has(sessionId)) return;
    const buffered = workshopTerminalInputBuffers.get(sessionId);
    if (!buffered) return;
    workshopTerminalInputBuffers.set(sessionId, "");
    workshopTerminalInputInFlight.add(sessionId);
    fetch("/api/workshop-terminal-input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, data: buffered }),
    })
      .catch(() => { /* noop */ })
      .finally(() => {
        workshopTerminalInputInFlight.delete(sessionId);
        if (workshopTerminalInputBuffers.get(sessionId)) {
          flushWorkshopTerminalInput(sessionId);
        }
      });
  }

  // Resize hysteresis: only re-fit the PTY once the proposed grid drifts far
  // enough from the last applied size. A sub-step jitter (a one-cell wobble
  // while dragging, a scrollbar appearing) would otherwise trigger a full
  // SIGWINCH + redraw of the running TUI on the slightest movement.
  async function stopWorkshopTerminal(sessionId) {
    if (!sessionId) return;
    const pending = workshopTerminalState.sessions.get(sessionId);
    if (pending?.closing) return;
    if (pending) {
      pending.closing = true;
      renderWorkshopTerminalList();
    }
    try {
      await fetch("/api/workshop-terminal-stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch { /* noop */ }
    closeWorkshopTerminalStream(sessionId);
    const entry = workshopTerminalState.sessions.get(sessionId);
    releaseWorkshopTerminalObserver(entry);
    if (entry?.terminal) {
      try { entry.terminal.dispose(); } catch { /* noop */ }
    }
    workshopTerminalState.sessions.delete(sessionId);
    reconcileWorkshopTerminalOrder({ persist: true });
    if (workshopTerminalState.activeId === sessionId) {
      setActiveWorkshopTerminal(workshopTerminalState.order[0] || "");
    } else {
      renderWorkshopTerminalList();
    }
    recomputeWorkshopBadges();
  }

  function closeWorkshopTerminalStream(sessionId) {
    const stream = workshopTerminalState.streams.get(sessionId);
    if (stream) {
      try { stream.close(); } catch { /* noop */ }
      workshopTerminalState.streams.delete(sessionId);
    }
  }

  function closeAllInactiveWorkshopTerminalStreams() {
    const keep = workshopTerminalState.activeId;
    for (const id of Array.from(workshopTerminalState.streams.keys())) {
      if (id !== keep) closeWorkshopTerminalStream(id);
    }
  }

  function openWorkshopTerminalStream(sessionId) {
    closeWorkshopTerminalStream(sessionId);
    closeAllInactiveWorkshopTerminalStreams();
    const entry = workshopTerminalState.sessions.get(sessionId);
    const since = entry && Number.isFinite(entry.lastSeq) ? entry.lastSeq : 0;
    const source = new EventSource(`/api/workshop-terminal/${encodeURIComponent(sessionId)}/stream?since=${since}`);
    workshopTerminalState.streams.set(sessionId, source);
    source.addEventListener("data", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        const chunk = String(payload.data || "");
        const seq = Number(payload.seq);
        const target = workshopTerminalState.sessions.get(sessionId);
        if (!target) return;
        if (Number.isFinite(seq)) target.lastSeq = seq;
        if (target.terminal) {
          target.terminal.write(chunk);
        } else {
          target.bufferedOutput = (target.bufferedOutput || "") + chunk;
        }
      } catch { /* noop */ }
    });
    source.addEventListener("end", (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        const target = workshopTerminalState.sessions.get(sessionId);
        if (target) target.state = payload.state;
        renderWorkshopTerminalList();
        recomputeWorkshopBadges();
      } catch { /* noop */ }
      closeWorkshopTerminalStream(sessionId);
    });
    source.addEventListener("error", () => {
      // A transient drop (sleep/wake, Wi-Fi blip) lands here too (clean end is
      // the "end" event), so reconnect a live session instead of freezing.
      closeWorkshopTerminalStream(sessionId);
      reopenWorkshopTerminalStreamSoon(sessionId);
    });
  }

  // Only the active terminal keeps a live stream (inactive ones replay on activation).
  function workshopTerminalStreamWanted(sessionId) {
    return workshopTerminalState.activeId === sessionId
      && workshopTerminalState.sessions.has(sessionId)
      && !workshopTerminalState.streams.has(sessionId);
  }

  function reopenWorkshopTerminalStreamSoon(sessionId) {
    const target = workshopTerminalState.sessions.get(sessionId);
    if (!target || ["finished", "failed", "stopped", "error"].includes(target.state)) return;
    setTimeout(() => { if (workshopTerminalStreamWanted(sessionId)) openWorkshopTerminalStream(sessionId); }, 1000);
  }

  function renderWorkshop(activeTab, options = {}) {
    if (options.unavailable) {
      return `
        <div class="viewer-workshop">
          <div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable">
            <span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span>
            <span>${escapeHtml(options.message || "Workshop is not available for this project.")}</span>
          </div>
        </div>
      `;
    }
    return `
      <div class="viewer-workshop">
        <div class="viewer-workshop__tabs" role="tablist" aria-label="Workshop sub-screens">
          ${renderWorkshopTabs(activeTab)}
        </div>
        ${renderWorkshopPanel(activeTab)}
      </div>
    `;
  }

  async function showWorkshop(options = {}) {
    const workshopAvailable = isCapabilityAvailable("workshop");
    const workspaceAvailable = isCapabilityAvailable("workspace");
    if (!workshopAvailable && !workspaceAvailable) {
      const message = capabilityMessage("workshop", "Workshop is not available for this project.");
      setDocument("Workshop", renderWorkshop("terminals", { unavailable: true, message }));
      setMeta(message);
      return;
    }
    // When the host only exposes the workspace (no terminals/commands), default
    // straight to the Explorer tab so the panel isn't empty.
    const fallbackTab = workshopAvailable ? preferredWorkshopTab() : "explorer";
    const activeTab = options.tab && workshopTabs.some((tab) => tab.id === options.tab)
      ? options.tab
      : fallbackTab;
    setWorkshopActiveTab(activeTab);
    setDocument("Workshop", renderWorkshop(activeTab));
    setMeta(`Workshop / ${activeTab}`);
    if (activeTab === "explorer") {
      await loadWorkshopExplorer({ silent: Boolean(options.silent) });
    } else if (activeTab === "commands") {
      await loadWorkshopCommands();
    } else if (activeTab === "terminals") {
      // The Workshop DOM was just re-rendered, so every prior xterm host /
      // EventSource is gone. Drop them from the in-memory state too so the
      // remount path recreates fresh ones and the SSE stream replays the
      // session buffer.
      for (const entry of workshopTerminalState.sessions.values()) {
        releaseWorkshopTerminalObserver(entry);
        if (entry.terminal) {
          try { entry.terminal.dispose(); } catch { /* noop */ }
        }
        entry.terminal = null;
        entry.fitAddon = null;
        // Reset lastSeq so the new SSE stream replays the FULL server-side
        // buffer instead of resuming after the dispose point. Otherwise the
        // freshly-created xterm only sees writes emitted since the dispose,
        // missing every escape sequence the TUI sent at startup (box-drawing
        // decor, SGR backgrounds) — visible to the user as "text is there
        // but the decor disappeared".
        entry.lastSeq = 0;
        closeWorkshopTerminalStream(entry.id);
      }
      if (workshopTerminalState.activeId) {
        setActiveWorkshopTerminal(workshopTerminalState.activeId);
      } else {
        renderWorkshopTerminalList();
        ensureWorkshopTerminalStage();
      }
    }
  }

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

  async function showReleaseStatus(options = {}) {
    latestCiScreenMode = "release";
    if (!options.silent) {
      setMeta("Checking release workflow state...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    let runsData = {};
    try {
      const [statusResponse, runsResponse] = await Promise.all([
        fetch("/api/release-status", { signal: view.signal }),
        fetch("/api/release-runs", { signal: view.signal }).catch(() => null),
      ]);
      response = statusResponse;
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (runsResponse && runsResponse.ok) {
        try {
          runsData = await runsResponse.json();
        } catch {
          runsData = {};
        }
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
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load release workflow state.");
    }
    const runsPayload = runsData && runsData.ok ? runsData.payload : null;
    if (runsPayload) {
      latestReleaseRunsStatusSignature = runtimeStatusSignature(runsPayload);
      updateMainReleaseBadge(runsPayload);
    }
    setDocument("Remote", renderReleaseStatus(data.payload, runsPayload));
    const state = data.payload?.state || "unknown";
    const button = ciButton();
    if (button instanceof HTMLElement) {
      button.title = data.payload?.next_action || "Show CI and release workflow state";
    }
    setMeta(options.silent ? "Release workflow refreshed." : `Release workflow state: ${state}.`);
  }

  // Clear the recorded release gate evidence (server-side) so every gate
  // returns to pending, then reload the Release sub-screen.
  async function resetReleaseState() {
    setMeta("Resetting release evidence...");
    let data = {};
    try {
      const response = await fetch("/api/release-reset", { method: "POST", headers: { "Content-Type": "application/json" } });
      data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to reset release evidence.");
      }
    } catch (error) {
      setMeta(`Release reset failed: ${error?.message || error}`);
      return;
    }
    await showReleaseStatus({ force: true });
    const cleared = Number(data.payload?.cleared || 0);
    setMeta(cleared > 0
      ? `Release evidence reset — cleared ${cleared} entr${cleared === 1 ? "y" : "ies"}; gates are pending.`
      : "Release evidence already empty; gates are pending.");
  }

  async function showCiStatus(options = {}) {
    latestCiScreenMode = "runs";
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

  function renderGitStatus(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-git">
          ${renderCiModeSwitcher("git")}
          <div class="viewer-git__state">${escapeHtml(payload?.message || "Git status is unavailable.")}</div>
        </div>
      `;
    }
    const counts = payload.counts || {};
    const stagedCount = Number(counts.staged || 0);
    const modifiedCount = Number(counts.modified || 0);
    const deletedCount = Number(counts.deleted || 0);
    const renamedCount = Number(counts.renamed || 0);
    const untrackedCount = Number(counts.untracked || 0);
    const cards = [
      renderGitSummaryCard("Branch", payload.branch || "HEAD"),
      renderGitSummaryCard("Tracking", payload.tracking || "None"),
      renderGitSummarySegments("Ahead / Behind", [
        ["Ahead", payload.ahead || 0],
        ["Behind", payload.behind || 0]
      ]),
      renderGitSummaryCard("State", payload.clean ? "Clean" : "Dirty"),
      renderGitSummarySegments("Files", [
        ["Staged", stagedCount],
        ["Worktree", modifiedCount + deletedCount + renamedCount],
        ["Untracked", untrackedCount]
      ])
    ].join("");
    const groupDefs = [
      ["staged", "Staged", "staged"],
      ["modified", "Modified", "worktree"],
      ["deleted", "Deleted", "worktree"],
      ["renamed", "Renamed", "worktree"],
      ["untracked", "Untracked", "untracked"]
    ];
    const domainDefs = [
      ["changes", "Changes", stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount],
      ["staged", "Staged", stagedCount],
      ["worktree", "Worktree", modifiedCount + deletedCount + renamedCount],
      ["untracked", "Untracked", untrackedCount],
      ["history", "History", formatGitHistoryCount(payload)],
      ["remote", "Remote", payload.tracking ? 1 : 0]
    ];
    const domains = domainDefs.map(([key, label, count], index) => `
      <button class="viewer-git__domain${index === 0 ? " is-active" : ""}" type="button" data-viewer-git-domain="${escapeHtml(key)}" aria-pressed="${index === 0 ? "true" : "false"}">
        <span class="viewer-git__domain-label">${escapeHtml(label)}${key === "changes" ? gitBadgeHtml("changes") : ""}${key === "history" ? gitBadgeHtml("history") : ""}</span><strong>${escapeHtml(count)}</strong>
      </button>
    `).join("");
    const renderChangeStats = (entry) => {
      const additions = Number(entry?.additions);
      const deletions = Number(entry?.deletions);
      if (!Number.isFinite(additions) || !Number.isFinite(deletions)) {
        return "";
      }
      return `<span class="viewer-git__file-changes" title="Line changes"><span class="viewer-git__file-additions">+${escapeHtml(additions)}</span><span class="viewer-git__file-deletions">-${escapeHtml(deletions)}</span></span>`;
    };
    const renderFileSections = (allowedKeys) => groupDefs.filter(([key]) => allowedKeys.includes(key)).map(([key, label]) => {
      const entries = Array.isArray(payload.groups?.[key]) ? payload.groups[key] : [];
      if (!entries.length) {
        return "";
      }
      return `
        <section class="viewer-git__section">
          <h2>${escapeHtml(label)}</h2>
          <ul class="viewer-git__files">${entries.map((entry) => `
            <li>
              <button class="viewer-git__file" type="button" data-viewer-git-file="${escapeHtml(entry.path)}" data-viewer-git-cached="${key === "staged" ? "1" : "0"}">
                <span class="viewer-git__file-path">${escapeHtml(entry.from ? `${entry.from} -> ${entry.path}` : entry.path)}</span>
                ${renderChangeStats(entry)}
                ${entry.logicsType ? `<span class="viewer-git__file-kind">${escapeHtml(entry.logicsType)}</span>` : ""}
              </button>
            </li>
          `).join("")}</ul>
        </section>
      `;
    }).join("");
    const changesSections = renderFileSections(["staged", "modified", "deleted", "renamed", "untracked"]);
    const stagedSections = renderFileSections(["staged"]);
    const worktreeSections = renderFileSections(["modified", "deleted", "renamed"]);
    const untrackedSections = renderFileSections(["untracked"]);
    const clean = payload.clean ? '<p class="viewer-git__state">Working tree clean.</p>' : "";
    const recentCommits = Array.isArray(payload.recentCommits) ? payload.recentCommits : [];
    const historyCount = formatGitHistoryCount(payload);
    const renderGitHistoryReveal = (hiddenCount) => {
      if (hiddenCount <= 0) {
        return "";
      }
      const nextCount = Math.min(gitHistoryPageSize, hiddenCount);
      return `<li class="viewer-git__commit-row viewer-git__commit-row--reveal"><button class="viewer-git__reveal" type="button" data-viewer-git-history-reveal>Show ${escapeHtml(nextCount)} more</button></li>`;
    };
    const historyRows = recentCommits.length
      ? recentCommits.map((commit, index) => `
        <li class="viewer-git__commit-row" ${index >= gitHistoryPageSize ? "hidden data-viewer-git-history-hidden" : ""}>
          <button class="viewer-git__commit" type="button" data-viewer-git-commit="${escapeHtml(commit.hash || "")}">
            <span class="viewer-git__commit-main">
              <code>${escapeHtml(commit.hash || "")}</code>
              <strong>${escapeHtml(commit.subject || "Untitled commit")}</strong>
            </span>
            <span class="viewer-git__commit-meta">
              <span>${escapeHtml([commit.author, commit.date].filter(Boolean).join(" · ") || "Unknown")}</span>
              ${commit.refs ? `<span class="viewer-git__commit-refs">${escapeHtml(commit.refs)}</span>` : ""}
            </span>
          </button>
        </li>
      `).join("") + renderGitHistoryReveal(Math.max(0, recentCommits.length - gitHistoryPageSize))
      : `<li class="viewer-git__commit-row">${escapeHtml(payload.latestCommit || "No commit history available.")}</li>`;
    const history = `
      <section class="viewer-git__section">
        <h2>History</h2>
        <ul class="viewer-git__commits">${historyRows}</ul>
      </section>
    `;
    const remote = `
      <section class="viewer-git__section">
        <h2>Remote</h2>
        <p class="viewer-git__state">${escapeHtml(payload.tracking ? `Tracking ${payload.tracking}` : "No upstream branch detected.")}</p>
        <p class="viewer-git__state">${escapeHtml(`Ahead ${payload.ahead || 0}, behind ${payload.behind || 0}`)}</p>
      </section>
    `;
    return `
      <div class="viewer-git">
        ${renderCiModeSwitcher("git")}
        <div class="viewer-git__summary">${cards}</div>
        <div class="viewer-git__workspace has-diff-detail">
          <nav class="viewer-git__domains" aria-label="Git domains">${domains}</nav>
          <div class="viewer-git__content" aria-label="Git domain content">
            <section class="viewer-git__panel" data-viewer-git-panel="changes">
              <header class="viewer-git__panel-header"><span>Changes</span><strong>${escapeHtml(stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount)} files</strong></header>
              ${clean}
              ${changesSections || '<p class="viewer-git__state">No file changes detected.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="staged" hidden>
              <header class="viewer-git__panel-header"><span>Staged</span><strong>${escapeHtml(stagedCount)} files</strong></header>
              ${stagedSections || '<p class="viewer-git__state">No staged files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="worktree" hidden>
              <header class="viewer-git__panel-header"><span>Worktree</span><strong>${escapeHtml(modifiedCount + deletedCount + renamedCount)} files</strong></header>
              ${worktreeSections || '<p class="viewer-git__state">No modified, deleted, or renamed files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="untracked" hidden>
              <header class="viewer-git__panel-header"><span>Untracked</span><strong>${escapeHtml(untrackedCount)} files</strong></header>
              ${untrackedSections || '<p class="viewer-git__state">No untracked files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="history" hidden>
              <header class="viewer-git__panel-header"><span>History</span><strong>${escapeHtml(historyCount)} commits</strong></header>
              ${history}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="remote" hidden>
              <header class="viewer-git__panel-header"><span>Remote</span><strong>${escapeHtml(payload.tracking || "none")}</strong></header>
              ${remote}
            </section>
          </div>
          <section class="viewer-git__detail" aria-label="Git diff" data-viewer-git-detail>
            <div class="viewer-git__detail-title">Diff preview</div>
            <div class="viewer-git__diff" data-viewer-git-diff>Select a changed file or history commit to preview its diff.</div>
          </section>
        </div>
      </div>
    `;
  }

  function gitDiffLineKind(line) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      return "add";
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      return "delete";
    }
    if (line.startsWith("@@")) {
      return "hunk";
    }
    if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("+++") || line.startsWith("---")) {
      return "meta";
    }
    return "context";
  }

  function renderGitDiffPreview(content) {
    return renderCodeViewer(content, {
      language: "diff",
      lineClassName: (line) => `viewer-git__diff-line viewer-git__diff-line--${gitDiffLineKind(line)}`,
      renderLineHtml: (line) => escapeHtml(line || " ")
    });
  }

  function setActiveGitCommit(button) {
    document.querySelectorAll("[data-viewer-git-commit]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
    document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.remove("is-active");
      }
    });
  }

  async function loadGitDiff(path, cached, button = null) {
    const diffPanel = document.querySelector("[data-viewer-git-diff]");
    const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
    if (!(diffPanel instanceof HTMLElement) || !path) {
      return;
    }
    if (button instanceof HTMLElement) {
      setActiveGitFile(button);
    }
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "Diff preview";
    }
    diffPanel.textContent = "Loading diff...";
    const params = new URLSearchParams({ path });
    if (cached) {
      params.set("cached", "1");
    }
    const response = await fetch(`/api/git-diff?${params.toString()}`);
    const data = await response.json();
    const payload = data.payload || {};
    if (!response.ok || !data.ok || payload.state !== "ok") {
      diffPanel.textContent = payload.message || data.error || "Unable to load diff.";
      return;
    }
    const content = payload.diff || "";
    if (!content.trim()) {
      await loadGitFilePreview(path, diffPanel, detailTitle);
      return;
    }
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} · ${escapeHtml(payload.mode || "worktree")}${payload.truncated ? " · truncated" : ""}</div>${renderGitDiffPreview(content)}`;
  }

  async function loadGitCommitDiff(ref, button = null) {
    const diffPanel = document.querySelector("[data-viewer-git-diff]");
    const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
    if (!(diffPanel instanceof HTMLElement) || !ref) {
      return;
    }
    if (button instanceof HTMLElement) {
      setActiveGitCommit(button);
    }
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "Commit diff";
    }
    diffPanel.textContent = "Loading commit diff...";
    const response = await fetch(`/api/git-commit-diff?${new URLSearchParams({ ref }).toString()}`);
    const data = await response.json();
    const payload = data.payload || {};
    if (!response.ok || !data.ok || payload.state !== "ok") {
      diffPanel.textContent = payload.message || data.error || "Unable to load commit diff.";
      return;
    }
    const content = payload.diff || "";
    if (!content.trim()) {
      diffPanel.textContent = payload.message || "No diff is available for this commit.";
      return;
    }
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.ref || ref)} · commit${payload.truncated ? " · truncated" : ""}</div>${renderGitDiffPreview(content)}`;
  }

  async function loadGitFilePreview(path, diffPanel, detailTitle = null, options = {}) {
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "File preview";
    }
    diffPanel.textContent = "Loading file preview...";
    const params = new URLSearchParams({ path });
    if (options.full) {
      params.set("full", "1");
    }
    const response = await fetch(`/api/git-file-preview?${params.toString()}`);
    const data = await response.json();
    const payload = data.payload || {};
    if (!response.ok || !data.ok) {
      diffPanel.textContent = data.error || "Unable to load file preview.";
      return;
    }
    if (payload.state !== "ok") {
      diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} · file preview unavailable</div><p class="viewer-git__state">${escapeHtml(payload.message || "File preview is unavailable.")}</p>`;
      return;
    }
    const content = payload.content || "";
    const previewPath = payload.path || path;
    const forceButtonHtml = payload.canForce
      ? `<button class="btn viewer-code__force" type="button" data-viewer-git-preview-full="${escapeHtml(previewPath)}">Load anyway</button>`
      : "";
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(previewPath)} · file preview${payload.truncated ? " · truncated" : ""}</div>${renderCodeViewer(content, {
      language: detectHljsLanguage(previewPath),
      lineCount: payload.lineCount,
      truncated: Boolean(payload.truncated),
      hardCapHit: Boolean(payload.hardCapHit),
      forceButtonHtml
    })}`;
  }

  async function openGitCommitModal() {
    let payload = latestGitStatusPayload;
    if (!payload || payload.state !== "ok") {
      const response = await fetch("/api/git-status");
      const data = await response.json();
      if (!response.ok || !data.ok || data.payload?.state !== "ok") {
        throw new Error(data.error || data.payload?.message || "Unable to load Git changes.");
      }
      payload = data.payload;
      latestGitStatusPayload = payload;
    }
    const entries = gitCommitModalEntries(payload);
    if (!entries.length) {
      await showThemedMessageModal({ title: "Commit", message: "No changed files are available to commit." });
      return;
    }

    const modal = createThemedModal({
      title: "Commit",
      message: "Select files, enter a message, then create the commit.",
      submitLabel: "Commit"
    });
    const body = modal.querySelector(".viewer-themed-modal__body");
    const submit = modal.querySelector(".viewer-themed-modal__submit");
    const error = document.createElement("div");
    error.className = "viewer-git-commit__error";
    error.hidden = true;
    const files = document.createElement("div");
    files.className = "viewer-git-commit__files";
    for (const entry of entries) {
      const label = document.createElement("label");
      label.className = "viewer-git-commit__file";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = entry.path;
      checkbox.checked = true;
      const text = document.createElement("span");
      text.textContent = `${entry.group}: ${entry.from ? `${entry.from} -> ${entry.path}` : entry.path}`;
      label.append(checkbox, text);
      files.appendChild(label);
    }
    const message = document.createElement("textarea");
    message.className = "viewer-themed-modal__input viewer-git-commit__message";
    message.placeholder = "Commit message";
    message.rows = 3;
    body?.append(files, message, error);

    const selectedFiles = () => Array.from(files.querySelectorAll("input[type='checkbox']"))
      .filter((node) => node instanceof HTMLInputElement && node.checked)
      .map((node) => node.value);
    const updateSubmit = () => {
      if (submit instanceof HTMLButtonElement) {
        submit.disabled = !selectedFiles().length || !message.value.trim();
      }
    };
    const close = () => closeThemedModal(modal);
    const fail = (text) => {
      error.textContent = text;
      error.hidden = false;
    };
    files.addEventListener("change", updateSubmit);
    message.addEventListener("input", updateSubmit);
    modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close);
    modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close);
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (submit instanceof HTMLButtonElement && !submit.disabled) submit.click();
      }
    });
    submit?.addEventListener("click", async () => {
      const filesToCommit = selectedFiles();
      const commitMessage = message.value.trim();
      if (!filesToCommit.length || !commitMessage) {
        updateSubmit();
        return;
      }
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      error.hidden = true;
      try {
        const response = await fetch("/api/git-commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesToCommit, message: commitMessage })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.payload?.message || "Git commit failed.");
        }
        close();
        latestGitStatusPayload = null;
        latestGitStatusSignature = "";
        recordGitActivity("Commit", `Created commit ${data.payload?.shortHash || ""}`.trim());
        await showGitStatus({ force: true });
        setMeta(`Commit created${data.payload?.shortHash ? `: ${data.payload.shortHash}` : "."}`);
      } catch (err) {
        fail(err?.message || "Git commit failed.");
        updateSubmit();
      }
    });
    updateSubmit();
    window.setTimeout(() => message.focus(), 0);
  }

  async function showGitStatus(options = {}) {
    latestCiScreenMode = "git";
    const previous = options.preserve ? currentGitViewState() : { domain: "changes", path: "", cached: false };
    if (!isCapabilityAvailable("git")) {
      const message = capabilityMessage("git", "Git is not available for this project.");
      setDocument("Remote", renderGitStatus({ state: capability("git").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking Git status...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/git-status", { signal: view.signal });
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
      setDocument("Remote", renderGitStatus({
        state: "unavailable",
        message: "Git status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      setMeta("Restart the local viewer to enable Git status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load Git status.");
    }
    syncGitCommitActivity(data.payload);
    const nextGitSignature = gitStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestGitStatusSignature && nextGitSignature === latestGitStatusSignature) {
      setGitBadgeCountsFromPayload(data.payload, { updateMain: false });
      updateMainGitBadges();
      if (!options.silent) {
        setMeta(`Checked Git status just now · no changes (${new Date().toLocaleTimeString()})`);
      }
      return;
    }
    latestGitStatusSignature = nextGitSignature;
    latestGitStatusPayload = data.payload;
    setGitBadgeCountsFromPayload(data.payload, { updateMain: false });
    updateMainGitBadges();
    setDocument("Remote", renderGitStatus(data.payload));
    applyGitDomain(previous.domain || "changes");
    const restoredFile = previous.path ? findGitFileButton(previous.path, previous.cached) : null;
    const firstFile = restoredFile || document.querySelector("[data-viewer-git-file]");
    if (firstFile instanceof HTMLElement) {
      await loadGitDiff(firstFile.getAttribute("data-viewer-git-file") || "", firstFile.getAttribute("data-viewer-git-cached") === "1", firstFile);
    }
    setMeta(options.silent ? "Git status refreshed." : "Git status loaded.");
  }

  window.acquireVsCodeApi = function acquireVsCodeApi() {
    return {
      postMessage(message) {
        if (!message || typeof message.type !== "string") {
          return;
        }
        if (message.type === "ready") {
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
          nextState.viewerFilterState = sanitizeViewerFilterState(nextState.viewerFilterState || viewerFilterState);
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
      workshopTerminalState.draggingId = id;
      row.classList.add("is-dragging");
      row.setAttribute("aria-grabbed", "true");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
      }
    });
    document.addEventListener("dragover", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement) || !workshopTerminalState.draggingId) return;
      const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (!targetId || targetId === workshopTerminalState.draggingId) return;
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
      const sourceId = workshopTerminalState.draggingId || event.dataTransfer?.getData("text/plain") || "";
      const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (sourceId && targetId && sourceId !== targetId) {
        event.preventDefault();
        moveWorkshopTerminalBefore(sourceId, targetId);
        workshopTerminalState.suppressSelectUntil = Date.now() + 250;
      }
      clearWorkshopTerminalDragState();
    });
    document.addEventListener("dragend", () => {
      workshopTerminalState.suppressSelectUntil = Date.now() + 250;
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
      if (workshopTerminalCloseTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalCloseTarget.getAttribute("data-viewer-workshop-terminal-close") || "";
        if (id) stopWorkshopTerminal(id);
        return;
      }
      if (workshopExternalCloseTarget instanceof HTMLElement) {
        event.preventDefault(); event.stopPropagation();
        const id = workshopExternalCloseTarget.getAttribute("data-viewer-workshop-external-close") || "", index = workshopExternalLaunches.findIndex((entry) => entry.id === id);
        if (index >= 0) workshopExternalLaunches.splice(index, 1);
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
        if (Date.now() < workshopTerminalState.suppressSelectUntil) return;
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
        const commands = workshopCommandState.catalog?.commands;
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
