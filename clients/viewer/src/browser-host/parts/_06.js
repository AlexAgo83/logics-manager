  function cdxRunsList(payload) {
    return payload && payload.state === "ok" && Array.isArray(payload.runs) ? payload.runs : [];
  }

  function cdxHistoryList(payload) {
    return payload && payload.state === "ok" && Array.isArray(payload.history) ? payload.history : [];
  }

  // Apply a badge without repainting when the value is unchanged (honours "si
  // pas de changement de valeur, pas la peine de le ré-afficher"). Reading the
  // current DOM also makes us resilient to other code that wipes the nav badges:
  // when the element is gone we always re-add it.
  function applyCdxBadge(host, selector, desiredLabel, makeHtml) {
    if (!(host instanceof HTMLElement)) return;
    const existing = host.querySelector(selector);
    const currentLabel = existing ? (existing.textContent || "").trim() : null;
    if (desiredLabel === null) {
      existing?.remove();
      return;
    }
    if (currentLabel === desiredLabel) return;
    existing?.remove();
    host.insertAdjacentHTML("beforeend", makeHtml(desiredLabel));
  }

  function updateCdxUnreadBadges() {
    const counts = {
      missions: Math.max(0, cdxUnreadState.missions?.count || 0),
      runs: Math.max(0, cdxUnreadState.runs?.count || 0),
      history: Math.max(0, cdxUnreadState.history?.count || 0)
    };
    const total = counts.missions + counts.runs + counts.history;
    const aggregateLabel = cdxBadgeLabel(total);

    const button = document.getElementById("viewer-cdx");
    if (button instanceof HTMLElement) {
      const parts = [];
      if (counts.missions) parts.push(cdxSectionBadgeTitle("missions", counts.missions));
      if (counts.runs) parts.push(cdxSectionBadgeTitle("runs", counts.runs));
      if (counts.history) parts.push(cdxSectionBadgeTitle("history", counts.history));
      const summary = parts.join(", ");
      button.title = (button.title || "Show CDX status").replace(/\s·\sCDX activity:.*$/, "");
      if (aggregateLabel) {
        button.title = `${button.title || "Show CDX status"} · CDX activity: ${summary}`;
      }
      applyCdxBadge(button, "[data-viewer-cdx-unread-badge]", aggregateLabel, (label) =>
        `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" data-viewer-cdx-unread-badge title="${escapeHtml(`CDX activity: ${summary}`)}" aria-label="${escapeHtml(`CDX activity: ${summary}`)}">${escapeHtml(label)}</span>`);
    }

    ["missions", "runs", "history"].forEach((section) => {
      const item = navMenuItem(`cdx:${section}`);
      if (!(item instanceof HTMLElement)) return;
      const label = cdxBadgeLabel(counts[section]);
      const existing = item.querySelector("[data-viewer-cdx-unread-menu-badge]");
      const currentLabel = existing ? (existing.textContent || "").trim() : null;
      if (label === null) {
        existing?.remove();
        return;
      }
      if (currentLabel === label) return;
      existing?.remove();
      const badge = renderCdxUnreadBadge(section, label, counts[section]);
      const container = item.querySelector("[data-viewer-menu-badges]");
      if (container) {
        container.insertAdjacentHTML("beforeend", `<span data-viewer-cdx-unread-menu-badge>${badge}</span>`);
      } else {
        item.insertAdjacentHTML("beforeend", `<span class="viewer-nav-menu__badges" data-viewer-menu-badges><span data-viewer-cdx-unread-menu-badge>${badge}</span></span>`);
      }
    });
  }

  // Missions badge is a live gauge: how many mission runs are running right now.
  // It does not reset when the user looks — it follows the runs payload.
  function updateCdxMissionsCount(runsPayload) {
    const payload = (runsPayload && runsPayload.state === "ok") ? runsPayload : latestCdxRunsPayload;
    cdxUnreadState.missions.count = activeCdxRunCountFromPayload(payload);
    updateCdxUnreadBadges();
  }

  // Runs/History badges are "new since the user last looked" deltas. When the
  // section is open (or seen for the first time) we adopt the current set as the
  // baseline; otherwise we count how many current ids are not in that baseline.
  function recordCdxDelta(section, ids, { isOpen, markSeen } = {}) {
    const state = cdxUnreadState[section];
    if (!state) return;
    const current = new Set(ids.filter(Boolean));
    if (state.seen === null || isOpen || markSeen) {
      state.seen = current;
      state.count = 0;
    } else {
      let count = 0;
      current.forEach((id) => {
        if (!state.seen.has(id)) count += 1;
      });
      state.count = count;
    }
    updateCdxUnreadBadges();
  }

  function recordCdxUnreadSnapshot(section, payload, options = {}) {
    if (section === "missions") {
      // Missions tracks running runs; the status payload it is sometimes called
      // with has no runs array, so always source the count from the runs payload.
      updateCdxMissionsCount();
      return;
    }
    if (section === "runs") {
      recordCdxDelta("runs", cdxRunsList(payload).map(cdxRunIdentity), {
        isOpen: isCdxRunsOpen(),
        markSeen: options.markSeen
      });
      return;
    }
    recordCdxDelta("history", cdxHistoryList(payload).map(cdxHistoryIdentity), {
      isOpen: isCdxHistoryOpen(),
      markSeen: options.markSeen
    });
  }

  function markCdxSectionSeen(section, payload = null) {
    if (section === "missions") {
      // Live gauge — opening the panel doesn't clear it; just keep it fresh
      // from the latest runs payload (the status payload has no runs array).
      updateCdxMissionsCount();
      return;
    }
    if (section === "runs") {
      recordCdxDelta("runs", cdxRunsList(payload || latestCdxRunsPayload).map(cdxRunIdentity), { markSeen: true });
      return;
    }
    recordCdxDelta("history", cdxHistoryList(payload || latestCdxHistoryPayload).map(cdxHistoryIdentity), { markSeen: true });
  }

  // The runsPayload argument is kept for call-site compatibility but is no longer
  // used here: running runs are surfaced by the Missions badge
  // (updateCdxMissionsCount), so this badge counts active assistant sessions only
  // and no longer double-counts runs.
  function updateMainCdxBadge(payload) {
    const button = document.getElementById("viewer-cdx");
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.querySelector("[data-viewer-cdx-badge]")?.remove();
    clearNavMenuBadges(["cdx:status"]);
    const activeSessions = activeCdxAssistantCountFromPayload(payload);
    if (activeSessions <= 0) {
      button.title = isCapabilityAvailable("cdx")
        ? "Show CDX status"
        : capabilityMessage("cdx", "CDX is not available for this project.");
      updateCdxUnreadBadges();
      return;
    }
    const label = activeSessions > 9 ? "9+" : String(activeSessions);
    const title = activeSessions === 1 ? "1 active session" : `${activeSessions} active sessions`;
    button.title = `Show CDX status · ${title}`;
    const badge = `<span class="viewer-cdx-button-badge" data-viewer-cdx-badge title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
    button.insertAdjacentHTML("beforeend", badge);
    setNavMenuBadges("cdx:status", `<span class="viewer-cdx-button-badge" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`);
    updateCdxUnreadBadges();
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
        latestGitStatusPayload = data.payload;
        latestGitStatusSignature = gitStatusSignature(data.payload);
        syncGitCommitActivity(data.payload);
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
        latestCdxStatusPayload = payload.cdx;
        latestCdxStatusSignature = runtimeStatusSignature({ status: payload.cdx, runs: runsPayload });
        if (runsPayload) {
          latestCdxRunsPayload = runsPayload;
          // Missions = running runs (live gauge); Reports = new runs since seen.
          updateCdxMissionsCount(runsPayload);
          recordCdxUnreadSnapshot("runs", runsPayload);
        }
        if (historyPayload) {
          latestCdxHistoryPayload = historyPayload;
          recordCdxUnreadSnapshot("history", historyPayload);
        }
        updateMainCdxBadge(payload.cdx, runsPayload);
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
      latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
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
