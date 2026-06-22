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

  async function fetchWorkspacePreview(path = "", { full = false } = {}) {
    const query = `path=${encodeURIComponent(path)}${full ? "&full=1" : ""}`;
    const response = await fetch(`/api/workspace-preview?${query}`);
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
    order: [],
    draggingId: "",
    suppressSelectUntil: 0,
    hydrated: false,
  };

  function workshopTerminalOrderRootKey() {
    return latestRepoRoot || latestRepository?.root || "default";
  }

  function storedWorkshopTerminalOrder() {
    const byRoot = viewerPreferences.workshopTerminalOrderByRoot;
    const rootKey = workshopTerminalOrderRootKey();
    const value = byRoot && typeof byRoot === "object" ? byRoot[rootKey] : null;
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  }

  function persistWorkshopTerminalOrder() {
    const rootKey = workshopTerminalOrderRootKey();
    const byRoot = viewerPreferences.workshopTerminalOrderByRoot && typeof viewerPreferences.workshopTerminalOrderByRoot === "object"
      ? viewerPreferences.workshopTerminalOrderByRoot
      : {};
    updateViewerPreferences({
      workshopTerminalOrderByRoot: {
        ...byRoot,
        [rootKey]: [...workshopTerminalState.order]
      }
    });
  }

  function reconcileWorkshopTerminalOrder({ persist = false } = {}) {
    const ids = [...workshopTerminalState.sessions.keys()];
    const live = new Set(ids);
    const preferred = workshopTerminalState.order.length ? workshopTerminalState.order : storedWorkshopTerminalOrder();
    const next = preferred.filter((id) => live.has(id));
    for (const id of ids) {
      if (!next.includes(id)) next.push(id);
    }
    workshopTerminalState.order = next;
    if (persist) persistWorkshopTerminalOrder();
  }

  function orderedWorkshopTerminalEntries() {
    reconcileWorkshopTerminalOrder();
    return workshopTerminalState.order
      .map((id) => workshopTerminalState.sessions.get(id))
      .filter(Boolean);
  }

  function moveWorkshopTerminalBefore(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return false;
    reconcileWorkshopTerminalOrder();
    const next = workshopTerminalState.order.filter((id) => id !== sourceId);
    const targetIndex = next.indexOf(targetId);
    if (targetIndex < 0) return false;
    next.splice(targetIndex, 0, sourceId);
    workshopTerminalState.order = next;
    persistWorkshopTerminalOrder();
    renderWorkshopTerminalList();
    setMeta("Terminal order updated.");
    return true;
  }

  function clearWorkshopTerminalDragState() {
    workshopTerminalState.draggingId = "";
    document.querySelectorAll(".viewer-workshop__terminal-row.is-dragging, .viewer-workshop__terminal-row.is-drop-target").forEach((node) => {
      node.classList.remove("is-dragging", "is-drop-target");
      node.removeAttribute("aria-grabbed");
    });
  }

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
          command: Array.isArray(remote?.command) ? remote.command.map(String) : [],
          cdxSession: String(remote?.cdxSession || ""),
          state,
          bufferedOutput: "",
        });
      }
      if (!workshopTerminalState.activeId) {
        reconcileWorkshopTerminalOrder();
        workshopTerminalState.activeId = workshopTerminalState.order[0] || "";
      }
      reconcileWorkshopTerminalOrder({ persist: true });
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
