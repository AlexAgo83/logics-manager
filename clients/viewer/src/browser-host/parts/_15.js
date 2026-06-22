  }

  function renderCdxDetailPills(item, excludedKeys) {
    const details = cdxDetailEntries(item, excludedKeys).map(([key, value]) => `
      <span class="viewer-cdx__pill"><span>${escapeHtml(cdxLabel(key))}</span><strong>${escapeHtml(formatCdxValue(key, value))}</strong></span>
    `).join("");
    return details ? `<div class="viewer-cdx__pills">${details}</div>` : "";
  }

  function renderCdxRemainingPill(item) {
    const percent = cdxRemainingPct(item);
    if (percent === null) {
      return "";
    }
    return `
      <span class="viewer-cdx__remaining viewer-cdx__remaining--${cdxRemainingClass(percent)}" title="${escapeHtml(percent)}% usage remaining">
        <span>Remaining</span>
        <strong>${escapeHtml(percent)}%</strong>
      </span>
    `;
  }

  function cdxSessionBlock(item) {
    const explicit = cdxField(item, ["block", "blocked", "blocking"], "");
    if (explicit && explicit !== true) {
      return explicit;
    }
    const fiveHour = Number(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN));
    const week = Number(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN));
    if (Number.isFinite(fiveHour) && fiveHour <= 0) {
      return "5H";
    }
    if (Number.isFinite(week) && week <= 1) {
      return "WEEK";
    }
    return explicit === true ? "YES" : "-";
  }

  function cdxProviderName(item) {
    return String(cdxField(item, ["provider", "name"], "unknown") || "unknown");
  }

  function cdxKnownProviders(status, providers, sessions) {
    const names = new Set();
    providers.forEach((provider) => {
      const name = cdxProviderName(provider);
      if (name) {
        names.add(name);
      }
    });
    sessions.forEach((session) => {
      const name = cdxProviderName(session);
      if (name) {
        names.add(name);
      }
    });
    pickFirstArray(status, ["providers", "providerStatus", "provider_status"]).forEach((provider) => {
      const name = cdxProviderName(provider);
      if (name) {
        names.add(name);
      }
    });
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }

  function filterCdxEntriesByProvider(entries, providerFilter) {
    if (providerFilter.mode !== "subset" || !providerFilter.selected.length) {
      return entries;
    }
    const selected = new Set(providerFilter.selected);
    return entries.filter((entry) => selected.has(cdxProviderName(entry)));
  }

  function renderCdxImportExportControls(knownSessions) {
    const sessionRows = knownSessions.map((name) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" class="viewer-cdx__export-session" value="${escapeHtml(name)}" checked>
        <span>${escapeHtml(name)}</span>
      </label>
    `).join("");
    return `
      <details class="viewer-cdx__menu" id="viewer-cdx-import-menu">
        <summary class="viewer-cdx__icon-button" title="Import CDX accounts" aria-label="Import CDX accounts">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide" role="dialog" aria-label="Import CDX accounts">
          <div class="viewer-cdx__import-form">
            <label class="viewer-cdx__form-label">
              <span>File (.cdx)</span>
              <input type="file" class="viewer-cdx__file-input" id="viewer-cdx-import-file" accept=".cdx,.json">
            </label>
            <label class="viewer-cdx__form-label">
              <span>Passphrase</span>
              <input type="password" class="viewer-cdx__pass-input" id="viewer-cdx-import-pass" placeholder="Leave empty if unencrypted" autocomplete="off">
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-import-merge" checked>
              <span>Merge (keep existing accounts)</span>
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-import-force">
              <span>Force overwrite when needed</span>
            </label>
            <button class="viewer-cdx__menu-action viewer-cdx__menu-action--primary" type="button" id="viewer-cdx-import-btn">Import</button>
            <div class="viewer-cdx__form-status" id="viewer-cdx-import-status" hidden></div>
          </div>
        </div>
      </details>
      <details class="viewer-cdx__menu" id="viewer-cdx-export-menu">
        <summary class="viewer-cdx__icon-button" title="Export CDX accounts" aria-label="Export CDX accounts">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide" role="dialog" aria-label="Export CDX accounts">
          <div class="viewer-cdx__import-form">
            <div class="viewer-cdx__form-section-label">Sessions to export</div>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-export-all" checked>
              <span>All sessions</span>
            </label>
            <div id="viewer-cdx-export-sessions">${sessionRows || '<div class="viewer-cdx__empty">No sessions available.</div>'}</div>
            <label class="viewer-cdx__form-label">
              <span>Passphrase</span>
              <input type="password" class="viewer-cdx__pass-input" id="viewer-cdx-export-pass" placeholder="Recommended — encrypts credentials" autocomplete="off">
            </label>
            <label class="viewer-cdx__menu-check">
              <input type="checkbox" id="viewer-cdx-export-auth" checked>
              <span>Include credentials (--include-auth)</span>
            </label>
            <button class="viewer-cdx__menu-action viewer-cdx__menu-action--primary" type="button" id="viewer-cdx-export-btn">Export</button>
            <div class="viewer-cdx__form-status" id="viewer-cdx-export-status" hidden></div>
          </div>
        </div>
      </details>
    `;
  }

  function renderCdxStatusControls(knownProviders, knownSessions, visibleColumns, providerFilter) {
    const columnRows = cdxStatusColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(providerFilter.mode === "subset" ? providerFilter.selected : knownProviders);
    const providerRows = knownProviders.map((provider) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-provider="${escapeHtml(provider)}"${selected.has(provider) ? " checked" : ""}>
        <span>${escapeHtml(provider)}</span>
      </label>
    `).join("");
    const providerSummary = providerFilter.mode === "subset" && providerFilter.selected.length
      ? `${providerFilter.selected.length}/${knownProviders.length || providerFilter.selected.length}`
      : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX status table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure status columns" aria-label="Configure status columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX status columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter status providers" aria-label="Filter status providers">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(providerSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX provider filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-provider-all>All providers</button>
            ${providerRows || '<div class="viewer-cdx__empty">No providers reported.</div>'}
          </div>
        </details>
        ${renderCdxImportExportControls(knownSessions)}
      </div>
    `;
  }

  function cdxRunSessionName(run) {
    return cdxField(run, ["session", "session_id", "sessionId", "session_name", "sessionName"], "-");
  }

  function knownCdxRunSessions(runs) {
    return Array.from(new Set(runs.map((run) => cdxRunSessionName(run)).filter((session) => session && session !== "-"))).sort((left, right) => left.localeCompare(right));
  }

  function filterCdxRunsBySession(runs, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return runs;
    }
    const selected = new Set(sessionFilter.selected);
    return runs.filter((run) => selected.has(cdxRunSessionName(run)));
  }

  function renderCdxRunControls(visibleColumns, knownSessions, sessionFilter) {
    const columnRows = cdxRunColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-run-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(sessionFilter.mode === "subset" ? sessionFilter.selected : knownSessions);
    const sessionRows = knownSessions.map((session) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-run-session="${escapeHtml(session)}"${selected.has(session) ? " checked" : ""}>
        <span>${escapeHtml(session)}</span>
      </label>
    `).join("");
    const sessionSummary = sessionFilter.mode === "subset" && sessionFilter.selected.length
      ? `${sessionFilter.selected.length}/${knownSessions.length || sessionFilter.selected.length}`
      : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX reports table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure run columns" aria-label="Configure run columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX run columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter report sessions" aria-label="Filter report sessions">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(sessionSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX report session filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-run-session-all>All sessions</button>
            ${sessionRows || '<div class="viewer-cdx__empty">No sessions reported.</div>'}
          </div>
        </details>
      </div>
    `;
  }

  function cdxHistorySessionName(entry) {
    return cdxField(entry, ["session_name", "sessionName", "session", "name"], "-");
  }

  function knownCdxHistorySessions(history) {
    return Array.from(new Set(history.map((entry) => cdxHistorySessionName(entry)).filter((session) => session && session !== "-"))).sort((left, right) => left.localeCompare(right));
  }

  function filterCdxHistoryBySession(history, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return history;
    }
    const selected = new Set(sessionFilter.selected);
    return history.filter((entry) => selected.has(cdxHistorySessionName(entry)));
  }

  function renderCdxHistoryControls(visibleColumns, knownSessions, sessionFilter) {
    const columnRows = cdxHistoryColumns.map((column) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-history-column="${escapeHtml(column.id)}"${visibleColumns[column.id] ? " checked" : ""}>
        <span>${escapeHtml(column.label)}</span>
      </label>
    `).join("");
    const selected = new Set(sessionFilter.mode === "subset" ? sessionFilter.selected : knownSessions);
    const sessionRows = knownSessions.map((session) => `
      <label class="viewer-cdx__menu-check">
        <input type="checkbox" data-viewer-cdx-history-session="${escapeHtml(session)}"${selected.has(session) ? " checked" : ""}>
        <span>${escapeHtml(session)}</span>
      </label>
    `).join("");
    const sessionSummary = sessionFilter.mode === "subset" && sessionFilter.selected.length
      ? `${sessionFilter.selected.length}/${knownSessions.length || sessionFilter.selected.length}`
      : "All";
    return `
      <div class="viewer-cdx__controls" aria-label="CDX history table controls">
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Configure history columns" aria-label="Configure history columns">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX history columns">${columnRows}</div>
        </details>
        <details class="viewer-cdx__menu">
          <summary class="viewer-cdx__icon-button" title="Filter history sessions" aria-label="Filter history sessions">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6h16l-6.5 7.2V19l-3 1.5v-7.3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>
            <span class="viewer-cdx__icon-count">${escapeHtml(sessionSummary)}</span>
          </summary>
          <div class="viewer-cdx__menu-panel" role="menu" aria-label="CDX history session filter">
            <button class="viewer-cdx__menu-action" type="button" data-viewer-cdx-history-session-all>All sessions</button>
            ${sessionRows || '<div class="viewer-cdx__empty">No sessions reported.</div>'}
          </div>
        </details>
      </div>
    `;
  }

  function isCdxSessionEnabled(item) {
    if (item.enabled === false) {
      return false;
    }
    const state = String(cdxField(item, ["status", "state"], "")).toLowerCase();
    return state !== "disabled";
  }

  function cdxPermissionValues() {
    return ["review", "default", "auto", "full"];
  }

  function cdxSessionPermission(item) {
    return String(cdxField(item, ["permission", "permission_mode", "permissionMode"], "-") || "-");
  }

  function renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal) {
    if (!name || name === "-") {
      return escapeHtml(label);
    }
    const enabled = isCdxSessionEnabled(item);
    const resumeAvailable = item.resume_available === true || item.resumeAvailable === true || item.resumable === true;
    const canHandoff = Boolean(enabled && canLaunchTerminal && latestSessionName && latestSessionName !== name);
    return `
      <details class="viewer-cdx__menu viewer-cdx__session-menu">
        <summary class="viewer-cdx__path-link viewer-cdx__session-summary" title="CDX session actions for ${escapeHtml(name)}">${escapeHtml(label)}</summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__session-menu-panel" role="menu" aria-label="CDX session actions for ${escapeHtml(name)}">
          ${enabled && canLaunchTerminal ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="new" data-viewer-cdx-session="${escapeHtml(name)}">New</button>` : ""}
          ${enabled && canLaunchTerminal && resumeAvailable ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="resume" data-viewer-cdx-session="${escapeHtml(name)}">Resume</button>` : ""}
          ${canHandoff ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="handoff" data-viewer-cdx-session="${escapeHtml(name)}" data-viewer-cdx-handoff-source="${escapeHtml(latestSessionName)}">Handoff (${escapeHtml(latestSessionName)})</button>` : ""}
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--config" type="button" role="menuitem" data-viewer-cdx-session-action="config" data-viewer-cdx-session="${escapeHtml(name)}">Config</button>
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--danger" type="button" role="menuitem" data-viewer-cdx-session-action="remove" data-viewer-cdx-session="${escapeHtml(name)}">Remove</button>
        </div>
      </details>
    `;
  }

  function closeCdxMenus(exceptMenu = null) {
    document.querySelectorAll(".viewer-cdx__menu[open], .viewer-workshop__command-run-menu[open]").forEach((menu) => {
      if (exceptMenu && menu === exceptMenu) {
        return;
      }
      menu.removeAttribute("open");
    });
  }

  function cdxMenuKey(menu) {
    if (!(menu instanceof HTMLElement)) {
      return "";
    }
    if (menu.id) {
      return `id:${menu.id}`;
    }
    const summaryLabel = menu.querySelector("summary")?.getAttribute("aria-label")
      || menu.querySelector("summary")?.getAttribute("title")
      || "";
    const panelLabel = menu.querySelector(".viewer-cdx__menu-panel, .viewer-workshop__command-run-menu-panel")?.getAttribute("aria-label") || "";
    const label = panelLabel || summaryLabel;
    return label ? `label:${label}` : "";
  }

  function activeCdxInteractionMenu() {
    return document.querySelector(".viewer-cdx__menu[open], .viewer-workshop__command-run-menu[open]");
  }

  function preserveActiveCdxMenu(render) {
    const key = cdxMenuKey(activeCdxInteractionMenu());
    render();
    if (!key) {
      return;
    }
    const nextMenu = Array.from(document.querySelectorAll(".viewer-cdx__menu, .viewer-workshop__command-run-menu"))
      .find((menu) => cdxMenuKey(menu) === key);
    if (nextMenu instanceof HTMLElement) {
      nextMenu.setAttribute("open", "");
    }
  }

  function renderCdxSessionTable(sessions, emptyText, latestSessionNameOverride = "") {
    if (!sessions.length) {
      return `<div class="viewer-cdx__empty">${escapeHtml(emptyText)}</div>`;
    }
    const visibleColumns = cdxColumnVisibilityPreference();
    const workshopCap = capability("workshop");
    const canLaunchTerminal = workshopCap.available === true && Boolean(workshopCap.detail?.terminalsAvailable);
    const latestSessionName = latestSessionNameOverride || latestCdxSessionName(sessions);
    const cellRenderers = {
      session: (item) => {
        const name = cdxSessionName(item);
        const label = `${name}${item.active ? "*" : ""}`;
        return `<td class="viewer-cdx__session-name">${renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal)}</td>`;
      },
      provider: (item) => `<td>${escapeHtml(cdxField(item, ["provider"], "-"))}</td>`,
      status: (item) => {
        const name = cdxSessionName(item);
        const isEnabled = isCdxSessionEnabled(item);
        const badge = renderCdxBadge(cdxField(item, ["status", "state"]));
        if (!name || name === "-") return `<td>${badge}</td>`;
        const pending = pendingCdxSessionToggles.has(name);
        return `<td><button class="viewer-cdx__status-toggle${isEnabled ? " is-on" : " is-off"}${pending ? " is-updating" : ""}" type="button" data-viewer-cdx-toggle="${escapeHtml(name)}" data-viewer-cdx-toggle-state="${isEnabled ? "on" : "off"}" title="${pending ? "Updating" : isEnabled ? "Disable" : "Enable"} ${escapeHtml(name)}"${pending ? " disabled" : ""}>${badge}</button></td>`;
      },
      auth: (item) => {
        const rawAuth = String(cdxField(item, ["auth_status", "authStatus"], "-"));
        const displayAuth = rawAuth.replace("authenticated", "logged");
        const isLoggedOut = rawAuth.toLowerCase() === "logged_out";
        const name = cdxField(item, ["session_name", "name", "id", "value"]);
        if (isLoggedOut && canLaunchTerminal && name && name !== "-") {
          return `<td><button class="viewer-cdx__auth-login" type="button" data-viewer-cdx-login="${escapeHtml(name)}" title="Open Workshop terminal: cdx login ${escapeHtml(name)}">${escapeHtml(displayAuth)}</button></td>`;
        }
        return `<td>${escapeHtml(displayAuth)}</td>`;
      },
      permission: (item) => {
        const name = cdxSessionName(item);
        const pending = name && pendingCdxSessionPermissions.has(name) ? pendingCdxSessionPermissions.get(name) : "";
        const permission = pending || cdxSessionPermission(item);
        const updating = pending ? " is-updating" : "";
        const title = pending ? ` title="Updating ${escapeHtml(name)}"` : "";
        return `<td><span class="viewer-cdx__permission-label${updating}"${title}>${escapeHtml(permission || "-")}</span></td>`;
      },
      ok: (item) => {
        // Reuse the shared session usage gauge (same component as the terminal
        // view) for the readiness column. Fall back to the legacy pill/percent
        // when the row has no session name or no usable usage value.
        const name = String(cdxField(item, ["session_name", "name", "id", "value"], "")).trim();
        const pct = cdxRemainingPct(item);
        const hasUsage = pct !== null && pct !== undefined && !Number.isNaN(Number(pct));
        if (name && name !== "-" && hasUsage) {
          const usage = {
            percent: pct,
            reset: formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""))
          };
          return `<td class="viewer-cdx__ok-cell">${renderCdxUsageGauge(usage, name)}</td>`;
        }
        return `<td>${renderCdxRemainingPill(item) || escapeHtml(cdxPct(cdxField(item, ["available_pct", "availablePct"], NaN)))}</td>`;
      },
      remaining5h: (item) => `<td>${escapeHtml(cdxPct(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN)))}</td>`,
      remainingWeek: (item) => `<td>${escapeHtml(cdxPct(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN)))}</td>`,
      block: (item) => `<td>${escapeHtml(cdxSessionBlock(item))}</td>`,
      credits: (item) => `<td>${escapeHtml(formatCdxCredits(cdxField(item, ["credits", "cr"], "-")))}</td>`,
      reset5h: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], "")))}</td>`,
      resetWeek: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["reset_week_at", "resetWeekAt", "reset_at", "resetAt"], "")))}</td>`,
      updated: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["updated_at", "updatedAt"], "")))}</td>`
    };
    const activeColumns = cdxStatusColumns.filter((column) => visibleColumns[column.id]);
    const rows = sessions.slice(0, 24).map((entry) => {
      const item = entry && typeof entry === "object" ? entry : { value: entry };
      return `
        <tr>
          ${activeColumns.map((column) => cellRenderers[column.id](item)).join("")}
        </tr>
      `;
    }).join("");
    return `
      <div class="viewer-cdx__table-wrap">
        <table class="viewer-cdx__table">
          <thead>
            <tr>
              ${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
