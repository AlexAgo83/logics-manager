/**
 * The workshop screen: command runner, terminals, and their badges.
 *
 * Lifted out of the browser host by req_312, on the seam the cdx screen proved. Measured
 * before moving: it touches three bindings it does not own -- the repository root, the
 * repository, and the viewer preferences -- and only reads them. Its own state moved with
 * it and is private here.
 *
 * The factory returns its functions by name so the host can destructure them back into
 * scope, and exposes its state through one accessor rather than scattering setters.
 */
import {
  WORKSHOP_TERMINAL_MIN_COLS,
  WORKSHOP_TERMINAL_MIN_ROWS,
  workshopTabs,
} from "./constants.js";
import {
  clearNavMenuBadges,
  ensureWorkshopTerminalHostFor,
  escapeHtml,
  nudgeWorkshopTerminalRedraw,
  renderCdxUsageGauge,
  renderGitBadge,
  renderWorkshopTabs,
  renderWorkspace,
  resizeWorkshopTerminal,
  setNavMenuBadges,
  showThemedInputModal,
  syncWorkshopTerminalSize,
} from "./render.js";
import {
  closeThemedModal,
  createThemedModal,
  fetchWorkspacePreview,
  fetchWorkspaceTree,
  releaseWorkshopTerminalObserver,
  workshopTerminalListNode,
  workshopTerminalPreferredFontSize,
  workshopTerminalStageNode,
} from "./util.js";

