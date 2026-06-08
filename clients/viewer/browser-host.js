(() => {
  const stateKey = "logics.localViewer.state";
  const meta = () => document.getElementById("viewer-meta");
  const documentPanel = () => document.getElementById("viewer-document");
  const documentTitle = () => document.getElementById("viewer-document-title");
  const documentContent = () => document.getElementById("viewer-document-content");
  const editDocumentButton = () => document.querySelector('[data-viewer-action="edit-document"]');
  const updateBanner = () => document.getElementById("viewer-update");
  const updateCopy = () => document.getElementById("viewer-update-copy");
  const updateCommand = () => document.getElementById("viewer-update-command");
  const filterCount = () => document.getElementById("viewer-filter-count");
  const repoPill = () => document.getElementById("viewer-repo-pill");
  const autoRefreshControl = () => document.getElementById("viewer-auto-refresh");
  const defaultAutoRefreshIntervalMs = 60 * 1000;
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
  let latestMetaText = "Read-only local viewer";
  let autoRefreshIntervalMs = defaultAutoRefreshIntervalMs;
  let nextAutoRefreshAt = 0;
  let autoRefreshEnabled = true;
  let autoRefreshTimeoutId = 0;
  let applyingLocalChrome = false;
  let autoRefreshStarted = false;
  let itemsLoadInFlight = false;
  let refreshAfterVisible = false;
  let mermaidInitialized = false;
  let focusApplied = false;

  function readStoredState() {
    try {
      return JSON.parse(window.localStorage.getItem(stateKey) || "null");
    } catch {
      return null;
    }
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

  function setMeta(text) {
    latestMetaText = text;
    renderMeta();
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
    const pill = repoPill();
    if (!pill) {
      return;
    }
    const repoName = String(payload.repoName || latestRepoRoot.split(/[\\/]/).filter(Boolean).pop() || "repository");
    pill.textContent = repoName;
    pill.title = latestRepoRoot || repoName;
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

  function applyFocusRequest(payload) {
    if (focusApplied) {
      return payload;
    }
    const request = focusRequest();
    if (!request.focus) {
      if (window.location.search.includes("focus=")) {
        window.setTimeout(() => setMeta("Invalid focus target. Loaded corpus without changing selection."), 0);
      }
      focusApplied = true;
      return payload;
    }
    const item = findFocusItem(request.focus);
    if (!item) {
      window.setTimeout(() => setMeta(`Focus target not found: ${request.focus}`), 0);
      focusApplied = true;
      return payload;
    }
    viewerFilterState = { ...viewerFilterState, focus: "all", type: "all", status: "any", relation: "any", activity: "any" };
    persistSelectedItem(item.id);
    focusApplied = true;
    const nextPayload = { ...payload, selectedId: item.id };
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

  function setDocument(titleText, html) {
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    if (title) {
      title.textContent = titleText || "Document";
    }
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
    latestItems = Array.isArray(payload.items) ? payload.items : [];
    const intervalSeconds = Number(payload.autoRefreshIntervalSeconds);
    autoRefreshIntervalMs = Number.isFinite(intervalSeconds) && intervalSeconds > 0
      ? intervalSeconds * 1000
      : defaultAutoRefreshIntervalMs;
    updateRepositoryIdentity(payload);
    const nextPayload = options.silent ? payload : applyFocusRequest(payload);
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload: nextPayload } }));
    const rootName = payload.root ? payload.root.split(/[\\/]/).filter(Boolean).pop() : "repository";
    if (!options.silent) {
      setMeta(`${rootName} · ${payload.items.length} docs · refreshed ${new Date().toLocaleTimeString()}`);
    }
    scheduleNextAutoRefresh();
    renderUpdateNotice(payload.updateInfo);
    updateFilterSummary();
    applyLocalViewerChrome();
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
      postToApp(data.payload, { silent: Boolean(options.silent) });
      return true;
    } finally {
      itemsLoadInFlight = false;
    }
  }

  function autoRefreshItems() {
    if (!autoRefreshEnabled) {
      return;
    }
    if (document.hidden) {
      refreshAfterVisible = true;
      return;
    }
    loadItems("POST", { silent: true }).catch((error) => setMeta(error.message));
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

  function statusValue(item) {
    return String(item?.indicators?.Status || "").toLowerCase();
  }

  function isClosed(item) {
    const status = statusValue(item);
    return status.includes("done") || status.includes("archived") || status.includes("obsolete");
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
    return !["draft", "ready", "in progress", "blocked", "done", "archived", "obsolete"].includes(normalized);
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
    return entries.map(([label, value]) => `
      <div class="viewer-insights__card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
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
      actions.push([`Review blocked workflow docs`, blocked.length]);
    }
    if (incompleteChains.length) {
      actions.push([`Promote or close incomplete workflow chains`, incompleteChains.length]);
    }
    if (brokenRefs.length) {
      actions.push([`Repair broken references`, brokenRefs.length]);
    }
    if (qualityFindings.length) {
      actions.push([`Run lint/audit and fix concentrated issues`, qualityFindings.length]);
    }
    if (missingStatus.length) {
      actions.push([`Normalize missing or ambiguous statuses`, missingStatus.length]);
    }
    if (!actions.length) {
      actions.push(["No immediate operator action detected", "OK"]);
    }

    const stageRows = Object.entries(countsByStage)
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
      .map(([stage, count]) => [stage, count]);
    return `
      <div class="viewer-insights">
        <div class="viewer-insights__summary">${renderMetricCards([
          ["Docs", docs.length],
          ["Open", open.length],
          ["Closed", closed.length],
          ["Blocked", blocked.length],
          ["Missing status", missingStatus.length],
          ["Modified 7d", recentlyModified.length]
        ])}</div>
        <section class="viewer-insights__section">
          <h2>Overview</h2>
          <ul class="viewer-insights__list">${renderInsightRows(stageRows, "No docs loaded")}</ul>
        </section>
        <section class="viewer-insights__section">
          <h2>Flow health</h2>
          <ul class="viewer-insights__list">${renderInsightRows([
            ["Incomplete workflow chains", incompleteChains.length],
            ["Promotion gaps", incompleteChains.filter((item) => item.stage === "request" || item.stage === "backlog").length],
            ["Orphan or unlinked docs", unlinked.length],
            ["Broken reference risks", brokenRefs.length]
          ])}</ul>
        </section>
        <section class="viewer-insights__section">
          <h2>Activity</h2>
          <ul class="viewer-insights__list">${renderInsightRows([
            ["Latest changes", recentRows.map(itemLabel).join(", ") || "None"],
            ["Stale active docs", staleActive.map(itemLabel).join(", ") || "None"],
            ["Recently active docs", recentlyModified.slice(0, 8).map(itemLabel).join(", ") || "None"],
            ["Activity classification", `recent ${recentlyModified.length}, stale ${open.filter(isStale).length}, quiet ${Math.max(0, open.length - recentlyModified.length)}`]
          ])}</ul>
        </section>
        <section class="viewer-insights__section">
          <h2>Traceability</h2>
          <ul class="viewer-insights__list">${renderInsightRows([
            ["Most referenced docs", mostReferenced.map((item) => `${item.id} (${(item.usedBy || []).length})`).join(", ") || "None"],
            ["Unlinked docs", unlinked.slice(0, 8).map((item) => item.id).join(", ") || "None"],
            ["Broken references", brokenRefs.slice(0, 8).join(", ") || "None"],
            ["Relationships by type", Object.entries(relationshipCounts).map(([stage, count]) => `${stage} ${count}`).join(", ") || "None"]
          ])}</ul>
        </section>
        <section class="viewer-insights__section">
          <h2>Quality signals</h2>
          <ul class="viewer-insights__list">${renderInsightRows([
            ["Lint/audit categories", Object.entries(qualityBySource).map(([key, count]) => `${key} ${count}`).join(", ") || "No findings loaded"],
            ["Findings by document type", Object.entries(qualityByDocType).map(([key, count]) => `${key} ${count}`).join(", ") || "No findings loaded"],
            ["Concentrated issues", concentratedIssues.map(([key, count]) => `${key} ${count}`).join(", ") || "None"]
          ])}</ul>
        </section>
        <section class="viewer-insights__section">
          <h2>Operator actions</h2>
          <ul class="viewer-insights__list">${renderInsightRows(actions)}</ul>
        </section>
      </div>
    `;
  }

  async function showCorpusInsights() {
    const [lintResponse, auditResponse] = await Promise.all([fetch("/api/lint"), fetch("/api/audit")]);
    const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
    setDocument("Corpus insights", buildCorpusInsights(lintData, auditData));
    setMeta("Corpus insights loaded.");
  }

  async function showDocument(item) {
    if (!item || !item.relPath) {
      return;
    }
    const response = await fetch(`/api/doc?path=${encodeURIComponent(item.relPath)}`);
    const data = await response.json();
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
    setDocument(data.document.path, html);
  }

  async function showDocumentByPath(relPath) {
    const item = findItemByPath(relPath) || { relPath, title: relPath, id: relPath };
    await showDocument(item);
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

  async function showHealth() {
    setMeta("Checking health...");
    const [lintResponse, auditResponse] = await Promise.all([fetch("/api/lint"), fetch("/api/audit")]);
    const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
    setDocument("Validation health", renderHealthSummary(lintData, auditData));
    setMeta("Health loaded.");
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
          loadItems("POST").catch((error) => setMeta(error.message));
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
        showCorpusInsights().catch((error) => setMeta(error.message));
      });
    });
    const autoControl = autoRefreshControl();
    if (autoControl instanceof HTMLInputElement) {
      autoControl.addEventListener("change", () => {
        setAutoRefreshEnabled(autoControl.checked);
      });
      setAutoRefreshEnabled(autoControl.checked);
    }
    document.querySelectorAll('[data-action="refresh"]').forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      element.addEventListener("click", () => {
        loadItems("POST").catch((error) => setMeta(error.message));
      });
    });
    document.getElementById("viewer-health")?.addEventListener("click", () => {
      showHealth().catch((error) => setMeta(error.message));
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
        editDocument(selectedItem()).catch((error) => setMeta(error.message));
      });
    }
    document.addEventListener("click", (event) => {
      window.setTimeout(() => applyLocalViewerChrome(), 0);
      const target = event.target instanceof Element ? event.target.closest("[data-viewer-doc-path]") : null;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const path = target.getAttribute("data-viewer-doc-path");
      if (path) {
        showDocumentByPath(path).catch((error) => setMeta(error.message));
      }
    });
    document.getElementById("viewer-document-close")?.addEventListener("click", () => {
      const panel = documentPanel();
      if (panel) {
        panel.hidden = true;
      }
    });
    startAutoRefresh();
  });
})();
