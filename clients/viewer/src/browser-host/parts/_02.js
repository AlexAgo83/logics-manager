  const refreshIntervalControl = () => document.getElementById("viewer-refresh-interval");
  const refreshMenuButton = () => document.getElementById("viewer-refresh-menu-button");
  const refreshMenuPanel = () => document.getElementById("viewer-refresh-menu");
  const versionLink = () => document.getElementById("viewer-version-link");
  const bootstrapLogicsButton = () => document.getElementById("viewer-bootstrap-logics");
  const activityClearControl = () => document.getElementById("activity-clear");
  const activityStorageLimit = 80;
  const gitHistoryPageSize = 10;
  const minAutoRefreshIntervalSeconds = 5;
  const maxAutoRefreshIntervalSeconds = 60;
  const defaultAutoRefreshIntervalMs = 15 * 1000;
  const defaultFilterState = {
    focus: "active",
    type: "all",
    status: "any",
    relation: "any",
    activity: "any"
  };
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
  let latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
  let latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
  let latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
  let latestReleaseRunsStatusSignature = "";
  let latestUpdateInfo = {};
  let latestCdxMissionState = {
    missionId: "full-audit",
    sessionId: "",
    strengthId: "standard",
    missionInputs: {},
    runMode: "terminal",
    outputMode: "plan",
    promptOverride: "",
    catalog: null,
    statusPayload: null,
    planPayload: null,
    runPayload: null,
    applyPayload: null
  };
  let connectionState = "connected";
  let lastSuccessfulSyncAt = 0;
  let latestViewerStateSignature = "";
  let latestGitStatusSignature = "";
  let latestGitStatusPayload = null;
  let latestCdxStatusSignature = "";
  let latestCdxStatusPayload = null;
  let latestCdxRunsPayload = null;
  let latestCdxHistoryPayload = null;
  const pendingCdxSessionToggles = new Map();
  const pendingCdxSessionPermissions = new Map();
  // Per-section badge counters. `missions` is a live gauge (number of mission
  // runs currently in progress) and carries no seen-tracking. `runs`/`history`
  // are deltas: `seen` is the set of identifiers the user has already looked at,
  // and `count` is how many current entries are not in that set. `seen: null`
  // means "not seeded yet" so the very first snapshot doesn't flag everything.
  const cdxUnreadState = {
    missions: { count: 0 },
    runs: { seen: null, count: 0 },
    history: { seen: null, count: 0 }
  };
  let latestCiStatusSignature = "";
  let latestCiScreenMode = "git";
  let currentDocumentItem = null;
  let primaryActionBusyKey = "";
  let primaryActionController = null;
  let cdxMissionBusyKey = "";
  let cdxCloseTarget = null;
  let viewerPreferences = readViewerPreferences();
  let autoRefreshIntervalForcedByLaunch = false;
  // View-transition guard. Prevents a slow async render (a previous document
  // fetch, or a silent auto-refresh in flight) from committing its DOM write
  // after the operator has already opened a different screen.
  let viewSeq = 0; // bumps on every view transition (operator or silent refresh)
  let userViewSeq = 0; // bumps only on operator-initiated transitions
  let activeUserViewController = null;
  const cdxStatusColumns = [
    { id: "session", label: "SESSION" },
    { id: "provider", label: "PROV." },
    { id: "status", label: "STATUS" },
    { id: "auth", label: "AUTH" },
    { id: "permission", label: "PERM." },
    { id: "ok", label: "OK" },
    { id: "remaining5h", label: "5H" },
    { id: "remainingWeek", label: "WEEK" },
    { id: "block", label: "BLOCK", defaultVisible: false },
    { id: "credits", label: "CR", defaultVisible: false },
    { id: "reset5h", label: "RESET 5H" },
    { id: "resetWeek", label: "RESET WEEK" },
    { id: "updated", label: "UPDATED" }
  ];
  const cdxRunColumns = [
    { id: "run", label: "RUN" },
    { id: "status", label: "STATUS" },
    { id: "kind", label: "KIND", defaultVisible: false },
    { id: "session", label: "SESSION" },
    { id: "tokens", label: "TOKENS" },
    { id: "cwd", label: "CWD", defaultVisible: false },
    { id: "report", label: "REPORT" }
  ];
  const cdxHistoryColumns = [
    { id: "session", label: "SESSION" },
    { id: "status", label: "STATUS" },
    { id: "action", label: "ACTION" },
    { id: "started", label: "STARTED" },
    { id: "duration", label: "DURATION" },
    { id: "tokens", label: "TOKENS" },
    { id: "artifacts", label: "ARTIFACTS" }
  ];
  const statusOptionsByStage = {
    request: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    backlog: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    task: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    product: ["Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    architecture: ["Draft", "Proposed", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    spec: ["Draft", "Ready", "In progress", "Done", "Validated", "Settled", "Archived"]
  };

  function readStoredState() {
    try {
      return JSON.parse(window.localStorage.getItem(stateKey) || "null");
    } catch {
      return null;
    }
  }

  function readViewerPreferences() {
    try {
      const value = JSON.parse(window.localStorage.getItem(preferenceKey) || "null");
      if (!value || typeof value !== "object" || value.version !== preferenceVersion) {
        return { version: preferenceVersion };
      }
      return { ...value, version: preferenceVersion };
    } catch {
      return { version: preferenceVersion };
    }
  }

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
  }

  function projectPreferenceId(project) {
    return String(project?.id || project?.root || project?.name || "");
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

  function cdxColumnVisibilityPreference() {
    const stored = viewerPreferences.cdxStatusColumns;
    const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
    const visibility = {};
    cdxStatusColumns.forEach((column) => {
      visibility[column.id] = column.defaultVisible !== false;
      if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
        visibility[column.id] = storedVisibility[column.id];
      }
    });
    return visibility;
  }

  function persistCdxColumnVisibility(columnId, visible) {
    const current = cdxColumnVisibilityPreference();
    if (!cdxStatusColumns.some((column) => column.id === columnId)) {
      return;
    }
    updateViewerPreferences({
      cdxStatusColumns: {
        visibility: { ...current, [columnId]: Boolean(visible) }
      }
    });
  }

  function cdxRunColumnVisibilityPreference() {
    const stored = viewerPreferences.cdxRunColumns;
    const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
    const visibility = {};
    cdxRunColumns.forEach((column) => {
      visibility[column.id] = column.defaultVisible !== false;
      if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
        visibility[column.id] = storedVisibility[column.id];
      }
    });
    return visibility;
  }

  function persistCdxRunColumnVisibility(columnId, visible) {
    const current = cdxRunColumnVisibilityPreference();
    if (!cdxRunColumns.some((column) => column.id === columnId)) {
      return;
    }
    updateViewerPreferences({
      cdxRunColumns: {
        visibility: { ...current, [columnId]: Boolean(visible) }
      }
    });
  }

  function cdxRunSessionFilterPreference() {
    const stored = viewerPreferences.cdxRunSessions;
    if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
      return { mode: "all", selected: [] };
    }
    const selected = Array.isArray(stored.selected)
      ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
  }

  function persistCdxRunSessionFilter(nextFilter) {
    const selected = Array.isArray(nextFilter?.selected)
      ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    updateViewerPreferences({
      cdxRunSessions: selected.length
        ? { mode: "subset", selected: Array.from(new Set(selected)) }
        : { mode: "all", selected: [] }
    });
  }

  function cdxHistoryColumnVisibilityPreference() {
    const stored = viewerPreferences.cdxHistoryColumns;
    const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
    const visibility = {};
    cdxHistoryColumns.forEach((column) => {
      visibility[column.id] = column.defaultVisible !== false;
      if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
        visibility[column.id] = storedVisibility[column.id];
      }
    });
    return visibility;
  }

  function persistCdxHistoryColumnVisibility(columnId, visible) {
    const current = cdxHistoryColumnVisibilityPreference();
    if (!cdxHistoryColumns.some((column) => column.id === columnId)) {
      return;
    }
    updateViewerPreferences({
      cdxHistoryColumns: {
        visibility: { ...current, [columnId]: Boolean(visible) }
      }
    });
  }

  function cdxHistorySessionFilterPreference() {
    const stored = viewerPreferences.cdxHistorySessions;
    if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
      return { mode: "all", selected: [] };
    }
    const selected = Array.isArray(stored.selected)
      ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
  }

  function persistCdxHistorySessionFilter(nextFilter) {
    const selected = Array.isArray(nextFilter?.selected)
      ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    updateViewerPreferences({
      cdxHistorySessions: selected.length
        ? { mode: "subset", selected: Array.from(new Set(selected)) }
        : { mode: "all", selected: [] }
    });
  }

  function cdxProviderFilterPreference() {
    const stored = viewerPreferences.cdxStatusProviders;
    if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
      return { mode: "all", selected: [] };
    }
    const selected = Array.isArray(stored.selected)
      ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
  }

  function persistCdxProviderFilter(nextFilter) {
    const selected = Array.isArray(nextFilter?.selected)
      ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    updateViewerPreferences({
      cdxStatusProviders: selected.length
        ? { mode: "subset", selected: Array.from(new Set(selected)).sort() }
        : { mode: "all", selected: [] }
    });
  }

  function sanitizeViewerFilterState(value) {
    const nextState = { ...defaultFilterState };
    if (!value || typeof value !== "object") {
      return nextState;
    }
    Object.keys(defaultFilterState).forEach((key) => {
      if (typeof value[key] === "string" && value[key]) {
        nextState[key] = value[key];
      }
    });
    return nextState;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function viewerStateSignature(payload) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const projects = Array.isArray(payload?.projects) ? payload.projects : [];
    return stableStringify({
      root: payload?.root || "",
      repository: payload?.repository || {},
      capabilities: normalizeCapabilities(payload),
      projects: projects.map((project) => ({
        id: project?.id || "",
        active: Boolean(project?.active),
        available: project?.available !== false,
        hasLogics: project?.hasLogics !== false,
        root: project?.root || ""
      })),
      items: items.map((item) => ({
        id: item?.id || "",
        relPath: item?.relPath || "",
        stage: item?.stage || "",
        status: item?.indicators?.Status || item?.status || "",
        updatedAt: item?.updatedAt || ""
      }))
    });
  }

  function gitStatusSignature(payload) {
    return stableStringify({
      state: payload?.state || "",
      branch: payload?.branch || "",
      tracking: payload?.tracking || "",
      ahead: Number(payload?.ahead || 0),
      behind: Number(payload?.behind || 0),
      clean: Boolean(payload?.clean),
      counts: payload?.counts || {},
      badgeCounts: payload?.badgeCounts || {},
      latestCommit: payload?.latestCommit || "",
      recentCommitsHasMore: Boolean(payload?.recentCommitsHasMore)
    });
  }

  function runtimeStatusSignature(payload) {
    return stableStringify(payload || {});
  }

  function primaryActionControls() {
    return Array.from(document.querySelectorAll([
      "#viewer-insights",
      "#viewer-health",
      "#viewer-getting-started",
      "#viewer-bootstrap-logics",
      "#viewer-restart-server",
      "#viewer-workshop",
      "#viewer-ci",
      "#viewer-cdx",
      "#viewer-repo-folder",
      "#viewer-document-status",
      "#viewer-release-reset",
      '[data-action="refresh"]',
      '[data-viewer-action="edit-document"]',
      "[data-viewer-project-id]",
      "[data-viewer-nav-target]",
      "[data-viewer-ci-mode]",
      "[data-viewer-cdx-mode]",
      "[data-viewer-cdx-session-action]",
      "[data-viewer-cdx-report]",
      "[data-viewer-cdx-artifact-path]",
    ].join(","))).filter((node) => node instanceof HTMLElement);
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
