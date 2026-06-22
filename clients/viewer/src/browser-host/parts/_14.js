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
      renderWorkshopTerminalList();
      // Remount every session so switching between rows is instant and
      // none of the terminals show a black/empty stage.
      for (const entry of workshopTerminalState.sessions.values()) {
        mountWorkshopTerminalEmulator(entry);
        if (entry.id !== workshopTerminalState.activeId) {
          const host = workshopTerminalStageNode()?.querySelector(`[data-viewer-workshop-terminal-host="${entry.id}"]`);
          if (host instanceof HTMLElement) host.classList.add("viewer-workshop__terminal-host--hidden");
        }
      }
      if (workshopTerminalState.activeId) {
        setActiveWorkshopTerminal(workshopTerminalState.activeId);
      }
    }
  }

  async function openWorkspaceTree(path) {
    if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(path), fetchWorkspacePreview(path)]);
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (container instanceof HTMLElement) {
      container.innerHTML = renderWorkspace(tree, preview);
    }
    setMeta(path ? `Explorer folder ${path}` : "Explorer root.");
  }

  async function openWorkspacePreview(path, { full = false } = {}) {
    if (!document.querySelector("[data-viewer-workshop-explorer]")) return;
    const treePath = workspaceParentPath(path);
    const [tree, preview] = await Promise.all([fetchWorkspaceTree(treePath), fetchWorkspacePreview(path, { full })]);
    const container = document.querySelector("[data-viewer-workshop-explorer]");
    if (container instanceof HTMLElement) {
      container.innerHTML = renderWorkspace(tree, preview);
    }
    setMeta(full ? `Loaded full preview of ${path}.` : `Previewing ${path || "workspace root"}.`);
  }

  function objectEntries(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? Object.entries(value) : [];
  }

  function asArray(value) {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.entries(value).map(([key, entry]) => ({ name: key, ...(entry && typeof entry === "object" ? entry : { value: entry }) }));
    }
    return [];
  }

  function pickFirstObject(status, keys) {
    for (const key of keys) {
      if (status?.[key] && typeof status[key] === "object" && !Array.isArray(status[key])) {
        return status[key];
      }
    }
    return {};
  }

  function pickFirstArray(status, keys) {
    for (const key of keys) {
      const entries = asArray(status?.[key]);
      if (entries.length) {
        return entries;
      }
    }
    return [];
  }

  function cdxRows(status) {
    return asArray(status?.rows);
  }

  function numericValues(values) {
    return values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }

  function formatPercentRange(values) {
    const numbers = numericValues(values).map((value) => Math.max(0, Math.min(100, Math.round(value))));
    if (!numbers.length) {
      return "not reported";
    }
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return min === max ? `${min}%` : `${min}-${max}%`;
  }

  function cdxProviders(status) {
    const rows = cdxRows(status);
    if (!rows.length) {
      return pickFirstArray(status, ["providers", "providerStatus", "provider_status"]);
    }
    const grouped = new Map();
    rows.forEach((row) => {
      const provider = String(row.provider || "unknown");
      const current = grouped.get(provider) || {
        name: provider,
        enabled: 0,
        active: 0,
        authenticated: 0,
        sessions: 0,
        remaining_5h: "not reported",
        remaining_week: "not reported",
        credits: "",
        _remaining5hValues: [],
        _remainingWeekValues: [],
        _creditsValues: []
      };
      current.sessions += 1;
      if (row.enabled) {
        current.enabled += 1;
      }
      if (row.active) {
        current.active += 1;
      }
      if (String(row.auth_status || "").toLowerCase() === "authenticated") {
        current.authenticated += 1;
      }
      const fiveHour = Number(row.remaining_5h_pct ?? row.remaining5hPct);
      if (Number.isFinite(fiveHour)) {
        current._remaining5hValues.push(fiveHour);
      }
      const week = Number(row.remaining_week_pct ?? row.remainingWeekPct);
      if (Number.isFinite(week)) {
        current._remainingWeekValues.push(week);
      }
      if (row.credits !== undefined && row.credits !== null && row.credits !== "") {
        current._creditsValues.push(row.credits);
      }
      current.state = current.active > 0 ? "active" : current.enabled > 0 ? "enabled" : "disabled";
      grouped.set(provider, current);
    });
    return Array.from(grouped.values()).map((provider) => {
      const creditsNumbers = numericValues(provider._creditsValues);
      const creditsTotal = creditsNumbers.length ? creditsNumbers.reduce((total, value) => total + value, 0) : null;
      const { _remaining5hValues, _remainingWeekValues, _creditsValues, ...publicProvider } = provider;
      return {
        ...publicProvider,
        remaining_5h: formatPercentRange(_remaining5hValues),
        remaining_week: formatPercentRange(_remainingWeekValues),
        credits: creditsTotal === null ? "" : creditsTotal.toFixed(2)
      };
    });
  }

  function cdxSessions(status) {
    const explicitSessions = pickFirstArray(status, ["sessions", "activeSessions", "active_sessions"]);
    return sortCdxSessionsByRemaining(explicitSessions.length ? explicitSessions : cdxRows(status));
  }

  function latestCdxSessionName(sessions) {
    let latest = null;
    sessions.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const name = cdxField(entry, ["session_name", "name", "id", "value"]);
      const timestamp = Date.parse(String(cdxField(entry, ["last_launched_at", "lastLaunchedAt"], "")));
      if (!name || name === "-" || !Number.isFinite(timestamp)) {
        return;
      }
      if (!latest || timestamp > latest.timestamp) {
        latest = { name, timestamp };
      }
    });
    return latest?.name || "";
  }

  function cdxReadiness(status) {
    const explicitReadiness = pickFirstObject(status, ["readiness", "quota", "quotas", "limits"]);
    if (objectEntries(explicitReadiness).length) {
      return explicitReadiness;
    }
    const rows = cdxRows(status);
    if (!rows.length) {
      return {};
    }
    const enabled = rows.filter((row) => row.enabled).length;
    const active = rows.filter((row) => row.active).length;
    const authenticated = rows.filter((row) => String(row.auth_status || "").toLowerCase() === "authenticated").length;
    const availableValues = rows.map((row) => row.available_pct).filter((value) => typeof value === "number");
    const lowestAvailable = availableValues.length ? Math.min(...availableValues) : null;
    return {
      enabled_sessions: enabled,
      active_sessions: active,
      authenticated_sessions: authenticated,
      lowest_remaining: lowestAvailable === null ? "not reported" : `${lowestAvailable}%`
    };
  }

  function renderCdxObjectRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => `
      <li class="viewer-cdx__row">
        <span>${escapeHtml(cdxLabel(key))}</span>
        <strong>${escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}</strong>
      </li>
    `).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

  function renderCdxArtifactRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => {
      const path = typeof entry === "string" ? entry : "";
      const filename = path ? path.split(/[\\/]/).filter(Boolean).pop() || path : "";
      return `
        <li class="viewer-cdx__row">
          <span>${escapeHtml(cdxLabel(key))}</span>
          <strong>${path
            ? `<button class="viewer-cdx__path-link" type="button" data-viewer-cdx-artifact-path="${escapeHtml(path)}" title="${escapeHtml(path)}">${escapeHtml(filename)}</button>`
            : escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}
          </strong>
        </li>
      `;
    }).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

  function cdxLabel(value) {
    return String(value || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function cdxStateClass(value) {
    const state = String(value || "").toLowerCase();
    if (["ready", "ok", "active", "enabled", "authenticated"].some((entry) => state.includes(entry))) {
      return "ok";
    }
    if (["starting", "pending", "running", "warning", "low", "limited", "stale"].some((entry) => state.includes(entry))) {
      return "warn";
    }
    if (["error", "failed", "disabled", "unavailable", "unauthenticated"].some((entry) => state.includes(entry))) {
      return "bad";
    }
    return "neutral";
  }

  function cdxRemainingPct(item) {
    const value = item?.remaining_pct ?? item?.remainingPct ?? item?.available_pct ?? item?.availablePct ?? item?.lowest_available_pct ?? item?.lowestAvailablePct;
    const percent = Number(value);
    return Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : null;
  }

  function cdxPct(value) {
    const percent = Number(value);
    return Number.isFinite(percent) ? `${Math.max(0, Math.min(100, Math.round(percent)))}%` : "-";
  }

  function cdxField(item, keys, fallback = "-") {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return fallback;
  }

  function cdxRemainingClass(percent) {
    if (percent === null) {
      return "neutral";
    }
    if (percent <= 10) {
      return "bad";
    }
    if (percent <= 30) {
      return "warn";
    }
    return "ok";
  }

  function sortCdxSessionsByRemaining(entries) {
    return [...entries].sort((left, right) => {
      const leftRemaining = cdxRemainingPct(left);
      const rightRemaining = cdxRemainingPct(right);
      if (leftRemaining === null && rightRemaining === null) {
        return 0;
      }
      if (leftRemaining === null) {
        return 1;
      }
      if (rightRemaining === null) {
        return -1;
      }
      return rightRemaining - leftRemaining;
    });
  }

  function formatCdxValue(key, value) {
    if (["reset_at", "resetAt", "resets_at", "resetsAt", "reset_5h_at", "reset5hAt", "reset_week_at", "resetWeekAt", "updated_at", "updatedAt"].includes(key)) {
      return formatCdxResetAt(value);
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return value;
  }

  function cdxUsageNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function cdxTokenUsage(item) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const candidates = [
      item.usage,
      item.tokenUsage,
      item.tokens,
      item.run && typeof item.run === "object" ? item.run.usage : null,
      item.result && typeof item.result === "object" ? item.result.usage : null
    ];
    const usage = candidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate));
    if (!usage || usage.available === false) {
      return null;
    }
    const inputTokens = cdxUsageNumber(usage.inputTokens ?? usage.input_tokens ?? usage.promptTokens ?? usage.prompt_tokens);
    const outputTokens = cdxUsageNumber(usage.outputTokens ?? usage.output_tokens ?? usage.completionTokens ?? usage.completion_tokens);
    const explicitTotal = cdxUsageNumber(usage.totalTokens ?? usage.total_tokens);
    const totalTokens = explicitTotal ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
    if (inputTokens === null && outputTokens === null && totalTokens === null) {
      return null;
    }
    return { inputTokens, outputTokens, totalTokens };
  }

  function formatCdxTokenUsage(usage) {
    if (!usage) {
      return "";
    }
    const total = usage.totalTokens ?? "-";
    const input = usage.inputTokens ?? "-";
    const output = usage.outputTokens ?? "-";
    return `${total} total · ${input} in · ${output} out`;
  }

  function renderCdxTokenUsage(usage) {
    if (!usage) {
      return '<span class="viewer-cdx__token-empty">-</span>';
    }
    const total = usage.totalTokens ?? "-";
    const input = usage.inputTokens ?? "-";
    const output = usage.outputTokens ?? "-";
    return `
      <div class="viewer-cdx__token-cell" title="${escapeHtml(formatCdxTokenUsage(usage))}">
        <strong>${escapeHtml(total)} total</strong>
        <span><em>${escapeHtml(input)}</em> in <em>${escapeHtml(output)}</em> out</span>
      </div>
    `;
  }

  function renderCdxActionButton(label, attrs, title = "") {
    return `<button class="viewer-cdx__action-button" type="button"${title ? ` title="${escapeHtml(title)}"` : ""} ${attrs}>${escapeHtml(label)}</button>`;
  }

  function parseCdxDate(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    const shortDate = raw.match(/^([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{1,2}:\d{2})$/);
    if (shortDate) {
      const year = new Date().getFullYear();
      const timestamp = Date.parse(`${shortDate[1]} ${shortDate[2]} ${year} ${shortDate[3]}`);
      return Number.isFinite(timestamp) ? timestamp : null;
    }
    const timestamp = Date.parse(raw);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
    return null;
  }

  function formatRelativeTime(timestamp) {
    const diffMs = timestamp - Date.now();
    const absMs = Math.abs(diffMs);
    const minutes = Math.round(absMs / 60000);
    if (minutes < 1) {
      return diffMs >= 0 ? "now" : "just now";
    }
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;
    let body = "";
    if (days > 0) {
      body = `${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ""}`;
    } else if (hours > 0) {
      body = `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ""}`;
    } else {
      body = `${minutes}m`;
    }
    return diffMs >= 0 ? `in ${body}` : `${body} ago`;
  }

  function formatCdxResetAt(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "-";
    }
    const timestamp = parseCdxDate(raw);
    return timestamp === null ? raw : formatRelativeTime(timestamp);
  }

  function formatCdxCredits(value) {
    const text = String(value ?? "").trim();
    if (!text || text === "-") {
      return "-";
    }
    const number = Number(text);
    return Number.isFinite(number) ? number.toFixed(2) : text;
  }

  function renderCdxBadge(value, fallback = "reported") {
    const label = String(value || fallback || "reported");
    return `<span class="viewer-cdx__badge viewer-cdx__badge--${cdxStateClass(label)}">${escapeHtml(cdxLabel(label))}</span>`;
  }

  function cdxRunStatusDetail(run) {
    return "";
  }

  function cdxDetailEntries(item, excludedKeys) {
    return objectEntries(item)
      .filter(([key, value]) => !excludedKeys.includes(key) && value !== undefined && value !== null && value !== "")
      .slice(0, 6);
