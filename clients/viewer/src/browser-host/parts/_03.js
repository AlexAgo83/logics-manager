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
      "[data-viewer-cdx-mission-select]"
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

  function activityRootKey(root = latestRepoRoot) {
    return String(root || "default").trim() || "default";
  }

  function activityStateForRoot(state = readStoredState(), root = latestRepoRoot) {
    const baseState = state && typeof state === "object" ? state : {};
    const byRoot = baseState.activityByRoot && typeof baseState.activityByRoot === "object" ? baseState.activityByRoot : {};
    const scoped = byRoot[activityRootKey(root)];
    if (scoped && typeof scoped === "object") {
      return {
        activitySnapshot: scoped.activitySnapshot && typeof scoped.activitySnapshot === "object" ? scoped.activitySnapshot : {},
        activityHistory: Array.isArray(scoped.activityHistory) ? scoped.activityHistory : []
      };
    }
    return {
      activitySnapshot: baseState.activitySnapshot && typeof baseState.activitySnapshot === "object" ? baseState.activitySnapshot : {},
      activityHistory: Array.isArray(baseState.activityHistory) ? baseState.activityHistory : []
    };
  }

  function writeActivityStateForRoot(baseState, root, activityState) {
    const key = activityRootKey(root);
    const previousByRoot = baseState.activityByRoot && typeof baseState.activityByRoot === "object" ? baseState.activityByRoot : {};
    return {
      ...baseState,
      activityByRoot: {
        ...previousByRoot,
        [key]: {
          activitySnapshot: activityState.activitySnapshot && typeof activityState.activitySnapshot === "object" ? activityState.activitySnapshot : {},
          activityHistory: Array.isArray(activityState.activityHistory) ? activityState.activityHistory.slice(0, activityStorageLimit) : []
        }
      }
    };
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
        at: entry.at || entry.updatedAt || "",
        updatedAt: entry.updatedAt || entry.at || ""
      }));
  }

  function dispatchViewerActivityUpdate() {
    const storedState = readStoredState();
    const payload = {
      root: latestRepoRoot,
      items: latestItems,
      selectedId: storedState?.selectedId || "",
      activityEvents: activityEventsFromStoredState(storedState, latestRepoRoot)
    };
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload } }));
    applyLocalViewerChrome();
  }

  function activityPanelIsOpen() {
    const panel = document.getElementById("activity-panel");
    return panel instanceof HTMLElement && !panel.hidden;
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
        history.unshift({ path: relPath, at: now, status, previousStatus, type: statusChanged ? "status-change" : "updated" });
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
