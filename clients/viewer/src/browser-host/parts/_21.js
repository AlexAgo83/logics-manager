
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

  function gitCommitModalEntries(payload) {
    const labels = {
      staged: "Staged",
      modified: "Modified",
      deleted: "Deleted",
      renamed: "Renamed",
      untracked: "Untracked"
    };
    const entries = [];
    const seen = new Set();
    for (const key of ["staged", "modified", "deleted", "renamed", "untracked"]) {
      const group = Array.isArray(payload?.groups?.[key]) ? payload.groups[key] : [];
      for (const entry of group) {
        const path = String(entry?.path || "").trim();
        if (!path || seen.has(path)) continue;
        seen.add(path);
        entries.push({
          path,
          from: String(entry?.from || "").trim(),
          group: labels[key] || key
        });
      }
    }
    return entries;
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
    document.getElementById("viewer-getting-started")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      showGettingStarted();
    });
    document.getElementById("viewer-restart-server")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      withPrimaryAction("restart-viewer", "Restarting server", restartViewerServer);
    });
    bootstrapLogicsButton()?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
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
