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
      const canonicalEntries = Array.isArray(payload?.findings)
        ? payload.findings
        : [
            ...(Array.isArray(payload?.issues) ? payload.issues : []),
            ...(Array.isArray(payload?.warnings) ? payload.warnings : [])
          ];
      const seen = new Set();
      canonicalEntries.forEach((entry) => {
        const key = `${entry?.path || ""}\n${entry?.code || ""}\n${entry?.message || ""}`;
        seen.add(key);
        findings.push({ source, ...entry });
      });
      const strictEntries = Array.isArray(payload?.strict) ? payload.strict : [];
      strictEntries.forEach((entry) => {
        const key = `${entry?.path || ""}\n${entry?.code || ""}\n${entry?.message || ""}`;
        if (!seen.has(key)) {
          findings.push({ source, ...entry });
        }
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

  // Map a file path to a highlight.js language name for the main languages.
  const HLJS_EXT_LANGUAGE = {
    js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp",
    php: "php", swift: "swift", kt: "kotlin", scala: "scala",
    sh: "bash", bash: "bash", zsh: "bash", fish: "bash",
    json: "json", yml: "yaml", yaml: "yaml", toml: "ini", ini: "ini",
    xml: "xml", html: "xml", htm: "xml", svg: "xml",
    css: "css", scss: "scss", less: "less",
    md: "markdown", markdown: "markdown",
    sql: "sql", dockerfile: "dockerfile", makefile: "makefile",
    diff: "diff", patch: "diff"
  };

  function detectHljsLanguage(path) {
    const file = String(path || "").split(/[\\/]/).pop() || "";
    const lower = file.toLowerCase();
    if (lower === "dockerfile") return "dockerfile";
    if (lower === "makefile") return "makefile";
    const ext = lower.includes(".") ? lower.split(".").pop() : "";
    return HLJS_EXT_LANGUAGE[ext] || "";
  }

  // Highlight code to HTML when highlight.js and the language are available,
  // otherwise fall back to escaped plain text. Never throws.
  function highlightCode(content, language) {
    const text = String(content || "");
    try {
      const hljs = typeof window !== "undefined" ? window.hljs : null;
      if (hljs && language && typeof hljs.getLanguage === "function" && hljs.getLanguage(language)) {
        return hljs.highlight(text, { language, ignoreIllegals: true }).value;
      }
    } catch {
      /* fall through to plain text */
    }
    return escapeHtml(text);
  }

  // Shared file/code viewer: a discreet line count, an optional "load anyway"
  // control when truncated, syntax highlighting, and a non-selectable line-number
  // label per rendered line. Used by the Explorer, git, and CDX preview surfaces.
  function renderCodeViewer(content, options = {}) {
    const text = String(content || "");
    const language = options.language || "";
    const lineCount = Number.isFinite(options.lineCount)
      ? options.lineCount
      : (text ? text.split("\n").length - (text.endsWith("\n") ? 1 : 0) : 0);
    const visibleLines = text ? text.split("\n").slice(0, text.endsWith("\n") ? -1 : undefined) : [];
    const lineNumberDigits = Math.max(2, String(Math.max(lineCount, visibleLines.length, 1)).length);
    const rows = visibleLines.map((line, index) => {
      const body = typeof options.renderLineHtml === "function"
        ? options.renderLineHtml(line, index)
        : highlightCode(line || " ", language);
      const extraLineClass = typeof options.lineClassName === "function"
        ? options.lineClassName(line, index)
        : (options.lineClassName || "");
      const lineClass = ["viewer-code__line", extraLineClass].filter(Boolean).map(escapeHtml).join(" ");
      return `<div class="viewer-code__row">
        <span class="viewer-code__line-number" aria-hidden="true">${index + 1}</span>
        <span class="${lineClass}"><code>${body}</code></span>
      </div>`;
    }).join("");
    const bar = [
      `<span class="viewer-code__lines">${lineCount} line${lineCount === 1 ? "" : "s"}</span>`,
      options.truncated ? `<span class="viewer-code__flag">truncated</span>` : "",
      options.hardCapHit ? `<span class="viewer-code__flag">hard cap reached</span>` : "",
      options.forceButtonHtml || ""
    ].filter(Boolean).join("");
    return `<div class="viewer-code" style="--viewer-code-line-number-width: ${lineNumberDigits}ch;">
      <div class="viewer-code__bar">${bar}</div>
      <div class="viewer-code__scroll"><div class="viewer-code__rows">${rows}</div></div>
    </div>`;
  }

  function renderWorkspacePreview(previewPayload) {
    if (!previewPayload) {
      return '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>Select a file or directory.</span></div>';
    }
    const path = previewPayload.path || "/";
    const name = previewPayload.name || path || "/";
    const state = previewPayload.state || "unknown";
    if (state === "ok") {
      const forceButtonHtml = previewPayload.canForce
        ? `<button class="btn viewer-code__force" type="button" data-viewer-workspace-preview-full="${escapeHtml(path)}">Load anyway</button>`
        : "";
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <em>${escapeHtml(previewPayload.truncated ? "truncated" : `${previewPayload.size || 0} bytes`)}</em>
        </div>
        ${renderCodeViewer(previewPayload.content || "", {
          language: detectHljsLanguage(path),
          lineCount: previewPayload.lineCount,
          truncated: Boolean(previewPayload.truncated),
          hardCapHit: Boolean(previewPayload.hardCapHit),
          forceButtonHtml
        })}
      `;
    }
    if (state === "oversized") {
      const forceButtonHtml = previewPayload.canForce
        ? `<button class="btn viewer-code__force" type="button" data-viewer-workspace-preview-full="${escapeHtml(path)}">Load anyway</button>`
        : "";
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
          <em>${escapeHtml(`${previewPayload.size || 0} bytes`)}</em>
        </div>
        <div class="viewer-workspace__preview-notice viewer-workspace__preview-notice--warn"><span>${escapeHtml(previewPayload.message || "File too large to preview.")}</span>${forceButtonHtml}</div>
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
    if (state === "directory") {
      return `
        <div class="viewer-workspace__preview-header">
          <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path || "/")}</span></div>
          <em>directory</em>
        </div>
        <div class="viewer-workspace__preview-notice">${escapeHtml(previewPayload.message || "Directory selected.")}</div>
      `;
    }
    const placeholderState = state === "unavailable" ? "unavailable" : "empty";
    const noticeClass = placeholderState === "unavailable" ? " viewer-workspace__preview-notice--unavailable" : "";
    return `
      <div class="viewer-workspace__preview-header">
        <div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(path)}</span></div>
        <em>${escapeHtml(state)}</em>
      </div>
      <div class="viewer-workspace__preview-notice${noticeClass}">${escapeHtml(previewPayload.message || "No preview is available.")}</div>
