  }

  // Detect the cdx session a terminal runs, by parsing its command label
  // (e.g. "cdx resume work2") and correlating tokens with known session names.
  function cdxSessionForTerminal(entry) {
    // Prefer the server-derived session name: it is carried on the terminal
    // payload itself, so the CDX typing is stable across refresh/reopen and
    // does not depend on latestCdxStatusPayload (which is null right after a
    // refresh, previously dropping the typing until the next status poll).
    const serverSession = String(entry?.cdxSession || "").trim();
    if (serverSession) return serverSession;
    const label = String(entry?.label || "").trim();
    if (!label) return "";
    const tokens = label.split(/\s+/).filter(Boolean);
    if (tokens.length < 2 || tokens[0].toLowerCase() !== "cdx") return "";
    // Mission terminals are labelled `cdx mission <missionId>` — the missionId
    // is not a cdx session, so don't try to read its (non-existent) usage.
    if (tokens[1].toLowerCase() === "mission") return "";
    // A handoff terminal runs the destination (new) session it migrates into
    // (`cdx handoff <source> <destination>`), so name it after the last
    // positional argument rather than the source it correlates against first.
    if (tokens[1].toLowerCase() === "handoff") {
      const positional = tokens.slice(2).filter((token) => token && !token.startsWith("-"));
      return positional.length ? positional[positional.length - 1] : "";
    }
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    const names = new Set(
      sessions
        .map((session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim())
        .filter(Boolean)
    );
    for (let i = 1; i < tokens.length; i += 1) {
      if (names.has(tokens[i])) return tokens[i];
    }
    // Fallback when status is not loaded yet: first non-flag arg after the verb.
    const candidate = tokens.slice(2).find((token) => token && !token.startsWith("-"));
    return candidate || "";
  }

  // Remaining usage ({ percent, reset }) for a session name from latest status.
  function cdxSessionUsage(sessionName) {
    if (!sessionName) return null;
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    const match = sessions.find(
      (session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim() === sessionName
    );
    if (!match) return null;
    return {
      percent: cdxRemainingPct(match),
      reset: formatCdxResetAt(cdxField(match, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""))
    };
  }

  // A small vertical gauge of remaining session usage, coloured by level.
  // Clickable: refreshes this session's CDX status. Rendered for every cdx
  // session (neutral/empty when usage is not known yet) so it stays clickable.
  function renderCdxUsageGauge(usage, sessionName) {
    if (!sessionName) return "";
    const hasPct = Boolean(usage) && usage.percent !== null && usage.percent !== undefined;
    const pct = hasPct ? Math.max(0, Math.min(100, usage.percent)) : 0;
    const tone = hasPct ? cdxRemainingClass(usage.percent) : "neutral";
    const resetText = usage?.reset && usage.reset !== "-" ? ` · resets ${usage.reset}` : "";
    const title = `CDX usage remaining: ${hasPct ? `${pct}%` : "unknown"}${resetText} · click to refresh`;
    return `<span class="viewer-workshop__usage viewer-workshop__usage--${tone}" data-viewer-cdx-usage-refresh="${escapeHtml(sessionName)}" role="button" tabindex="0" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span class="viewer-workshop__usage-fill" style="height:${pct}%"></span>
    </span>`;
  }

  async function refreshCdxSessionUsage(sessionName) {
    try {
      setMeta(sessionName ? `Refreshing CDX usage for ${sessionName}...` : "Refreshing CDX usage...");
      const response = await fetch("/api/cdx-status", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.ok) return;
      latestCdxStatusPayload = data.payload;
      latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload });
      renderWorkshopTerminalList();
      const usage = cdxSessionUsage(sessionName);
      if (usage && usage.percent !== null && usage.percent !== undefined) {
        const resetText = usage.reset && usage.reset !== "-" ? ` · resets ${usage.reset}` : "";
        setMeta(`CDX usage ${sessionName}: ${usage.percent}% remaining${resetText}.`);
      } else {
        setMeta(`Refreshed CDX usage${sessionName ? ` for ${sessionName}` : ""}.`);
      }
    } catch (error) {
      setMeta(`CDX usage: ${error?.message || error}`);
    }
  }

  // Re-render the terminal list when CDX usage changes so the gauges stay live
  // without the operator opening the CDX status screen. Self-guards: only runs
  // when the list is on screen and at least one terminal is a cdx session.
  function refreshWorkshopTerminalUsage() {
    if (!workshopTerminalListNode()) return;
    for (const entry of workshopTerminalState.sessions.values()) {
      if (cdxSessionForTerminal(entry)) {
        renderWorkshopTerminalList();
        return;
      }
    }
  }

  function renderWorkshopTerminalList() {
    const node = workshopTerminalListNode();
    if (!(node instanceof HTMLElement)) return;
    const entries = orderedWorkshopTerminalEntries();
    const header = `<div class="viewer-workshop__terminal-list-header">
      <span>Terminals</span>
      <span class="viewer-workshop__terminal-actions">
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-new>+ Shell</button>
        <button class="btn viewer-workshop__terminal-new" type="button" data-viewer-workshop-terminal-custom>+ Custom</button>
      </span>
    </div>`;
    if (entries.length === 0) {
      node.innerHTML = `${header}<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span class="viewer-workspace__placeholder-icon" aria-hidden="true">·</span><span>No sessions yet.</span></div>`;
      return;
    }
    const rows = entries.map((entry) => {
      const isActive = entry.id === workshopTerminalState.activeId;
      const stateBadge = entry.state ? `<span class="viewer-workshop__state viewer-workshop__state--${escapeHtml(entry.state)}">${escapeHtml(entry.state)}</span>` : "";
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
      const cdxSession = cdxSessionForTerminal(entry);
      const rawCommandLabel = Array.isArray(entry.command) ? entry.command.join(" ") : "";
      const isRawCdxLabel = cdxSession && (!entry.label || entry.label === rawCommandLabel || /^cdx\s+/.test(String(entry.label)));
      const displayLabel = isRawCdxLabel ? cdxSession : (entry.label || cdxSession || entry.id);
      const gauge = cdxSession ? renderCdxUsageGauge(cdxSessionUsage(cdxSession), cdxSession) : "";
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
    node.innerHTML = `${header}<div class="viewer-workshop__terminal-rows">${rows}</div>`;
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

  function ensureWorkshopTerminalHostFor(sessionId) {
    const stage = workshopTerminalStageNode();
    if (!(stage instanceof HTMLElement)) return null;
    const placeholder = stage.querySelector("[data-viewer-workshop-terminal-empty]");
    if (placeholder) placeholder.remove();
    let host = stage.querySelector(`[data-viewer-workshop-terminal-host="${sessionId}"]`);
    if (!(host instanceof HTMLElement)) {
      host = document.createElement("div");
      host.className = "viewer-workshop__terminal-host";
      host.setAttribute("data-viewer-workshop-terminal-host", sessionId);
      stage.appendChild(host);
    }
    return host;
  }

  function mountWorkshopTerminalEmulator(entry) {
    if (typeof window.Terminal !== "function") return;
    if (entry.terminal) return;
    const host = ensureWorkshopTerminalHostFor(entry.id);
    if (!host) return;
    const term = new window.Terminal({
      fontSize: workshopTerminalPreferredFontSize(),
      fontFamily: 'var(--vscode-editor-font-family, "Menlo", "Consolas", monospace)',
      theme: { background: "#0a0a0a", foreground: "#d4d4d4" },
      cursorBlink: true,
      scrollback: 5000,
      convertEol: true,
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

  function workshopTerminalPreferredFontSize() {
    // Smaller cells on narrow viewports keep enough columns visible to make
    // TUIs (btop, lazygit, cdx) usable on a phone without horizontal scroll
    // taking over. Phone portrait sits in <=420, landscape in <=900.
    const width = window.innerWidth || document.documentElement?.clientWidth || 0;
    if (width <= 360) return 6;
    if (width <= 420) return 7;
    if (width <= 560) return 8;
    if (width <= 700) return 9;
    if (width <= 900) return 10;
    return 12;
  }

  // Fit the emulator to its host and push the resulting dimensions to the PTY
  // (TIOCSWINSZ) so the backend's terminal width matches what is rendered.
  function syncWorkshopTerminalSize(entry, { useHysteresis = false } = {}) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    try {
      entry.fitAddon.fit();
      const dim = entry.fitAddon.proposeDimensions();
      if (!dim || !(dim.rows > 0) || !(dim.cols > 0)) return;
      // xterm and the PTY MUST agree on size. resizeWorkshopTerminal() clamps
      // the value sent to the PTY up to a minimum (80x24), but fit() may have
      // sized xterm below that floor. If we only clamp the PTY side, the app
      // wraps/redraws against a grid the renderer does not have, producing
      // ghosting and text written over the same line. Force xterm onto the same
      // clamped grid so term.cols/rows always equal the PTY's.
      const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
      const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
      // Hold the previous size until the drift crosses the step thresholds, so
      // a faux mouvement (one-cell wobble while dragging) does not redraw the
      // whole terminal. Only the noisy ResizeObserver path opts into this;
      // corrective syncs (mount, font load, becoming visible) must always apply
      // their exact size, otherwise the grid stays stuck at a stale width until
      // a manual Ctrl+L forces a repaint.
      if (
        useHysteresis
        && typeof entry.lastSyncedCols === "number"
        && typeof entry.lastSyncedRows === "number"
        && Math.abs(cols - entry.lastSyncedCols) < WORKSHOP_TERMINAL_RESIZE_COL_STEP
        && Math.abs(rows - entry.lastSyncedRows) < WORKSHOP_TERMINAL_RESIZE_ROW_STEP
      ) {
        return;
      }
      entry.lastSyncedCols = cols;
      entry.lastSyncedRows = rows;
      if (entry.terminal.cols !== cols || entry.terminal.rows !== rows) {
        try { entry.terminal.resize(cols, rows); } catch { /* noop */ }
      }
      resizeWorkshopTerminal(entry.id, rows, cols);
    } catch { /* noop */ }
  }

  function hasMountedWorkshopTerminals() {
    for (const entry of workshopTerminalState.sessions.values()) {
      if (entry.terminal) return true;
    }
    return false;
  }

  // Force a running TUI to repaint its current frame without replaying the
  // server buffer or sending it any input: briefly change the PTY size so the
  // kernel raises SIGWINCH, then restore it. This is exactly what a window
  // resize does, so every terminal app (Claude, Codex, btop, vim) redraws.
  function nudgeWorkshopTerminalRedraw(entry) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    let dim;
    try {
      entry.fitAddon.fit();
      dim = entry.fitAddon.proposeDimensions();
    } catch { return; }
    if (!dim || dim.rows <= 0 || dim.cols <= 0) return;
    const rows = Math.max(dim.rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const cols = Math.max(dim.cols, WORKSHOP_TERMINAL_MIN_COLS);
    // Shrink by one row (or grow if already at the floor) so the value sent
    // actually differs and the kernel emits a SIGWINCH, then restore.
    const nudgeRows = rows > WORKSHOP_TERMINAL_MIN_ROWS ? rows - 1 : rows + 1;
    resizeWorkshopTerminal(entry.id, nudgeRows, cols);
    setTimeout(() => resizeWorkshopTerminal(entry.id, rows, cols), 60);
  }

  // Non-destructive redraw of every mounted terminal: repaint xterm's DOM from
  // its cell buffer and nudge each running app to re-render. Returns the count.
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
