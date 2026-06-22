      try { entry.terminal.focus(); } catch { /* noop */ }
    }
    setMeta("Sent clear (Ctrl+L) to terminal.");
  }

  async function renameWorkshopTerminal(sessionId) {
    const entry = workshopTerminalState.sessions.get(sessionId);
    if (!entry || entry.closing) return;
    const current = String(entry.label || "").trim();
    const detectedCdxSession = cdxSessionForTerminal(entry);
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
      setMeta(`Renamed terminal to ${entry.label}.`);
    } catch (error) {
      setMeta(`Terminal rename: ${error?.message || error}`);
    }
  }

  async function loadCdxSessionsForCustomTerminal() {
    if (!isCapabilityAvailable("cdx")) return [];
    try {
      const response = await fetch("/api/cdx-status", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.ok) {
        latestCdxStatusPayload = data.payload;
      }
    } catch {
      // Keep any already-cached CDX status.
    }
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    return sessions
      .filter((session) => session && typeof session === "object" && session.enabled !== false)
      .map((session) => {
        const name = String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim();
        return name ? { name, label: formatCustomTerminalCdxSessionOption(session, name) } : null;
      })
      .filter(Boolean);
  }

  function formatCustomTerminalCdxSessionOption(session, name) {
    const parts = [name];
    const title = String(cdxField(session, ["title", "label", "description"], "")).trim();
    if (title && title !== name) parts.push(title);
    const provider = String(cdxField(session, ["provider", "backend"], "")).trim();
    const model = String(cdxField(session, ["model", "model_name", "modelName"], "")).trim();
    const runtime = [provider, model].filter(Boolean).join("/");
    if (runtime) parts.push(runtime);
    const state = String(cdxField(session, ["status", "state", "auth_status", "authStatus"], "")).trim();
    if (state) parts.push(state);
    const remaining = cdxRemainingPct(session);
    if (remaining !== null) parts.push(`${remaining}% left`);
    return parts.join(" · ");
  }

  async function showCustomTerminalModal() {
    const sessions = await loadCdxSessionsForCustomTerminal();
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
      body?.append(select, input);
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      const submit = () => {
        const sessionName = select.value.trim();
        if (sessionName) {
          done({ command: ["cdx", sessionName], label: `cdx ${sessionName}` });
          return;
        }
        const command = input.value.trim().split(/\s+/).filter(Boolean);
        done(command.length ? { command, label: command.slice(0, 2).join(" ").slice(0, 32) || "custom" } : null);
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

  function releaseWorkshopTerminalObserver(entry) {
    if (entry?.resizeObserver) {
      try { entry.resizeObserver.disconnect(); } catch { /* noop */ }
      entry.resizeObserver = null;
    }
    if (entry?.resizeRaf) {
      cancelAnimationFrame(entry.resizeRaf);
      entry.resizeRaf = 0;
    }
  }

  function refitAllWorkshopTerminals() {
    const fontSize = workshopTerminalPreferredFontSize();
    for (const entry of workshopTerminalState.sessions.values()) {
      if (!entry.fitAddon || !entry.terminal) continue;
      try {
        if (entry.terminal.options && entry.terminal.options.fontSize !== fontSize) {
          entry.terminal.options.fontSize = fontSize;
        }
        entry.fitAddon.fit();
        const dim = entry.fitAddon.proposeDimensions();
        if (dim) {
          entry.lastSyncedCols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
          entry.lastSyncedRows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
          resizeWorkshopTerminal(entry.id, dim.rows, dim.cols);
        }
      } catch { /* noop */ }
    }
  }

  // Whenever the page/tab regains visibility or the workshop becomes
  // visible again, force every mounted xterm to repaint from its cell
  // buffer. The renderer's DOM state can drift while the host is hidden
  // (display:none on parent, browser tab inactive, OS window minimised)
  // and decorations (SGR backgrounds, box-drawing glyphs) end up blanked
  // until the next full repaint.
  function repaintAllWorkshopTerminals() {
    for (const entry of workshopTerminalState.sessions.values()) {
      const term = entry.terminal;
      if (!term) continue;
      try { term.refresh(0, Math.max(0, term.rows - 1)); } catch { /* noop */ }
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestAnimationFrame(repaintAllWorkshopTerminals);
    }
  });
  window.addEventListener("focus", () => {
    requestAnimationFrame(repaintAllWorkshopTerminals);
  });

  let workshopTerminalResizeTimer = null;
  let customTerminalBusy = false;
  window.addEventListener("resize", () => {
    if (workshopTerminalResizeTimer) clearTimeout(workshopTerminalResizeTimer);
    workshopTerminalResizeTimer = setTimeout(() => {
      workshopTerminalResizeTimer = null;
      refitAllWorkshopTerminals();
    }, 80);
  });

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
      setMeta("Loading CDX sessions...");
    }
  }

  async function spawnWorkshopTerminal(options = {}) {
    try {
      const liveCount = [...workshopTerminalState.sessions.values()].filter((entry) => entry.state === "running" || entry.state === "starting").length;
      const WORKSHOP_TERMINAL_SOFT_CAP = 12;
      if (liveCount >= WORKSHOP_TERMINAL_SOFT_CAP) {
        setMeta(`Terminal limit reached (${WORKSHOP_TERMINAL_SOFT_CAP} live sessions). Close one before spawning another.`);
        return "";
      }
      const body = {};
      if (Array.isArray(options.command) && options.command.length) body.command = options.command;
      if (options.label) body.label = String(options.label);
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
      setMeta(`Terminal: ${error?.message || error}`);
      return "";
    }
  }

  async function spawnCustomWorkshopTerminal(trigger = null) {
    if (customTerminalBusy) return;
    setCustomTerminalBusy(trigger, true);
    try {
      const result = await showCustomTerminalModal();
      if (!result || !Array.isArray(result.command) || !result.command.length) return;
      spawnWorkshopTerminal({ command: result.command, label: result.label });
    } finally {
      setCustomTerminalBusy(trigger, false);
    }
  }

  // Public API for CDX / handoff launchers and other callers that want to
  // open a Workshop terminal pre-running a canonical command.
  window.logicsViewer = window.logicsViewer || {};
  window.logicsViewer.launchTerminal = (command, label) => spawnWorkshopTerminal({ command, label });

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

  const WORKSHOP_TERMINAL_MIN_COLS = 80;
  const WORKSHOP_TERMINAL_MIN_ROWS = 24;
  // Resize hysteresis: only re-fit the PTY once the proposed grid drifts far
  // enough from the last applied size. A sub-step jitter (a one-cell wobble
  // while dragging, a scrollbar appearing) would otherwise trigger a full
  // SIGWINCH + redraw of the running TUI on the slightest movement.
  const WORKSHOP_TERMINAL_RESIZE_COL_STEP = 10;
  const WORKSHOP_TERMINAL_RESIZE_ROW_STEP = 5;

  function resizeWorkshopTerminal(sessionId, rows, cols) {
    if (!sessionId || rows <= 0 || cols <= 0) return;
    const safeRows = Math.max(rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const safeCols = Math.max(cols, WORKSHOP_TERMINAL_MIN_COLS);
    fetch("/api/workshop-terminal-resize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, rows: safeRows, cols: safeCols }),
    }).catch(() => { /* noop */ });
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
      closeWorkshopTerminalStream(sessionId);
    });
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
    const workshopAvailable = isCapabilityAvailable("workshop");
    const workspaceAvailable = isCapabilityAvailable("workspace");
    if (!workshopAvailable && !workspaceAvailable) {
      const message = capabilityMessage("workshop", "Workshop is not available for this project.");
      setDocument("Workshop", renderWorkshop("terminals", { unavailable: true, message }));
      setMeta(message);
      return;
    }
    // When the host only exposes the workspace (no terminals/commands), default
    // straight to the Explorer tab so the panel isn't empty.
    const fallbackTab = workshopAvailable ? preferredWorkshopTab() : "explorer";
    const activeTab = options.tab && workshopTabs.some((tab) => tab.id === options.tab)
      ? options.tab
      : fallbackTab;
    setWorkshopActiveTab(activeTab);
    setDocument("Workshop", renderWorkshop(activeTab));
    setMeta(`Workshop / ${activeTab}`);
    if (activeTab === "explorer") {
      await loadWorkshopExplorer({ silent: Boolean(options.silent) });
    } else if (activeTab === "commands") {
      await loadWorkshopCommands();
    } else if (activeTab === "terminals") {
      // The Workshop DOM was just re-rendered, so every prior xterm host /
      // EventSource is gone. Drop them from the in-memory state too so the
      // remount path recreates fresh ones and the SSE stream replays the