export function createWorkshopScreen(host) {
  const workshopButton = () => document.getElementById("viewer-workshop");

  function workshopUsesSystemTerminal() {
    return host.shared.viewerPreferences.workshopUseSystemTerminal === true || window.parent !== window;
  }

  function syncWorkshopSystemTerminalControls() {
    document.querySelectorAll("[data-viewer-workshop-system-terminal]").forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.checked = workshopUsesSystemTerminal();
      }
    });
  }

  function bindWorkshopSystemTerminalControls() {
    document.querySelectorAll("[data-viewer-workshop-system-terminal]").forEach((node) => {
      if (!(node instanceof HTMLInputElement) || node.dataset.viewerBound === "1") return;
      node.dataset.viewerBound = "1";
      node.addEventListener("change", () => {
        host.updateViewerPreferences({ workshopUseSystemTerminal: node.checked });
        host.setMeta(node.checked ? "Workshop will open system terminals." : "Workshop will use the embedded terminal (xterm.js).");
      });
    });
    syncWorkshopSystemTerminalControls();
  }

  let workshopBadgeCounts = { terminals: 0, commands: 0 };

  function updateWorkshopBadges() {
    const button = document.getElementById("viewer-workshop");
    if (!(button instanceof HTMLElement)) return;
    button.querySelector('[data-viewer-workshop-badges]')?.remove();
    clearNavMenuBadges(["workshop:terminals", "workshop:commands"]);
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
    if (terminals > 0) {
      setNavMenuBadges("workshop:terminals", renderGitBadge("commits", terminals));
    }
    if (commands > 0) {
      setNavMenuBadges("workshop:commands", renderGitBadge("files", commands));
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

  async function loadWorkshopExplorer(options = {}) {
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (!(container instanceof HTMLElement)) return;
    if (!host.isCapabilityAvailable("workspace")) {
      const message = host.capabilityMessage("workspace", "Explorer is not available for this project.");
      container.innerHTML = renderWorkspace({ state: "unavailable", message }, { state: "unavailable", message });
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Loading workspace...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(""), fetchWorkspacePreview("")]);
    if (host.isViewStale(view)) {
      return;
    }
    const fresh = document.querySelector("[data-viewer-workshop-explorer]");
    if (fresh instanceof HTMLElement) {
      fresh.innerHTML = renderWorkspace(tree, preview);
    }
    host.setMeta(options.silent ? "Explorer refreshed." : "Explorer loaded.");
  }

  function preferredWorkshopTab() {
    const stored = String(host.shared.viewerPreferences.workshopActiveTab || "");
    return workshopTabs.some((tab) => tab.id === stored) ? stored : "terminals";
  }

  function setWorkshopActiveTab(tabId) {
    const next = workshopTabs.some((tab) => tab.id === tabId) ? tabId : "terminals";
    if (next === host.shared.viewerPreferences.workshopActiveTab) return;
    host.updateViewerPreferences({ workshopActiveTab: next });
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
    const terminalsAvailable = Boolean(host.capability("workshop").detail?.terminalsAvailable);
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

  function renderWorkshopCommandRunMenu(entry) {
    const id = escapeHtml(entry.id);
    const terminalsAvailable = Boolean(host.capability("workshop")?.detail?.terminalsAvailable);
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

  const workshopExternalLaunches = [];

  function workshopTerminalOrderRootKey() {
    return host.shared.latestRepoRoot || host.shared.latestRepository?.root || "default";
  }

  function storedWorkshopTerminalOrder() {
    const byRoot = host.shared.viewerPreferences.workshopTerminalOrderByRoot;
    const rootKey = workshopTerminalOrderRootKey();
    const value = byRoot && typeof byRoot === "object" ? byRoot[rootKey] : null;
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  }

  function persistWorkshopTerminalOrder() {
    const rootKey = workshopTerminalOrderRootKey();
    const byRoot = host.shared.viewerPreferences.workshopTerminalOrderByRoot && typeof host.shared.viewerPreferences.workshopTerminalOrderByRoot === "object"
      ? host.shared.viewerPreferences.workshopTerminalOrderByRoot
      : {};
    host.updateViewerPreferences({
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
    host.setMeta("Terminal order updated.");
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
    if (!host.isCapabilityAvailable("workshop")) return;
    if (!host.capability("workshop").detail?.terminalsAvailable) return;
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

  function refreshWorkshopTerminalUsage() {
    if (!workshopTerminalListNode()) return;
    for (const entry of workshopTerminalState.sessions.values()) {
      if (host.cdxSessionForTerminal(entry)) {
        renderWorkshopTerminalList();
        return;
      }
    }
  }

  function renderWorkshopTerminalList() {
    const node = workshopTerminalListNode();
    if (!(node instanceof HTMLElement)) return;
    const entries = orderedWorkshopTerminalEntries();
    const externalRows = workshopExternalLaunches.slice(-12).reverse().map((entry) => {
      const cdxSession = host.cdxSessionForTerminal(entry), raw = Array.isArray(entry.command) ? entry.command.join(" ") : "";
      const displayLabel = cdxSession && (!entry.label || entry.label === raw || /^cdx\s+/.test(String(entry.label))) ? cdxSession : (entry.label || cdxSession || raw || "system terminal");
      return `<div class="viewer-workshop__terminal-row" data-viewer-workshop-external="${escapeHtml(entry.id)}" title="${escapeHtml([entry.terminal, entry.nativeRef || entry.id].filter(Boolean).join(" · "))}"><span class="viewer-workshop__terminal-row-main">${cdxSession ? renderCdxUsageGauge(host.cdxSessionUsage(cdxSession), cdxSession) : ""}<span class="viewer-workshop__terminal-row-label">${escapeHtml(displayLabel)}</span></span><span class="viewer-workshop__state viewer-workshop__state--running">external</span><span class="viewer-workshop__terminal-row-controls"><button class="viewer-workshop__terminal-row-close" type="button" data-viewer-workshop-external-close="${escapeHtml(entry.id)}" aria-label="Remove external terminal entry">×</button></span></div>`;
    }).join("");
    const header = `<div class="viewer-workshop__terminal-list-header">
      <span>Terminals</span>
      <span class="viewer-workshop__terminal-actions">
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-new>+ Shell</button>
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-custom>+ Custom</button>
      </span>
    </div>`;
    if (entries.length === 0 && !externalRows) {
      node.innerHTML = `${header}<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>No sessions yet.</span></div>`;
      return;
    }
    const rows = entries.map((entry) => {
      const isActive = entry.id === workshopTerminalState.activeId;
      const state = String(entry.state || "");
      const stateBadge = state && state !== "running" ? `<span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(state)}">${escapeHtml(state)}</span>` : "";
      const closing = Boolean(entry.closing);
      const closeAttrs = closing
        ? `aria-busy="true" aria-label="Closing session"`
        : `data-viewer-workshop-terminal-close="${escapeHtml(entry.id)}" role="button" tabindex="0" aria-label="Close session"`;
      const closeGlyph = closing
        ? `<span class="viewer-workshop__spinner" aria-hidden="true"></span>`
        : `×`;
      const clearSpan = closing
        ? ""
        : `<span class="viewer-workshop__terminal-row-clear" data-viewer-workshop-terminal-clear="${escapeHtml(entry.id)}" role="button" tabindex="0" aria-label="Clear screen">⎚</span>`;
      // When the terminal runs a cdx session, show the session name instead of
      // the raw command and a discreet usage gauge next to it.
      const cdxSession = host.cdxSessionForTerminal(entry);
      const rawCommandLabel = Array.isArray(entry.command) ? entry.command.join(" ") : "";
      const isRawCdxLabel = cdxSession && (!entry.label || entry.label === rawCommandLabel || /^cdx\s+/.test(String(entry.label)));
      const displayLabel = isRawCdxLabel ? cdxSession : (entry.label || cdxSession || entry.id);
      const gauge = cdxSession ? renderCdxUsageGauge(host.cdxSessionUsage(cdxSession), cdxSession) : "";
      return `<button class="viewer-workshop__terminal-row${isActive ? " is-active" : ""}${closing ? " is-closing" : ""}" type="button" draggable="true" data-viewer-workshop-terminal-drag="${escapeHtml(entry.id)}" data-viewer-workshop-terminal-select="${escapeHtml(entry.id)}">
        <span class="viewer-workshop__terminal-row-main">
          ${gauge}
          <span class="viewer-workshop__terminal-row-label" data-viewer-workshop-terminal-rename="${escapeHtml(entry.id)}">${escapeHtml(displayLabel)}</span>
        </span>
        ${stateBadge}
        <span class="viewer-workshop__terminal-row-controls">
          ${clearSpan}
          <span class="viewer-workshop__terminal-row-close${closing ? " is-closing" : ""}" ${closeAttrs}>${closeGlyph}</span>
        </span>
      </button>`;
    }).join("");
    node.innerHTML = `${header}<div class="viewer-workshop__terminal-rows">${rows}${externalRows}</div>`;
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

  function mountWorkshopTerminalEmulator(entry) {
    if (typeof window.Terminal !== "function") return;
    if (entry.terminal) return;
    const host = ensureWorkshopTerminalHostFor(entry.id);
    if (!host) return;
    const term = new window.Terminal({
      fontSize: workshopTerminalPreferredFontSize(),
      fontFamily: '"Menlo", "Consolas", monospace',
      letterSpacing: 0,
      theme: { background: "#0a0a0a", foreground: "#d4d4d4" },
      cursorBlink: true,
      scrollback: 2000,
      convertEol: false,
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
      if (ev.type === "keydown" && ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.shiftKey && (ev.key === "c" || ev.key === "C")) {
        // Ctrl+C must always interrupt the foreground process. When an app
        // (Claude/Codex) enables the kitty keyboard protocol and exits without
        // restoring it, xterm would otherwise emit a CSI-u sequence instead of
        // the legacy ETX byte, so the program never receives SIGINT and Ctrl+C
        // appears to hang. Force the classic \x03 so the PTY always raises
        // SIGINT regardless of the terminal's current keyboard mode.
        if (typeof ev.preventDefault === "function") ev.preventDefault();
        if (typeof ev.stopPropagation === "function") ev.stopPropagation();
        writeWorkshopTerminalInput(entry.id, "\x03");
        return false;
      }
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
            syncWorkshopTerminalSize(entry, { useHysteresis: true });
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
      host.viewerDiagnostics.breadcrumb(`terminal:replay ${entry.id} ${entry.bufferedOutput.length}b`);
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

  function hasMountedWorkshopTerminals() {
    for (const entry of workshopTerminalState.sessions.values()) {
      if (entry.terminal) return true;
    }
    return false;
  }

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
    host.setMeta("Sent clear (Ctrl+L) to terminal.");
  }

  async function renameWorkshopTerminal(sessionId) {
    const entry = workshopTerminalState.sessions.get(sessionId);
    if (!entry || entry.closing) return;
    const current = String(entry.label || "").trim();
    const detectedCdxSession = host.cdxSessionForTerminal(entry);
    const next = await showThemedInputModal({
      title: "Rename terminal",
      message: "Edit the label shown in the terminal list.",
      defaultValue: current,
      placeholder: "Terminal label",
      submitLabel: "Rename",
      maxLength: 64
    });
    if (next === null) return;
    const label = String(next || "").trim();
    if (!label || label === current) return;
    try {
      const response = await fetch("/api/workshop-terminal-rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, label }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to rename terminal.");
      }
      const payload = data.payload || {};
      entry.label = String(payload.label || label);
      entry.command = Array.isArray(payload.command) ? payload.command.map(String) : entry.command;
      entry.cdxSession = String(payload.cdxSession || entry.cdxSession || detectedCdxSession || "");
      renderWorkshopTerminalList();
      host.setMeta(`Renamed terminal to ${entry.label}.`);
    } catch (error) {
      host.setMeta(`Terminal rename: ${error?.message || error}`);
    }
  }

  async function showCustomTerminalModal() {
    const sessions = await host.loadCdxSessionsForCustomTerminal();
    return new Promise((resolve) => {
      const modal = createThemedModal({
        title: "Custom terminal",
        message: "Run a command or start a terminal for an available CDX session.",
        submitLabel: "Run command"
      });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const select = document.createElement("select");
      select.className = "viewer-themed-modal__select";
      select.innerHTML = `<option value="">Custom command</option>${sessions.map((session) => `<option value="${escapeHtml(session.name)}">${escapeHtml(session.label)}</option>`).join("")}`;
      const input = document.createElement("input");
      input.className = "viewer-themed-modal__input";
      input.type = "text";
      input.placeholder = "node --version";
      const external = document.createElement("label"); external.className = "viewer-cdx__field viewer-cdx__field--check";
      external.innerHTML = `<input type="checkbox" data-viewer-custom-terminal-external${workshopUsesSystemTerminal() ? " checked" : ""}> Open in system terminal`;
      body?.append(select, input, external);
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      const submit = () => {
        const sessionName = select.value.trim();
        const systemTerminal = Boolean(modal.querySelector("[data-viewer-custom-terminal-external]")?.checked);
        if (sessionName) return done({ command: ["cdx", sessionName], label: `cdx ${sessionName}`, systemTerminal });
        const command = input.value.trim();
        done(command ? { command: ["sh", "-lc", command], label: command.slice(0, 32) || "custom", systemTerminal } : null);
      };
      select.addEventListener("change", () => {
        const hasSession = Boolean(select.value.trim());
        input.disabled = hasSession;
        input.placeholder = hasSession ? "Using selected CDX session" : "node --version";
      });
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", submit);
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter" && !(event.target instanceof HTMLSelectElement)) submit();
      });
      window.setTimeout(() => input.focus(), 0);
    });
  }

  function refitAllWorkshopTerminals() {
    const fontSize = workshopTerminalPreferredFontSize();
    for (const entry of workshopTerminalState.sessions.values()) {
      if (!entry.fitAddon || !entry.terminal) continue;
      try {
        if (entry.terminal.options && entry.terminal.options.fontSize !== fontSize) {
          entry.terminal.options.fontSize = fontSize;
        }
        // Same divergence trap as syncWorkshopTerminalSize: don't let fit()
        // size xterm to the raw dims while the PTY gets the clamped floor.
        // Resize both to the identical clamped value.
        const dim = entry.fitAddon.proposeDimensions();
        if (dim && dim.cols > 0 && dim.rows > 0) {
          const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
          const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
          entry.lastSyncedCols = cols;
          entry.lastSyncedRows = rows;
          if (entry.terminal.cols !== cols || entry.terminal.rows !== rows) {
            try { entry.terminal.resize(cols, rows); } catch { /* noop */ }
          }
          resizeWorkshopTerminal(entry.id, rows, cols);
        }
      } catch { /* noop */ }
    }
  }

  function repaintAllWorkshopTerminals() {
    for (const entry of workshopTerminalState.sessions.values()) {
      const term = entry.terminal;
      if (!term) continue;
      try { term.refresh(0, Math.max(0, term.rows - 1)); } catch { /* noop */ }
    }
  }

  function resumeActiveWorkshopTerminalStream() {
    // After sleep/wake the EventSource error may not have fired yet; reopen the
    // active terminal stream if it dropped (resumes from lastSeq).
    const activeId = workshopTerminalState.activeId;
    if (activeId && workshopTerminalStreamWanted(activeId)) openWorkshopTerminalStream(activeId);
  }

  let workshopTerminalResizeTimer = null;

  let customTerminalBusy = false;

  function setCustomTerminalBusy(trigger, busy) {
    customTerminalBusy = Boolean(busy);
    const controls = trigger instanceof HTMLElement
      ? [trigger]
      : Array.from(document.querySelectorAll("[data-viewer-workshop-terminal-custom]")).filter((node) => node instanceof HTMLElement);
    controls.forEach((control) => {
      if (!control.dataset.viewerOriginalLabel) {
        control.dataset.viewerOriginalLabel = control.textContent || "+ Custom";
      }
      if ("disabled" in control) {
        control.disabled = customTerminalBusy;
      }
      control.setAttribute("aria-busy", customTerminalBusy ? "true" : "false");
      control.classList.toggle("is-loading", customTerminalBusy);
      control.textContent = customTerminalBusy ? "Loading..." : (control.dataset.viewerOriginalLabel || "+ Custom");
    });
    if (customTerminalBusy) {
      host.setMeta("Loading CDX sessions...");
    }
  }

  function measureWorkshopTerminalGrid() {
    const mounted = [...workshopTerminalState.sessions.values()].find((entry) => entry.terminal && entry.terminal.cols > 0 && entry.terminal.rows > 0);
    if (mounted) {
      return { cols: mounted.terminal.cols, rows: mounted.terminal.rows };
    }
    const stage = workshopTerminalStageNode();
    const rect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null;
    if (!rect || rect.width < 1 || rect.height < 1) return null;
    const fontSize = workshopTerminalPreferredFontSize();
    const cellW = fontSize * 0.6;
    const cellH = fontSize * 1.2;
    const cols = Math.max(20, Math.min(400, Math.floor(rect.width / cellW)));
    const rows = Math.max(5, Math.min(200, Math.floor(rect.height / cellH)));
    return { cols, rows };
  }

  async function spawnWorkshopTerminal(options = {}) {
    if (options.systemTerminal === true || (options.systemTerminal !== false && workshopUsesSystemTerminal())) {
      return spawnSystemWorkshopTerminal(options);
    }
    try {
      const liveCount = [...workshopTerminalState.sessions.values()].filter((entry) => entry.state === "running" || entry.state === "starting").length;
      const WORKSHOP_TERMINAL_SOFT_CAP = 12;
      if (liveCount >= WORKSHOP_TERMINAL_SOFT_CAP) {
        host.setMeta(`Terminal limit reached (${WORKSHOP_TERMINAL_SOFT_CAP} live sessions). Close one before spawning another.`);
        return "";
      }
      const body = {};
      if (Array.isArray(options.command) && options.command.length) body.command = options.command;
      if (options.label) body.label = String(options.label);
      const grid = measureWorkshopTerminalGrid();
      if (grid) {
        body.cols = grid.cols;
        body.rows = grid.rows;
      }
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
        command: Array.isArray(session.command) ? session.command.map(String) : [],
        cdxSession: String(session.cdxSession || ""),
        state: session.state,
        bufferedOutput: "",
      });
      reconcileWorkshopTerminalOrder({ persist: true });
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
      host.setMeta(`Terminal: ${error?.message || error}`);
      return "";
    }
  }

  async function spawnSystemWorkshopTerminal(options = {}) {
    try {
      if (window.parent !== window) { const id = `vscode-terminal-${Date.now()}-${workshopExternalLaunches.length + 1}`, command = Array.isArray(options.command) ? options.command.map(String) : [], label = String(options.label || "terminal"); window.parent.postMessage({ type: "launch-workshop-terminal", command, label, cwd: host.shared.latestRepoRoot || "" }, "*"); workshopExternalLaunches.push({ id, label, command, terminal: "VS Code", nativeRef: id }); renderWorkshopTerminalList(); await showWorkshop({ tab: "terminals" }); host.setMeta(`Opened VS Code terminal: ${label}.`); return id; }
      const body = {};
      if (Array.isArray(options.command) && options.command.length) body.command = options.command;
      if (options.label) body.label = String(options.label);
      const response = await fetch("/api/workshop-terminal-external-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to open system terminal.");
      const payload = data.payload || {};
      const id = String(payload.terminalRef || payload.id || `external-${Date.now()}-${workshopExternalLaunches.length + 1}`);
      workshopExternalLaunches.push({
        id, label: String(payload.label || options.label || "system terminal"),
        command: Array.isArray(payload.command) ? payload.command.map(String) : [],
        terminal: String(payload.terminal || ""), nativeRef: payload.nativeRef ? String(payload.nativeRef) : "",
      });
      renderWorkshopTerminalList();
      await showWorkshop({ tab: "terminals" });
      host.setMeta(`Opened ${payload.terminal || "system terminal"}: ${payload.label || options.label || "terminal"}.`);
      return id;
    } catch (error) {
      host.setMeta(`System terminal: ${error?.message || error}`);
      return "";
    }
  }

  async function spawnCustomWorkshopTerminal(trigger = null) {
    if (customTerminalBusy) return;
    setCustomTerminalBusy(trigger, true);
    try {
      const result = await showCustomTerminalModal();
      if (!result || !Array.isArray(result.command) || !result.command.length) return;
      spawnWorkshopTerminal({ command: result.command, label: result.label, systemTerminal: result.systemTerminal });
    } finally {
      setCustomTerminalBusy(trigger, false);
    }
  }

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
    reconcileWorkshopTerminalOrder({ persist: true });
    if (workshopTerminalState.activeId === sessionId) {
      setActiveWorkshopTerminal(workshopTerminalState.order[0] || "");
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
      // A transient drop (sleep/wake, Wi-Fi blip) lands here too (clean end is
      // the "end" event), so reconnect a live session instead of freezing.
      closeWorkshopTerminalStream(sessionId);
      reopenWorkshopTerminalStreamSoon(sessionId);
    });
  }

  function workshopTerminalStreamWanted(sessionId) {
    return workshopTerminalState.activeId === sessionId
      && workshopTerminalState.sessions.has(sessionId)
      && !workshopTerminalState.streams.has(sessionId);
  }

  function reopenWorkshopTerminalStreamSoon(sessionId) {
    const target = workshopTerminalState.sessions.get(sessionId);
    if (!target || ["finished", "failed", "stopped", "error"].includes(target.state)) return;
    setTimeout(() => { if (workshopTerminalStreamWanted(sessionId)) openWorkshopTerminalStream(sessionId); }, 1000);
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
    const workshopAvailable = host.isCapabilityAvailable("workshop");
    const workspaceAvailable = host.isCapabilityAvailable("workspace");
    if (!workshopAvailable && !workspaceAvailable) {
      const message = host.capabilityMessage("workshop", "Workshop is not available for this project.");
      host.setDocument("Workshop", renderWorkshop("terminals", { unavailable: true, message }));
      host.setMeta(message);
      return;
    }
    // When the host only exposes the workspace (no terminals/commands), default
    // straight to the Explorer tab so the panel isn't empty.
    const fallbackTab = workshopAvailable ? preferredWorkshopTab() : "explorer";
    const activeTab = options.tab && workshopTabs.some((tab) => tab.id === options.tab)
      ? options.tab
      : fallbackTab;
    setWorkshopActiveTab(activeTab);
    host.setDocument("Workshop", renderWorkshop(activeTab));
    // Naming the tab is not a completion signal: these two screens were the only ones of
    // fourteen that never reached a terminal state, so nothing distinguished finished from
    // still working. The explorer already reports its own, below.
    host.setMeta(`Workshop / ${activeTab}: loading...`);
    if (activeTab === "explorer") {
      await loadWorkshopExplorer({ silent: Boolean(options.silent) });
    } else if (activeTab === "commands") {
      await loadWorkshopCommands();
      host.setMeta(`Workshop / ${activeTab} loaded.`);
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
      if (workshopTerminalState.activeId) {
        setActiveWorkshopTerminal(workshopTerminalState.activeId);
      } else {
        renderWorkshopTerminalList();
        ensureWorkshopTerminalStage();
      }
      host.setMeta(`Workshop / ${activeTab} loaded.`);
    }
  }

  const state = {};
  Object.defineProperties(state, {
    workshopButton: { get: () => workshopButton },
    workshopBadgeCounts: { get: () => workshopBadgeCounts, set: (value) => { workshopBadgeCounts = value; } },
    workshopCommandState: { get: () => workshopCommandState },
    workshopTerminalState: { get: () => workshopTerminalState },
    workshopExternalLaunches: { get: () => workshopExternalLaunches },
    workshopTerminalResizeTimer: { get: () => workshopTerminalResizeTimer, set: (value) => { workshopTerminalResizeTimer = value; } },
    customTerminalBusy: { get: () => customTerminalBusy, set: (value) => { customTerminalBusy = value; } },
    workshopTerminalInputBuffers: { get: () => workshopTerminalInputBuffers },
    workshopTerminalInputInFlight: { get: () => workshopTerminalInputInFlight },
  });

  return {
    state,
    appendWorkshopCommandLog,
    bindWorkshopSystemTerminalControls,
    clearWorkshopTerminal,
    clearWorkshopTerminalDragState,
    closeAllInactiveWorkshopTerminalStreams,
    closeWorkshopCommandStream,
    closeWorkshopTerminalStream,
    ensureWorkshopTerminalStage,
    flushWorkshopTerminalInput,
    hasMountedWorkshopTerminals,
    hydrateWorkshopTerminals,
    loadWorkshopCommands,
    loadWorkshopExplorer,
    measureWorkshopTerminalGrid,
    mountWorkshopTerminalEmulator,
    moveWorkshopTerminalBefore,
    openWorkshopCommandStream,
    openWorkshopTerminalStream,
    orderedWorkshopTerminalEntries,
    persistWorkshopTerminalOrder,
    preferredWorkshopTab,
    recomputeWorkshopBadges,
    reconcileWorkshopTerminalOrder,
    redrawWorkshopTerminals,
    refitAllWorkshopTerminals,
    refreshWorkshopTerminalUsage,
    renameWorkshopTerminal,
    renderWorkshop,
    renderWorkshopCommandList,
    renderWorkshopCommandRow,
    renderWorkshopCommandRunMenu,
    renderWorkshopCommands,
    renderWorkshopPanel,
    renderWorkshopTerminalList,
    reopenWorkshopTerminalStreamSoon,
    repaintAllWorkshopTerminals,
    resumeActiveWorkshopTerminalStream,
    setActiveWorkshopTerminal,
    setCustomTerminalBusy,
    setWorkshopActiveTab,
    showCustomTerminalModal,
    showWorkshop,
    spawnCustomWorkshopTerminal,
    spawnSystemWorkshopTerminal,
    spawnWorkshopTerminal,
    startWorkshopCommand,
    stopWorkshopCommand,
    stopWorkshopTerminal,
    storedWorkshopTerminalOrder,
    syncWorkshopSystemTerminalControls,
    updateWorkshopBadges,
    updateWorkshopCommandSession,
    workshopTerminalOrderRootKey,
    workshopTerminalStreamWanted,
    workshopUsesSystemTerminal,
    writeWorkshopTerminalInput,
  };
}
