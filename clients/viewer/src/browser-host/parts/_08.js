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
    renderUpdateNotice(payload.updateInfo);
    renderEnvironmentWarning(payload.bootstrapWarning || payload.environmentWarning);
    refreshBadgeCounters();
    maybePromptBootstrapLogics();
    updateFilterSummary();
    applyLocalViewerChrome();
    bindRefreshMenuControls();
    if (activityPanelIsOpen()) {
      dispatchViewerActivityUpdate();
    }
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
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX reports");
  }

  function isCdxHistoryOpen() {
    const panel = documentPanel();
    const title = documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX history");
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

  async function refreshCurrentScreen() {
    const panel = documentPanel();
    const title = documentTitle();
    if (!panel || panel.hidden || !title) return;
    const screen = title.textContent || "";
    const opts = { force: true };
    if (screen === "CDX status") return showCdxStatus(opts);
    if (screen === "CDX missions") return showCdxMissions(opts);
    if (screen === "CDX reports") return showCdxRuns(opts);
    if (screen === "CDX history") return showCdxHistory(opts);
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

  // Open/close a topbar sub-section menu. Opening one closes the others so at
  // most one nav menu is visible at a time.
  function setNavMenuOpen(wrapper, open) {
    document.querySelectorAll(".viewer-nav-menu.is-open").forEach((el) => {
      if (el === wrapper && open) return;
      el.classList.remove("is-open");
      el.querySelector(".btn")?.setAttribute("aria-expanded", "false");
    });
    if (!(wrapper instanceof HTMLElement) || !open) {
      return;
    }
    wrapper.classList.add("is-open");
    wrapper.querySelector(".btn")?.setAttribute("aria-expanded", "true");
  }

  function closeNavMenus() {
    setNavMenuOpen(null, false);
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
