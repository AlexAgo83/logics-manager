(() => {
  const stateKey = "logics.localViewer.state";
  const meta = () => document.getElementById("viewer-meta");
  const documentPanel = () => document.getElementById("viewer-document");
  const documentTitle = () => document.getElementById("viewer-document-title");
  const documentContent = () => document.getElementById("viewer-document-content");
  const editDocumentButton = () => document.querySelector('[data-viewer-action="edit-document"]');
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
    applyLocalViewerChrome();
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
    applyLocalViewerChrome();
    document.getElementById("viewer-health")?.addEventListener("click", () => {
      showHealth().catch((error) => setMeta(error.message));
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
