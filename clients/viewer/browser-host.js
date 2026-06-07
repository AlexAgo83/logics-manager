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
  const defaultFilterState = {
    focus: "active",
    type: "all",
    status: "any",
    relation: "any",
    activity: "any"
  };
  let viewerFilterState = { ...defaultFilterState };
  let latestItems = [];
  let applyingLocalChrome = false;
  let mermaidInitialized = false;

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

  function setMeta(text) {
    const node = meta();
    if (node) {
      node.textContent = text;
    }
  }

  function findItemByPath(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\//, "");
    return latestItems.find((entry) => entry.relPath === normalized || entry.path === normalized) || null;
  }

  function selectedItem() {
    const selectedCard = document.querySelector(".card--selected[data-id]");
    const selectedCardId = selectedCard instanceof HTMLElement ? selectedCard.dataset.id : "";
    if (selectedCardId) {
      return latestItems.find((entry) => entry.id === selectedCardId) || null;
    }
    try {
      const state = JSON.parse(window.localStorage.getItem(stateKey) || "null");
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

  function postToApp(payload) {
    latestItems = Array.isArray(payload.items) ? payload.items : [];
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload } }));
    const rootName = payload.root ? payload.root.split(/[\\/]/).filter(Boolean).pop() : "repository";
    setMeta(`${rootName} · ${payload.items.length} docs · refreshed ${new Date().toLocaleTimeString()}`);
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

  async function loadItems(method = "GET") {
    setMeta("Refreshing...");
    const response = await fetch(method === "POST" ? "/api/refresh" : "/api/items", { method });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load viewer data.");
    }
    postToApp(data.payload);
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

  function buildCorpusInsights() {
    const countsByStage = latestItems.reduce((acc, item) => {
      acc[item.stage] = (acc[item.stage] || 0) + 1;
      return acc;
    }, {});
    const active = latestItems.filter((item) => !isClosed(item)).length;
    const blocked = latestItems.filter((item) => statusValue(item).includes("blocked")).length;
    const unlinked = latestItems.filter((item) => (item.references || []).length === 0 && (item.usedBy || []).length === 0).length;
    const incompleteChains = latestItems.filter((item) => ["request", "backlog"].includes(item.stage) && !item.isPromoted && !isClosed(item)).length;
    const cards = [
      ["Docs", latestItems.length],
      ["Active", active],
      ["Blocked", blocked],
      ["Unlinked", unlinked]
    ].map(([label, value]) => `
      <div class="viewer-insights__card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
    const stageRows = Object.entries(countsByStage)
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
      .map(([stage, count]) => `<li class="viewer-insights__item"><span>${escapeHtml(stage)}</span><strong>${escapeHtml(count)}</strong></li>`)
      .join("");
    const recentRows = [...latestItems]
      .sort((left, right) => (Date.parse(right.updatedAt || "") || 0) - (Date.parse(left.updatedAt || "") || 0))
      .slice(0, 8)
      .map((item) => `<li class="viewer-insights__item"><span>${escapeHtml(item.id)}</span><strong>${escapeHtml(item.indicators?.Status || "No status")}</strong></li>`)
      .join("");
    return `
      <div class="viewer-insights">
        <div class="viewer-insights__summary">${cards}</div>
        <div class="viewer-insights__grid">
          <div class="viewer-insights__card">
            <div class="viewer-insights__label">Incomplete chains</div>
            <div class="viewer-insights__value">${escapeHtml(incompleteChains)}</div>
          </div>
        </div>
        <section class="viewer-insights__section">
          <h2>Corpus families</h2>
          <ul class="viewer-insights__list">${stageRows || '<li class="viewer-insights__item">No docs loaded</li>'}</ul>
        </section>
        <section class="viewer-insights__section">
          <h2>Recent activity</h2>
          <ul class="viewer-insights__list">${recentRows || '<li class="viewer-insights__item">No recent docs</li>'}</ul>
        </section>
      </div>
    `;
  }

  function showCorpusInsights() {
    setDocument("Corpus insights", buildCorpusInsights());
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
          const pathControl = path
            ? `<button class="viewer-health__path" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>`
            : '<span class="viewer-health__meta">Repository-level finding</span>';
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
        try {
          return JSON.parse(window.localStorage.getItem(stateKey) || "null");
        } catch {
          return null;
        }
      },
      setState(value) {
        window.localStorage.setItem(stateKey, JSON.stringify(value || null));
      }
    };
  };
  window.addEventListener("load", () => {
    window.__CDX_LOGICS_VIEWER_FILTER__ = matchesViewerFilter;
    setControlValue("hide-complete", false, "change");
    setControlValue("hide-processed-requests", false, "change");
    setControlValue("hide-spec", false, "change");
    setControlValue("show-companion-docs", true, "change");
    setControlValue("hide-empty-columns", true, "change");
    applyLocalViewerChrome();
    [document.getElementById("viewer-insights"), document.getElementById("header-logics-insights")].forEach((button) => {
      button?.addEventListener("click", () => {
        showCorpusInsights();
      });
    });
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
  });
})();
