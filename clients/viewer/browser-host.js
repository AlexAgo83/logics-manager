(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input, init) {
    const opts = init ? { ...init } : {};
    if (!opts.signal && primaryActionController) {
      opts.signal = primaryActionController.signal;
    }
    return nativeFetch(input, opts);
  };
  const stateKey = "logics.localViewer.state";
  const preferenceKey = "logics.localViewer.preferences.v1";
  const lanTokenKey = "logics.lan.token";
  const deviceTokenKey = "logics.lan.deviceToken";
  const deviceIdKey = "logics.lan.deviceId";
  const deviceLabelKey = "logics.lan.deviceLabel";

  function captureLanTokenFromUrl() {
    try {
      const url = new URL(window.location.href);
      const queryToken = url.searchParams.get("t");
      if (queryToken) {
        window.sessionStorage.setItem(lanTokenKey, queryToken);
        url.searchParams.delete("t");
        const cleaned = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(null, "", cleaned || "/");
      }
    } catch {
      // sessionStorage / history may be unavailable in some embed contexts.
    }
  }

  function getLanToken() {
    try {
      return window.sessionStorage.getItem(lanTokenKey) || "";
    } catch {
      return "";
    }
  }

  function getDeviceToken() {
    try {
      return window.localStorage.getItem(deviceTokenKey) || "";
    } catch {
      return "";
    }
  }

  function setDeviceCredentials({ token, deviceId, label }) {
    try {
      window.localStorage.setItem(deviceTokenKey, token || "");
      window.localStorage.setItem(deviceIdKey, deviceId || "");
      window.localStorage.setItem(deviceLabelKey, label || "");
    } catch { /* noop */ }
  }

  function clearDeviceCredentials() {
    try {
      window.localStorage.removeItem(deviceTokenKey);
      window.localStorage.removeItem(deviceIdKey);
      window.localStorage.removeItem(deviceLabelKey);
    } catch { /* noop */ }
  }

  // Prefer the persistent per-device token over the per-session share
  // token when both exist — mutations require the device token under
  // --lan-rw, and a paired device should not lose access if the share
  // URL is regenerated.
  function getActiveToken() {
    return getDeviceToken() || getLanToken();
  }

  captureLanTokenFromUrl();

  const originalFetch = window.fetch.bind(window);
  function withLanAuthorization(input, init) {
    const token = getActiveToken();
    if (!token) return init;
    const next = init ? { ...init } : {};
    const headers = new Headers(next.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    next.headers = headers;
    return next;
  }

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

  function closeThemedModal(modal) {
    if (modal instanceof HTMLElement) {
      modal.remove();
    }
  }

  function createThemedModal({ title, message, submitLabel = "OK", cancelLabel = "Cancel" }) {
    const modal = document.createElement("div");
    modal.className = "viewer-themed-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="viewer-themed-modal__panel">
        <div class="viewer-themed-modal__header">
          <div>
            <h2 class="viewer-themed-modal__title"></h2>
            <p class="viewer-themed-modal__copy"></p>
          </div>
          <button class="viewer-themed-modal__close" type="button" aria-label="Close" title="Close">x</button>
        </div>
        <div class="viewer-themed-modal__body"></div>
        <div class="viewer-themed-modal__actions">
          <button class="btn viewer-themed-modal__cancel" type="button"></button>
          <button class="btn primary viewer-themed-modal__submit" type="button"></button>
        </div>
      </div>
    `;
    const titleTarget = modal.querySelector(".viewer-themed-modal__title");
    const copyTarget = modal.querySelector(".viewer-themed-modal__copy");
    const submit = modal.querySelector(".viewer-themed-modal__submit");
    const cancel = modal.querySelector(".viewer-themed-modal__cancel");
    if (titleTarget instanceof HTMLElement) titleTarget.textContent = title;
    if (copyTarget instanceof HTMLElement) copyTarget.textContent = message || "";
    if (submit instanceof HTMLButtonElement) submit.textContent = submitLabel;
    if (cancel instanceof HTMLButtonElement) cancel.textContent = cancelLabel;
    document.body.appendChild(modal);
    return modal;
  }

  function showThemedInputModal({ title, message, defaultValue = "", placeholder = "", submitLabel = "OK", inputMode = "text", maxLength = 0 }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const input = document.createElement("input");
      input.className = "viewer-themed-modal__input";
      input.type = "text";
      input.value = defaultValue;
      input.placeholder = placeholder;
      input.inputMode = inputMode;
      if (maxLength > 0) input.maxLength = maxLength;
      body?.appendChild(input);
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(input.value));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter") done(input.value);
      });
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  }

  function showThemedChoiceModal({ title, message, options, value, submitLabel = "Apply" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const select = document.createElement("select");
      select.className = "viewer-themed-modal__select";
      for (const option of options) {
        const element = document.createElement("option");
        element.value = option;
        element.textContent = option;
        select.appendChild(element);
      }
      select.value = value && options.includes(value) ? value : (options[0] || "");
      body?.appendChild(select);
      const done = (nextValue) => {
        closeThemedModal(modal);
        resolve(nextValue);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(select.value));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter") done(select.value);
      });
      window.setTimeout(() => {
        select.focus();
      }, 0);
    });
  }

  function showThemedMessageModal({ title, message, submitLabel = "OK" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel, cancelLabel: "Close" });
      const cancel = modal.querySelector(".viewer-themed-modal__cancel");
      if (cancel instanceof HTMLButtonElement) cancel.hidden = true;
      const done = () => {
        closeThemedModal(modal);
        resolve();
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", done);
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", done);
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape" || event.key === "Enter") done();
      });
      window.setTimeout(() => {
        const submit = modal.querySelector(".viewer-themed-modal__submit");
        if (submit instanceof HTMLButtonElement) submit.focus();
      }, 0);
    });
  }

  function showThemedConfirmModal({ title, message, submitLabel = "Confirm", cancelLabel = "Cancel" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel, cancelLabel });
      const done = (confirmed) => {
        closeThemedModal(modal);
        resolve(Boolean(confirmed));
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(true));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(false));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(false));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(false);
        if (event.key === "Enter") done(true);
      });
      window.setTimeout(() => {
        const submit = modal.querySelector(".viewer-themed-modal__submit");
        if (submit instanceof HTMLButtonElement) submit.focus();
      }, 0);
    });
  }

  window.logicsViewerModals = {
    prompt: showThemedInputModal,
    choice: showThemedChoiceModal,
    message: showThemedMessageModal,
    confirm: showThemedConfirmModal
  };

  async function startDevicePairing() {
    const defaultLabel = String(window.navigator?.platform || "").trim() || "LAN device";
    const label = String(await showThemedInputModal({
      title: "Pair device",
      message: "Name this browser so the host can identify it before granting write access.",
      defaultValue: defaultLabel,
      placeholder: "Windows test",
      submitLabel: "Request PIN"
    }) || "").trim();
    if (!label) return;
    let pairingId = "";
    try {
      const startResponse = await fetch("/api/lan/pair/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok || !startData.ok) {
        await showThemedMessageModal({ title: "Pairing refused", message: String(startData.error || startResponse.status) });
        return;
      }
      pairingId = String(startData.payload?.pairingId || "");
    } catch (err) {
      await showThemedMessageModal({ title: "Pairing failed", message: String(err?.message || err) });
      return;
    }
    const pin = String(await showThemedInputModal({
      title: "Enter pairing PIN",
      message: "Enter the 6-digit PIN displayed on the host terminal.",
      placeholder: "000000",
      submitLabel: "Pair device",
      inputMode: "numeric",
      maxLength: 6
    }) || "").trim();
    if (!pin) return;
    try {
      const completeResponse = await fetch("/api/lan/pair/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingId, pin, label }),
      });
      const completeData = await completeResponse.json();
      if (!completeResponse.ok || !completeData.ok) {
        await showThemedMessageModal({ title: "Pairing failed", message: String(completeData.error || completeResponse.status) });
        return;
      }
      setDeviceCredentials({
        token: String(completeData.payload?.deviceToken || ""),
        deviceId: String(completeData.payload?.deviceId || ""),
        label: String(completeData.payload?.label || label),
      });
      refreshLanBannerPairingState();
      await showThemedMessageModal({
        title: "Device paired",
        message: `Paired as ${completeData.payload?.label || label}. Write access is enabled on this device.`
      });
    } catch (err) {
      await showThemedMessageModal({ title: "Pairing failed", message: String(err?.message || err) });
    }
  }

  function refreshLanBannerPairingState() {
    const banner = document.getElementById("viewer-lan-banner");
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    const pairedLabel = document.getElementById("viewer-lan-banner-paired");
    const deviceLabel = (() => {
      try { return window.localStorage.getItem(deviceLabelKey) || ""; } catch { return ""; }
    })();
    const hasDeviceToken = Boolean(getDeviceToken());
    if (banner instanceof HTMLElement && hasDeviceToken) {
      banner.hidden = true;
    }
    if (pairButton instanceof HTMLButtonElement) {
      pairButton.hidden = !window.__logicsLanRwEnabled || hasDeviceToken;
    }
    if (pairedLabel instanceof HTMLElement) {
      if (hasDeviceToken && deviceLabel) {
        pairedLabel.hidden = false;
        pairedLabel.textContent = `Paired as ${deviceLabel}`;
      } else {
        pairedLabel.hidden = true;
        pairedLabel.textContent = "";
      }
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    if (pairButton instanceof HTMLButtonElement) {
      pairButton.addEventListener("click", () => { startDevicePairing(); });
    }
    refreshLanBannerPairingState();
  });

  const preferenceVersion = 1;
  const meta = () => document.getElementById("viewer-meta");
  const documentPanel = () => document.getElementById("viewer-document");
  const documentTitle = () => document.getElementById("viewer-document-title");
  const documentContent = () => document.getElementById("viewer-document-content");
  const documentStatusButton = () => document.getElementById("viewer-document-status");
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
  const refreshMenuButton = () => document.getElementById("viewer-refresh-menu-button");
  const refreshMenuPanel = () => document.getElementById("viewer-refresh-menu");
  const versionLink = () => document.getElementById("viewer-version-link");
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
  let latestMetaText = "Read-only local viewer";
  let autoRefreshIntervalMs = defaultAutoRefreshIntervalMs;
  let nextAutoRefreshAt = 0;
  let autoRefreshEnabled = true;
  let autoRefreshTimeoutId = 0;
  let autoRefreshIntervalTouched = false;
  let applyingLocalChrome = false;
  let autoRefreshStarted = false;
  let itemsLoadInFlight = false;
  let refreshAfterVisible = false;
  let mermaidInitialized = false;
  let focusApplied = false;
  let latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
  let latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
  let latestUpdateInfo = {};
  let latestCdxMissionState = {
    missionId: "full-audit",
    sessionId: "",
    strengthId: "standard",
    missionInputs: {},
    runMode: "terminal",
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
  let latestCdxStatusSignature = "";
  let latestCdxStatusPayload = null;
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
    { id: "ok", label: "OK" },
    { id: "remaining5h", label: "5H" },
    { id: "remainingWeek", label: "WEEK" },
    { id: "block", label: "BLOCK", defaultVisible: false },
    { id: "credits", label: "CR", defaultVisible: false },
    { id: "reset5h", label: "RESET 5H" },
    { id: "resetWeek", label: "RESET WEEK" },
    { id: "updated", label: "UPDATED" }
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
      "#viewer-workshop",
      "#viewer-ci",
      "#viewer-cdx",
      "#viewer-repo-folder",
      "#viewer-document-status",
      '[data-action="refresh"]',
      '[data-viewer-action="edit-document"]',
      "[data-viewer-project-id]",
      "[data-viewer-ci-mode]",
      "[data-viewer-cdx-mode]",
      "[data-viewer-cdx-session-action]",
      "[data-viewer-cdx-report]",
      "[data-viewer-cdx-artifact-path]",
      "[data-viewer-cdx-create-request]"
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

  function cdxMissionActionControls() {
    return Array.from(document.querySelectorAll([
      "[data-viewer-cdx-plan]",
      "[data-viewer-cdx-run]",
      "[data-viewer-cdx-apply-plan]",
      "[data-viewer-cdx-mission]"
    ].join(","))).filter((node) => node instanceof HTMLElement);
  }

  function setCdxMissionBusy(actionKey, label = "") {
    cdxMissionBusyKey = actionKey || "";
    document.body?.toggleAttribute("data-viewer-cdx-mission-busy", Boolean(cdxMissionBusyKey));
    if (cdxMissionBusyKey) {
      document.body?.setAttribute("data-viewer-cdx-mission-busy-action", cdxMissionBusyKey);
    } else {
      document.body?.removeAttribute("data-viewer-cdx-mission-busy-action");
    }
    cdxMissionActionControls().forEach((control) => {
      if (!("disabled" in control)) {
        return;
      }
      control.disabled = Boolean(cdxMissionBusyKey);
      control.setAttribute("aria-busy", cdxMissionBusyKey ? "true" : "false");
      if (cdxMissionBusyKey) {
        control.setAttribute("data-viewer-action-busy", control.getAttribute("data-viewer-action-key") === actionKey ? "active" : "blocked");
      } else {
        control.removeAttribute("data-viewer-action-busy");
      }
    });
    if (!cdxMissionBusyKey) {
      updateCapabilityControls();
      applyLocalViewerChrome();
    }
    if (cdxMissionBusyKey && label) {
      setMeta(`${label}...`);
    }
  }

  function withCdxMissionAction(actionKey, label, action) {
    if (cdxMissionBusyKey) {
      setMeta("Another CDX mission action is still running.");
      return Promise.resolve(false);
    }
    setCdxMissionBusy(actionKey, label);
    return Promise.resolve()
      .then(action)
      .then(() => true)
      .catch((error) => {
        setMeta(error.message || "CDX mission action failed.");
        return false;
      })
      .finally(() => {
        setCdxMissionBusy("", "");
      });
  }

  function hydrateViewerFilterState() {
    const storedState = readStoredState();
    viewerFilterState = sanitizeViewerFilterState(storedState?.viewerFilterState);
  }

  function writeStoredState(value) {
    window.localStorage.setItem(stateKey, JSON.stringify(value || null));
  }

  function persistViewerFilterState() {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? storedState : {};
    writeStoredState({ ...nextState, viewerFilterState: { ...viewerFilterState } });
  }

  function updateStoredActivity(nextItems) {
    const storedState = readStoredState();
    const baseState = storedState && typeof storedState === "object" ? storedState : {};
    const previousSnapshot = baseState.activitySnapshot && typeof baseState.activitySnapshot === "object"
      ? baseState.activitySnapshot
      : {};
    const history = Array.isArray(baseState.activityHistory) ? [...baseState.activityHistory] : [];
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
        history.unshift({ path: relPath, at: now, status, previousStatus, type: statusChanged ? "status-change" : "updated" });
      }
      return statusChanged ? { ...item, activityType: "status-change" } : item;
    });
    writeStoredState({
      ...baseState,
      viewerFilterState: { ...viewerFilterState },
      activitySnapshot: nextSnapshot,
      activityHistory: history.slice(0, activityStorageLimit)
    });
    return decorated;
  }

  function clearActivityHistory() {
    const storedState = readStoredState();
    const nextState = storedState && typeof storedState === "object" ? { ...storedState } : {};
    delete nextState.activitySnapshot;
    delete nextState.activityHistory;
    writeStoredState(nextState);
    latestItems = latestItems.map((item) => {
      const clone = { ...item };
      delete clone.activityType;
      return clone;
    });
    setMeta("Local activity history cleared.");
  }

  function markdownApi() {
    if (typeof window.createCdxLogicsMarkdownApi === "function") {
      return window.createCdxLogicsMarkdownApi();
    }
    return null;
  }

  function escapeHtml(value) {
    const api = markdownApi();
    if (api && typeof api.escapeHtml === "function") {
      return api.escapeHtml(value);
    }
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value ?? "").replace(/["\\]/g, "\\$&");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = typeof result === "string" ? result.split(",")[1] || "" : "";
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  }

  function downloadBase64File(base64, filename) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function showCdxFormStatus(el, type, message) {
    if (!el) return;
    el.hidden = false;
    el.className = `viewer-cdx__form-status viewer-cdx__form-status--${type}`;
    el.textContent = message;
  }

  function setMeta(text) {
    latestMetaText = text;
    renderMeta();
  }

  function formatConnectionTime(timestamp) {
    if (!timestamp) {
      return "No successful sync yet";
    }
    return `Last successful sync ${new Date(timestamp).toLocaleTimeString()}`;
  }

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
      const parts = [latestMetaText];
      if (autoRefreshEnabled && nextAutoRefreshAt > 0) {
        const seconds = Math.max(0, Math.ceil((nextAutoRefreshAt - Date.now()) / 1000));
        parts.push(`next auto refresh in ${seconds}s`);
      }
      node.textContent = parts.join(" · ");
    }
  }

  function normalizeAutoRefreshIntervalSeconds(value) {
    const seconds = Math.round(Number(value));
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return defaultAutoRefreshIntervalMs / 1000;
    }
    return Math.min(maxAutoRefreshIntervalSeconds, Math.max(minAutoRefreshIntervalSeconds, seconds));
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
      githubUrl: String(repository.githubUrl || "")
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
        pill.disabled = latestProjects.length <= 1;
      }
      pill.onclick = () => {
        const menu = projectMenu();
        setProjectMenuOpen(Boolean(menu?.hidden));
      };
    }
    updateRepositoryShortcuts();
    renderProjectMenu();
  }

  function projectStateLabel(project) {
    if (project?.active) {
      return "current";
    }
    if (project?.available === false) {
      return "missing";
    }
    if (project?.hasLogics === false) {
      return "no Logics";
    }
    return "available";
  }

  function renderProjectMenu() {
    const menu = projectMenu();
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    const projects = latestProjects.filter((project) => project && typeof project === "object");
    menu.innerHTML = projects.map((project) => `
      <button class="viewer-project-switcher__item${project.active ? " is-active" : ""}" type="button" role="menuitem" data-viewer-project-id="${escapeHtml(project.id || "")}" title="${escapeHtml(project.root || project.name || "")}">
        <span class="viewer-project-switcher__item-name">${escapeHtml(project.name || "project")}</span>
        <span class="viewer-project-switcher__item-state">${escapeHtml(projectStateLabel(project))}</span>
        <span class="viewer-project-switcher__item-path">${escapeHtml(project.root || "")}</span>
      </button>
    `).join("");
  }

  function setProjectMenuOpen(open) {
    const button = repoPill();
    const menu = projectMenu();
    if (!(button instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      return;
    }
    const nextOpen = Boolean(open) && latestProjects.length > 1;
    menu.hidden = !nextOpen;
    button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
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
    latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
    latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(latestCiStatus);
    updateMainCdxBadge(null);
    const panel = documentPanel();
    if (panel) {
      panel.hidden = true;
    }
    postToApp(data.payload);
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

  let latestLanShareUrl = "";

  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to legacy path */ }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

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

  function normalizeCapabilities(payload) {
    const capabilities = payload?.capabilities && typeof payload.capabilities === "object" ? payload.capabilities : {};
    return {
      logics: capabilities.logics || { state: "ready", available: true, message: "" },
      workspace: capabilities.workspace || { state: "ready", available: true, message: "" },
      workshop: capabilities.workshop || { state: "missing", available: false, message: "" },
      git: capabilities.git || { state: "ready", available: true, message: "" },
      ci: capabilities.ci || { state: "ready", available: true, message: "" },
      cdx: capabilities.cdx || { state: "ready", available: true, message: "" },
      cdxRuns: capabilities.cdxRuns || { state: "unsupported", available: false, message: "" }
    };
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

  function setButtonUnavailable(button, message) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.title = message;
  }

  function setButtonAvailable(button, title) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.title = title;
  }

  function updateCapabilityControls() {
    const workshop = workshopButton();
    if (workshop instanceof HTMLElement) {
      // The Explorer screen now lives as a Workshop sub-tab (alongside
      // Terminals and Commands), so Workshop stays reachable whenever either
      // the workshop or the workspace capability is available.
      const workshopAvailable = isCapabilityAvailable("workshop");
      const workspaceAvailable = isCapabilityAvailable("workspace");
      const workshopVisible = workshopAvailable || workspaceAvailable;
      workshop.hidden = !workshopVisible;
      if (workshopVisible) {
        setButtonAvailable(workshop, "Show Workshop (terminals, commands, explorer)");
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
      if (latestRepository.githubUrl) {
        github.hidden = false;
        github.href = latestRepository.githubUrl;
      } else {
        github.hidden = true;
        github.removeAttribute("href");
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
    link.href = latestRepository.githubUrl || "https://github.com/AlexAgo83/logics-manager";
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
      setMeta(error instanceof Error ? error.message : "Unable to open repository folder.");
    }
  }

  function normalizeGitBadgeCounts(payload) {
    const counts = payload && typeof payload === "object" ? payload.badgeCounts || {} : {};
    return {
      unpushedCommits: Math.max(0, Number(counts.unpushedCommits || payload?.ahead || 0)),
      uncommittedFiles: Math.max(0, Number(counts.uncommittedFiles || 0))
    };
  }

  function renderGitBadge(kind, count) {
    const value = Number(count || 0);
    if (value <= 0) {
      return "";
    }
    const label = kind === "commits"
      ? `${value} commits locaux non pushés`
      : `${value} fichiers modifiés non commités`;
    return `<span class="viewer-git-badge viewer-git-badge--${kind}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(value)}</span>`;
  }

  function gitBadgeHtml(scope) {
    const commitsVisible = latestGitBadgeCounts.unpushedCommits > 0 && (
      scope === "main" || scope === "history"
    );
    const filesVisible = latestGitBadgeCounts.uncommittedFiles > 0 && (
      scope === "main" || scope === "changes"
    );
    const html = [
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
  }

  function ciBadgeTone(value) {
    const state = String(value || "").toLowerCase();
    if (state === "passing") {
      return "passing";
    }
    if (state === "failing") {
      return "failing";
    }
    if (state === "running" || state === "queued") {
      return "running";
    }
    if (state === "cancelled") {
      return "cancelled";
    }
    if (state === "unavailable") {
      return "unavailable";
    }
    return "unknown";
  }

  function ciBadgeLabel(value) {
    const state = ciBadgeTone(value);
    if (state === "passing") {
      return "pass";
    }
    if (state === "failing") {
      return "fail";
    }
    if (state === "running") {
      return String(value || "").toLowerCase() === "queued" ? "queue" : "run";
    }
    if (state === "cancelled") {
      return "cancel";
    }
    if (state === "unavailable") {
      return "auth";
    }
    return "n/a";
  }

  function renderCiButtonBadge(payload) {
    const state = payload?.badgeState || payload?.state || "unknown";
    const label = ciBadgeLabel(state);
    const tone = ciBadgeTone(state);
    return `<span class="viewer-ci-badge viewer-ci-badge--${escapeHtml(tone)}" data-viewer-ci-badge title="${escapeHtml(payload?.message || `CI ${label}`)}">${escapeHtml(label)}</span>`;
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
    if (!latestCiStatus.visible) {
      return;
    }
    // Surface the latest CI message in the shared button tooltip when CI is live.
    button.title = latestCiStatus.message || "Show Git status, CI runs, and release state";
    button.insertAdjacentHTML("beforeend", renderCiButtonBadge(latestCiStatus));
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
      }
    } catch {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status unavailable." });
    }
  }

  function activeCdxAssistantCountFromPayload(payload) {
    if (!payload || payload.state !== "ok") {
      return 0;
    }
    const status = payload.status || {};
    const sessions = cdxSessions(status);
    const sessionActive = sessions.filter((session) => {
      const state = String(session.state || session.status || session.availability || "").toLowerCase();
      return session.active === true ||
        state.includes("active") ||
        state.includes("running") ||
        state.includes("busy");
    }).length;
    if (sessionActive > 0) {
      return sessionActive;
    }
    const rowsActive = cdxRows(status).filter((row) => row.active === true).length;
    if (rowsActive > 0) {
      return rowsActive;
    }
    return cdxProviders(status).reduce((total, provider) => total + Math.max(0, Number(provider.active || 0)), 0);
  }

  function activeCdxRunCountFromPayload(payload) {
    if (!payload || payload.state !== "ok" || !Array.isArray(payload.runs)) {
      return 0;
    }
    return payload.runs.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
  }

  function updateMainCdxBadge(payload, runsPayload = null) {
    const button = document.getElementById("viewer-cdx");
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.querySelector("[data-viewer-cdx-badge]")?.remove();
    const activeSessions = activeCdxAssistantCountFromPayload(payload);
    const activeRuns = activeCdxRunCountFromPayload(runsPayload);
    const activeCount = activeSessions + activeRuns;
    if (activeCount <= 0) {
      button.title = isCapabilityAvailable("cdx")
        ? "Show CDX status"
        : capabilityMessage("cdx", "CDX is not available for this project.");
      return;
    }
    const label = activeCount > 9 ? "9+" : String(activeCount);
    const titleParts = [];
    if (activeSessions > 0) {
      titleParts.push(activeSessions === 1 ? "1 active session" : `${activeSessions} active sessions`);
    }
    if (activeRuns > 0) {
      titleParts.push(activeRuns === 1 ? "1 running run" : `${activeRuns} running runs`);
    }
    const title = titleParts.join(" · ");
    button.title = `Show CDX status · ${title}`;
    const tone = activeRuns > 0 ? " viewer-cdx-button-badge--runs" : "";
    button.insertAdjacentHTML("beforeend", `<span class="viewer-cdx-button-badge${tone}" data-viewer-cdx-badge title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`);
  }

  async function refreshCdxBadgeCounters() {
    if (!isCapabilityAvailable("cdx")) {
      updateMainCdxBadge(null);
      return;
    }
    try {
      const [statusResponse, runsResponse] = await Promise.all([
        fetch("/api/cdx-status"),
        fetch("/api/cdx-runs").catch(() => null)
      ]);
      if (statusResponse.status === 404) {
        updateMainCdxBadge(null);
        return;
      }
      const data = await statusResponse.json();
      let runsPayload = null;
      if (runsResponse && runsResponse.ok) {
        const runsData = await runsResponse.json();
        runsPayload = runsData?.ok ? runsData.payload : null;
      }
      if (statusResponse.ok && data.ok) {
        latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload, runs: runsPayload });
        updateMainCdxBadge(data.payload, runsPayload);
      }
    } catch {
      updateMainCdxBadge(null);
    }
  }

  function setGitBadgeCountsFromPayload(payload, options = {}) {
    latestGitBadgeCounts = normalizeGitBadgeCounts(payload);
    if (options.updateMain !== false) {
      updateMainGitBadges();
    }
  }

  async function refreshGitBadgeCounters() {
    if (!isCapabilityAvailable("git")) {
      latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
      return;
    }
    try {
      const response = await fetch("/api/git-status");
      const data = await response.json();
      if (response.ok && data.ok && data.payload?.state === "ok") {
        latestGitStatusSignature = gitStatusSignature(data.payload);
        setGitBadgeCountsFromPayload(data.payload);
      }
    } catch {
      latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
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
      const response = await fetch("/api/status");
      if (response.status === 404) {
        refreshCiBadgeCounters();
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
      }
    } else {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "CI is not available for this project.") });
    }
    if (isCapabilityAvailable("cdx")) {
      if (payload.cdx) {
        const runsPayload = payload.cdxRuns || null;
        // Keep the full CDX status payload fresh from the lightweight badge
        // poll (same shape as /api/cdx-status), so consumers like the Workshop
        // terminal usage gauge have current data without opening the CDX screen.
        latestCdxStatusPayload = payload.cdx;
        latestCdxStatusSignature = runtimeStatusSignature({ status: payload.cdx, runs: runsPayload });
        updateMainCdxBadge(payload.cdx, runsPayload);
        refreshWorkshopTerminalUsage();
      }
    } else {
      updateMainCdxBadge(null);
    }
    if (isCapabilityAvailable("git")) {
      if (payload.git && payload.git.state === "ok") {
        latestGitStatusSignature = gitStatusSignature(payload.git);
        setGitBadgeCountsFromPayload(payload.git);
      }
    } else {
      latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
    }
  }

  function findItemByPath(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\//, "");
    return latestItems.find((entry) => entry.relPath === normalized || entry.path === normalized) || null;
  }

  function normalizeFocusTarget(value) {
    const normalized = String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^\//, "").trim();
    if (!normalized || normalized.startsWith("~") || /^[A-Za-z]:/.test(normalized)) {
      return "";
    }
    if (normalized.split("/").includes("..")) {
      return "";
    }
    return normalized;
  }

  function focusRequest() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const focus = normalizeFocusTarget(params.get("focus") || "");
      return {
        focus,
        read: params.get("read") === "1" || params.get("read") === "true"
      };
    } catch {
      return { focus: "", read: false };
    }
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
  function describeDocumentScreen(titleText) {
    const title = String(titleText || "").trim();
    if (!title) return "";
    const exact = {
      "Remote": "Git status, CI runs, and release gates",
      "Workshop": "Terminals, commands, and file explorer",
      "Validation health": "Lint and audit summary",
      "Corpus insights": "Workflow corpus dashboard",
      "CDX status": "Configured agents and runtime checks",
      "CDX missions": "Guided missions and plans",
      "CDX runs": "Recent CDX session runs",
      "CDX run report": "Mission output and findings",
      "CDX log": "Streaming log output",
    };
    if (exact[title]) return exact[title];
    if (title.startsWith("CDX log")) return "Streaming log output";
    if (title.startsWith("logics/request/")) return "Logics request";
    if (title.startsWith("logics/task/")) return "Logics task";
    if (title.startsWith("logics/backlog")) return "Logics backlog";
    if (title.endsWith(".md")) return "Logics document";
    return "";
  }

  function updateScreenActions(titleText) {
    const isGit = titleText === "Remote" && latestCiScreenMode === "git";
    const pull = document.getElementById("viewer-git-pull");
    const push = document.getElementById("viewer-git-push");
    const status = documentStatusButton();
    if (pull) pull.hidden = !isGit;
    if (push) push.hidden = !isGit;
    if (status instanceof HTMLButtonElement) {
      const options = statusOptionsByStage[currentDocumentItem?.stage] || [];
      const currentStatus = String(currentDocumentItem?.indicators?.Status || currentDocumentItem?.status || "").trim();
      status.hidden = !(currentDocumentItem && currentDocumentItem.relPath && options.length);
      status.disabled = status.hidden;
      status.title = currentStatus ? `Change status from ${currentStatus}` : "Change status";
    }
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

  function isAbortError(error) {
    return Boolean(error) && (error.name === "AbortError" || error.code === 20);
  }

  function setDocument(titleText, html, options = {}) {
    invalidatePendingViews();
    cdxCloseTarget = null;
    currentDocumentItem = options.item || null;
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    const eyebrow = document.getElementById("viewer-document-eyebrow");
    if (title) {
      title.textContent = titleText || "Document";
    }
    if (eyebrow instanceof HTMLElement) {
      const description = describeDocumentScreen(titleText);
      eyebrow.textContent = description;
      eyebrow.hidden = !description;
    }
    updateScreenActions(titleText);
    if (content) {
      content.innerHTML = html || "";
    }
    if (panel) {
      panel.hidden = false;
      if (typeof panel.scrollIntoView === "function") {
        panel.scrollIntoView({ block: "nearest" });
      }
    }
    renderMermaidDiagrams();
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
    const target = cdxCloseTarget;
    cdxCloseTarget = null;
    if (target?.type === "cdx-report") {
      setDocument(target.title || "CDX run report", target.html || "");
      cdxCloseTarget = { type: "cdx-runs" };
      setMeta("Returned to CDX run report.");
      return;
    }
    if (target?.type === "cdx-runs") {
      await showCdxRuns({ silent: true });
      setMeta("Returned to CDX runs.");
      return;
    }
    const panel = documentPanel();
    if (panel) {
      invalidatePendingViews();
      panel.hidden = true;
    }
    updateScreenActions("");
  }

  function showMermaidFallback(message) {
    document.querySelectorAll(".markdown-preview__mermaid-fallback").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      node.hidden = false;
      if (message) {
        node.textContent = message;
      }
    });
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
    latestItems = updateStoredActivity(Array.isArray(payload.items) ? payload.items : []);
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
    applyLanBanner(Boolean(payload?.lanMode), String(payload?.lanShareUrl || ""), Boolean(payload?.lanRwMode));
    updateCapabilityControls();
    const payloadWithActivity = { ...payload, items: latestItems };
    const nextPayload = applyFocusRequest(payloadWithActivity, { silent: Boolean(options.silent) });
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload: nextPayload } }));
    const rootName = payload.root ? payload.root.split(/[\\/]/).filter(Boolean).pop() : "repository";
    if (!options.silent) {
      setMeta(`${rootName} · ${payload.items.length} docs · refreshed ${new Date().toLocaleTimeString()}`);
    }
    scheduleNextAutoRefresh();
    updateVersionLink(payload.updateInfo);
    renderUpdateNotice(payload.updateInfo);
    renderEnvironmentWarning(payload.environmentWarning);
    refreshBadgeCounters();
    updateFilterSummary();
    applyLocalViewerChrome();
    bindRefreshMenuControls();
    return true;
  }

  function renderEnvironmentWarning(warning) {
    const banner = document.getElementById("viewer-environment-warning");
    if (!(banner instanceof HTMLElement)) return;
    if (!warning || typeof warning !== "object" || !warning.message) {
      banner.hidden = true;
      return;
    }
    const titleEl = document.getElementById("viewer-environment-warning-title");
    const copyEl = document.getElementById("viewer-environment-warning-copy");
    if (titleEl) titleEl.textContent = warning.title || "Environment warning";
    if (copyEl) copyEl.textContent = warning.message;
    banner.hidden = false;
  }

  function renderUpdateNotice(updateInfo) {
    const banner = updateBanner();
    if (!(banner instanceof HTMLElement)) {
      return;
    }
    if (!updateInfo || updateInfo.updateAvailable !== true || !updateInfo.latestVersion) {
      banner.hidden = true;
      return;
    }
    const copy = updateCopy();
    const command = updateCommand();
    if (copy) {
      copy.textContent = `logics-manager ${updateInfo.latestVersion} is available. Current version: ${updateInfo.currentVersion || "unknown"}.`;
    }
    if (command) {
      command.textContent = updateInfo.updateCommand || "logics-manager self-update";
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

  function isCdxStatusOpen() {
    const panel = documentPanel();
    const title = documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX status");
  }

  function isCdxRunsOpen() {
    const panel = documentPanel();
    const title = documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX runs");
  }

  function isCdxMissionsOpen() {
    const panel = documentPanel();
    const title = documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX missions");
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
    } else if (method === "POST") {
      await refreshGitBadgeCounters();
    }
    if (!changed && !options.silent && !options.force) {
      setMeta(`Checked just now · no viewer changes (${new Date().toLocaleTimeString()})`);
    }
  }

  async function refreshCurrentScreen() {
    const panel = documentPanel();
    const title = documentTitle();
    if (!panel || panel.hidden || !title) return;
    const screen = title.textContent || "";
    const opts = { force: true };
    if (screen === "CDX status") return showCdxStatus(opts);
    if (screen === "CDX missions") return showCdxMissions(opts);
    if (screen === "CDX runs") return showCdxRuns(opts);
    if (screen === "Remote") {
      if (latestCiScreenMode === "release") return showReleaseStatus(opts);
      if (latestCiScreenMode === "runs") return showCiStatus(opts);
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
    window.setInterval(() => {
      renderMeta();
    }, 1000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && refreshAfterVisible) {
        refreshAfterVisible = false;
        autoRefreshItems();
      }
    });
  }

  function setAutoRefreshEnabled(enabled) {
    autoRefreshEnabled = Boolean(enabled);
    const control = autoRefreshControl();
    if (control instanceof HTMLInputElement) {
      control.checked = autoRefreshEnabled;
    }
    scheduleNextAutoRefresh();
  }

  function setRefreshMenuOpen(open) {
    const panel = refreshMenuPanel();
    const button = refreshMenuButton();
    if (!panel) {
      return;
    }
    panel.hidden = !open;
    if (button instanceof HTMLElement) {
      button.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

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

  function statusValue(item) {
    return String(item?.indicators?.Status || "").toLowerCase();
  }

  function isClosed(item) {
    const status = statusValue(item);
    return (
      status.includes("done") ||
      status.includes("archived") ||
      status.includes("obsolete") ||
      status.includes("superseded") ||
      status.includes("settled")
    );
  }

  function hasLinks(item) {
    return (item.references || []).length > 0 || (item.usedBy || []).length > 0;
  }

  function needsPromotion(item) {
    return ["request", "backlog"].includes(item.stage) && !item.isPromoted && !isClosed(item);
  }

  function updatedWithin(item, days) {
    const timestamp = Date.parse(item.updatedAt || "") || 0;
    return timestamp > 0 && timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
  }

  function isStale(item) {
    const timestamp = Date.parse(item.updatedAt || "") || 0;
    return timestamp > 0 && timestamp < Date.now() - 30 * 24 * 60 * 60 * 1000 && !isClosed(item);
  }

  function isRecent(item, days = 7) {
    return updatedWithin(item, days);
  }

  function hasMissingOrAmbiguousStatus(item) {
    const rawStatus = String(item?.indicators?.Status || "").trim();
    if (!rawStatus) {
      return true;
    }
    const normalized = rawStatus.toLowerCase();
    return ![
      "draft",
      "ready",
      "in progress",
      "blocked",
      "done",
      "active",
      "proposed",
      "accepted",
      "validated",
      "rejected",
      "superseded",
      "settled",
      "archived",
      "obsolete"
    ].includes(normalized);
  }

  function isSafeLogicsDocPath(value) {
    const path = String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").trim();
    if (!path || path.startsWith("/") || path.startsWith("~") || /^[A-Za-z]:/.test(path)) {
      return false;
    }
    if (path.split("/").includes("..") || !path.endsWith(".md")) {
      return false;
    }
    return [
      "logics/request/",
      "logics/backlog/",
      "logics/tasks/",
      "logics/product/",
      "logics/architecture/",
      "logics/specs/"
    ].some((prefix) => path.startsWith(prefix));
  }

  function matchesViewerFilter(item) {
    if (!item) {
      return false;
    }
    const status = statusValue(item);
    if (viewerFilterState.focus === "active" && isClosed(item)) {
      return false;
    }
    if (viewerFilterState.focus === "blocked" && !status.includes("blocked")) {
      return false;
    }
    if (viewerFilterState.focus === "needs-promotion" && !needsPromotion(item)) {
      return false;
    }
    if (viewerFilterState.focus === "recent" && !updatedWithin(item, 14)) {
      return false;
    }

    if (viewerFilterState.type === "workflow" && !["request", "backlog", "task"].includes(item.stage)) {
      return false;
    }
    if (viewerFilterState.type === "companion" && !["product", "architecture", "spec"].includes(item.stage)) {
      return false;
    }
    if (!["all", "workflow", "companion"].includes(viewerFilterState.type) && item.stage !== viewerFilterState.type) {
      return false;
    }

    if (viewerFilterState.status === "ready" && !status.includes("ready")) {
      return false;
    }
    if (viewerFilterState.status === "in-progress" && !status.includes("in progress")) {
      return false;
    }
    if (viewerFilterState.status === "blocked" && !status.includes("blocked")) {
      return false;
    }
    if (viewerFilterState.status === "done" && !isClosed(item)) {
      return false;
    }

    if (viewerFilterState.relation === "unlinked" && hasLinks(item)) {
      return false;
    }
    if (viewerFilterState.relation === "linked" && !hasLinks(item)) {
      return false;
    }
    if (viewerFilterState.relation === "needs-promotion" && !needsPromotion(item)) {
      return false;
    }

    if (viewerFilterState.activity === "recent" && !updatedWithin(item, 14)) {
      return false;
    }
    if (viewerFilterState.activity === "stale" && !isStale(item)) {
      return false;
    }

    return true;
  }

  function setControlValue(id, value, eventName) {
    const element = document.getElementById(id);
    if (!element) {
      return;
    }
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = Boolean(value);
    } else if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
      element.value = String(value ?? "");
    }
    element.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  function applyViewerFilter(group, value) {
    if (!Object.prototype.hasOwnProperty.call(defaultFilterState, group)) {
      return;
    }
    viewerFilterState = { ...viewerFilterState, [group]: value || defaultFilterState[group] };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    setControlValue("hide-complete", false, "change");
    setControlValue("hide-processed-requests", false, "change");
    setControlValue("hide-spec", false, "change");
    setControlValue("show-companion-docs", true, "change");
    setControlValue("hide-empty-columns", true, "change");
    updateFilterSummary();
  }

  function clearLocalPreset() {
    viewerFilterState = { ...defaultFilterState };
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    persistViewerFilterState();
    setControlValue("search-input", "", "input");
    setControlValue("hide-complete", false, "change");
    setControlValue("hide-processed-requests", false, "change");
    setControlValue("hide-spec", false, "change");
    setControlValue("show-companion-docs", true, "change");
    setControlValue("hide-empty-columns", true, "change");
    updateFilterSummary();
  }

  function updateFilterSummary() {
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
    const count = filterCount();
    if (!count) {
      return;
    }
    const visibleCount = latestItems.filter(matchesViewerFilter).length;
    const activeLabels = Object.entries(viewerFilterState)
      .filter(([key, value]) => value !== defaultFilterState[key])
      .map(([key, value]) => `${key}: ${String(value).replace("-", " ")}`);
    const suffix = activeLabels.length > 0 ? ` · ${activeLabels.join(" · ")}` : " · Active work";
    count.textContent = `${visibleCount} of ${latestItems.length} docs shown${suffix}`;
  }

  function countBy(items, selector) {
    return items.reduce((acc, item) => {
      const key = selector(item) || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function renderMetricCards(entries) {
    return entries.map(([label, value, tone]) => `
      <div class="viewer-insights__card${tone ? ` viewer-insights__card--${escapeHtml(tone)}` : ""}">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
  }

  function renderGitSummaryCard(label, value) {
    return `
      <div class="viewer-insights__card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `;
  }

  function renderGitSummarySegments(label, segments) {
    return `
      <div class="viewer-insights__card viewer-git__summary-card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-git__summary-segments">
          ${segments.map(([segmentLabel, value]) => `
            <span class="viewer-git__summary-segment">
              <span>${escapeHtml(segmentLabel)}</span>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `).join("")}
        </div>
      </div>
    `;
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

  function renderSignalRows(items, emptyText = "No signals") {
    if (!items.length) {
      return `<li class="viewer-insights__signal viewer-insights__signal--empty">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(([label, value, tone]) => `
      <li class="viewer-insights__signal${tone ? ` viewer-insights__signal--${escapeHtml(tone)}` : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </li>
    `).join("");
  }

  function renderInsightRows(items, emptyText = "No signals") {
    if (!items.length) {
      return `<li class="viewer-insights__item">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(([label, value]) => `
      <li class="viewer-insights__item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("");
  }

  function renderDocRows(items, emptyText = "None", limit = 6) {
    if (!items.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = items.map((item, index) => {
      const path = item.relPath || item.path || "";
      const control = path && isSafeLogicsDocPath(path)
        ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(item.id || path)}</button>`
        : `<span class="viewer-insights__doc">${escapeHtml(item.id || path || item.title)}</span>`;
      return `
        <li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>
          ${control}
          <span>${escapeHtml(item.indicators?.Status || item.stage || "No status")}</span>
        </li>
      `;
    });
    const hiddenCount = Math.max(0, items.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
  }

  function renderPathRows(paths, emptyText = "None", limit = 6) {
    if (!paths.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = paths.map((path, index) => {
      const control = isSafeLogicsDocPath(path)
        ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>`
        : `<span class="viewer-insights__doc">${escapeHtml(path)}</span>`;
      return `<li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>${control}</li>`;
    });
    const hiddenCount = Math.max(0, paths.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
  }

  function renderActionRows(actions) {
    return actions.map((action) => {
      if (action.filter) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-filter-group="${escapeHtml(action.filter.group)}" data-viewer-filter-value="${escapeHtml(action.filter.value)}">${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      if (action.health) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-open-health>${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      if (action.path && isSafeLogicsDocPath(action.path)) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-doc-path="${escapeHtml(action.path)}">${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      return `<li class="viewer-insights__row"><span>${escapeHtml(action.label)}</span><strong>${escapeHtml(action.value)}</strong></li>`;
    }).join("");
  }

  function itemLabel(item) {
    return `${item.id || item.relPath || "doc"} - ${item.indicators?.Status || "No status"}`;
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
        if (ref.path && !itemPaths.has(ref.path)) {
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
      if (api && typeof api.stripLeadingDocumentFrontMatter === "function") {
        markdown = api.stripLeadingDocumentFrontMatter(markdown, item);
      }
      const html = api && typeof api.renderMarkdownToHtml === "function"
        ? api.renderMarkdownToHtml(markdown)
        : `<pre>${escapeHtml(markdown)}</pre>`;
      setDocument(data.document.path, html, { item: { ...item, relPath: data.document.path || item.relPath } });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  async function showDocumentByPath(relPath, view) {
    const item = findItemByPath(relPath) || { relPath, title: relPath, id: relPath };
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

  function countPayloadEntries(payload, keys) {
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) {
        return payload[key].length;
      }
      if (typeof payload?.[key] === "number") {
        return payload[key];
      }
    }
    return 0;
  }

  function collectHealthFindings(lintData, auditData) {
    const findings = [];
    const append = (source, payload) => {
      ["issues", "warnings", "findings", "strict"].forEach((key) => {
        const entries = Array.isArray(payload?.[key]) ? payload[key] : [];
        entries.forEach((entry) => findings.push({ source, ...entry }));
      });
    };
    append("lint", lintData.payload || {});
    append("audit", auditData.payload || {});
    return findings;
  }

  function renderHealthSummary(lintData, auditData) {
    const lintPayload = lintData.payload || {};
    const auditPayload = auditData.payload || {};
    const blocking = countPayloadEntries(lintPayload, ["issue_count", "issues"]) +
      countPayloadEntries(auditPayload, ["issue_count", "issues"]);
    const warnings = countPayloadEntries(lintPayload, ["warning_count", "warnings"]) +
      countPayloadEntries(auditPayload, ["warning_count", "warnings"]);
    const findings = collectHealthFindings(lintData, auditData);
    const releaseReady = Boolean(lintPayload.ok) && Boolean(auditPayload.release_ready ?? auditPayload.ok);

    const cards = [
      ["Blocking", blocking],
      ["Warnings", warnings],
      ["Release ready", releaseReady ? "Yes" : "No"]
    ]
      .map(([label, value]) => `
        <div class="viewer-health__card">
          <div class="viewer-health__label">${escapeHtml(label)}</div>
          <div class="viewer-health__value">${escapeHtml(value)}</div>
        </div>
      `)
      .join("");

    const list = findings.length
      ? findings.slice(0, 50).map((finding) => {
          const path = finding.path || "";
          const pathControl = path && isSafeLogicsDocPath(path)
            ? `<button class="viewer-health__path" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>`
            : `<span class="viewer-health__meta">${escapeHtml(path ? `Repository-level or unsafe path: ${path}` : "Repository-level finding")}</span>`;
          const severity = finding.severity || finding.code || finding.source || "finding";
          return `
            <li class="viewer-health__issue">
              ${pathControl}
              <div>${escapeHtml(finding.message || finding.code || "Validation finding")}</div>
              <div class="viewer-health__meta">${escapeHtml(finding.source)} · ${escapeHtml(severity)}</div>
            </li>
          `;
        }).join("")
      : '<li class="viewer-health__empty">No lint or audit findings were reported.</li>';

    return `
      <div class="viewer-health">
        <div class="viewer-health__summary">${cards}</div>
        <section class="viewer-health__section">
          <h2 class="viewer-health__heading">Validation findings</h2>
          <ul class="viewer-health__list">${list}</ul>
        </section>
      </div>
    `;
  }

  async function showHealth(options = {}) {
    const view = options.view || beginView();
    setMeta("Checking health...");
    try {
      const [lintResponse, auditResponse] = await Promise.all([
        fetch("/api/lint", { signal: view.signal }),
        fetch("/api/audit", { signal: view.signal })
      ]);
      const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
      if (isViewStale(view)) {
        return;
      }
      setDocument("Validation health", renderHealthSummary(lintData, auditData));
      setMeta("Health loaded.");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  function workspaceParentPath(path) {
    const parts = String(path || "").split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
  }

  function renderWorkspaceBreadcrumb(currentPath) {
    const segments = String(currentPath || "").split("/").filter(Boolean);
    const crumbs = [
      `<button class="viewer-workspace__crumb" type="button" data-viewer-workspace-tree="" title="Workspace root">/</button>`,
    ];
    let accum = "";
    segments.forEach((segment, idx) => {
      accum = accum ? `${accum}/${segment}` : segment;
      const isLast = idx === segments.length - 1;
      crumbs.push(`<span class="viewer-workspace__crumb-sep" aria-hidden="true">/</span>`);
      crumbs.push(
        `<button class="viewer-workspace__crumb${isLast ? " is-current" : ""}" type="button" data-viewer-workspace-tree="${escapeHtml(accum)}" title="${escapeHtml(accum)}"${isLast ? ' aria-current="location"' : ""}>${escapeHtml(segment)}</button>`,
      );
    });
    return `<nav class="viewer-workspace__breadcrumb" aria-label="Workspace breadcrumb">${crumbs.join("")}</nav>`;
  }

  function workspaceEntryIcon(kind, ignored) {
    if (kind === "directory") {
      return ignored
        ? '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4h4l1 1h7v8H2V4Zm9.5 3.2L9.7 9l1.8 1.8-.7.7L9 9.7l-1.8 1.8-.7-.7L8.3 9 6.5 7.2l.7-.7L9 8.3l1.8-1.8.7.7Z"/></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M2 4h4l1 1h7v8H2V4Z"/></svg>';
    }
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 2h6l3 3v9H4V2Zm6 0v3h3"/></svg>';
  }

  function renderWorkspaceTree(treePayload, selectedPath = "") {
    if (!treePayload || treePayload.state !== "ok") {
      const message = treePayload?.message || "Workspace tree is unavailable.";
      const state = treePayload?.state === "unavailable" ? "unavailable" : "empty";
      return `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--${state}"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">${state === "unavailable" ? "!" : "·"}</span><span>${escapeHtml(message)}</span></div>`;
    }
    const currentPath = String(treePayload.path || "");
    const parentPath = workspaceParentPath(currentPath);
    const upButton = currentPath
      ? `<button class="viewer-workspace__item viewer-workspace__item--up" type="button" data-viewer-workspace-tree="${escapeHtml(parentPath)}" title="Parent directory"><span class="viewer-workspace__item-icon" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path fill="currentColor" d="M8 3 3 8h3v5h4V8h3L8 3Z"/></svg></span><span class="viewer-workspace__item-name">..</span></button>`
      : "";
    const rows = (Array.isArray(treePayload.entries) ? treePayload.entries : []).map((entry) => {
      const path = String(entry.path || "");
      const kind = String(entry.kind || "file");
      const ignored = Boolean(entry.ignored);
      const selected = path === selectedPath;
      const actionAttr = kind === "directory" && !ignored
        ? `data-viewer-workspace-tree="${escapeHtml(path)}"`
        : `data-viewer-workspace-preview="${escapeHtml(path)}"`;
      const classes = [
        "viewer-workspace__item",
        `viewer-workspace__item--${kind === "directory" ? "directory" : "file"}`,
      ];
      if (selected) classes.push("is-selected");
      if (ignored) classes.push("is-muted");
      return `
        <button class="${classes.join(" ")}" type="button" ${actionAttr} title="${escapeHtml(path)}"${selected ? ' aria-current="true"' : ""}>
          <span class="viewer-workspace__item-icon" aria-hidden="true">${workspaceEntryIcon(kind, ignored)}</span>
          <span class="viewer-workspace__item-name">${escapeHtml(entry.name || path || "/")}</span>
        </button>
      `;
    }).join("");
    return `
      <div class="viewer-workspace__tree-header">
        ${renderWorkspaceBreadcrumb(currentPath)}
      </div>
      <div class="viewer-workspace__tree-list" role="list">
        ${upButton}
        ${rows || '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>Directory is empty.</span></div>'}
      </div>
      ${treePayload.truncated ? '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--warn"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span><span>Directory listing truncated.</span></div>' : ""}
    `;
  }

  function renderWorkspacePreview(previewPayload) {
    if (!previewPayload) {
      return '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>Select a file or directory.</span></div>';
    }
    const path = previewPayload.path || "/";
    const name = previewPayload.name || path || "/";
    const state = previewPayload.state || "unknown";
    if (state === "ok") {
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <em>${escapeHtml(previewPayload.truncated ? "truncated" : `${previewPayload.size || 0} bytes`)}</em>
        </div>
        ${previewPayload.truncated ? '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--warn"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">!</span><span>Preview truncated.</span></div>' : ""}
        <pre class="viewer-workspace__code">${escapeHtml(previewPayload.content || "")}</pre>
      `;
    }
    if (state === "image") {
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <em>${escapeHtml(previewPayload.contentType || "image")}</em>
        </div>
        <img class="viewer-workspace__image" src="/api/workspace-file?path=${encodeURIComponent(path)}" alt="${escapeHtml(name)}">
      `;
    }
    const placeholderState = state === "unavailable" ? "unavailable" : "empty";
    const placeholderIcon = placeholderState === "unavailable" ? "!" : "·";
    return `
      <div class="viewer-workspace__preview-header">
        <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
        <em>${escapeHtml(state)}</em>
      </div>
      <div class="viewer-workspace__placeholder viewer-workspace__placeholder--${placeholderState}"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">${placeholderIcon}</span><span>${escapeHtml(previewPayload.message || "No preview is available.")}</span></div>
    `;
  }

  function renderWorkspace(treePayload, previewPayload) {
    const selectedPath = previewPayload?.path || "";
    return `
      <div class="viewer-workspace">
        <aside class="viewer-workspace__tree" aria-label="Workspace files">
          ${renderWorkspaceTree(treePayload, selectedPath)}
        </aside>
        <section class="viewer-workspace__preview" aria-label="Workspace preview">
          ${renderWorkspacePreview(previewPayload)}
        </section>
      </div>
    `;
  }

  async function fetchWorkspaceTree(path = "") {
    const response = await fetch(`/api/workspace-tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load workspace tree.");
    }
    return data.payload;
  }

  async function fetchWorkspacePreview(path = "") {
    const response = await fetch(`/api/workspace-preview?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load workspace preview.");
    }
    return data.payload;
  }

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

  const workshopTabs = [
    { id: "terminals", label: "Terminals", title: "In-app PTY terminals" },
    { id: "commands", label: "Commands", title: "Discovered package and project scripts" },
    { id: "explorer", label: "Explorer", title: "Browse repository files" },
  ];

  function preferredWorkshopTab() {
    const stored = String(viewerPreferences.workshopActiveTab || "");
    return workshopTabs.some((tab) => tab.id === stored) ? stored : "terminals";
  }

  function setWorkshopActiveTab(tabId) {
    const next = workshopTabs.some((tab) => tab.id === tabId) ? tabId : "terminals";
    if (next === viewerPreferences.workshopActiveTab) return;
    updateViewerPreferences({ workshopActiveTab: next });
  }

  function renderWorkshopTabs(activeTab) {
    const buttons = workshopTabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return `<button class="viewer-cdx__mode${isActive ? " is-active" : ""}" type="button" role="tab" aria-selected="${isActive ? "true" : "false"}" data-viewer-workshop-tab="${escapeHtml(tab.id)}" title="${escapeHtml(tab.title)}">${escapeHtml(tab.label)}</button>`;
    }).join("");
    return `<div class="viewer-cdx__modes" role="tablist" aria-label="Workshop sub-screens">${buttons}</div>`;
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
    hydrated: false,
  };

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
          state,
          bufferedOutput: "",
        });
      }
      if (!workshopTerminalState.activeId) {
        const next = workshopTerminalState.sessions.keys().next();
        workshopTerminalState.activeId = next.done ? "" : next.value;
      }
      recomputeWorkshopBadges();
    } catch {
      workshopTerminalState.hydrated = false;
    }
  }

  function workshopTerminalListNode() {
    return document.querySelector("[data-viewer-workshop-terminal-list]");
  }

  function workshopTerminalStageNode() {
    return document.querySelector("[data-viewer-workshop-terminal-stage]");
  }

  // Detect the cdx session a terminal runs, by parsing its command label
  // (e.g. "cdx resume work2") and correlating tokens with known session names.
  function cdxSessionForTerminal(entry) {
    const label = String(entry?.label || "").trim();
    if (!label) return "";
    const tokens = label.split(/\s+/).filter(Boolean);
    if (tokens.length < 2 || tokens[0].toLowerCase() !== "cdx") return "";
    // A handoff terminal runs the destination (new) session it migrates into
    // (`cdx handoff <source> <destination>`), so name it after the last
    // positional argument rather than the source it correlates against first.
    if (tokens[1].toLowerCase() === "handoff") {
      const positional = tokens.slice(2).filter((token) => token && !token.startsWith("-"));
      return positional.length ? positional[positional.length - 1] : "";
    }
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    const names = new Set(
      sessions
        .map((session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim())
        .filter(Boolean)
    );
    for (let i = 1; i < tokens.length; i += 1) {
      if (names.has(tokens[i])) return tokens[i];
    }
    // Fallback when status is not loaded yet: first non-flag arg after the verb.
    const candidate = tokens.slice(2).find((token) => token && !token.startsWith("-"));
    return candidate || "";
  }

  // Remaining usage ({ percent, reset }) for a session name from latest status.
  function cdxSessionUsage(sessionName) {
    if (!sessionName) return null;
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    const match = sessions.find(
      (session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim() === sessionName
    );
    if (!match) return null;
    return {
      percent: cdxRemainingPct(match),
      reset: formatCdxResetAt(cdxField(match, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""))
    };
  }

  // A small vertical gauge of remaining session usage, coloured by level.
  // Clickable: refreshes this session's CDX status. Rendered for every cdx
  // session (neutral/empty when usage is not known yet) so it stays clickable.
  function renderCdxUsageGauge(usage, sessionName) {
    if (!sessionName) return "";
    const hasPct = Boolean(usage) && usage.percent !== null && usage.percent !== undefined;
    const pct = hasPct ? Math.max(0, Math.min(100, usage.percent)) : 0;
    const tone = hasPct ? cdxRemainingClass(usage.percent) : "neutral";
    const resetText = usage?.reset && usage.reset !== "-" ? ` · resets ${usage.reset}` : "";
    const title = `CDX usage remaining: ${hasPct ? `${pct}%` : "unknown"}${resetText} · click to refresh`;
    return `<span class="viewer-workshop__usage viewer-workshop__usage--${tone}" data-viewer-cdx-usage-refresh="${escapeHtml(sessionName)}" role="button" tabindex="0" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span class="viewer-workshop__usage-fill" style="height:${pct}%"></span>
    </span>`;
  }

  async function refreshCdxSessionUsage(sessionName) {
    try {
      setMeta(sessionName ? `Refreshing CDX usage for ${sessionName}...` : "Refreshing CDX usage...");
      const response = await fetch("/api/cdx-status", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.ok) return;
      latestCdxStatusPayload = data.payload;
      latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload });
      renderWorkshopTerminalList();
      const usage = cdxSessionUsage(sessionName);
      if (usage && usage.percent !== null && usage.percent !== undefined) {
        const resetText = usage.reset && usage.reset !== "-" ? ` · resets ${usage.reset}` : "";
        setMeta(`CDX usage ${sessionName}: ${usage.percent}% remaining${resetText}.`);
      } else {
        setMeta(`Refreshed CDX usage${sessionName ? ` for ${sessionName}` : ""}.`);
      }
    } catch (error) {
      setMeta(`CDX usage: ${error?.message || error}`);
    }
  }

  // Re-render the terminal list when CDX usage changes so the gauges stay live
  // without the operator opening the CDX status screen. Self-guards: only runs
  // when the list is on screen and at least one terminal is a cdx session.
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
    const entries = [...workshopTerminalState.sessions.values()];
    const header = `<div class="viewer-workshop__terminal-list-header">
      <span>Terminals</span>
      <span class="viewer-workshop__terminal-actions">
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-new title="Spawn a shell session">+ Shell</button>
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-custom title="Spawn a session with a custom command">+ Custom</button>
      </span>
    </div>`;
    if (entries.length === 0) {
      node.innerHTML = `${header}<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>No sessions yet.</span></div>`;
      return;
    }
    const rows = entries.map((entry) => {
      const isActive = entry.id === workshopTerminalState.activeId;
      const stateBadge = entry.state ? `<span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(entry.state)}">${escapeHtml(entry.state)}</span>` : "";
      const closing = Boolean(entry.closing);
      const closeAttrs = closing
        ? `aria-busy="true" aria-label="Closing session" title="Closing session..."`
        : `data-viewer-workshop-terminal-close="${escapeHtml(entry.id)}" role="button" tabindex="0" title="Close session" aria-label="Close session"`;
      const closeGlyph = closing
        ? `<span class="viewer-workshop__spinner" aria-hidden="true"></span>`
        : `×`;
      const clearSpan = closing
        ? ""
        : `<span class="viewer-workshop__terminal-row-clear" data-viewer-workshop-terminal-clear="${escapeHtml(entry.id)}" role="button" tabindex="0" title="Clear screen (Ctrl+L)" aria-label="Clear screen">⎚</span>`;
      // When the terminal runs a cdx session, show the session name instead of
      // the raw command and a discreet usage gauge next to it.
      const cdxSession = cdxSessionForTerminal(entry);
      const displayLabel = cdxSession || entry.label || entry.id;
      const gauge = cdxSession ? renderCdxUsageGauge(cdxSessionUsage(cdxSession), cdxSession) : "";
      return `<button class="viewer-workshop__terminal-row${isActive ? " is-active" : ""}${closing ? " is-closing" : ""}" type="button" data-viewer-workshop-terminal-select="${escapeHtml(entry.id)}" title="${escapeHtml(entry.label || entry.id)}">
        <span class="viewer-workshop__terminal-row-main">
          ${gauge}
          <span class="viewer-workshop__terminal-row-label">${escapeHtml(displayLabel)}</span>
        </span>
        ${stateBadge}
        <span class="viewer-workshop__terminal-row-controls">
          ${clearSpan}
          <span class="viewer-workshop__terminal-row-close${closing ? " is-closing" : ""}" ${closeAttrs}>${closeGlyph}</span>
        </span>
      </button>`;
    }).join("");
    node.innerHTML = `${header}<div class="viewer-workshop__terminal-rows">${rows}</div>`;
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

  function ensureWorkshopTerminalHostFor(sessionId) {
    const stage = workshopTerminalStageNode();
    if (!(stage instanceof HTMLElement)) return null;
    const placeholder = stage.querySelector("[data-viewer-workshop-terminal-empty]");
    if (placeholder) placeholder.remove();
    let host = stage.querySelector(`[data-viewer-workshop-terminal-host="${sessionId}"]`);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.className = "viewer-workshop__terminal-host";
      host.setAttribute("data-viewer-workshop-terminal-host", sessionId);
      stage.appendChild(host);
    }
    return host;
  }

  function mountWorkshopTerminalEmulator(entry) {
    if (typeof window.Terminal !== "function") return;
    if (entry.terminal) return;
    const host = ensureWorkshopTerminalHostFor(entry.id);
    if (!host) return;
    const term = new window.Terminal({
      fontSize: workshopTerminalPreferredFontSize(),
      fontFamily: 'var(--vscode-editor-font-family, "Menlo", "Consolas", monospace)',
      theme: { background: "#0a0a0a", foreground: "#d4d4d4" },
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
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
            syncWorkshopTerminalSize(entry);
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

  function workshopTerminalPreferredFontSize() {
    // Smaller cells on narrow viewports keep enough columns visible to make
    // TUIs (btop, lazygit, cdx) usable on a phone without horizontal scroll
    // taking over. Phone portrait sits in <=420, landscape in <=900.
    const width = window.innerWidth || document.documentElement?.clientWidth || 0;
    if (width <= 360) return 6;
    if (width <= 420) return 7;
    if (width <= 560) return 8;
    if (width <= 700) return 9;
    if (width <= 900) return 10;
    return 12;
  }

  // Fit the emulator to its host and push the resulting dimensions to the PTY
  // (TIOCSWINSZ) so the backend's terminal width matches what is rendered.
  function syncWorkshopTerminalSize(entry) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    try {
      entry.fitAddon.fit();
      const dim = entry.fitAddon.proposeDimensions();
      if (dim && dim.rows > 0 && dim.cols > 0) {
        resizeWorkshopTerminal(entry.id, dim.rows, dim.cols);
      }
    } catch { /* noop */ }
  }

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
  function nudgeWorkshopTerminalRedraw(entry) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    let dim;
    try {
      entry.fitAddon.fit();
      dim = entry.fitAddon.proposeDimensions();
    } catch { return; }
    if (!dim || dim.rows <= 0 || dim.cols <= 0) return;
    const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
    // Shrink by one row (or grow if already at the floor) so the value sent
    // actually differs and the kernel emits a SIGWINCH, then restore.
    const nudgeRows = rows > WORKSHOP_TERMINAL_MIN_ROWS ? rows - 1 : rows + 1;
    resizeWorkshopTerminal(entry.id, nudgeRows, cols);
    setTimeout(() => resizeWorkshopTerminal(entry.id, rows, cols), 60);
  }

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

  function releaseWorkshopTerminalObserver(entry) {
    if (entry?.resizeObserver) {
      try { entry.resizeObserver.disconnect(); } catch { /* noop */ }
      entry.resizeObserver = null;
    }
    if (entry?.resizeRaf) {
      cancelAnimationFrame(entry.resizeRaf);
      entry.resizeRaf = 0;
    }
  }

  function refitAllWorkshopTerminals() {
    const fontSize = workshopTerminalPreferredFontSize();
    for (const entry of workshopTerminalState.sessions.values()) {
      if (!entry.fitAddon || !entry.terminal) continue;
      try {
        if (entry.terminal.options && entry.terminal.options.fontSize !== fontSize) {
          entry.terminal.options.fontSize = fontSize;
        }
        entry.fitAddon.fit();
        const dim = entry.fitAddon.proposeDimensions();
        if (dim) resizeWorkshopTerminal(entry.id, dim.rows, dim.cols);
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

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestAnimationFrame(repaintAllWorkshopTerminals);
    }
  });
  window.addEventListener("focus", () => {
    requestAnimationFrame(repaintAllWorkshopTerminals);
  });

  let workshopTerminalResizeTimer = null;
  window.addEventListener("resize", () => {
    if (workshopTerminalResizeTimer) clearTimeout(workshopTerminalResizeTimer);
    workshopTerminalResizeTimer = setTimeout(() => {
      workshopTerminalResizeTimer = null;
      refitAllWorkshopTerminals();
    }, 80);
  });

  async function spawnWorkshopTerminal(options = {}) {
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
        state: session.state,
        bufferedOutput: "",
      });
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

  async function spawnCustomWorkshopTerminal() {
    const raw = await showThemedInputModal({
      title: "Custom terminal",
      message: "Enter the command to run in a new Workshop terminal.",
      placeholder: "node --version",
      submitLabel: "Run command"
    });
    if (!raw) return;
    const command = String(raw).trim().split(/\s+/).filter(Boolean);
    if (!command.length) return;
    const label = command.slice(0, 2).join(" ").slice(0, 32) || "custom";
    spawnWorkshopTerminal({ command, label });
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

  const WORKSHOP_TERMINAL_MIN_COLS = 80;
  const WORKSHOP_TERMINAL_MIN_ROWS = 24;

  function resizeWorkshopTerminal(sessionId, rows, cols) {
    if (!sessionId || rows <= 0 || cols <= 0) return;
    const safeRows = Math.max(rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const safeCols = Math.max(cols, WORKSHOP_TERMINAL_MIN_COLS);
    fetch("/api/workshop-terminal-resize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, rows: safeRows, cols: safeCols }),
    }).catch(() => { /* noop */ });
  }

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
    if (workshopTerminalState.activeId === sessionId) {
      const next = workshopTerminalState.sessions.keys().next();
      setActiveWorkshopTerminal(next.done ? "" : next.value);
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
      closeWorkshopTerminalStream(sessionId);
    });
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
      renderWorkshopTerminalList();
      // Remount every session so switching between rows is instant and
      // none of the terminals show a black/empty stage.
      for (const entry of workshopTerminalState.sessions.values()) {
        mountWorkshopTerminalEmulator(entry);
        if (entry.id !== workshopTerminalState.activeId) {
          const host = workshopTerminalStageNode()?.querySelector(`[data-viewer-workshop-terminal-host="${entry.id}"]`);
          if (host instanceof HTMLElement) host.classList.add("viewer-workshop__terminal-host--hidden");
        }
      }
      if (workshopTerminalState.activeId) {
        setActiveWorkshopTerminal(workshopTerminalState.activeId);
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

  async function openWorkspacePreview(path) {
    if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
    const treePath = workspaceParentPath(path);
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(treePath), fetchWorkspacePreview(path)]);
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (container instanceof HTMLElement) {
      container.innerHTML = renderWorkspace(tree, preview);
    }
    setMeta(`Previewing ${path || "workspace root"}.`);
  }

  function objectEntries(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : [];
  }

  function asArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, entry]) => ({ name: key, ...(entry && typeof entry === "object" ? entry : { value: entry }) }));
    }
    return [];
  }

  function pickFirstObject(status, keys) {
    for (const key of keys) {
      if (status?.[key] && typeof status[key] === "object" && !Array.isArray(status[key])) {
        return status[key];
      }
    }
    return {};
  }

  function pickFirstArray(status, keys) {
    for (const key of keys) {
      const entries = asArray(status?.[key]);
      if (entries.length) {
        return entries;
      }
    }
    return [];
  }

  function cdxRows(status) {
    return asArray(status?.rows);
  }

  function numericValues(values) {
    return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }

  function formatPercentRange(values) {
    const numbers = numericValues(values).map((value) => Math.max(0, Math.min(100, Math.round(value))));
    if (!numbers.length) {
      return "not reported";
    }
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return min === max ? `${min}%` : `${min}-${max}%`;
  }

  function cdxProviders(status) {
    const rows = cdxRows(status);
    if (!rows.length) {
      return pickFirstArray(status, ["providers", "providerStatus", "provider_status"]);
    }
    const grouped = new Map();
    rows.forEach((row) => {
      const provider = String(row.provider || "unknown");
      const current = grouped.get(provider) || {
        name: provider,
        enabled: 0,
        active: 0,
        authenticated: 0,
        sessions: 0,
        remaining_5h: "not reported",
        remaining_week: "not reported",
        credits: "",
        _remaining5hValues: [],
        _remainingWeekValues: [],
        _creditsValues: []
      };
      current.sessions += 1;
      if (row.enabled) {
        current.enabled += 1;
      }
      if (row.active) {
        current.active += 1;
      }
      if (String(row.auth_status || "").toLowerCase() === "authenticated") {
        current.authenticated += 1;
      }
      const fiveHour = Number(row.remaining_5h_pct ?? row.remaining5hPct);
      if (Number.isFinite(fiveHour)) {
        current._remaining5hValues.push(fiveHour);
      }
      const week = Number(row.remaining_week_pct ?? row.remainingWeekPct);
      if (Number.isFinite(week)) {
        current._remainingWeekValues.push(week);
      }
      if (row.credits !== undefined && row.credits !== null && row.credits !== "") {
        current._creditsValues.push(row.credits);
      }
      current.state = current.active > 0 ? "active" : current.enabled > 0 ? "enabled" : "disabled";
      grouped.set(provider, current);
    });
    return Array.from(grouped.values()).map((provider) => {
      const creditsNumbers = numericValues(provider._creditsValues);
      const creditsTotal = creditsNumbers.length ? creditsNumbers.reduce((total, value) => total + value, 0) : null;
      const { _remaining5hValues, _remainingWeekValues, _creditsValues, ...publicProvider } = provider;
      return {
        ...publicProvider,
        remaining_5h: formatPercentRange(_remaining5hValues),
        remaining_week: formatPercentRange(_remainingWeekValues),
        credits: creditsTotal === null ? "" : creditsTotal.toFixed(2)
      };
    });
  }

  function cdxSessions(status) {
    const explicitSessions = pickFirstArray(status, ["sessions", "activeSessions", "active_sessions"]);
    return sortCdxSessionsByRemaining(explicitSessions.length ? explicitSessions : cdxRows(status));
  }

  function latestCdxSessionName(sessions) {
    let latest = null;
    sessions.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const name = cdxField(entry, ["session_name", "name", "id", "value"]);
      const timestamp = Date.parse(String(cdxField(entry, ["last_launched_at", "lastLaunchedAt"], "")));
      if (!name || name === "-" || !Number.isFinite(timestamp)) {
        return;
      }
      if (!latest || timestamp > latest.timestamp) {
        latest = { name, timestamp };
      }
    });
    return latest?.name || "";
  }

  function cdxReadiness(status) {
    const explicitReadiness = pickFirstObject(status, ["readiness", "quota", "quotas", "limits"]);
    if (objectEntries(explicitReadiness).length) {
      return explicitReadiness;
    }
    const rows = cdxRows(status);
    if (!rows.length) {
      return {};
    }
    const enabled = rows.filter((row) => row.enabled).length;
    const active = rows.filter((row) => row.active).length;
    const authenticated = rows.filter((row) => String(row.auth_status || "").toLowerCase() === "authenticated").length;
    const availableValues = rows.map((row) => row.available_pct).filter((value) => typeof value === "number");
    const lowestAvailable = availableValues.length ? Math.min(...availableValues) : null;
    return {
      enabled_sessions: enabled,
      active_sessions: active,
      authenticated_sessions: authenticated,
      lowest_remaining: lowestAvailable === null ? "not reported" : `${lowestAvailable}%`
    };
  }

  function renderCdxObjectRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => `
      <li class="viewer-cdx__row">
        <span>${escapeHtml(cdxLabel(key))}</span>
        <strong>${escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}</strong>
      </li>
    `).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

  function renderCdxArtifactRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => {
      const path = typeof entry === "string" ? entry : "";
      return `
        <li class="viewer-cdx__row">
          <span>${escapeHtml(cdxLabel(key))}</span>
          <strong>${path
            ? `<button class="viewer-cdx__path-link" type="button" data-viewer-cdx-artifact-path="${escapeHtml(path)}">${escapeHtml(path)}</button>`
            : escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}
          </strong>
        </li>
      `;
    }).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

  function cdxLabel(value) {
    return String(value || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function cdxStateClass(value) {
    const state = String(value || "").toLowerCase();
    if (["ready", "ok", "active", "enabled", "authenticated"].some((entry) => state.includes(entry))) {
      return "ok";
    }
    if (["starting", "pending", "running", "warning", "low", "limited", "stale"].some((entry) => state.includes(entry))) {
      return "warn";
    }
    if (["error", "failed", "disabled", "unavailable", "unauthenticated"].some((entry) => state.includes(entry))) {
      return "bad";
    }
    return "neutral";
  }

  function cdxRemainingPct(item) {
    const value = item?.remaining_pct ?? item?.remainingPct ?? item?.available_pct ?? item?.availablePct ?? item?.lowest_available_pct ?? item?.lowestAvailablePct;
    const percent = Number(value);
    return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : null;
  }

  function cdxPct(value) {
    const percent = Number(value);
    return Number.isFinite(percent) ? `${Math.max(0, Math.min(100, Math.round(percent)))}%` : "-";
  }

  function cdxField(item, keys, fallback = "-") {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return fallback;
  }

  function cdxRemainingClass(percent) {
    if (percent === null) {
      return "neutral";
    }
    if (percent <= 10) {
      return "bad";
    }
    if (percent <= 30) {
      return "warn";
    }
    return "ok";
  }

  function sortCdxSessionsByRemaining(entries) {
    return [...entries].sort((left, right) => {
      const leftRemaining = cdxRemainingPct(left);
      const rightRemaining = cdxRemainingPct(right);
      if (leftRemaining === null && rightRemaining === null) {
        return 0;
      }
      if (leftRemaining === null) {
        return 1;
      }
      if (rightRemaining === null) {
        return -1;
      }
      return rightRemaining - leftRemaining;
    });
  }

  function formatCdxValue(key, value) {
    if (["reset_at", "resetAt", "resets_at", "resetsAt", "reset_5h_at", "reset5hAt", "reset_week_at", "resetWeekAt", "updated_at", "updatedAt"].includes(key)) {
      return formatCdxResetAt(value);
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return value;
  }

  function parseCdxDate(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    const shortDate = raw.match(/^([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{1,2}:\d{2})$/);
    if (shortDate) {
      const year = new Date().getFullYear();
      const timestamp = Date.parse(`${shortDate[1]} ${shortDate[2]} ${year} ${shortDate[3]}`);
      return Number.isFinite(timestamp) ? timestamp : null;
    }
    const timestamp = Date.parse(raw);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
    return null;
  }

  function formatRelativeTime(timestamp) {
    const diffMs = timestamp - Date.now();
    const absMs = Math.abs(diffMs);
    const minutes = Math.round(absMs / 60000);
    if (minutes < 1) {
      return diffMs >= 0 ? "now" : "just now";
    }
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    let body = "";
    if (days > 0) {
      body = `${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ""}`;
    } else if (hours > 0) {
      body = `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    } else {
      body = `${minutes}m`;
    }
    return diffMs >= 0 ? `in ${body}` : `${body} ago`;
  }

  function formatCdxResetAt(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "-";
    }
    const timestamp = parseCdxDate(raw);
    return timestamp === null ? raw : formatRelativeTime(timestamp);
  }

  function formatCdxCredits(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "-") {
      return "-";
    }
    const number = Number(text);
    return Number.isFinite(number) ? number.toFixed(2) : text;
  }

  function renderCdxBadge(value, fallback = "reported") {
    const label = String(value || fallback || "reported");
    return `<span class="viewer-cdx__badge viewer-cdx__badge--${cdxStateClass(label)}">${escapeHtml(cdxLabel(label))}</span>`;
  }

  function cdxRunStatusDetail(run) {
    return "";
  }

  function cdxDetailEntries(item, excludedKeys) {
    return objectEntries(item)
      .filter(([key, value]) => !excludedKeys.includes(key) && value !== undefined && value !== null && value !== "")
      .slice(0, 6);
  }

  function renderCdxDetailPills(item, excludedKeys) {
    const details = cdxDetailEntries(item, excludedKeys).map(([key, value]) => `
      <span class="viewer-cdx__pill"><span>${escapeHtml(cdxLabel(key))}</span><strong>${escapeHtml(formatCdxValue(key, value))}</strong></span>
    `).join("");
    return details ? `<div class="viewer-cdx__pills">${details}</div>` : "";
  }

  function renderCdxRemainingPill(item) {
    const percent = cdxRemainingPct(item);
    if (percent === null) {
      return "";
    }
    return `
      <span class="viewer-cdx__remaining viewer-cdx__remaining--${cdxRemainingClass(percent)}" title="${escapeHtml(percent)}% usage remaining">
        <span>Remaining</span>
        <strong>${escapeHtml(percent)}%</strong>
      </span>
    `;
  }

  function cdxSessionBlock(item) {
    const explicit = cdxField(item, ["block", "blocked", "blocking"], "");
    if (explicit && explicit !== true) {
      return explicit;
    }
    const fiveHour = Number(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN));
    const week = Number(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN));
    if (Number.isFinite(fiveHour) && fiveHour <= 0) {
      return "5H";
    }
    if (Number.isFinite(week) && week <= 1) {
      return "WEEK";
    }
    return explicit === true ? "YES" : "-";
  }

  function cdxProviderName(item) {
    return String(cdxField(item, ["provider", "name"], "unknown") || "unknown");
  }

  function cdxKnownProviders(status, providers, sessions) {
    const names = new Set();
    providers.forEach((provider) => {
      const name = cdxProviderName(provider);
      if (name) {
        names.add(name);
      }
    });
    sessions.forEach((session) => {
      const name = cdxProviderName(session);
      if (name) {
        names.add(name);
      }
    });
    pickFirstArray(status, ["providers", "providerStatus", "provider_status"]).forEach((provider) => {
      const name = cdxProviderName(provider);
      if (name) {
        names.add(name);
      }
    });
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }

  function filterCdxEntriesByProvider(entries, providerFilter) {
    if (providerFilter.mode !== "subset" || !providerFilter.selected.length) {
      return entries;
    }
    const selected = new Set(providerFilter.selected);
    return entries.filter((entry) => selected.has(cdxProviderName(entry)));
  }

  function renderCdxImportExportControls(knownSessions) {
    const sessionRows = knownSessions.map((name) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" class="viewer-cdx__export-session" value="${escapeHtml(name)}" checked>
        <span>${escapeHtml(name)}</span>
      </label>
    `).join("");
    return `
      <details class="viewer-cdx__menu" id="viewer-cdx-import-menu">
        <summary class="viewer-cdx__icon-button" title="Import CDX accounts" aria-label="Import CDX accounts">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide" role="dialog" aria-label="Import CDX accounts">
          <div class="viewer-cdx__import-form">
            <label class="viewer-cdx__form-label">
              <span>File (.cdx)</span>
              <input type="file" class="viewer-cdx__file-input" id="viewer-cdx-import-file" accept=".cdx,.json">
            </label>
            <label class="viewer-cdx__form-label">
              <span>Passphrase</span>
              <input type="password" class="viewer-cdx__pass-input" id="viewer-cdx-import-pass" placeholder="Leave empty if unencrypted" autocomplete="off">
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-import-merge" checked>
              <span>Merge (keep existing accounts)</span>
            </label>
            <button class="viewer-cdx__menu-action viewer-cdx__menu-action--primary" type="button" id="viewer-cdx-import-btn">Import</button>
            <div class="viewer-cdx__form-status" id="viewer-cdx-import-status" hidden></div>
          </div>
        </div>
      </details>
      <details class="viewer-cdx__menu" id="viewer-cdx-export-menu">
        <summary class="viewer-cdx__icon-button" title="Export CDX accounts" aria-label="Export CDX accounts">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide" role="dialog" aria-label="Export CDX accounts">
          <div class="viewer-cdx__import-form">
            <div class="viewer-cdx__form-section-label">Sessions to export</div>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-export-all" checked>
              <span>All sessions</span>
            </label>
            <div id="viewer-cdx-export-sessions">${sessionRows || '<div class="viewer-cdx__empty">No sessions available.</div>'}</div>
            <label class="viewer-cdx__form-label">
              <span>Passphrase</span>
              <input type="password" class="viewer-cdx__pass-input" id="viewer-cdx-export-pass" placeholder="Recommended — encrypts credentials" autocomplete="off">
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-export-auth" checked>
              <span>Include credentials (--include-auth)</span>
            </label>
            <button class="viewer-cdx__menu-action viewer-cdx__menu-action--primary" type="button" id="viewer-cdx-export-btn">Export</button>
            <div class="viewer-cdx__form-status" id="viewer-cdx-export-status" hidden></div>
          </div>
        </div>
      </details>
    `;
  }

  function renderCdxStatusControls(knownProviders, knownSessions, visibleColumns, providerFilter) {
    const columnRows = cdxStatusColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(providerFilter.mode === "subset" ? providerFilter.selected : knownProviders);
    const providerRows = knownProviders.map((provider) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-provider="${escapeHtml(provider)}"${selected.has(provider) ? " checked" : ""}>
        <span>${escapeHtml(provider)}</span>
      </label>
    `).join("");
    const providerSummary = providerFilter.mode === "subset" && providerFilter.selected.length
      ? `${providerFilter.selected.length}/${knownProviders.length || providerFilter.selected.length}`
      : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX status table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure status columns" aria-label="Configure status columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX status columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter status providers" aria-label="Filter status providers">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(providerSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX provider filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-provider-all>All providers</button>
            ${providerRows || '<div class="viewer-cdx__empty">No providers reported.</div>'}
          </div>
        </details>
        ${renderCdxImportExportControls(knownSessions)}
      </div>
    `;
  }

  function isCdxSessionEnabled(item) {
    if (item.enabled === false) {
      return false;
    }
    const state = String(cdxField(item, ["status", "state"], "")).toLowerCase();
    return state !== "disabled";
  }

  function renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal) {
    if (!name || name === "-") {
      return escapeHtml(label);
    }
    const enabled = isCdxSessionEnabled(item);
    const resumeAvailable = item.resume_available === true || item.resumeAvailable === true || item.resumable === true;
    const canHandoff = Boolean(enabled && canLaunchTerminal && latestSessionName && latestSessionName !== name);
    return `
      <details class="viewer-cdx__menu viewer-cdx__session-menu">
        <summary class="viewer-cdx__path-link viewer-cdx__session-summary" title="CDX session actions for ${escapeHtml(name)}">${escapeHtml(label)}</summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__session-menu-panel" role="menu" aria-label="CDX session actions for ${escapeHtml(name)}">
          ${enabled && canLaunchTerminal ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="new" data-viewer-cdx-session="${escapeHtml(name)}">New</button>` : ""}
          ${enabled && canLaunchTerminal && resumeAvailable ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="resume" data-viewer-cdx-session="${escapeHtml(name)}">Resume</button>` : ""}
          ${canHandoff ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="handoff" data-viewer-cdx-session="${escapeHtml(name)}" data-viewer-cdx-handoff-source="${escapeHtml(latestSessionName)}">Handoff (${escapeHtml(latestSessionName)})</button>` : ""}
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--danger" type="button" role="menuitem" data-viewer-cdx-session-action="remove" data-viewer-cdx-session="${escapeHtml(name)}">Remove</button>
        </div>
      </details>
    `;
  }

  function closeCdxSessionMenus(exceptMenu = null) {
    document.querySelectorAll(".viewer-cdx__session-menu[open], .viewer-cdx__mission-config[open], .viewer-workshop__command-run-menu[open]").forEach((menu) => {
      if (exceptMenu && menu === exceptMenu) {
        return;
      }
      menu.removeAttribute("open");
    });
  }

  function renderCdxSessionTable(sessions, emptyText, latestSessionNameOverride = "") {
    if (!sessions.length) {
      return `<div class="viewer-cdx__empty">${escapeHtml(emptyText)}</div>`;
    }
    const visibleColumns = cdxColumnVisibilityPreference();
    const workshopCap = capability("workshop");
    const canLaunchTerminal = workshopCap.available === true && Boolean(workshopCap.detail?.terminalsAvailable);
    const latestSessionName = latestSessionNameOverride || latestCdxSessionName(sessions);
    const cellRenderers = {
      session: (item) => {
        const name = cdxField(item, ["session_name", "name", "id", "value"]);
        const label = `${name}${item.active ? "*" : ""}`;
        return `<td class="viewer-cdx__session-name">${renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal)}</td>`;
      },
      provider: (item) => `<td>${escapeHtml(cdxField(item, ["provider"], "-"))}</td>`,
      status: (item) => {
        const name = cdxField(item, ["session_name", "name", "id", "value"]);
        const isEnabled = isCdxSessionEnabled(item);
        const badge = renderCdxBadge(cdxField(item, ["status", "state"]));
        if (!name || name === "-") return `<td>${badge}</td>`;
        return `<td><button class="viewer-cdx__status-toggle${isEnabled ? " is-on" : " is-off"}" type="button" data-viewer-cdx-toggle="${escapeHtml(name)}" data-viewer-cdx-toggle-state="${isEnabled ? "on" : "off"}" title="${isEnabled ? "Disable" : "Enable"} ${escapeHtml(name)}">${badge}</button></td>`;
      },
      auth: (item) => {
        const rawAuth = String(cdxField(item, ["auth_status", "authStatus"], "-"));
        const displayAuth = rawAuth.replace("authenticated", "logged");
        const isLoggedOut = rawAuth.toLowerCase() === "logged_out";
        const name = cdxField(item, ["session_name", "name", "id", "value"]);
        if (isLoggedOut && canLaunchTerminal && name && name !== "-") {
          return `<td><button class="viewer-cdx__auth-login" type="button" data-viewer-cdx-login="${escapeHtml(name)}" title="Open Workshop terminal: cdx login ${escapeHtml(name)}">${escapeHtml(displayAuth)}</button></td>`;
        }
        return `<td>${escapeHtml(displayAuth)}</td>`;
      },
      ok: (item) => `<td>${renderCdxRemainingPill(item) || escapeHtml(cdxPct(cdxField(item, ["available_pct", "availablePct"], NaN)))}</td>`,
      remaining5h: (item) => `<td>${escapeHtml(cdxPct(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN)))}</td>`,
      remainingWeek: (item) => `<td>${escapeHtml(cdxPct(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN)))}</td>`,
      block: (item) => `<td>${escapeHtml(cdxSessionBlock(item))}</td>`,
      credits: (item) => `<td>${escapeHtml(formatCdxCredits(cdxField(item, ["credits", "cr"], "-")))}</td>`,
      reset5h: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], "")))}</td>`,
      resetWeek: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["reset_week_at", "resetWeekAt", "reset_at", "resetAt"], "")))}</td>`,
      updated: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["updated_at", "updatedAt"], "")))}</td>`
    };
    const activeColumns = cdxStatusColumns.filter((column) => visibleColumns[column.id]);
    const rows = sessions.slice(0, 24).map((entry) => {
      const item = entry && typeof entry === "object" ? entry : { value: entry };
      return `
        <tr>
          ${activeColumns.map((column) => cellRenderers[column.id](item)).join("")}
        </tr>
      `;
    }).join("");
    return `
      <div class="viewer-cdx__table-wrap">
        <table class="viewer-cdx__table">
          <thead>
            <tr>
              ${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderCdxEntityRows(entries, emptyText, options = {}) {
    const titleKeys = options.titleKeys || ["name", "session_name", "id", "provider", "model", "value"];
    const stateKeys = options.stateKeys || ["state", "status", "readiness", "available", "auth_status"];
    const excludedKeys = [...titleKeys, ...stateKeys, "available_pct", "availablePct", "remaining_pct", "remainingPct", "lowest_available_pct", "lowestAvailablePct"];
    const rows = entries.slice(0, 16).map((entry) => {
      const item = entry && typeof entry === "object" ? entry : { value: entry };
      const name = titleKeys.map((key) => item[key]).find(Boolean) || "entry";
      const state = stateKeys.map((key) => item[key]).find((value) => value !== undefined && value !== null && value !== "") || "";
      const subtitle = options.subtitleKeys
        ? options.subtitleKeys.map((key) => item[key]).filter(Boolean).join(" · ")
        : "";
      return `
        <li class="viewer-cdx__entity">
          <div class="viewer-cdx__entity-main">
            <div>
              <strong>${escapeHtml(name)}</strong>
              ${subtitle ? `<div class="viewer-cdx__meta">${escapeHtml(subtitle)}</div>` : ""}
            </div>
            <div class="viewer-cdx__entity-status">
              ${renderCdxRemainingPill(item)}
              ${renderCdxBadge(state)}
            </div>
          </div>
          ${renderCdxDetailPills(item, excludedKeys)}
        </li>
      `;
    }).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

  function cdxMissionCatalog(payload = {}) {
    return payload.catalog || {
      missions: [
        { id: "full-audit", title: "Full audit", description: "Audit the repository, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.", scope: "repository", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "release-review", title: "Review since latest release", description: "Review changes since the latest release, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.", scope: "latest-release", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "corpus-ready", title: "Prepare dev-ready corpus", description: "Produce a corpus plan for explicit deterministic application.", scope: "open-logics-workflow", requiresPlanConfirmation: true, supportsFileWrites: false },
        { id: "wish-to-request", title: "Wish to request", description: "Create or draft a structured Logics request from a free-form wish.", scope: "request-draft", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "wishText", label: "Wish or intent", type: "textarea", required: true }] },
        { id: "pre-release", title: "Guarded pre-release", description: "Prepare release metadata, changelog, validation, and fixes without tagging or publishing.", scope: "pre-release-report", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "releaseVersion", label: "Version", type: "text", placeholder: "vX.X.X", required: true }, { id: "runFullValidation", label: "Run full validation and report fixes before pre-release", type: "checkbox" }] }
      ],
      strengths: [
        { id: "standard", label: "Standard" },
        { id: "deep", label: "Deep" },
        { id: "max", label: "Max" }
      ],
      defaultMissionId: "full-audit",
      defaultStrengthId: "standard"
    };
  }

  function selectedCdxMissionRequest() {
    const catalog = latestCdxMissionState.catalog || cdxMissionCatalog();
    const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
    const missionId = latestCdxMissionState.missionId || "full-audit";
    const mission = missions.find((entry) => entry.id === missionId) || {};
    const status = latestCdxMissionState.statusPayload?.status || {};
    const sessions = cdxSessions(status);
    const selectedSession = sessions.find((session) => cdxField(session && typeof session === "object" ? session : { value: session }, ["id", "name", "session_name", "value"], "") === latestCdxMissionState.sessionId);
    const selectedModel = cdxField(selectedSession && typeof selectedSession === "object" ? selectedSession : {}, ["model", "model_name", "modelName"], "");
    const allowFileWrites = mission.supportsFileWrites === false
      ? "false"
      : (latestCdxMissionState.missionInputs.allowFileWrites === "false" ? "false" : "true");
    const request = {
      missionId,
      sessionId: latestCdxMissionState.sessionId || "",
      strengthId: latestCdxMissionState.strengthId || "standard",
      ...latestCdxMissionState.missionInputs,
      model: Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model") ? latestCdxMissionState.missionInputs.model : selectedModel,
      allowFileWrites,
      commitAtEnd: latestCdxMissionState.missionInputs.commitAtEnd === "true" ? "true" : "false"
    };
    if (latestCdxMissionState.promptOverride) {
      request.promptOverride = latestCdxMissionState.promptOverride;
    }
    return request;
  }

  function renderCdxMissionConfigMenu(session, strength) {
    const model = Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model")
      ? latestCdxMissionState.missionInputs.model
      : cdxField(session && typeof session === "object" ? session : {}, ["model", "model_name", "modelName"], "");
    const levels = ["minimal", "low", "medium", "high", "xhigh"];
    const defaultReasoning = strength?.reasoningEffort || "medium";
    const defaultPower = strength?.power || "medium";
    const reasoningEffort = latestCdxMissionState.missionInputs.reasoningEffort || defaultReasoning;
    const power = latestCdxMissionState.missionInputs.power || defaultPower;
    const optionRows = (selected) => levels.map((level) => `<option value="${escapeHtml(level)}"${level === selected ? " selected" : ""}>${escapeHtml(cdxLabel(level))}</option>`).join("");
    return `
      <details class="viewer-cdx__menu viewer-cdx__mission-config">
        <summary class="viewer-cdx__icon-button" title="Configure CDX model and reasoning">Config</summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide viewer-cdx__mission-config-panel" role="menu" aria-label="CDX mission configuration">
          <label class="viewer-cdx__field">
            <span>Model</span>
            <input data-viewer-cdx-input="model" type="text" value="${escapeHtml(model)}" placeholder="Default session model">
          </label>
          <label class="viewer-cdx__field">
            <span>Reasoning</span>
            <select data-viewer-cdx-input="reasoningEffort">${optionRows(reasoningEffort)}</select>
          </label>
          <label class="viewer-cdx__field">
            <span>Power</span>
            <select data-viewer-cdx-input="power">${optionRows(power)}</select>
          </label>
        </div>
      </details>
    `;
  }

  function renderCdxMissionInputs(mission) {
    const fields = Array.isArray(mission?.inputFields) ? mission.inputFields : [];
    if (!fields.length) {
      return "";
    }
    const rows = fields.map((field) => {
      const id = field.id || "";
      const value = latestCdxMissionState.missionInputs[id] || "";
      if (field.type === "checkbox") {
        return `
          <label class="viewer-cdx__field viewer-cdx__field--check">
            <input data-viewer-cdx-input="${escapeHtml(id)}" type="checkbox"${value === "true" ? " checked" : ""}>
            <span>${escapeHtml(field.label || cdxLabel(id))}</span>
          </label>
        `;
      }
      if (field.type === "textarea") {
        return `
          <label class="viewer-cdx__field">
            <span>${escapeHtml(field.label || cdxLabel(id))}</span>
            <textarea data-viewer-cdx-input="${escapeHtml(id)}" placeholder="${escapeHtml(field.placeholder || "")}" rows="5">${escapeHtml(value)}</textarea>
          </label>
        `;
      }
      return `
        <label class="viewer-cdx__field">
          <span>${escapeHtml(field.label || cdxLabel(id))}</span>
          <input data-viewer-cdx-input="${escapeHtml(id)}" type="${escapeHtml(field.type || "text")}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}"${field.pattern ? ` pattern="${escapeHtml(field.pattern)}"` : ""}>
        </label>
      `;
    }).join("");
    return `<div class="viewer-cdx__inputs">${rows}</div>`;
  }

  function renderCdxMissionSetup(statusPayload, planPayload, runPayload, applyPayload) {
    const catalog = cdxMissionCatalog(planPayload || {});
    latestCdxMissionState.catalog = catalog;
    const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
    const strengths = Array.isArray(catalog.strengths) ? catalog.strengths : [];
    const status = statusPayload?.status || {};
    const sessions = cdxSessions(status);
    const selectedSession = latestCdxMissionState.sessionId || cdxField(sessions[0] || {}, ["id", "name", "session_name", "value"], "");
    const selectedSessionItem = sessions.find((session) => cdxField(session && typeof session === "object" ? session : { value: session }, ["id", "name", "session_name", "value"], "") === selectedSession) || {};
    const missionId = latestCdxMissionState.missionId || catalog.defaultMissionId || "full-audit";
    const selectedMission = missions.find((mission) => mission.id === missionId) || {};
    const strengthId = latestCdxMissionState.strengthId || catalog.defaultStrengthId || "standard";
    const selectedStrength = strengths.find((strength) => strength.id === strengthId) || strengths.find((strength) => strength.id === catalog.defaultStrengthId) || {};
    const runMode = latestCdxMissionState.runMode === "terminal" ? "terminal" : "background";
    const supportsFileWrites = selectedMission.supportsFileWrites !== false;
    const requiresFileWrites = selectedMission.requiresFileWrites === true;
    const allowFileWrites = supportsFileWrites && latestCdxMissionState.missionInputs.allowFileWrites !== "false";
    const commitControl = `
            <label class="viewer-cdx__field viewer-cdx__field--check">
              <input data-viewer-cdx-input="commitAtEnd" type="checkbox"${latestCdxMissionState.missionInputs.commitAtEnd === "true" ? " checked" : ""}>
              <span>Commit changes at end</span>
            </label>`;
    const fileWriteControl = requiresFileWrites
      ? `
            <div class="viewer-cdx__meta">This mission always drafts a Logics request. Enabling "Fix directly" also promotes it into a backlog item and task as proof.</div>
            ${commitControl}
        `
      : supportsFileWrites
        ? `
            <label class="viewer-cdx__field viewer-cdx__field--check">
              <input data-viewer-cdx-input="allowFileWrites" type="checkbox"${allowFileWrites ? " checked" : ""}>
              <span>Allow CDX to modify files</span>
            </label>
            ${commitControl}
        `
        : `
            <div class="viewer-cdx__meta">Corpus updates are applied after CDX returns allowed actions.</div>
        `;
    latestCdxMissionState.sessionId = selectedSession;
    const missionCards = missions.map((mission) => `
      <button class="viewer-cdx__mission${mission.id === missionId ? " is-active" : ""}" type="button" data-viewer-cdx-mission="${escapeHtml(mission.id)}" aria-pressed="${mission.id === missionId ? "true" : "false"}">
        <strong>${escapeHtml(mission.title || mission.id)}</strong>
        <span>${escapeHtml(mission.description || "")}</span>
        <em>${escapeHtml(cdxLabel(mission.scope || ""))}</em>
      </button>
    `).join("");
    const sessionOptions = sessions.map((session) => {
      const item = session && typeof session === "object" ? session : { value: session };
      const id = cdxField(item, ["id", "name", "session_name", "value"], "");
      const label = [id, cdxField(item, ["provider"], ""), renderTextRemaining(item)].filter(Boolean).join(" · ");
      return `<option value="${escapeHtml(id)}"${id === selectedSession ? " selected" : ""}>${escapeHtml(label || id)}</option>`;
    }).join("");
    const plan = planPayload?.plan;
    const warnings = Array.isArray(plan?.warnings) ? plan.warnings : [];
    const command = Array.isArray(plan?.command) ? plan.command.join(" ") : "";
    const promptValue = latestCdxMissionState.promptOverride || (plan && typeof plan.prompt === "string" ? plan.prompt : "");
    const promptEdited = Boolean(plan?.promptEdited || latestCdxMissionState.promptOverride);
    const warningRows = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    const canRun = planPayload?.state === "ok" && plan?.canRun;
    const usage = runPayload?.run?.usage || {};
    const run = runPayload?.run;
    const usageText = usage.available
      ? `${usage.totalTokens ?? "-"} total · ${usage.inputTokens ?? "-"} in · ${usage.outputTokens ?? "-"} out`
      : (usage.message || "Token usage not reported yet.");
    const parsedActions = Array.isArray(run?.parsed?.actions) ? run.parsed.actions : [];
    const applyResults = Array.isArray(applyPayload?.results) ? applyPayload.results : [];
    const actionRows = parsedActions.map((action) => `
      <li class="viewer-cdx__row"><span>${escapeHtml(cdxLabel(action.type || "action"))}</span><strong>${escapeHtml(action.target || "-")}</strong></li>
    `).join("");
    const applyRows = applyResults.map((result) => `
      <li class="viewer-cdx__row"><span>${escapeHtml(cdxLabel(result.type || "action"))}</span><strong>${escapeHtml(result.returnCode === 0 ? "applied" : "failed")}</strong></li>
    `).join("");
    return `
      <div class="viewer-cdx__workspace viewer-cdx__workspace--missions">
        <div class="viewer-cdx__stack">
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Mission</h2>
            <div class="viewer-cdx__missions">${missionCards}</div>
          </section>
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Execution</h2>
            <label class="viewer-cdx__field">
              <span>Session</span>
              <select data-viewer-cdx-session>${sessionOptions || '<option value="">No session reported</option>'}</select>
            </label>
            ${renderCdxMissionConfigMenu(selectedSessionItem, selectedStrength)}
            ${fileWriteControl}
            ${renderCdxMissionInputs(selectedMission)}
            <label class="viewer-cdx__field">
              <span>Run in</span>
              <select data-viewer-cdx-run-mode>
                <option value="background"${runMode === "terminal" ? "" : " selected"}>Background runner</option>
                <option value="terminal"${runMode === "terminal" ? " selected" : ""}>New terminal</option>
              </select>
            </label>
            <div class="viewer-cdx__actions">
              <button class="btn" type="button" data-viewer-cdx-plan>Preview</button>
              <button class="btn" type="button" data-viewer-cdx-run${canRun ? "" : " disabled"}>${runMode === "terminal" ? "Launch in terminal" : "Launch run"}</button>
            </div>
          </section>
        </div>
        <div class="viewer-cdx__stack">
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Plan preview</h2>
            ${planPayload && planPayload.state !== "ok" ? `<div class="viewer-cdx__state">${escapeHtml(planPayload.message || "Unable to build mission plan.")}</div>` : ""}
            ${command ? `<pre class="viewer-cdx__code">${escapeHtml(command)}</pre>` : '<div class="viewer-cdx__empty">Preview a mission to inspect the exact command before launch.</div>'}
            ${plan && typeof plan.prompt === "string" ? `
              <label class="viewer-cdx__field">
                <span>Prompt${promptEdited ? " (edited)" : " (editable)"}</span>
                <textarea data-viewer-cdx-prompt rows="10" spellcheck="false" placeholder="Generated mission prompt">${escapeHtml(promptValue)}</textarea>
              </label>
              <div class="viewer-cdx__meta">Edits apply on the next Preview or Launch run. Session, permission, and timeout stay enforced by the server and release contract.</div>
            ` : ""}
            ${plan?.releaseTag ? `<div class="viewer-cdx__meta">Base tag: ${escapeHtml(plan.releaseTag)}</div>` : ""}
            ${plan?.commitAtEnd ? '<div class="viewer-cdx__meta">Commit at end: enabled when mission changes files.</div>' : ""}
            ${plan?.requiresConfirmation ? '<div class="viewer-cdx__meta">Plan-first mission: Logics changes need explicit apply after CDX returns allowed actions.</div>' : ""}
            ${warningRows ? `<ul class="viewer-cdx__warnings">${warningRows}</ul>` : ""}
          </section>
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Run output</h2>
            ${runPayload ? `<div class="viewer-cdx__state viewer-cdx__state--${escapeHtml(cdxStateClass(runPayload.state))}">${escapeHtml(runPayload.message || cdxLabel(runPayload.state))}</div>` : '<div class="viewer-cdx__empty">No mission run launched yet.</div>'}
            ${run ? `<ul class="viewer-cdx__list">
              <li class="viewer-cdx__row"><span>Run</span><strong>${escapeHtml(run.runId || "-")}</strong></li>
              <li class="viewer-cdx__row"><span>Usage</span><strong>${escapeHtml(usageText)}</strong></li>
              <li class="viewer-cdx__row"><span>Return code</span><strong>${escapeHtml(run.returnCode ?? "-")}</strong></li>
            </ul>` : ""}
            ${run?.stdout ? `<pre class="viewer-cdx__code">${escapeHtml(run.stdout)}</pre>` : ""}
            ${run?.stderr ? `<pre class="viewer-cdx__code viewer-cdx__code--error">${escapeHtml(run.stderr)}</pre>` : ""}
          </section>
          ${plan?.missionId === "corpus-ready" || latestCdxMissionState.missionId === "corpus-ready" ? `
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Corpus apply</h2>
              <ul class="viewer-cdx__list">${actionRows || '<li class="viewer-cdx__empty">CDX has not returned allowed corpus actions yet.</li>'}</ul>
              <div class="viewer-cdx__actions">
                <button class="btn" type="button" data-viewer-cdx-apply-plan${parsedActions.length ? "" : " disabled"}>Apply allowed actions</button>
              </div>
              ${applyPayload ? `<div class="viewer-cdx__state viewer-cdx__state--${escapeHtml(cdxStateClass(applyPayload.state))}">${escapeHtml(applyPayload.message || cdxLabel(applyPayload.state))}</div>` : ""}
              ${applyRows ? `<ul class="viewer-cdx__list">${applyRows}</ul>` : ""}
            </section>
          ` : ""}
        </div>
      </div>
    `;
  }

  function renderTextRemaining(item) {
    const percent = cdxRemainingPct(item);
    return percent === null ? "" : `${percent}% remaining`;
  }

  function renderCdxMissions(statusPayload, planPayload = null, runPayload = null, applyPayload = null) {
    if (!statusPayload || statusPayload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("missions")}
          <div class="viewer-cdx__state">${escapeHtml(statusPayload?.message || "CDX missions are unavailable.")}</div>
        </div>
      `;
    }
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("missions")}
        ${renderCdxMissionSetup(statusPayload, planPayload, runPayload, applyPayload)}
      </div>
    `;
  }

  function renderCdxModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes" role="tablist" aria-label="CDX views">
        <button class="viewer-cdx__mode${active === "status" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="status" aria-selected="${active === "status" ? "true" : "false"}">Status</button>
        <button class="viewer-cdx__mode${active === "missions" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="missions" aria-selected="${active === "missions" ? "true" : "false"}">Missions</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">Runs</button>
      </div>
    `;
  }

  function renderCdxStatus(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("status")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX status is unavailable.")}</div>
        </div>
      `;
    }
    const status = payload.status || {};
    const allProviders = cdxProviders(status);
    const allSessions = cdxSessions(status);
    const providerFilter = cdxProviderFilterPreference();
    const knownProviders = cdxKnownProviders(status, allProviders, allSessions);
    const providers = filterCdxEntriesByProvider(allProviders, providerFilter);
    const sessions = filterCdxEntriesByProvider(allSessions, providerFilter);
    const readiness = cdxReadiness(status);
    const commands = pickFirstArray(status, ["nextCommands", "next_commands", "safeCommands", "safe_commands", "commands"])
      .map((entry) => typeof entry === "string" ? entry : (entry.command || entry.value || entry.name || ""))
      .filter(Boolean);
    if (!commands.length) {
      commands.push("cdx status --json");
    }
    const runtimeState = status.state || status.status || status.availability || "ok";
    const readinessCount = objectEntries(readiness).length;
    const cards = [
      ["Runtime", runtimeState],
      ["Providers", providers.length],
      ["Sessions", sessions.length],
      ["Readiness", readinessCount ? `${readinessCount} signals` : "Not reported"]
    ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${label === "Runtime" ? renderCdxBadge(value) : escapeHtml(value)}</div>
      </div>
    `).join("");
    const commandRows = commands.slice(0, 10).map((command, index) => `
      <li>
        <span>${escapeHtml(index + 1)}</span>
        <code>${escapeHtml(command)}</code>
      </li>
    `).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("status")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxStatusControls(knownProviders, sessions.filter((s) => s.enabled !== false).map((s) => cdxField(s, ["session_name", "name", "id", "value"]) || "").filter(Boolean), cdxColumnVisibilityPreference(), providerFilter)}
        <div class="viewer-cdx__workspace">
          <div class="viewer-cdx__stack">
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Sessions</h2>
              ${renderCdxSessionTable(sessions, "No sessions reported.", latestCdxSessionName(allSessions))}
            </section>
          </div>
          <div class="viewer-cdx__stack">
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Readiness and quota</h2>
              <ul class="viewer-cdx__list">${renderCdxObjectRows(readiness, "No readiness or quota details reported.")}</ul>
            </section>
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Safe next commands</h2>
              <ul class="viewer-cdx__commands">${commandRows || '<li class="viewer-cdx__empty">No suggested commands reported.</li>'}</ul>
            </section>
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Providers</h2>
              <ul class="viewer-cdx__list">${renderCdxEntityRows(providers, "No provider status reported.", { subtitleKeys: ["model"] })}</ul>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function rerenderCdxStatusFromPreferences() {
    if (isCdxStatusOpen() && latestCdxStatusPayload) {
      setDocument("CDX status", renderCdxStatus(latestCdxStatusPayload));
      setupCdxImportExportHandlers();
    }
  }

  function setupCdxImportExportHandlers() {
    const importBtn = document.getElementById("viewer-cdx-import-btn");
    if (importBtn) {
      importBtn.addEventListener("click", async () => {
        const fileInput = document.getElementById("viewer-cdx-import-file");
        const passInput = document.getElementById("viewer-cdx-import-pass");
        const mergeCheck = document.getElementById("viewer-cdx-import-merge");
        const statusEl = document.getElementById("viewer-cdx-import-status");
        const file = fileInput?.files?.[0];
        if (!file) { showCdxFormStatus(statusEl, "error", "Please select a file."); return; }
        importBtn.disabled = true;
        showCdxFormStatus(statusEl, "info", "Importing…");
        try {
          const fileBase64 = await fileToBase64(file);
          const response = await fetch("/api/cdx-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileBase64, passphrase: passInput?.value || "", merge: mergeCheck?.checked ?? true }),
          });
          const data = await response.json();
          if (data.ok) {
            showCdxFormStatus(statusEl, "ok", data.payload?.message || "Import complete.");
            if (fileInput) fileInput.value = "";
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || "Import failed.");
          }
        } catch (err) {
          showCdxFormStatus(statusEl, "error", err?.message || "Import failed.");
        } finally {
          importBtn.disabled = false;
        }
      });
    }

    const exportBtn = document.getElementById("viewer-cdx-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const passInput = document.getElementById("viewer-cdx-export-pass");
        const authCheck = document.getElementById("viewer-cdx-export-auth");
        const allCheck = document.getElementById("viewer-cdx-export-all");
        const statusEl = document.getElementById("viewer-cdx-export-status");
        exportBtn.disabled = true;
        showCdxFormStatus(statusEl, "info", "Exporting…");
        const sessions = allCheck?.checked
          ? []
          : Array.from(document.querySelectorAll(".viewer-cdx__export-session:checked")).map((el) => el.value);
        try {
          const response = await fetch("/api/cdx-export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessions, passphrase: passInput?.value || "", includeAuth: authCheck?.checked ?? true }),
          });
          const data = await response.json();
          if (data.ok) {
            downloadBase64File(data.payload?.fileBase64 || "", data.payload?.filename || "cdx-accounts.cdx");
            showCdxFormStatus(statusEl, "ok", "Export ready — file downloaded.");
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || "Export failed.");
          }
        } catch (err) {
          showCdxFormStatus(statusEl, "error", err?.message || "Export failed.");
        } finally {
          exportBtn.disabled = false;
        }
      });
    }

    const exportAllCheck = document.getElementById("viewer-cdx-export-all");
    if (exportAllCheck) {
      exportAllCheck.addEventListener("change", () => {
        const sessionBoxes = document.querySelectorAll(".viewer-cdx__export-session");
        sessionBoxes.forEach((cb) => { cb.disabled = exportAllCheck.checked; });
      });
    }
  }

  function renderCdxRuns(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("runs")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX runs are unavailable.")}</div>
        </div>
      `;
    }
    const runs = Array.isArray(payload.runs) ? payload.runs : [];
    const staleCount = runs.filter((run) => String(cdxField(run, ["status", "state"], "")).toLowerCase() === "stale").length;
    const runningCount = runs.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
    const runsSummary = staleCount
      ? `${runs.length} reported · ${staleCount} incomplete${runningCount ? ` · ${runningCount} running` : ""}`
      : runningCount
      ? `${runs.length} reported · ${runningCount} running`
      : `${runs.length} reported`;
    const rows = runs.map((run) => {
      const runId = cdxField(run, ["run_id", "runId", "id"], "");
      const status = cdxField(run, ["status", "state"], "unknown");
      const detail = cdxRunStatusDetail(run);
      return `
        <tr>
          <td><code>${escapeHtml(runId || "-")}</code>${detail ? `<div class="viewer-cdx__meta">${escapeHtml(detail)}</div>` : ""}</td>
          <td>${renderCdxBadge(status)}</td>
          <td>${escapeHtml(cdxField(run, ["kind"], "assistant"))}</td>
          <td>${escapeHtml(cdxField(run, ["session", "session_id", "sessionId"], "-"))}</td>
          <td>${escapeHtml(cdxField(run, ["cwd", "workspace", "repo"], "-"))}</td>
          <td>${runId ? `<button class="viewer-cdx__mode" type="button" data-viewer-cdx-report="${escapeHtml(runId)}">Report</button>` : ""}</td>
        </tr>
      `;
    }).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("runs")}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Assistant runs</h2><span>${escapeHtml(runsSummary)}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr><th>RUN</th><th>STATUS</th><th>KIND</th><th>SESSION</th><th>CWD</th><th>REPORT</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="6" class="viewer-cdx__empty">No assistant runs reported.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function cdxReportMissionOutput(report, run, taskReport) {
    const parsed = report?.parsed && typeof report.parsed === "object" ? report.parsed : {};
    const candidates = [
      report?.missionOutput,
      report?.mission_output,
      parsed.missionOutput,
      parsed.mission_output,
      run?.missionOutput,
      run?.mission_output,
      taskReport?.missionOutput,
      taskReport?.mission_output
    ];
    return candidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate)) || null;
  }

  function cdxCount(value) {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (value && typeof value === "object") {
      return objectEntries(value).length;
    }
    return value ? 1 : 0;
  }

  function cdxReportCanCreateRequest(taskReport, missionOutput) {
    if (taskReport?.kind === "code-review") {
      return true;
    }
    if (cdxCount(taskReport?.findings)) {
      return true;
    }
    return ["findings", "recommendations", "requestFiles", "actionableFixes", "releasePlan"].some((key) => cdxCount(missionOutput?.[key]));
  }

  function renderCdxReportCards(cards) {
    return `
      <div class="viewer-cdx__summary">
        ${cards.map(([label, value]) => `
          <div class="viewer-cdx__card">
            <div class="viewer-cdx__label">${escapeHtml(label)}</div>
            <div class="viewer-cdx__value">${escapeHtml(value)}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCdxDetailValue(value) {
    if (Array.isArray(value)) {
      return `
        <ol class="viewer-cdx__detail-list">
          ${value.map((item) => `
            <li>${typeof item === "object" && item !== null
              ? `<pre class="viewer-cdx__detail-code">${escapeHtml(JSON.stringify(item, null, 2))}</pre>`
              : escapeHtml(String(item))}
            </li>
          `).join("")}
        </ol>
      `;
    }
    if (value && typeof value === "object") {
      return `<pre class="viewer-cdx__detail-code">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }
    return `<strong>${escapeHtml(String(value))}</strong>`;
  }

  function renderCdxDetailRow(label, value) {
    return `
      <li class="viewer-cdx__row viewer-cdx__row--block">
        <span>${escapeHtml(label)}</span>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(value)}</div>
      </li>
    `;
  }

  function parseCdxLogJson(content) {
    const raw = String(content || "").trim();
    if (!raw) {
      return null;
    }
    try {
      return { kind: "json", value: JSON.parse(raw) };
    } catch {
      // Fall through to JSONL detection.
    }
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      return null;
    }
    const values = [];
    for (const line of lines) {
      try {
        values.push(JSON.parse(line));
      } catch {
        return null;
      }
    }
    return { kind: "jsonl", value: values };
  }

  function renderCdxStructuredLog(parsed) {
    if (!parsed) {
      return "";
    }
    const label = parsed.kind === "jsonl" ? `${parsed.value.length} JSONL event(s)` : "JSON document";
    return `
      <details class="viewer-cdx__log-structured" open>
        <summary>Structured preview · ${escapeHtml(label)}</summary>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(parsed.value)}</div>
      </details>
    `;
  }

  function renderCdxLogPreview(payload) {
    const path = payload?.path || "";
    const content = payload?.content || "";
    const truncated = Boolean(payload?.truncated);
    const parsed = parseCdxLogJson(content);
    return `
      <div class="viewer-cdx">
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Log preview</h2><span>${truncated ? "latest output" : "complete file"}</span></div>
          <div class="viewer-cdx__log-preview">
            <div class="viewer-cdx__meta">${escapeHtml(path)}</div>
            ${truncated ? '<div class="viewer-cdx__state viewer-cdx__state--warn">Preview truncated to the end of the file. Open the file externally for the full log.</div>' : ""}
            ${renderCdxStructuredLog(parsed)}
            <details class="viewer-cdx__log-raw"${parsed ? "" : " open"}>
              <summary>Raw log</summary>
              <pre class="viewer-cdx__log-content">${escapeHtml(content || "Log is empty.")}</pre>
            </details>
          </div>
        </section>
      </div>
    `;
  }

  function renderCdxMissionOutput(output) {
    if (!output) {
      return "";
    }
    const rows = [
      ["Summary", output.summary],
      ["Version", output.version],
      ["Validation", output.validationMode],
      ["Blocked", typeof output.blocked === "boolean" ? (output.blocked ? "Yes" : "No") : ""],
      ["Actions", cdxCount(output.actions)],
      ["Findings", cdxCount(output.findings)],
      ["Recommendations", cdxCount(output.recommendations)],
      ["Changed files", cdxCount(output.changedFiles)],
      ["Corpus files", cdxCount(output.corpusFiles)],
      ["Generated files", cdxCount(output.generatedFiles)],
      ["Validation evidence", cdxCount(output.validationEvidence)]
    ].filter(([_label, value]) => value !== undefined && value !== null && value !== "" && value !== 0);
    const detailKeys = [
      "actions",
      "findings",
      "recommendations",
      "directFixes",
      "requestFiles",
      "actionableFixes",
      "changedFiles",
      "corpusFiles",
      "generatedFiles",
      "validationEvidence",
      "releasePlan"
    ];
    const details = detailKeys
      .filter((key) => cdxCount(output[key]))
      .map((key) => renderCdxDetailRow(cdxLabel(key), output[key]))
      .join("");
    return `
      <section class="viewer-cdx__section">
        <div class="viewer-ci__heading"><h2>Mission output</h2><span>${escapeHtml(rows.length)} signals</span></div>
        <ul class="viewer-cdx__list">
          ${rows.map(([label, value]) => renderCdxDetailRow(label, value)).join("") || '<li class="viewer-cdx__empty">No structured mission output was reported.</li>'}
        </ul>
        ${details ? `<ul class="viewer-cdx__list">${details}</ul>` : ""}
      </section>
    `;
  }

  function renderCdxReport(payload) {
    if (!payload || payload.state !== "ok" || !payload.report) {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("runs")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX run report is unavailable.")}</div>
        </div>
      `;
    }
    const report = payload.report || {};
    const run = report.run || {};
    const taskReport = report.task_report || {};
    const runError = report.error || run.error || {};
    const artifacts = report.artifacts || run.artifacts || {};
    const findings = Array.isArray(taskReport.findings) ? taskReport.findings : [];
    const missionOutput = cdxReportMissionOutput(report, run, taskReport);
    const findingRows = findings.map((finding, index) => {
      const location = [finding.path || finding.file || "", finding.line || ""].filter(Boolean).join(":") || "-";
      return `<li class="viewer-cdx__entity"><div class="viewer-cdx__entity-main"><div><strong>${escapeHtml(finding.message || finding.title || `Finding ${index + 1}`)}</strong><div class="viewer-cdx__meta">${escapeHtml(location)}</div></div>${renderCdxBadge(finding.severity || "unknown")}</div></li>`;
    }).join("");
    const canCreate = cdxReportCanCreateRequest(taskReport, missionOutput);
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("runs")}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading viewer-ci__heading--actions">
            <div><h2>Run report</h2><span>${escapeHtml(run.status || "unknown")}</span></div>
            <button class="viewer-cdx__mode" type="button" data-viewer-cdx-back-runs>Back to runs</button>
          </div>
          ${renderCdxReportCards([
            ["Status", run.status || "unknown"],
            ["Kind", taskReport.kind || run.kind || "assistant"],
            ["Findings", String(findings.length)],
            ["Artifacts", String(objectEntries(artifacts).length)]
          ])}
          <ul class="viewer-cdx__list">
            <li class="viewer-cdx__row"><span>Run</span><strong>${escapeHtml(run.run_id || taskReport.run_id || "-")}</strong></li>
            <li class="viewer-cdx__row"><span>Kind</span><strong>${escapeHtml(taskReport.kind || run.kind || "assistant")}</strong></li>
            ${renderCdxDetailRow("Summary", taskReport.summary || "No summary reported.")}
          </ul>
          ${canCreate ? `<button class="btn" type="button" data-viewer-cdx-create-request="${escapeHtml(run.run_id || taskReport.run_id || "")}">Create Logics request</button>` : ""}
        </section>
        ${renderCdxMissionOutput(missionOutput)}
        ${objectEntries(runError).length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Run signal</h2><span>${escapeHtml(runError.code || "reported")}</span></div>
            <ul class="viewer-cdx__list">${renderCdxObjectRows(runError, "No run signal reported.")}</ul>
          </section>
        ` : ""}
        ${objectEntries(artifacts).length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Artifacts</h2><span>${escapeHtml(objectEntries(artifacts).length)} paths</span></div>
            <ul class="viewer-cdx__list">${renderCdxArtifactRows(artifacts, "No artifact paths reported.")}</ul>
          </section>
        ` : ""}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Findings</h2><span>${escapeHtml(findings.length)} reported</span></div>
          <ul class="viewer-cdx__list">${findingRows || '<li class="viewer-cdx__empty">No structured findings reported.</li>'}</ul>
        </section>
      </div>
    `;
  }

  async function showCdxStatus(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      setDocument("CDX status", renderCdxStatus({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking CDX status...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-status", { signal: view.signal });
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
      setDocument("CDX status", renderCdxStatus({
        state: "unavailable",
        message: "CDX status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      setMeta("Restart the local viewer to enable CDX status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX status.");
    }
    const nextCdxSignature = runtimeStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestCdxStatusSignature && nextCdxSignature === latestCdxStatusSignature) {
      updateMainCdxBadge(data.payload);
      if (!options.silent) {
        setMeta(`Checked CDX status just now · no changes (${new Date().toLocaleTimeString()})`);
      }
      return;
    }
    latestCdxStatusSignature = nextCdxSignature;
    latestCdxStatusPayload = data.payload;
    updateMainCdxBadge(data.payload);
    setDocument("CDX status", renderCdxStatus(data.payload));
    setupCdxImportExportHandlers();
    setMeta(options.silent ? "CDX status refreshed." : "CDX status loaded.");
  }

  async function showCdxMissions(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      setDocument("CDX missions", renderCdxMissions({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Loading CDX missions...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-status", { signal: view.signal });
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
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX mission status.");
    }
    latestCdxMissionState.statusPayload = data.payload;
    const sessions = cdxSessions(data.payload?.status || {});
    if (!latestCdxMissionState.sessionId && sessions.length) {
      latestCdxMissionState.sessionId = cdxField(sessions[0], ["id", "name", "session_name", "value"], "");
    }
    updateMainCdxBadge(data.payload);
    setDocument("CDX missions", renderCdxMissions(data.payload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
    setMeta(options.silent ? "CDX missions refreshed." : "CDX missions loaded.");
  }

  async function previewCdxMission() {
    setMeta("Preparing CDX mission preview...");
    const response = await fetch("/api/cdx-mission-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedCdxMissionRequest())
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to preview CDX mission.");
    }
    latestCdxMissionState.planPayload = data.payload;
    latestCdxMissionState.runPayload = null;
    latestCdxMissionState.applyPayload = null;
    if (data.payload?.plan?.sessionId) {
      latestCdxMissionState.sessionId = data.payload.plan.sessionId;
    }
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload || data.payload?.status, data.payload, null, null));
    setMeta(data.payload?.state === "ok" ? "CDX mission preview ready." : (data.payload?.message || "CDX mission preview failed."));
  }

  async function launchCdxMissionInTerminal() {
    setMeta("Preparing CDX mission for a new terminal...");
    const response = await fetch("/api/cdx-mission-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedCdxMissionRequest())
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to prepare CDX mission.");
    }
    latestCdxMissionState.planPayload = data.payload;
    const plan = data.payload?.plan || null;
    if (data.payload?.state !== "ok" || !plan || !Array.isArray(plan.command) || !plan.command.length) {
      latestCdxMissionState.runPayload = null;
      latestCdxMissionState.applyPayload = null;
      setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, data.payload, null, null));
      setMeta(data.payload?.message || "CDX mission could not be prepared for a terminal.");
      return;
    }
    if (plan.sessionId) {
      latestCdxMissionState.sessionId = plan.sessionId;
    }
    // `cdx run` is a one-shot batch command: --json is mandatory and it only
    // prints its result once the run finishes, so a bare PTY launch shows a
    // black screen for the whole run. Keep the plan command intact (incl.
    // --json) but wrap it in a tiny shell that prints a notice first. `exec
    // "$@"` forwards the original argv verbatim, preserving the multi-line
    // prompt without any re-quoting.
    const noticeScript = 'printf "%s\\n\\n" "CDX mission running — one-shot batch run; the JSON result prints here once it completes (timeout-bounded)."; exec "$@"';
    const terminalCommand = ["/bin/sh", "-c", noticeScript, "cdx-mission", ...plan.command];
    const terminalId = await spawnWorkshopTerminal({
      command: terminalCommand,
      label: `cdx mission ${plan.missionId || latestCdxMissionState.missionId}`
    });
    const launched = Boolean(terminalId);
    latestCdxMissionState.runPayload = {
      state: launched ? "terminal" : "error",
      message: launched
        ? "Mission launched in a Workshop terminal. Track its result and run id from the Runs tab once it completes."
        : "Unable to start a Workshop terminal for this mission.",
      plan,
      run: null
    };
    latestCdxMissionState.applyPayload = null;
    if (isCdxMissionsOpen()) {
      setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, null));
    }
    setMeta(launched ? "CDX mission launched in a new terminal." : "CDX mission terminal launch failed.");
  }

  async function launchCdxMission() {
    if (latestCdxMissionState.runMode === "terminal") {
      return launchCdxMissionInTerminal();
    }
    setMeta("Launching CDX mission...");
    const request = selectedCdxMissionRequest();
    const plan = latestCdxMissionState.planPayload?.plan || null;
    const pendingPayload = {
      state: "running",
      message: "CDX mission is running. You can keep using the viewer; this panel will update when it completes.",
      plan,
      run: {
        runId: "pending",
        returnCode: "pending",
        pending: true,
        usage: { available: false, message: "Still running." },
        stdout: "",
        stderr: ""
      }
    };
    latestCdxMissionState.runPayload = pendingPayload;
    latestCdxMissionState.applyPayload = null;
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, pendingPayload, null));
    const response = await fetch("/api/cdx-mission-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to launch CDX mission.");
    }
    latestCdxMissionState.planPayload = { state: data.payload?.state === "ok" ? "ok" : data.payload?.state, message: data.payload?.message || "", plan: data.payload?.plan };
    latestCdxMissionState.runPayload = data.payload;
    latestCdxMissionState.applyPayload = null;
    if (isCdxMissionsOpen()) {
      setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, data.payload, null));
    }
    setMeta(data.payload?.state === "ok" ? "CDX mission launched." : (data.payload?.message || "CDX mission failed."));
  }

  async function applyCdxMissionPlan() {
    const actions = latestCdxMissionState.runPayload?.run?.parsed?.actions;
    if (!Array.isArray(actions) || !actions.length) {
      setMeta("No corpus actions to apply.");
      return;
    }
    setMeta("Applying allowed corpus actions...");
    const response = await fetch("/api/cdx-mission-apply-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to apply corpus plan.");
    }
    latestCdxMissionState.applyPayload = data.payload;
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, data.payload));
    setMeta(data.payload?.state === "ok" ? "Corpus actions applied." : (data.payload?.message || "Corpus apply failed."));
  }

  async function showCdxRuns(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      setDocument("CDX runs", renderCdxRuns({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking CDX runs...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-runs", { signal: view.signal });
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
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX runs.");
    }
    setDocument("CDX runs", renderCdxRuns(data.payload));
    setMeta(options.silent ? "CDX runs refreshed." : "CDX runs loaded.");
  }

  async function showCdxReport(runId, options = {}) {
    if (!runId) {
      return;
    }
    setMeta("Loading CDX report...");
    const view = options.view || beginView();
    let response;
    let data;
    try {
      response = await fetch(`/api/cdx-run-report?${new URLSearchParams({ runId }).toString()}`, { signal: view.signal });
      data = await response.json();
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
      throw new Error(data.error || "Unable to load CDX report.");
    }
    setDocument("CDX run report", renderCdxReport(data.payload));
    cdxCloseTarget = { type: "cdx-runs" };
    setMeta("CDX report loaded.");
  }

  async function openCdxArtifact(path) {
    if (!path) {
      return;
    }
    setMeta("Loading CDX log...");
    const response = await fetch("/api/file-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX artifact.");
    }
    const reportSnapshot = currentDocumentSnapshot("CDX run report");
    setDocument(data.payload?.name ? `CDX log · ${data.payload.name}` : "CDX log", renderCdxLogPreview(data.payload));
    cdxCloseTarget = { type: "cdx-report", title: reportSnapshot.title, html: reportSnapshot.html };
    setMeta(`Loaded ${data.payload?.path || path}.`);
  }

  async function createRequestFromCdxReport(runId) {
    if (!runId) {
      return;
    }
    setMeta("Creating Logics request from CDX report...");
    const response = await fetch("/api/cdx-report-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to create Logics request.");
    }
    postToApp(data.payload);
    setMeta(`Created ${data.created?.id || "Logics request"} from CDX report.`);
  }

  function renderCiBadge(value) {
    const tone = ciBadgeTone(value);
    return `<span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(ciBadgeLabel(value))}</span>`;
  }

  function formatCiDate(value) {
    const timestamp = Date.parse(String(value || ""));
    if (!Number.isFinite(timestamp)) {
      return "";
    }
    return new Date(timestamp).toLocaleString();
  }

  function renderCiModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes viewer-ci__modes" role="tablist" aria-label="Git and CI views">
        <button class="viewer-cdx__mode${active === "git" ? " is-active" : ""}" type="button" data-viewer-ci-mode="git" aria-selected="${active === "git" ? "true" : "false"}">Git</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-ci-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">CI</button>
        <button class="viewer-cdx__mode${active === "release" ? " is-active" : ""}" type="button" data-viewer-ci-mode="release" aria-selected="${active === "release" ? "true" : "false"}">Release</button>
      </div>
    `;
  }

  function renderCiStatus(payload) {
    if (!payload || !payload.visible) {
      return `
        <div class="viewer-ci">
          ${renderCiModeSwitcher("runs")}
          <div class="viewer-ci__state">${escapeHtml(payload?.message || "GitHub Actions CI is not configured for this repository.")}</div>
        </div>
      `;
    }
    const run = payload.run && typeof payload.run === "object" ? payload.run : null;
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    const state = payload.badgeState || run?.badgeState || payload.state || "unknown";
    const matchLabel = run?.matchSource === "head-active"
      ? "Current HEAD running"
      : run?.matchSource === "head-failing"
      ? "Current HEAD failing"
      : run?.matchSource === "head-cancelled"
      ? "Current HEAD cancelled"
      : run?.matchSource === "head-unknown"
      ? "Current HEAD unknown"
      : run?.matchSource === "head"
      ? "Current HEAD"
      : run?.matchSource === "branch-active"
      ? "Branch running"
      : run?.matchSource === "branch-failing"
      ? "Branch failing"
      : "Latest branch run";
    const cards = renderMetricCards([
      ["State", ciBadgeLabel(state)],
      ["Branch", run?.branch || payload.branch || "Unknown"],
      ["Commit", (run?.headSha || payload.headSha || "").slice(0, 7) || "Unknown"],
      ["Match", matchLabel]
    ]);
    const runUrl = run?.htmlUrl ? `<a class="viewer-ci__link" href="${escapeHtml(run.htmlUrl)}" target="_blank" rel="noreferrer">Open in GitHub</a>` : "";
    const runRows = run ? [
      ["Workflow", run.workflowName || run.name || "GitHub Actions"],
      ["Status", `${run.status || "unknown"}${run.conclusion ? ` / ${run.conclusion}` : ""}`],
      ["Event", run.event || "Unknown"],
      ["Commit", run.commitMessage || payload.subject || "Unknown"],
      ["Author", run.author || payload.author || "Unknown"],
      ["Started", formatCiDate(run.runStartedAt || run.createdAt) || "Unknown"],
      ["Updated", formatCiDate(run.updatedAt) || "Unknown"]
    ].map(([label, value]) => `
      <li class="viewer-ci__row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("") : `<li class="viewer-ci__empty">${escapeHtml(payload.message || "No GitHub Actions run found for this branch.")}</li>`;
    const jobRows = jobs.length ? jobs.map((job) => {
      const jobState = ciBadgeTone(job.conclusion || job.status);
      const content = `
        <span>${escapeHtml(job.name || "Job")}</span>
        <strong>${escapeHtml([job.status, job.conclusion].filter(Boolean).join(" / ") || "unknown")}</strong>
      `;
      return `<li class="viewer-ci__job viewer-ci__job--${escapeHtml(jobState)}">${job.htmlUrl ? `<a href="${escapeHtml(job.htmlUrl)}" target="_blank" rel="noreferrer">${content}</a>` : content}</li>`;
    }).join("") : `<li class="viewer-ci__empty">No job details reported.</li>`;
    return `
      <div class="viewer-ci">
        ${renderCiModeSwitcher("runs")}
        <div class="viewer-ci__summary">${cards}</div>
        <div class="viewer-ci__workspace">
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Latest run</h2>${renderCiBadge(state)}</div>
            <ul class="viewer-ci__list">${runRows}</ul>
            ${runUrl}
          </section>
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Jobs</h2><span>${escapeHtml(jobs.length)} reported</span></div>
            <ul class="viewer-ci__jobs">${jobRows}</ul>
          </section>
        </div>
      </div>
    `;
  }

  function releaseBadgeTone(value) {
    const state = String(value || "").toLowerCase();
    if (["ready", "passed"].includes(state)) {
      return "passing";
    }
    if (["blocked", "failed", "stale"].includes(state)) {
      return "failing";
    }
    if (["pending", "planning", "preparing", "local_validation", "commit_ready", "pushed", "ci_verification", "github_release", "external_publication"].includes(state)) {
      return "running";
    }
    return "unknown";
  }

  function releaseEvidenceRows(evidence) {
    if (!evidence || typeof evidence !== "object") {
      return '<li class="viewer-ci__empty">No evidence recorded.</li>';
    }
    const rows = [
      ["Kind", evidence.kind || "unknown"],
      ["Status", evidence.status || "unknown"],
      ["Observed", formatCiDate(evidence.observed_at) || evidence.observed_at || "unknown"],
      ["Version", evidence.target_version || "unknown"],
      ["Commit", evidence.commit ? String(evidence.commit).slice(0, 12) : ""],
      ["Tag", evidence.tag || ""],
      ["Summary", evidence.summary || ""],
    ].filter(([, value]) => String(value || "").trim());
    if (evidence.url) {
      rows.push(["Link", evidence.url]);
    }
    return rows.map(([label, value]) => {
      const renderedValue = label === "Link"
        ? `<a class="viewer-ci__link viewer-release__inline-link" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`
        : `<strong>${escapeHtml(value)}</strong>`;
      return `<li class="viewer-ci__row"><span>${escapeHtml(label)}</span>${renderedValue}</li>`;
    }).join("");
  }

  function renderReleaseGate(gate) {
    const status = String(gate?.status || "pending");
    const tone = releaseBadgeTone(status);
    const reason = gate?.blocking_reason ? `<div class="viewer-release__reason">${escapeHtml(gate.blocking_reason)}</div>` : "";
    return `
      <details class="viewer-release__gate">
        <summary>
          <span>
            <strong>${escapeHtml(gate?.id || "gate")}</strong>
            <em>${escapeHtml(gate?.state || "")}${gate?.required === false ? " · optional" : ""}</em>
          </span>
          <span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(status)}</span>
        </summary>
        ${reason}
        <ul class="viewer-ci__list">${releaseEvidenceRows(gate?.evidence)}</ul>
      </details>
    `;
  }

  function renderReleaseStatus(payload) {
    const state = payload?.state || "not_configured";
    const gates = Array.isArray(payload?.gates) ? payload.gates : [];
    const blockedGate = gates.find((gate) => gate && gate.required !== false && gate.blocking_reason);
    const cards = renderMetricCards([
      ["State", state],
      ["Version", payload?.target_version || "Unknown"],
      ["Blocked gate", blockedGate?.id || "None"],
      ["Evidence", `${gates.filter((gate) => gate?.evidence).length}/${gates.length}`],
    ]);
    const gateRows = gates.length ? gates.map(renderReleaseGate).join("") : `
      <div class="viewer-ci__empty">${escapeHtml(payload?.next_action || "Add logics/release/contract.json to configure release workflow state.")}</div>
    `;
    return `
      <div class="viewer-release">
        ${renderCiModeSwitcher("release")}
        <div class="viewer-ci__summary">${cards}</div>
        <div class="viewer-ci__workspace viewer-release__workspace">
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Release state</h2><span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(releaseBadgeTone(state))}">${escapeHtml(state)}</span></div>
            <ul class="viewer-ci__list">
              <li class="viewer-ci__row"><span>Contract</span><strong>${escapeHtml(payload?.configured ? payload.contract_path || "configured" : "not configured")}</strong></li>
              <li class="viewer-ci__row"><span>Commit</span><strong>${escapeHtml(payload?.commit ? String(payload.commit).slice(0, 12) : "unknown")}</strong></li>
              <li class="viewer-ci__row"><span>Next action</span><strong>${escapeHtml(payload?.next_action || "Inspect release workflow state.")}</strong></li>
            </ul>
          </section>
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Gates</h2><span>${escapeHtml(String(gates.length))} configured</span></div>
            <div class="viewer-release__gates">${gateRows}</div>
          </section>
        </div>
      </div>
    `;
  }

  async function showReleaseStatus(options = {}) {
    latestCiScreenMode = "release";
    if (!options.silent) {
      setMeta("Checking release workflow state...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/release-status", { signal: view.signal });
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
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load release workflow state.");
    }
    setDocument("Remote", renderReleaseStatus(data.payload));
    const state = data.payload?.state || "unknown";
    const button = ciButton();
    if (button instanceof HTMLElement) {
      button.title = data.payload?.next_action || "Show CI and release workflow state";
    }
    setMeta(options.silent ? "Release workflow refreshed." : `Release workflow state: ${state}.`);
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
          <div class="viewer-git__commit-main">
            <code>${escapeHtml(commit.hash || "")}</code>
            <strong>${escapeHtml(commit.subject || "Untitled commit")}</strong>
          </div>
          <div class="viewer-git__commit-meta">
            <span>${escapeHtml([commit.author, commit.date].filter(Boolean).join(" · ") || "Unknown")}</span>
            ${commit.refs ? `<span class="viewer-git__commit-refs">${escapeHtml(commit.refs)}</span>` : ""}
          </div>
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
            <div class="viewer-git__diff" data-viewer-git-diff>Select a changed file to preview its diff.</div>
          </section>
        </div>
      </div>
    `;
  }

  function formatGitHistoryCount(payload) {
    const count = Array.isArray(payload?.recentCommits) ? payload.recentCommits.length : (payload?.latestCommit ? 1 : 0);
    return `${count}${payload?.recentCommitsHasMore ? "+" : ""}`;
  }

  function setActiveGitFile(button) {
    document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
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
    return String(content)
      .split("\n")
      .map((line) => `<span class="viewer-git__diff-line viewer-git__diff-line--${gitDiffLineKind(line)}">${escapeHtml(line || " ")}</span>`)
      .join("");
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
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} · ${escapeHtml(payload.mode || "worktree")}${payload.truncated ? " · truncated" : ""}</div><pre><code>${renderGitDiffPreview(content)}</code></pre>`;
  }

  async function loadGitFilePreview(path, diffPanel, detailTitle = null) {
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "File preview";
    }
    diffPanel.textContent = "Loading file preview...";
    const response = await fetch(`/api/git-file-preview?${new URLSearchParams({ path }).toString()}`);
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
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} · file preview${payload.truncated ? " · truncated" : ""}</div><pre><code>${renderGitDiffPreview(content)}</code></pre>`;
  }

  function applyGitDomain(domain) {
    const selected = domain || "changes";
    const diffDomains = new Set(["changes", "staged", "worktree", "untracked"]);
    const showDiffDetail = diffDomains.has(selected);
    document.querySelectorAll(".viewer-git__domain[data-viewer-git-domain]").forEach((node) => {
      if (node instanceof HTMLElement) {
        const active = node.getAttribute("data-viewer-git-domain") === selected;
        node.classList.toggle("is-active", active);
        node.setAttribute("aria-pressed", active ? "true" : "false");
      }
    });
    document.querySelectorAll("[data-viewer-git-panel]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = node.getAttribute("data-viewer-git-panel") !== selected;
      }
    });
    document.querySelectorAll(".viewer-git__workspace").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("has-diff-detail", showDiffDetail);
      }
    });
    document.querySelectorAll("[data-viewer-git-detail]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.hidden = !showDiffDetail;
      }
    });
  }

  function currentGitViewState() {
    const activeDomain = document.querySelector(".viewer-git__domain.is-active[data-viewer-git-domain]");
    const activeFile = document.querySelector(".viewer-git__file.is-active[data-viewer-git-file]");
    return {
      domain: activeDomain instanceof HTMLElement ? activeDomain.getAttribute("data-viewer-git-domain") || "changes" : "changes",
      path: activeFile instanceof HTMLElement ? activeFile.getAttribute("data-viewer-git-file") || "" : "",
      cached: activeFile instanceof HTMLElement && activeFile.getAttribute("data-viewer-git-cached") === "1",
    };
  }

  function findGitFileButton(path, cached) {
    return Array.from(document.querySelectorAll("[data-viewer-git-file]")).find((node) => (
      node instanceof HTMLElement &&
      node.getAttribute("data-viewer-git-file") === path &&
      (node.getAttribute("data-viewer-git-cached") === "1") === Boolean(cached)
    )) || null;
  }

  // Entry point for the merged "Remote" button. Git is the first section, so
  // open it by default; fall back to CI runs when git isn't available.
  async function showGitCiScreen(options = {}) {
    if (isCapabilityAvailable("git")) {
      return showGitStatus(options);
    }
    return showCiStatus(options);
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
          loadItems().catch((error) => setMeta(error.message));
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
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    setControlValue("hide-complete", false, "change");
    setControlValue("hide-processed-requests", false, "change");
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
    document.addEventListener("click", (event) => {
      const target = event.target;
      const button = refreshMenuButton();
      const panel = refreshMenuPanel();
      try {
        if (target && (
          button?.contains(target) ||
          panel?.contains(target)
        )) {
          return;
        }
      } catch {
        // Ignore non-node event targets and close the menu below.
      }
      setRefreshMenuOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setRefreshMenuOpen(false);
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
    document.getElementById("viewer-workshop")?.addEventListener("click", () => {
      withPrimaryAction("workshop", "Opening Workshop", () => showWorkshop());
    });
    ciButton()?.addEventListener("click", () => {
      withPrimaryAction("git-ci", "Opening Remote", showGitCiScreen);
    });
    document.getElementById("viewer-cdx")?.addEventListener("click", () => {
      withPrimaryAction("cdx", "Checking CDX status", showCdxStatus);
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
    document.addEventListener("change", (event) => {
      const sessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session]") : null;
      const cdxInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-input]") : null;
      const cdxRunModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-mode]") : null;
      const cdxPromptTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-prompt]") : null;
      const cdxColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-column]") : null;
      const cdxProviderTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider]") : null;
      if (cdxPromptTarget instanceof HTMLTextAreaElement) {
        // Store the operator-edited prompt without resetting the plan so the
        // edit survives until the next Preview or Launch run.
        latestCdxMissionState.promptOverride = cdxPromptTarget.value || "";
        return;
      }
      if (cdxRunModeTarget instanceof HTMLSelectElement) {
        latestCdxMissionState.runMode = cdxRunModeTarget.value === "terminal" ? "terminal" : "background";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
        return;
      }
      if (sessionTarget instanceof HTMLSelectElement) {
        latestCdxMissionState.sessionId = sessionTarget.value || "";
        delete latestCdxMissionState.missionInputs.model;
        latestCdxMissionState.planPayload = null;
        latestCdxMissionState.runPayload = null;
        latestCdxMissionState.applyPayload = null;
        latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
      }
      if (cdxInputTarget instanceof HTMLInputElement || cdxInputTarget instanceof HTMLTextAreaElement || cdxInputTarget instanceof HTMLSelectElement) {
        const key = cdxInputTarget.getAttribute("data-viewer-cdx-input") || "";
        if (key) {
          latestCdxMissionState.missionInputs[key] = cdxInputTarget instanceof HTMLInputElement && cdxInputTarget.type === "checkbox" ? (cdxInputTarget.checked ? "true" : "false") : (cdxInputTarget.value || "");
          latestCdxMissionState.planPayload = null;
          latestCdxMissionState.runPayload = null;
          latestCdxMissionState.applyPayload = null;
          latestCdxMissionState.promptOverride = "";
        }
      }
      if (cdxColumnTarget instanceof HTMLInputElement) {
        persistCdxColumnVisibility(cdxColumnTarget.getAttribute("data-viewer-cdx-column") || "", cdxColumnTarget.checked);
        rerenderCdxStatusFromPreferences();
      }
      if (cdxProviderTarget instanceof HTMLInputElement) {
        const provider = cdxProviderTarget.getAttribute("data-viewer-cdx-provider") || "";
        const status = latestCdxStatusPayload?.status || {};
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
    document.addEventListener("click", (event) => {
      window.setTimeout(() => applyLocalViewerChrome(), 0);
      const activeCdxSessionMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__session-menu, .viewer-cdx__mission-config, .viewer-workshop__command-run-menu") : null;
      closeCdxSessionMenus(activeCdxSessionMenu);
      const target = event.target instanceof Element ? event.target.closest("[data-viewer-doc-path]") : null;
      const healthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-open-health]") : null;
      const filterTarget = event.target instanceof Element ? event.target.closest("[data-viewer-filter-group][data-viewer-filter-value]") : null;
      const revealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-reveal]") : null;
      const gitHistoryRevealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-history-reveal]") : null;
      const gitDomainTarget = event.target instanceof Element ? event.target.closest(".viewer-git__domain[data-viewer-git-domain]") : null;
      const gitFileTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-file]") : null;
      const workspaceTreeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-tree]") : null;
      const workspacePreviewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview]") : null;
      const workshopTabTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-tab]") : null;
      const workshopRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run]") : null;
      const workshopRunTerminalTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run-terminal]") : null;
      const workshopStopTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-stop]") : null;
      const workshopTerminalNewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-new]") : null;
      const workshopTerminalCustomTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-custom]") : null;
      const workshopTerminalSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-select]") : null;
      const workshopTerminalCloseTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-close]") : null;
      const workshopTerminalClearTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-clear]") : null;
      const workshopCdxUsageTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-usage-refresh]") : null;
      const projectSwitcherTarget = event.target instanceof Element ? event.target.closest("#viewer-repo-pill") : null;
      const projectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-id]") : null;
      const ciModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-ci-mode]") : null;
      const cdxModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mode]") : null;
      const cdxBackRunsTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-back-runs]") : null;
      const cdxReportTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-report]") : null;
      const cdxArtifactTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-artifact-path]") : null;
      const cdxProviderAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider-all]") : null;
      const cdxCreateRequestTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-create-request]") : null;
      const cdxMissionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission]") : null;
      const cdxStrengthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-strength]") : null;
      const cdxPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-plan]") : null;
      const cdxRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run]") : null;
      const cdxApplyPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-apply-plan]") : null;
      const cdxToggleTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-toggle]") : null;
      const cdxSessionActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-action]") : null;
      const cdxLoginTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-login]") : null;
      if (cdxToggleTarget instanceof HTMLButtonElement) {
        event.preventDefault();
        const sessionName = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle") || "";
        const currentState = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle-state") || "on";
        const enable = currentState === "off";
        if (!sessionName) return;
        cdxToggleTarget.disabled = true;
        fetch("/api/cdx-toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: sessionName, enable }),
        }).then((r) => r.json()).then((data) => {
          if (data.ok) {
            cdxToggleTarget.setAttribute("data-viewer-cdx-toggle-state", enable ? "on" : "off");
            cdxToggleTarget.classList.toggle("is-on", enable);
            cdxToggleTarget.classList.toggle("is-off", !enable);
            cdxToggleTarget.title = `${enable ? "Disable" : "Enable"} ${sessionName}`;
            showCdxStatus({ silent: true, force: true }).catch(() => {});
          }
        }).catch(() => {}).finally(() => { cdxToggleTarget.disabled = false; });
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
        const handoffSource = cdxSessionActionTarget.getAttribute("data-viewer-cdx-handoff-source") || "";
        cdxSessionActionTarget.closest("details")?.removeAttribute("open");
        if (!sessionName) {
          return;
        }
        if (action === "resume") {
          spawnWorkshopTerminal({ command: ["cdx", "resume", sessionName], label: `cdx resume ${sessionName}` });
        } else if (action === "handoff" && handoffSource) {
          spawnWorkshopTerminal({ command: ["cdx", "handoff", handoffSource, sessionName], label: `cdx handoff ${handoffSource} ${sessionName}` });
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
      if (cdxMissionTarget instanceof HTMLElement) {
        latestCdxMissionState.missionId = cdxMissionTarget.getAttribute("data-viewer-cdx-mission") || "full-audit";
        latestCdxMissionState.planPayload = null;
        latestCdxMissionState.runPayload = null;
        latestCdxMissionState.applyPayload = null;
        latestCdxMissionState.missionInputs = {};
        latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
        return;
      }
      if (cdxStrengthTarget instanceof HTMLElement) {
        latestCdxMissionState.strengthId = cdxStrengthTarget.getAttribute("data-viewer-cdx-strength") || "standard";
        latestCdxMissionState.planPayload = null;
        latestCdxMissionState.runPayload = null;
        latestCdxMissionState.applyPayload = null;
        latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
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
      if (cdxBackRunsTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-runs", "Loading CDX runs", showCdxRuns);
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
      if (cdxCreateRequestTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-create-request", "Creating Logics request", () => createRequestFromCdxReport(cdxCreateRequestTarget.getAttribute("data-viewer-cdx-create-request") || ""));
        return;
      }
      if (cdxModeTarget instanceof HTMLElement) {
        const mode = cdxModeTarget.getAttribute("data-viewer-cdx-mode") || "status";
        if (mode === "runs") {
          withPrimaryAction("cdx-runs", "Loading CDX runs", showCdxRuns);
        } else if (mode === "missions") {
          withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
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
      if (workshopTerminalClearTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalClearTarget.getAttribute("data-viewer-workshop-terminal-clear") || "";
        if (id) clearWorkshopTerminal(id);
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
        spawnCustomWorkshopTerminal();
        return;
      }
      if (workshopTerminalSelectTarget instanceof HTMLElement) {
        event.preventDefault();
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
        applyGitDomain(gitDomainTarget.getAttribute("data-viewer-git-domain") || "changes");
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
      const activeCdxSessionMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__session-menu, .viewer-cdx__mission-config, .viewer-workshop__command-run-menu") : null;
      closeCdxSessionMenus(activeCdxSessionMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCdxSessionMenus();
      }
    });
    document.getElementById("viewer-document-close")?.addEventListener("click", () => {
      withPrimaryAction("close-document", "Closing preview", closeDocumentPanel);
    });
    document.getElementById("viewer-document-refresh")?.addEventListener("click", () => {
      withPrimaryAction("refresh-document", "Refreshing", refreshCurrentScreen);
    });
    documentStatusButton()?.addEventListener("click", () => {
      withPrimaryAction("change-document-status", "Updating status", changeCurrentDocumentStatus);
    });
    document.getElementById("viewer-git-pull")?.addEventListener("click", () => {
      spawnWorkshopTerminal({ command: ["git", "pull"], label: "git pull" });
    });
    document.getElementById("viewer-git-push")?.addEventListener("click", () => {
      spawnWorkshopTerminal({ command: ["git", "push"], label: "git push" });
    });
    startAutoRefresh();
  });
})();
