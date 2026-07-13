// De-monolith pass 2-3: pure builder/render helpers from browser-host/index.js.
// Reference only util.js leaves, constants.js data, and each other. Verbatim.

import {
  activeCdxInteractionMenu,
  activityMinuteBucket,
  activityPanelIsOpen,
  activityRootKey,
  asArray,
  cdxField,
  cdxLabel,
  cdxMenuKey,
  cdxRemainingClass,
  cdxRemainingPct,
  cdxReportMissionOutput,
  cdxReportSummary,
  cdxSectionBadgeTitle,
  cdxStateClass,
  cdxUsageNumber,
  ciBadgeTone,
  closeThemedModal,
  collectHealthFindings,
  countPayloadEntries,
  createThemedModal,
  downloadBase64File,
  fileToBase64,
  formatCdxTokenUsage,
  formatCiDate,
  formatRelativeTime,
  isSafeLogicsDocPath,
  markdownApi,
  navMenuItem,
  normalizeCapabilities,
  normalizeFocusTarget,
  numericValues,
  objectEntries,
  parseCdxDate,
  parseCdxLogJson,
  pickFirstObject,
  releaseBadgeTone,
  renderCdxModeSwitcher,
  renderCiModeSwitcher,
  scrollableAncestor,
  setNavMenuOpen,
  showCdxFormStatus,
  stableStringify,
  statusValue,
  updatedWithin,
  workshopTerminalStageNode,
  workspaceEntryIcon,
  workspaceParentPath
} from "./util.js";
import {
  HLJS_EXT_LANGUAGE,
  WORKSHOP_TERMINAL_MIN_COLS,
  WORKSHOP_TERMINAL_MIN_ROWS,
  WORKSHOP_TERMINAL_RESIZE_COL_STEP,
  WORKSHOP_TERMINAL_RESIZE_ROW_STEP,
  activityStorageLimit,
  cdxHistoryColumns,
  cdxRunColumns,
  cdxStatusColumns,
  defaultAutoRefreshIntervalMs,
  defaultFilterState,
  deviceIdKey,
  deviceLabelKey,
  deviceTokenKey,
  lanTokenKey,
  maxAutoRefreshIntervalSeconds,
  minAutoRefreshIntervalSeconds,
  onboardingDocGuide,
  onboardingStages,
  preferenceKey,
  preferenceVersion,
  stageBadgeLabels,
  stateKey,
  workshopTabs
} from "./constants.js";

export function activeCdxAssistantCountFromPayload(payload) {
    if (!payload || payload.state !== "ok") {
      return 0;
    }
    const status = payload.status || {};
    const sessions = cdxSessions(status);
    const sessionActive = sessions.filter((session) => {
      const state = String(session.state || session.status || session.availability || "").toLowerCase();
      return session.active === true ||
        state.includes("active") ||
        state.includes("running") ||
        state.includes("busy");
    }).length;
    if (sessionActive > 0) {
      return sessionActive;
    }
    const rowsActive = cdxRows(status).filter((row) => row.active === true).length;
    if (rowsActive > 0) {
      return rowsActive;
    }
    return cdxProviders(status).reduce((total, provider) => total + Math.max(0, Number(provider.active || 0)), 0);
  }

export function activeCdxRunCountFromPayload(payload) {
    if (!payload || payload.state !== "ok" || !Array.isArray(payload.runs)) {
      return 0;
    }
    return payload.runs.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
  }

export function activityHistoryKey(entry) {
    if (!entry || typeof entry !== "object") {
      return "";
    }
    const minute = activityMinuteBucket(entry.at || entry.updatedAt || "");
    return [
      entry.path || entry.id || "",
      entry.type || "",
      entry.status || "",
      entry.previousStatus || "",
      minute
    ].map((part) => String(part || "")).join("|");
  }

export function activityStateForRoot(state = readStoredState(), root = latestRepoRoot) {
    const baseState = state && typeof state === "object" ? state : {};
    const byRoot = baseState.activityByRoot && typeof baseState.activityByRoot === "object" ? baseState.activityByRoot : {};
    const scoped = byRoot[activityRootKey(root)];
    if (scoped && typeof scoped === "object") {
      return {
        activitySnapshot: scoped.activitySnapshot && typeof scoped.activitySnapshot === "object" ? scoped.activitySnapshot : {},
        activityHistory: Array.isArray(scoped.activityHistory) ? scoped.activityHistory : []
      };
    }
    return {
      activitySnapshot: baseState.activitySnapshot && typeof baseState.activitySnapshot === "object" ? baseState.activitySnapshot : {},
      activityHistory: Array.isArray(baseState.activityHistory) ? baseState.activityHistory : []
    };
  }

export function captureDocumentViewState(content) {
    const scroller = scrollableAncestor(content);
    const openDetails = Array.from(content.querySelectorAll("details[open]"))
      .map((node) => (node.querySelector("summary")?.textContent || "").trim())
      .filter(Boolean);
    const active = document.activeElement;
    let focusKey = null;
    if (active && content.contains(active) && active !== content) {
      if (active.id) {
        focusKey = `#${(window.CSS && CSS.escape) ? CSS.escape(active.id) : active.id}`;
      } else {
        const key = active.getAttribute("data-viewer-focus-key");
        if (key) focusKey = `[data-viewer-focus-key="${key}"]`;
      }
    }
    return { scroller, scrollTop: scroller ? scroller.scrollTop : 0, openDetails, focusKey };
  }

export function cdxCount(value) {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (value && typeof value === "object") {
      return objectEntries(value).length;
    }
    return value ? 1 : 0;
  }

export function cdxDetailEntries(item, excludedKeys) {
    return objectEntries(item)
      .filter(([key, value]) => !excludedKeys.includes(key) && value !== undefined && value !== null && value !== "")
      .slice(0, 6);
  }

export function cdxHistoryIdentity(entry) {
    return [
      cdxField(entry, ["started_at", "startedAt", "created_at", "createdAt"], ""),
      cdxHistorySessionName(entry),
      cdxField(entry, ["action"], ""),
      cdxField(entry, ["provider"], ""),
      cdxField(entry, ["label"], "")
    ].map((part) => String(part || "")).join("|");
  }

export function cdxHistorySessionName(entry) {
    return cdxField(entry, ["session_name", "sessionName", "session", "name"], "-");
  }

export function cdxKnownProviders(status, providers, sessions) {
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

export function cdxProviderName(item) {
    return String(cdxField(item, ["provider", "name"], "unknown") || "unknown");
  }

export function cdxProviders(status) {
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

export function cdxReadiness(status) {
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

export function cdxReportNextAction(taskReport, missionOutput, runError, permissionDenials, findings) {
    if (permissionDenials.length) {
      return "Review denied operations before rerunning or applying work.";
    }
    if (findings.length) {
      return "Review findings and create a Logics request if follow-up is needed.";
    }
    if (cdxCount(missionOutput?.recommendations)) {
      return "Review recommendations in the details below.";
    }
    if (runError?.message) {
      return "Inspect the run signal and logs.";
    }
    if (taskReport?.summary || missionOutput?.summary) {
      return "Inspect the artifacts if you need the full transcript.";
    }
    return "Open the transcript or stdout artifact for raw output.";
  }

export function cdxRows(status) {
    return asArray(status?.rows);
  }

export function cdxRunIdentity(run) {
    return String(cdxField(run, ["run_id", "runId", "id"], "")).trim();
  }

export function cdxRunSessionName(run) {
    return cdxField(run, ["session", "session_id", "sessionId", "session_name", "sessionName"], "-");
  }

export function cdxSessionBlock(item) {
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

export function cdxSessionName(item) {
    return cdxField(item, ["session_name", "name", "id", "value"], "");
  }

export function cdxSessionPermission(item) {
    return String(cdxField(item, ["permission", "permission_mode", "permissionMode"], "-") || "-");
  }

export function cdxSessions(status) {
    const explicitSessions = pickFirstArray(status, ["sessions", "activeSessions", "active_sessions"]);
    return sortCdxSessionsByRemaining(explicitSessions.length ? explicitSessions : cdxRows(status));
  }

export function cdxTokenUsage(item) {
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

export function ciBadgeLabel(value) {
    const state = ciBadgeTone(value);
    if (state === "passing") {
      return "pass";
    }
    if (state === "failing") {
      return "fail";
    }
    if (state === "running") {
      return String(value || "").toLowerCase() === "queued" ? "queue" : "run";
    }
    if (state === "cancelled") {
      return "cancel";
    }
    if (state === "unavailable") {
      return "auth";
    }
    return "n/a";
  }

export function clearNavMenuBadges(targets) {
    targets.forEach((target) => {
      navMenuItem(target)?.querySelector("[data-viewer-menu-badges]")?.remove();
    });
  }

export function closeNavMenus() {
    setNavMenuOpen(null, false);
  }

export function ensureWorkshopTerminalHostFor(sessionId) {
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

export function escapeHtml(value) {
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

export function filterCdxEntriesByProvider(entries, providerFilter) {
    if (providerFilter.mode !== "subset" || !providerFilter.selected.length) {
      return entries;
    }
    const selected = new Set(providerFilter.selected);
    return entries.filter((entry) => selected.has(cdxProviderName(entry)));
  }

export function filterCdxHistoryBySession(history, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return history;
    }
    const selected = new Set(sessionFilter.selected);
    return history.filter((entry) => selected.has(cdxHistorySessionName(entry)));
  }

export function filterCdxRunsBySession(runs, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return runs;
    }
    const selected = new Set(sessionFilter.selected);
    return runs.filter((run) => selected.has(cdxRunSessionName(run)));
  }

export function focusRequest() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      const focus = normalizeFocusTarget(params.get("focus") || "");
      return {
        focus,
        read: params.get("read") === "1" || params.get("read") === "true"
      };
    } catch {
      return { focus: "", read: false };
    }
  }

export function formatCdxResetAt(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "-";
    }
    const timestamp = parseCdxDate(raw);
    return timestamp === null ? raw : formatRelativeTime(timestamp);
  }

export function formatCdxValue(key, value) {
    if (["reset_at", "resetAt", "resets_at", "resetsAt", "reset_5h_at", "reset5hAt", "reset_week_at", "resetWeekAt", "updated_at", "updatedAt"].includes(key)) {
      return formatCdxResetAt(value);
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return value;
  }

export function formatCustomTerminalCdxSessionOption(session, name) {
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

export function formatPercentRange(values) {
    const numbers = numericValues(values).map((value) => Math.max(0, Math.min(100, Math.round(value))));
    if (!numbers.length) {
      return "not reported";
    }
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return min === max ? `${min}%` : `${min}-${max}%`;
  }

export function gitStatusSignature(payload) {
    return stableStringify({
      state: payload?.state || "",
      branch: payload?.branch || "",
      tracking: payload?.tracking || "",
      ahead: Number(payload?.ahead || 0),
      behind: Number(payload?.behind || 0),
      clean: Boolean(payload?.clean),
      counts: payload?.counts || {},
      badgeCounts: payload?.badgeCounts || {},
      latestCommit: payload?.latestCommit || "",
      recentCommitsHasMore: Boolean(payload?.recentCommitsHasMore)
    });
  }

export function highlightCode(content, language) {
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

export function isCdxSessionEnabled(item) {
    if (item.enabled === false) {
      return false;
    }
    const state = String(cdxField(item, ["status", "state"], "")).toLowerCase();
    return state !== "disabled";
  }

export function isClosed(item) {
    const status = statusValue(item);
    return (
      status.includes("done") ||
      status.includes("archived") ||
      status.includes("obsolete") ||
      status.includes("superseded") ||
      status.includes("settled")
    );
  }

export function isRecent(item, days = 7) {
    return updatedWithin(item, days);
  }

export function isStale(item) {
    const timestamp = Date.parse(item.updatedAt || "") || 0;
    return timestamp > 0 && timestamp < Date.now() - 30 * 24 * 60 * 60 * 1000 && !isClosed(item);
  }

export function knownCdxHistorySessions(history) {
    return Array.from(new Set(history.map((entry) => cdxHistorySessionName(entry)).filter((session) => session && session !== "-"))).sort((left, right) => left.localeCompare(right));
  }

export function knownCdxRunSessions(runs) {
    return Array.from(new Set(runs.map((run) => cdxRunSessionName(run)).filter((session) => session && session !== "-"))).sort((left, right) => left.localeCompare(right));
  }

export function latestCdxSessionName(sessions) {
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

export function needsPromotion(item) {
    return ["request", "backlog"].includes(item.stage) && !item.isPromoted && !isClosed(item);
  }

export function pickFirstArray(status, keys) {
    for (const key of keys) {
      const entries = asArray(status?.[key]);
      if (entries.length) {
        return entries;
      }
    }
    return [];
  }

export function prependUniqueActivity(history, entry) {
    const key = activityHistoryKey(entry);
    if (key && history.some((candidate) => activityHistoryKey(candidate) === key)) {
      return history;
    }
    history.unshift(entry);
    return history;
  }

export function preserveActiveCdxMenu(render) {
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

export function releaseEvidenceRows(evidence) {
    if (!evidence || typeof evidence !== "object") {
      return '<li class="viewer-ci__empty">No evidence recorded.</li>';
    }
    const rows = [
      ["Kind", evidence.kind || "unknown"],
      ["Status", evidence.status || "unknown"],
      ["Observed", formatCiDate(evidence.observed_at) || evidence.observed_at || "unknown"],
      ["Version", evidence.target_version || "unknown"],
      ["Commit", evidence.commit ? String(evidence.commit).slice(0, 12) : ""],
      ["Tag", evidence.tag || ""],
      ["Summary", evidence.summary || ""],
    ].filter(([, value]) => String(value || "").trim());
    if (evidence.url) {
      rows.push(["Link", evidence.url]);
    }
    return rows.map(([label, value]) => {
      const renderedValue = label === "Link"
        ? `<a class="viewer-ci__link viewer-release__inline-link" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`
        : `<strong>${escapeHtml(value)}</strong>`;
      return `<li class="viewer-ci__row"><span>${escapeHtml(label)}</span>${renderedValue}</li>`;
    }).join("");
  }

export function renderActionRows(actions) {
    return actions.map((action) => {
      if (action.filter) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-filter-group="${escapeHtml(action.filter.group)}" data-viewer-filter-value="${escapeHtml(action.filter.value)}">${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      if (action.health) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-open-health>${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      if (action.path && isSafeLogicsDocPath(action.path)) {
        return `
          <li class="viewer-insights__row">
            <button class="viewer-insights__action" type="button" data-viewer-doc-path="${escapeHtml(action.path)}">${escapeHtml(action.label)}</button>
            <strong>${escapeHtml(action.value)}</strong>
          </li>
        `;
      }
      return `<li class="viewer-insights__row"><span>${escapeHtml(action.label)}</span><strong>${escapeHtml(action.value)}</strong></li>`;
    }).join("");
  }

export function renderCdxActionButton(label, attrs, title = "") {
    return `<button class="viewer-cdx__action-button" type="button"${title ? ` title="${escapeHtml(title)}"` : ""} ${attrs}>${escapeHtml(label)}</button>`;
  }

export function renderCdxArtifactRows(value, emptyText) {
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

export function renderCdxBadge(value, fallback = "reported") {
    const label = String(value || fallback || "reported");
    return `<span class="viewer-cdx__badge viewer-cdx__badge--${cdxStateClass(label)}">${escapeHtml(cdxLabel(label))}</span>`;
  }

export function renderCdxDetailPills(item, excludedKeys) {
    const details = cdxDetailEntries(item, excludedKeys).map(([key, value]) => `
      <span class="viewer-cdx__pill"><span>${escapeHtml(cdxLabel(key))}</span><strong>${escapeHtml(formatCdxValue(key, value))}</strong></span>
    `).join("");
    return details ? `<div class="viewer-cdx__pills">${details}</div>` : "";
  }

export function renderCdxDetailRow(label, value) {
    return `
      <li class="viewer-cdx__row viewer-cdx__row--block">
        <span>${escapeHtml(label)}</span>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(value)}</div>
      </li>
    `;
  }

export function renderCdxDetailValue(value) {
    if (Array.isArray(value)) {
      return `
        <ol class="viewer-cdx__detail-list">
          ${value.map((item) => `
            <li>${typeof item === "object" && item !== null
              ? `<pre class="viewer-cdx__detail-code">${escapeHtml(JSON.stringify(item, null, 2))}</pre>`
              : escapeHtml(String(item))}
            </li>
          `).join("")}
        </ol>
      `;
    }
    if (value && typeof value === "object") {
      return `<pre class="viewer-cdx__detail-code">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }
    return `<strong>${escapeHtml(String(value))}</strong>`;
  }

export function renderCdxEntityRows(entries, emptyText, options = {}) {
    const titleKeys = options.titleKeys || ["name", "session_name", "id", "provider", "model", "value"];
    const stateKeys = options.stateKeys || ["state", "status", "readiness", "available", "auth_status"];
    const excludedKeys = [...titleKeys, ...stateKeys, "available_pct", "availablePct", "remaining_pct", "remainingPct", "lowest_available_pct", "lowestAvailablePct"];
    const rows = entries.slice(0, 16).map((entry) => {
      const item = entry && typeof entry === "object" ? entry : { value: entry };
      const name = titleKeys.map((key) => item[key]).find(Boolean) || "entry";
      const state = stateKeys.map((key) => item[key]).find((value) => value !== undefined && value !== null && value !== "") || "";
      const subtitle = options.subtitleKeys
        ? options.subtitleKeys.map((key) => item[key]).filter(Boolean).join(" · ")
        : "";
      return `
        <li class="viewer-cdx__entity">
          <div class="viewer-cdx__entity-main">
            <div>
              <strong>${escapeHtml(name)}</strong>
              ${subtitle ? `<div class="viewer-cdx__meta">${escapeHtml(subtitle)}</div>` : ""}
            </div>
            <div class="viewer-cdx__entity-status">
              ${renderCdxRemainingPill(item)}
              ${renderCdxBadge(state)}
            </div>
          </div>
          ${renderCdxDetailPills(item, excludedKeys)}
        </li>
      `;
    }).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

export function renderCdxImportExportControls(knownSessions) {
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

export function renderCdxMissionOutput(output) {
    if (!output) {
      return "";
    }
    const rows = [
      ["Summary", output.summary],
      ["Version", output.version],
      ["Validation", output.validationMode],
      ["Blocked", typeof output.blocked === "boolean" ? (output.blocked ? "Yes" : "No") : ""],
      ["Actions", cdxCount(output.actions)],
      ["Findings", cdxCount(output.findings)],
      ["Recommendations", cdxCount(output.recommendations)],
      ["Changed files", cdxCount(output.changedFiles)],
      ["Corpus files", cdxCount(output.corpusFiles)],
      ["Generated files", cdxCount(output.generatedFiles)],
      ["Validation evidence", cdxCount(output.validationEvidence)]
    ].filter(([_label, value]) => value !== undefined && value !== null && value !== "" && value !== 0);
    const detailKeys = [
      "actions",
      "findings",
      "recommendations",
      "directFixes",
      "requestFiles",
      "actionableFixes",
      "changedFiles",
      "corpusFiles",
      "generatedFiles",
      "validationEvidence",
      "releasePlan"
    ];
    const details = detailKeys
      .filter((key) => cdxCount(output[key]))
      .map((key) => renderCdxDetailRow(cdxLabel(key), output[key]))
      .join("");
    return `
      <section class="viewer-cdx__section">
        <div class="viewer-ci__heading"><h2>Details</h2><span>${escapeHtml(rows.length)} signals</span></div>
        <ul class="viewer-cdx__list">
          ${rows.map(([label, value]) => renderCdxDetailRow(label, value)).join("") || '<li class="viewer-cdx__empty">No structured mission output was reported.</li>'}
        </ul>
        ${details ? `<ul class="viewer-cdx__list">${details}</ul>` : ""}
      </section>
    `;
  }

export function renderCdxObjectRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => `
      <li class="viewer-cdx__row">
        <span>${escapeHtml(cdxLabel(key))}</span>
        <strong>${escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}</strong>
      </li>
    `).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

export function renderCdxRemainingPill(item) {
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

export function renderCdxReport(payload) {
    if (!payload || payload.state !== "ok" || !payload.report) {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("runs")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX run report is unavailable.")}</div>
        </div>
      `;
    }
    const report = payload.report || {};
    const run = report.run || {};
    const taskReport = report.task_report || {};
    const runError = report.error || run.error || {};
    const artifacts = report.artifacts || run.artifacts || {};
    const permissionDenials = Array.isArray(report.permissionDenials)
      ? report.permissionDenials
      : Array.isArray(report.permission_denials)
        ? report.permission_denials
        : [];
    const findings = Array.isArray(taskReport.findings) ? taskReport.findings : [];
    const missionOutput = cdxReportMissionOutput(report, run, taskReport);
    const summary = cdxReportSummary(report, taskReport, missionOutput, runError, permissionDenials);
    const nextAction = cdxReportNextAction(taskReport, missionOutput, runError, permissionDenials, findings);
    const tokenUsage = formatCdxTokenUsage(cdxTokenUsage(report) || cdxTokenUsage(run) || cdxTokenUsage(taskReport));
    const findingRows = findings.map((finding, index) => {
      const location = [finding.path || finding.file || "", finding.line || ""].filter(Boolean).join(":") || "-";
      return `<li class="viewer-cdx__entity"><div class="viewer-cdx__entity-main"><div><strong>${escapeHtml(finding.message || finding.title || `Finding ${index + 1}`)}</strong><div class="viewer-cdx__meta">${escapeHtml(location)}</div></div>${renderCdxBadge(finding.severity || "unknown")}</div></li>`;
    }).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("runs")}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading viewer-ci__heading--actions">
            <div><h2>Run report</h2><span>${escapeHtml(run.status || "unknown")}</span></div>
            <button class="viewer-cdx__mode" type="button" data-viewer-cdx-back-runs>Back to reports</button>
          </div>
          <ul class="viewer-cdx__list">
            <li class="viewer-cdx__row viewer-cdx__row--block"><span>Summary</span><div class="viewer-cdx__detail-value"><strong>${escapeHtml(summary)}</strong></div></li>
            <li class="viewer-cdx__row viewer-cdx__row--block"><span>Next</span><div class="viewer-cdx__detail-value"><strong>${escapeHtml(nextAction)}</strong></div></li>
          </ul>
          <ul class="viewer-cdx__list">
            ${renderCdxReportKeyList([
              ["Status", run.status || "unknown"],
              ["Run", run.run_id || taskReport.run_id || "-"],
              ["Session", run.session || taskReport.session || ""],
              ["Tokens", tokenUsage],
              ["Findings", String(findings.length)],
              ["Artifacts", String(objectEntries(artifacts).length)]
            ])}
          </ul>
        </section>
        ${renderCdxMissionOutput(missionOutput)}
        ${permissionDenials.length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Permission denials</h2><span>${escapeHtml(permissionDenials.length)} reported</span></div>
            <ul class="viewer-cdx__list">
              ${permissionDenials.map((denial, index) => renderCdxDetailRow(`Denial ${index + 1}`, denial)).join("")}
            </ul>
          </section>
        ` : ""}
        ${objectEntries(runError).length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Signal</h2><span>${escapeHtml(runError.code || "reported")}</span></div>
            <ul class="viewer-cdx__list">${renderCdxObjectRows(runError, "No run signal reported.")}</ul>
          </section>
        ` : ""}
        ${objectEntries(artifacts).length ? `
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading"><h2>Artifacts</h2><span>${escapeHtml(objectEntries(artifacts).length)} paths</span></div>
            <ul class="viewer-cdx__list">${renderCdxArtifactRows(artifacts, "No artifact paths reported.")}</ul>
          </section>
        ` : ""}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Findings</h2><span>${escapeHtml(findings.length)} reported</span></div>
          <ul class="viewer-cdx__list">${findingRows || '<li class="viewer-cdx__empty">No structured findings reported.</li>'}</ul>
        </section>
      </div>
    `;
  }

export function renderCdxReportKeyList(rows, emptyText = "No details reported.") {
    const content = rows
      .filter(([_label, value]) => value !== undefined && value !== null && value !== "" && value !== 0)
      .map(([label, value]) => `
        <li class="viewer-cdx__row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </li>
      `).join("");
    return content || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
  }

export function renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal) {
    if (!name || name === "-") {
      return escapeHtml(label);
    }
    const enabled = isCdxSessionEnabled(item);
    const resumeAvailable = item.resume_available === true || item.resumeAvailable === true || item.resumable === true;
    const canHandoff = Boolean(enabled && canLaunchTerminal);
    return `
      <details class="viewer-cdx__menu viewer-cdx__session-menu">
        <summary class="viewer-cdx__path-link viewer-cdx__session-summary" title="CDX session actions for ${escapeHtml(name)}">${escapeHtml(label)}</summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__session-menu-panel" role="menu" aria-label="CDX session actions for ${escapeHtml(name)}">
          ${enabled && canLaunchTerminal ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="new" data-viewer-cdx-session="${escapeHtml(name)}">New</button>` : ""}
          ${enabled && canLaunchTerminal && resumeAvailable ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="resume" data-viewer-cdx-session="${escapeHtml(name)}">Resume</button>` : ""}
          ${canHandoff ? `<button class="viewer-cdx__menu-action" type="button" role="menuitem" data-viewer-cdx-session-action="handoff" data-viewer-cdx-session="${escapeHtml(name)}">Handoff...</button>` : ""}
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--config" type="button" role="menuitem" data-viewer-cdx-session-action="config" data-viewer-cdx-session="${escapeHtml(name)}">Config</button>
          <button class="viewer-cdx__menu-action viewer-cdx__menu-action--danger" type="button" role="menuitem" data-viewer-cdx-session-action="remove" data-viewer-cdx-session="${escapeHtml(name)}">Remove</button>
        </div>
      </details>
    `;
  }

export function renderCdxStructuredLog(parsed) {
    if (!parsed) {
      return "";
    }
    const label = parsed.kind === "jsonl" ? `${parsed.value.length} JSONL event(s)` : "JSON document";
    return `
      <details class="viewer-cdx__log-structured" open>
        <summary>Structured preview · ${escapeHtml(label)}</summary>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(parsed.value)}</div>
      </details>
    `;
  }

export function renderCdxTokenUsage(usage) {
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

export function renderCdxUnreadBadge(section, label, count) {
    const title = cdxSectionBadgeTitle(section, count);
    return `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  }
export function renderCdxUsageGauge(usage, sessionName) {
    if (!sessionName) return "";
    const part = (label, value) => {
      const raw = Number(value?.percent), hasPct = value?.percent !== null && value?.percent !== undefined && Number.isFinite(raw);
      const pct = hasPct ? Math.max(0, Math.min(100, raw)) : 0;
      const resetText = value?.reset && value.reset !== "-" ? ` · resets ${value.reset}` : "";
      return { hasPct, pct, tone: hasPct ? cdxRemainingClass(pct) : "neutral", title: `${label} remaining: ${hasPct ? `${pct}%` : "unknown"}${resetText}` };
    };
    const fiveHour = part("5h", usage?.fiveHour || usage), week = part("week", usage?.week);
    const parts = [
      fiveHour.hasPct ? `<span class="viewer-workshop__usage-segment viewer-workshop__usage--${fiveHour.tone}" title="${escapeHtml(fiveHour.title)}" aria-label="${escapeHtml(fiveHour.title)}"><span class="viewer-workshop__usage-fill" style="height:${fiveHour.pct}%"></span></span>` : "",
      `<span class="viewer-workshop__usage-segment viewer-workshop__usage-segment--week viewer-workshop__usage--${week.tone}" title="${escapeHtml(week.title)}" aria-label="${escapeHtml(week.title)}"><span class="viewer-workshop__usage-fill" style="height:${week.pct}%"></span></span>`
    ].filter(Boolean);
    const title = `CDX usage remaining: ${[fiveHour.hasPct ? fiveHour.title : "", week.title].filter(Boolean).join("; ")} · click to refresh`;
    return `<span class="viewer-workshop__usage" data-viewer-cdx-usage-refresh="${escapeHtml(sessionName)}" role="button" tabindex="0" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${parts.join("")}</span>`;
  }

export function renderCiBadge(value) {
    const tone = ciBadgeTone(value);
    return `<span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(ciBadgeLabel(value))}</span>`;
  }

export function renderCiButtonBadge(payload) {
    const state = payload?.badgeState || payload?.state || "unknown";
    const label = ciBadgeLabel(state);
    const tone = ciBadgeTone(state);
    return `<span class="viewer-ci-badge viewer-ci-badge--${escapeHtml(tone)}" data-viewer-ci-badge title="${escapeHtml(payload?.message || `CI ${label}`)}">${escapeHtml(label)}</span>`;
  }

export function renderCiStatus(payload) {
    const providerLabel = payload?.provider === "gitlab" ? "GitLab CI" : "GitHub Actions";
    if (!payload || !payload.visible) {
      return `
        <div class="viewer-ci">
          ${renderCiModeSwitcher("runs")}
          <div class="viewer-ci__state">${escapeHtml(payload?.message || `${providerLabel} is not configured for this repository.`)}</div>
        </div>
      `;
    }
    const run = payload.run && typeof payload.run === "object" ? payload.run : null;
    const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
    const state = payload.badgeState || run?.badgeState || payload.state || "unknown";
    const matchLabel = run?.matchSource === "head-active"
      ? "Current HEAD running"
      : run?.matchSource === "head-failing"
      ? "Current HEAD failing"
      : run?.matchSource === "head-cancelled"
      ? "Current HEAD cancelled"
      : run?.matchSource === "head-unknown"
      ? "Current HEAD unknown"
      : run?.matchSource === "head"
      ? "Current HEAD"
      : run?.matchSource === "branch-active"
      ? "Branch running"
      : run?.matchSource === "branch-failing"
      ? "Branch failing"
      : "Latest branch run";
    const cards = renderMetricCards([
      ["State", ciBadgeLabel(state)],
      ["Branch", run?.branch || payload.branch || "Unknown"],
      ["Commit", (run?.headSha || payload.headSha || "").slice(0, 7) || "Unknown"],
      ["Match", matchLabel]
    ]);
    const runUrl = run?.htmlUrl ? `<a class="viewer-ci__link" href="${escapeHtml(run.htmlUrl)}" target="_blank" rel="noreferrer">Open in ${escapeHtml(payload?.provider === "gitlab" ? "GitLab" : "GitHub")}</a>` : "";
    const runRows = run ? [
      ["Workflow", run.workflowName || run.name || providerLabel],
      ["Status", `${run.status || "unknown"}${run.conclusion ? ` / ${run.conclusion}` : ""}`],
      ["Event", run.event || "Unknown"],
      ["Commit", run.commitMessage || payload.subject || "Unknown"],
      ["Author", run.author || payload.author || "Unknown"],
      ["Started", formatCiDate(run.runStartedAt || run.createdAt) || "Unknown"],
      ["Updated", formatCiDate(run.updatedAt) || "Unknown"]
    ].map(([label, value]) => `
      <li class="viewer-ci__row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("") : `<li class="viewer-ci__empty">${escapeHtml(payload.message || `No ${providerLabel} run found for this branch.`)}</li>`;
    const jobRows = jobs.length ? jobs.map((job) => {
      const jobState = ciBadgeTone(job.conclusion || job.status);
      const content = `
        <span>${escapeHtml(job.name || "Job")}</span>
        <strong>${escapeHtml([job.status, job.conclusion].filter(Boolean).join(" / ") || "unknown")}</strong>
      `;
      return `<li class="viewer-ci__job viewer-ci__job--${escapeHtml(jobState)}">${job.htmlUrl ? `<a href="${escapeHtml(job.htmlUrl)}" target="_blank" rel="noreferrer">${content}</a>` : content}</li>`;
    }).join("") : `<li class="viewer-ci__empty">No job details reported.</li>`;
    return `
      <div class="viewer-ci">
        ${renderCiModeSwitcher("runs")}
        <div class="viewer-ci__summary">${cards}</div>
        <div class="viewer-ci__workspace">
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Latest run</h2>${renderCiBadge(state)}</div>
            <ul class="viewer-ci__list">${runRows}</ul>
            ${runUrl}
          </section>
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Jobs</h2><span>${escapeHtml(jobs.length)} reported</span></div>
            <ul class="viewer-ci__jobs">${jobRows}</ul>
          </section>
        </div>
      </div>
    `;
  }

export function renderCodeViewer(content, options = {}) {
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

export function renderDocRows(items, emptyText = "None", limit = 6) {
    if (!items.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = items.map((item, index) => {
      const path = item.relPath || item.path || "";
      const control = path && isSafeLogicsDocPath(path)
        ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(item.id || path)}</button>`
        : `<span class="viewer-insights__doc">${escapeHtml(item.id || path || item.title)}</span>`;
      return `
        <li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>
          ${control}
          <span>${escapeHtml(item.indicators?.Status || item.stage || "No status")}</span>
        </li>
      `;
    });
    const hiddenCount = Math.max(0, items.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
  }

export function renderGitBadge(kind, count) {
    const value = Number(count || 0);
    if (value <= 0) {
      return "";
    }
    const labels = {
      commits: `${value} commits locaux non pushés`,
      "commits-behind": `${value} commits distants non récupérés`,
      files: `${value} fichiers modifiés non commités`
    };
    const label = labels[kind] || "";
    return `<span class="viewer-git-badge viewer-git-badge--${kind}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(value)}</span>`;
  }

export function renderGitSummaryCard(label, value) {
    return `
      <div class="viewer-insights__card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `;
  }

export function renderGitSummarySegments(label, segments) {
    return `
      <div class="viewer-insights__card viewer-git__summary-card">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-git__summary-segments">
          ${segments.map(([segmentLabel, value]) => `
            <span class="viewer-git__summary-segment">
              <span>${escapeHtml(segmentLabel)}</span>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `).join("")}
        </div>
      </div>
    `;
  }

export function renderHealthSummary(lintData, auditData) {
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

export function renderInsightRows(items, emptyText = "No signals") {
    if (!items.length) {
      return `<li class="viewer-insights__item">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(([label, value]) => `
      <li class="viewer-insights__item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("");
  }

export function renderMetricCards(entries) {
    return entries.map(([label, value, tone]) => `
      <div class="viewer-insights__card${tone ? ` viewer-insights__card--${escapeHtml(tone)}` : ""}">
        <div class="viewer-insights__label">${escapeHtml(label)}</div>
        <div class="viewer-insights__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
  }

export function renderPathRows(paths, emptyText = "None", limit = 6) {
    if (!paths.length) {
      return `<li class="viewer-insights__row viewer-insights__row--empty">${escapeHtml(emptyText)}</li>`;
    }
    const rows = paths.map((path, index) => {
      const control = isSafeLogicsDocPath(path)
        ? `<button class="viewer-insights__doc" type="button" data-viewer-doc-path="${escapeHtml(path)}">${escapeHtml(path)}</button>`
        : `<span class="viewer-insights__doc">${escapeHtml(path)}</span>`;
      return `<li class="viewer-insights__row" ${index >= limit ? "hidden data-viewer-hidden-row" : ""}>${control}</li>`;
    });
    const hiddenCount = Math.max(0, paths.length - limit);
    if (hiddenCount > 0) {
      rows.push(`<li class="viewer-insights__row"><button class="viewer-insights__reveal" type="button" data-viewer-reveal>Show ${hiddenCount} more</button></li>`);
    }
    return rows.join("");
  }

export function renderProjectPickerModalBody(body, payload) {
    if (!(body instanceof HTMLElement)) return;
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const path = String(payload.path || "");
    const rows = entries.map((entry) => `
      <button class="viewer-project-picker__row" type="button" data-viewer-project-picker-open="${escapeHtml(entry.path || "")}">
        <span>${escapeHtml(entry.name || entry.path || "folder")}</span>
        <em>${entry.hasLogics ? "Logics" : "folder"}</em>
      </button>
    `).join("");
    body.innerHTML = `
      <div class="viewer-project-picker">
        <div class="viewer-project-picker__meta">
          <strong>${escapeHtml(payload.selectedPath || payload.root || "/")}</strong>
          <span>${path ? "Browse a child folder or select this folder." : "Browse from the local project area."}</span>
        </div>
        <div class="viewer-project-picker__actions">
          <button class="btn" type="button" data-viewer-project-picker-open="${escapeHtml(payload.parentPath || "")}"${path ? "" : " disabled"}>Parent</button>
          <button class="btn primary" type="button" data-viewer-project-picker-select="${escapeHtml(path)}">Select this folder</button>
        </div>
        <div class="viewer-project-picker__list">${rows || '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span>No child folders.</span></div>'}</div>
      </div>
    `;
  }

export function renderReleaseGate(gate) {
    const status = String(gate?.status || "pending");
    const tone = releaseBadgeTone(status);
    const reason = gate?.blocking_reason ? `<div class="viewer-release__reason">${escapeHtml(gate.blocking_reason)}</div>` : "";
    return `
      <details class="viewer-release__gate">
        <summary>
          <span>
            <strong>${escapeHtml(gate?.id || "gate")}</strong>
            <em>${escapeHtml(gate?.state || "")}${gate?.required === false ? " · optional" : ""}</em>
          </span>
          <span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(status)}</span>
        </summary>
        ${reason}
        <ul class="viewer-ci__list">${releaseEvidenceRows(gate?.evidence)}</ul>
      </details>
    `;
  }

export function renderReleaseRunSection(runsPayload) {
    if (!runsPayload || !runsPayload.visible) {
      const message = runsPayload?.message || "Release workflow runs are not available for this repository.";
      return `
        <section class="viewer-ci__section">
          <div class="viewer-ci__heading"><h2>Latest release run</h2></div>
          <ul class="viewer-ci__list"><li class="viewer-ci__empty">${escapeHtml(message)}</li></ul>
        </section>
      `;
    }
    const run = runsPayload.run && typeof runsPayload.run === "object" ? runsPayload.run : null;
    const jobs = Array.isArray(runsPayload.jobs) ? runsPayload.jobs : [];
    const state = runsPayload.badgeState || run?.badgeState || runsPayload.state || "unknown";
    const runUrl = run?.htmlUrl ? `<a class="viewer-ci__link" href="${escapeHtml(run.htmlUrl)}" target="_blank" rel="noreferrer">Open in GitHub</a>` : "";
    const runRows = run ? [
      ["Workflow", run.workflowName || run.name || "Release"],
      ["Status", `${run.status || "unknown"}${run.conclusion ? ` / ${run.conclusion}` : ""}`],
      ["Tag / ref", run.branch || "Unknown"],
      ["Event", run.event || "Unknown"],
      ["Commit", run.commitMessage || "Unknown"],
      ["Started", formatCiDate(run.runStartedAt || run.createdAt) || "Unknown"],
      ["Updated", formatCiDate(run.updatedAt) || "Unknown"],
    ].map(([label, value]) => `
      <li class="viewer-ci__row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></li>
    `).join("") : `<li class="viewer-ci__empty">${escapeHtml(runsPayload.message || "No release workflow run found.")}</li>`;
    const jobRows = jobs.length ? jobs.map((job) => {
      const jobState = ciBadgeTone(job.conclusion || job.status);
      const content = `
        <span>${escapeHtml(job.name || "Job")}</span>
        <strong>${escapeHtml([job.status, job.conclusion].filter(Boolean).join(" / ") || "unknown")}</strong>
      `;
      return `<li class="viewer-ci__job viewer-ci__job--${escapeHtml(jobState)}">${job.htmlUrl ? `<a href="${escapeHtml(job.htmlUrl)}" target="_blank" rel="noreferrer">${content}</a>` : content}</li>`;
    }).join("") : `<li class="viewer-ci__empty">No job details reported.</li>`;
    const activeNote = Number(runsPayload.activeCount) > 0 ? `<span>${escapeHtml(String(runsPayload.activeCount))} active</span>` : "";
    return `
      <section class="viewer-ci__section">
        <div class="viewer-ci__heading"><h2>Latest release run</h2>${renderCiBadge(state)}</div>
        <ul class="viewer-ci__list">${runRows}</ul>
        ${runUrl}
      </section>
      <section class="viewer-ci__section">
        <div class="viewer-ci__heading"><h2>Release jobs</h2>${activeNote || `<span>${escapeHtml(String(jobs.length))} reported</span>`}</div>
        <ul class="viewer-ci__jobs">${jobRows}</ul>
      </section>
    `;
  }

export function renderReleaseRunsButtonBadge(payload) {
    const state = payload?.badgeState || payload?.state || "unknown";
    const tone = ciBadgeTone(state);
    const stateLabel = ciBadgeLabel(state);
    // Prefer the release version (tag) as the badge label; fall back to the
    // state label when no version is available (e.g. no runs yet).
    const version = String(payload?.version || payload?.run?.version || "").trim();
    const label = version || stateLabel;
    const title = payload?.message || (version ? `Release ${version} (${stateLabel})` : `Release ${stateLabel}`);
    return `<span class="viewer-ci-badge viewer-ci-badge--${escapeHtml(tone)}" data-viewer-release-badge title="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  }

export function renderReleaseStatus(payload, runsPayload) {
    const state = payload?.state || "not_configured";
    const gates = Array.isArray(payload?.gates) ? payload.gates : [];
    const blockedGate = gates.find((gate) => gate && gate.required !== false && gate.blocking_reason);
    const cards = renderMetricCards([
      ["State", state],
      ["Version", payload?.target_version || "Unknown"],
      ["Blocked gate", blockedGate?.id || "None"],
      ["Evidence", `${gates.filter((gate) => gate?.evidence).length}/${gates.length}`],
    ]);
    const gateRows = gates.length ? gates.map(renderReleaseGate).join("") : `
      <div class="viewer-ci__empty">${escapeHtml(payload?.next_action || "Add logics/release/contract.json to configure release workflow state.")}</div>
    `;
    return `
      <div class="viewer-release">
        ${renderCiModeSwitcher("release")}
        <div class="viewer-ci__summary">${cards}</div>
        <div class="viewer-ci__workspace viewer-release__workspace">
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Release state</h2><span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(releaseBadgeTone(state))}">${escapeHtml(state)}</span></div>
            <ul class="viewer-ci__list">
              <li class="viewer-ci__row"><span>Contract</span><strong>${escapeHtml(payload?.configured ? payload.contract_path || "configured" : "not configured")}</strong></li>
              <li class="viewer-ci__row"><span>Commit</span><strong>${escapeHtml(payload?.commit ? String(payload.commit).slice(0, 12) : "unknown")}</strong></li>
              <li class="viewer-ci__row"><span>Next action</span><strong>${escapeHtml(payload?.next_action || "Inspect release workflow state.")}</strong></li>
            </ul>
          </section>
          ${renderReleaseRunSection(runsPayload)}
          <section class="viewer-ci__section">
            <div class="viewer-ci__heading"><h2>Gates</h2><span>${escapeHtml(String(gates.length))} configured</span></div>
            <div class="viewer-release__gates">${gateRows}</div>
          </section>
        </div>
      </div>
    `;
  }

export function renderSignalRows(items, emptyText = "No signals") {
    if (!items.length) {
      return `<li class="viewer-insights__signal viewer-insights__signal--empty">${escapeHtml(emptyText)}</li>`;
    }
    return items.map(([label, value, tone]) => `
      <li class="viewer-insights__signal${tone ? ` viewer-insights__signal--${escapeHtml(tone)}` : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </li>
    `).join("");
  }

export function renderTextRemaining(item) {
    const percent = cdxRemainingPct(item);
    return percent === null ? "" : `${percent}% remaining`;
  }

export function renderWorkspaceBreadcrumb(currentPath) {
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

export function renderWorkspaceTree(treePayload, selectedPath = "") {
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

export function returnToProjectSurface() {
    const activityToggle = document.getElementById("activity-toggle");
    if (activityPanelIsOpen() && activityToggle instanceof HTMLElement) {
      activityToggle.click();
    }
    document.body?.classList.remove("viewer-screen-activity");
    document.body?.classList.add("viewer-screen-project");
  }

export function runtimeStatusSignature(payload) {
    return stableStringify(payload || {});
  }

export function setNavMenuBadges(target, html) {
    const item = navMenuItem(target);
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.querySelector("[data-viewer-menu-badges]")?.remove();
    if (html) {
      item.insertAdjacentHTML("beforeend", `<span class="viewer-nav-menu__badges" data-viewer-menu-badges>${html}</span>`);
    }
  }

export function setupCdxImportExportHandlers() {
    const importBtn = document.getElementById("viewer-cdx-import-btn");
    if (importBtn) {
      importBtn.addEventListener("click", async () => {
        const fileInput = document.getElementById("viewer-cdx-import-file");
        const passInput = document.getElementById("viewer-cdx-import-pass");
        const mergeCheck = document.getElementById("viewer-cdx-import-merge");
        const forceCheck = document.getElementById("viewer-cdx-import-force");
        const statusEl = document.getElementById("viewer-cdx-import-status");
        const file = fileInput?.files?.[0];
        if (!file) { showCdxFormStatus(statusEl, "error", "Please select a file."); return; }
        importBtn.disabled = true;
        showCdxFormStatus(statusEl, "info", "Importing…");
        try {
          const fileBase64 = await fileToBase64(file);
          const response = await fetch("/api/cdx-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileBase64,
              passphrase: passInput?.value || "",
              merge: mergeCheck?.checked ?? true,
              force: forceCheck?.checked ?? false
            }),
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok) {
            showCdxFormStatus(statusEl, "ok", data.payload?.message || "Import complete.");
            if (fileInput) fileInput.value = "";
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || `Import failed (HTTP ${response.status}).`);
          }
        } catch (err) {
          showCdxFormStatus(statusEl, "error", err?.message || "Import failed.");
        } finally {
          importBtn.disabled = false;
        }
      });
    }

    const exportBtn = document.getElementById("viewer-cdx-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const passInput = document.getElementById("viewer-cdx-export-pass");
        const authCheck = document.getElementById("viewer-cdx-export-auth");
        const allCheck = document.getElementById("viewer-cdx-export-all");
        const statusEl = document.getElementById("viewer-cdx-export-status");
        exportBtn.disabled = true;
        showCdxFormStatus(statusEl, "info", "Exporting…");
        const sessions = allCheck?.checked
          ? []
          : Array.from(document.querySelectorAll(".viewer-cdx__export-session:checked")).map((el) => el.value);
        try {
          const response = await fetch("/api/cdx-export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessions, passphrase: passInput?.value || "", includeAuth: authCheck?.checked ?? true }),
          });
          const data = await response.json().catch(() => ({}));
          if (response.ok && data.ok) {
            downloadBase64File(data.payload?.fileBase64 || "", data.payload?.filename || "cdx-accounts.cdx");
            showCdxFormStatus(statusEl, "ok", "Export ready — file downloaded.");
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || `Export failed (HTTP ${response.status}).`);
          }
        } catch (err) {
          showCdxFormStatus(statusEl, "error", err?.message || "Export failed.");
        } finally {
          exportBtn.disabled = false;
        }
      });
    }

    const exportAllCheck = document.getElementById("viewer-cdx-export-all");
    if (exportAllCheck) {
      exportAllCheck.addEventListener("change", () => {
        const sessionBoxes = document.querySelectorAll(".viewer-cdx__export-session");
        sessionBoxes.forEach((cb) => { cb.disabled = exportAllCheck.checked; });
      });
    }
  }

export function showRequestDraftModal() {
    return new Promise((resolve) => {
      const modal = createThemedModal({
        title: "New request",
        message: "",
        submitLabel: "Create request"
      });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const fields = [
        { id: "title", label: "Title", placeholder: "Short request title", type: "input", required: false },
        { id: "intent", label: "Need", placeholder: "What should change, and why?", type: "textarea", required: true },
        { id: "context", label: "Context", placeholder: "Constraints, links, scope notes, or acceptance hints", type: "textarea", required: false }
      ];
      const controls = new Map();
      fields.forEach((field) => {
        const wrapper = document.createElement("label");
        wrapper.className = "viewer-themed-modal__field";
        const label = document.createElement("span");
        label.className = "viewer-themed-modal__label";
        label.textContent = field.label;
        const control = field.type === "textarea" ? document.createElement("textarea") : document.createElement("input");
        control.className = "viewer-themed-modal__input";
        control.placeholder = field.placeholder;
        if (field.type === "textarea") {
          control.rows = field.id === "intent" ? 5 : 4;
        } else {
          control.type = "text";
        }
        if (field.required) {
          control.required = true;
        }
        wrapper.append(label, control);
        body?.appendChild(wrapper);
        controls.set(field.id, control);
      });
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      const submit = () => {
        const draft = {
          title: String(controls.get("title")?.value || "").trim(),
          intent: String(controls.get("intent")?.value || "").trim(),
          context: String(controls.get("context")?.value || "").trim()
        };
        if (!draft.intent) {
          const need = controls.get("intent");
          if (need instanceof HTMLElement) {
            need.focus();
          }
          return;
        }
        done(draft);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", submit);
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          done(null);
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          submit();
        }
      });
      window.setTimeout(() => {
        const titleInput = controls.get("title");
        if (titleInput instanceof HTMLElement) {
          titleInput.focus();
        }
      }, 0);
    });
  }

export function showThemedChoiceModal({ title, message, options, value, submitLabel = "Apply" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const select = document.createElement("select");
      select.className = "viewer-themed-modal__select";
      for (const option of options) {
        const element = document.createElement("option");
        element.value = option;
        element.textContent = option;
        select.appendChild(element);
      }
      select.value = value && options.includes(value) ? value : (options[0] || "");
      body?.appendChild(select);
      const done = (nextValue) => {
        closeThemedModal(modal);
        resolve(nextValue);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(select.value));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter") done(select.value);
      });
      window.setTimeout(() => {
        select.focus();
      }, 0);
    });
  }

export function showThemedConfirmModal({ title, message, submitLabel = "Confirm", cancelLabel = "Cancel" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel, cancelLabel });
      const done = (confirmed) => {
        closeThemedModal(modal);
        resolve(Boolean(confirmed));
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(true));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(false));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(false));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(false);
        if (event.key === "Enter") done(true);
      });
      window.setTimeout(() => {
        const submit = modal.querySelector(".viewer-themed-modal__submit");
        if (submit instanceof HTMLButtonElement) submit.focus();
      }, 0);
    });
  }

export function showThemedInputModal({ title, message, defaultValue = "", placeholder = "", submitLabel = "OK", inputMode = "text", maxLength = 0 }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel });
      const body = modal.querySelector(".viewer-themed-modal__body");
      const input = document.createElement("input");
      input.className = "viewer-themed-modal__input";
      input.type = "text";
      input.value = defaultValue;
      input.placeholder = placeholder;
      input.inputMode = inputMode;
      if (maxLength > 0) input.maxLength = maxLength;
      body?.appendChild(input);
      const done = (value) => {
        closeThemedModal(modal);
        resolve(value);
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", () => done(input.value));
      modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", () => done(null));
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", () => done(null));
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") done(null);
        if (event.key === "Enter") done(input.value);
      });
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  }

export function showThemedMessageModal({ title, message, submitLabel = "OK" }) {
    return new Promise((resolve) => {
      const modal = createThemedModal({ title, message, submitLabel, cancelLabel: "Close" });
      const cancel = modal.querySelector(".viewer-themed-modal__cancel");
      if (cancel instanceof HTMLButtonElement) cancel.hidden = true;
      const done = () => {
        closeThemedModal(modal);
        resolve();
      };
      modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", done);
      modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", done);
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape" || event.key === "Enter") done();
      });
      window.setTimeout(() => {
        const submit = modal.querySelector(".viewer-themed-modal__submit");
        if (submit instanceof HTMLButtonElement) submit.focus();
      }, 0);
    });
  }

export function sortCdxSessionsByRemaining(entries) {
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

export function updateCdxSessionEntry(item, sessionName, enable) {
    if (!item || typeof item !== "object" || cdxSessionName(item) !== sessionName) {
      return false;
    }
    item.enabled = enable;
    item.status = enable ? "enabled" : "disabled";
    if ("state" in item) {
      item.state = enable ? "enabled" : "disabled";
    }
    if (!enable && "active" in item) {
      item.active = false;
    }
    return true;
  }

export function updateCdxSessionPermissionEntry(item, sessionName, permission) {
    if (!item || typeof item !== "object" || cdxSessionName(item) !== sessionName) {
      return false;
    }
    item.permission = permission;
    item.permission_mode = permission;
    item.permissionMode = permission;
    return true;
  }

export function viewerStateSignature(payload) {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const projects = Array.isArray(payload?.projects) ? payload.projects : [];
    return stableStringify({
      root: payload?.root || "",
      repository: payload?.repository || {},
      capabilities: normalizeCapabilities(payload),
      bootstrapWarning: payload?.bootstrapWarning || null,
      environmentWarning: payload?.environmentWarning || null,
      projects: projects.map((project) => ({
        id: project?.id || "",
        active: Boolean(project?.active),
        available: project?.available !== false,
        hasLogics: project?.hasLogics !== false,
        root: project?.root || ""
      })),
      items: items.map((item) => ({
        id: item?.id || "",
        relPath: item?.relPath || "",
        stage: item?.stage || "",
        status: item?.indicators?.Status || item?.status || "",
        updatedAt: item?.updatedAt || ""
      }))
    });
  }

export function captureLanTokenFromUrl() {
    try {
      const url = new URL(window.location.href);
      const queryToken = url.searchParams.get("t");
      if (queryToken) {
        const previousToken = window.sessionStorage.getItem(lanTokenKey) || "";
        if (previousToken !== queryToken) {
          clearDeviceCredentials();
        }
        window.sessionStorage.setItem(lanTokenKey, queryToken);
        url.searchParams.delete("t");
        const cleaned = `${url.pathname}${url.search}${url.hash}`;
        window.history.replaceState(null, "", cleaned || "/");
      }
    } catch {
      // sessionStorage / history may be unavailable in some embed contexts.
    }
  }

export function clearDeviceCredentials() {
    try {
      window.localStorage.removeItem(deviceTokenKey);
      window.localStorage.removeItem(deviceIdKey);
      window.localStorage.removeItem(deviceLabelKey);
    } catch { /* noop */ }
  }

export function detectHljsLanguage(path) {
    const file = String(path || "").split(/[\\/]/).pop() || "";
    const lower = file.toLowerCase();
    if (lower === "dockerfile") return "dockerfile";
    if (lower === "makefile") return "makefile";
    const ext = lower.includes(".") ? lower.split(".").pop() : "";
    return HLJS_EXT_LANGUAGE[ext] || "";
  }

export function getActiveToken() {
    return getDeviceToken() || getLanToken();
  }

export function getDeviceToken() {
    try {
      return window.localStorage.getItem(deviceTokenKey) || "";
    } catch {
      return "";
    }
  }

export function getLanToken() {
    try {
      return window.sessionStorage.getItem(lanTokenKey) || "";
    } catch {
      return "";
    }
  }

export function normalizeAutoRefreshIntervalSeconds(value) {
    const seconds = Math.round(Number(value));
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return defaultAutoRefreshIntervalMs / 1000;
    }
    return Math.min(maxAutoRefreshIntervalSeconds, Math.max(minAutoRefreshIntervalSeconds, seconds));
  }

export function nudgeWorkshopTerminalRedraw(entry) {
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

export function readStoredState() {
    try {
      return JSON.parse(window.localStorage.getItem(stateKey) || "null");
    } catch {
      return null;
    }
  }

export function readViewerPreferences() {
    try {
      const value = JSON.parse(window.localStorage.getItem(preferenceKey) || "null");
      if (!value || typeof value !== "object" || value.version !== preferenceVersion) {
        return { version: preferenceVersion };
      }
      return { ...value, version: preferenceVersion };
    } catch {
      return { version: preferenceVersion };
    }
  }

export function refreshLanBannerPairingState() {
    const banner = document.getElementById("viewer-lan-banner");
    const pairButton = document.getElementById("viewer-lan-banner-pair");
    const pairedLabel = document.getElementById("viewer-lan-banner-paired");
    const deviceLabel = (() => {
      try { return window.localStorage.getItem(deviceLabelKey) || ""; } catch { return ""; }
    })();
    const hasDeviceToken = Boolean(getDeviceToken());
    if (banner instanceof HTMLElement && hasDeviceToken) {
      banner.hidden = true;
    }
    if (pairButton instanceof HTMLButtonElement) {
      pairButton.hidden = !window.__logicsLanRwEnabled || hasDeviceToken;
    }
    if (pairedLabel instanceof HTMLElement) {
      if (hasDeviceToken && deviceLabel) {
        pairedLabel.hidden = false;
        pairedLabel.textContent = `Paired as ${deviceLabel}`;
      } else {
        pairedLabel.hidden = true;
        pairedLabel.textContent = "";
      }
    }
  }

export function renderCdxHistoryControls(visibleColumns, knownSessions, sessionFilter) {
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

export function renderCdxLogPreview(payload) {
    const path = payload?.path || "";
    const content = payload?.content || "";
    const truncated = Boolean(payload?.truncated);
    const parsed = parseCdxLogJson(content);
    return `
      <div class="viewer-cdx">
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Log preview</h2><span>${truncated ? "latest output" : "complete file"}</span></div>
          <div class="viewer-cdx__log-preview">
            <div class="viewer-cdx__meta">${escapeHtml(path)}</div>
            ${truncated ? '<div class="viewer-cdx__state viewer-cdx__state--warn">Preview truncated to the end of the file. Open the file externally for the full log.</div>' : ""}
            ${renderCdxStructuredLog(parsed)}
            <details class="viewer-cdx__log-raw"${parsed ? "" : " open"}>
              <summary>Raw log</summary>
              ${content
                ? renderCodeViewer(content, { language: detectHljsLanguage(path), truncated })
                : '<pre class="viewer-cdx__log-content">Log is empty.</pre>'}
            </details>
          </div>
        </section>
      </div>
    `;
  }

export function renderCdxRunControls(visibleColumns, knownSessions, sessionFilter) {
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

export function renderCdxStatusControls(knownProviders, knownSessions, visibleColumns, providerFilter) {
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

export function renderViewerOnboarding() {
    const stages = onboardingStages.map((stage, index) => {
      const prompts = stage.prompts.map((prompt) => `
        <div class="viewer-onboarding__prompt">
          <div class="viewer-onboarding__prompt-label">Example prompt</div>
          <div class="viewer-onboarding__prompt-text">${escapeHtml(prompt)}</div>
        </div>
      `).join("");
      const actions = stage.actions.map((action) => `
        <button class="btn viewer-onboarding__action" type="button" data-viewer-onboarding-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>
      `).join("");
      return `
        <section class="viewer-onboarding__stage">
          <div class="viewer-onboarding__stage-number" aria-hidden="true">${index + 1}</div>
          <div class="viewer-onboarding__stage-body">
            <h2>${escapeHtml(stage.label)}</h2>
            <p class="viewer-onboarding__tagline">${escapeHtml(stage.tagline)}</p>
            <p>${escapeHtml(stage.description)}</p>
            <div class="viewer-onboarding__prompts">${prompts}</div>
            <p class="viewer-onboarding__mapping">${escapeHtml(stage.mapping)}</p>
            ${actions ? `<div class="viewer-onboarding__actions">${actions}</div>` : ""}
          </div>
        </section>
      `;
    }).join("");
    const docs = onboardingDocGuide.map(([cue, destination]) => `
      <div class="viewer-onboarding__doc-card">
        <div>${escapeHtml(cue)}</div>
        <strong>${escapeHtml(destination)}</strong>
      </div>
    `).join("");
    return `
      <div class="viewer-onboarding">
        <header class="viewer-onboarding__header">
          <h1>Logics in four steps</h1>
          <p>Logics is a lightweight delivery workflow that keeps project context in plain Markdown: readable by humans, diffable in git, and usable by AI assistants without re-explaining history every time.</p>
        </header>
        <div class="viewer-onboarding__stages">${stages}</div>
        <section class="viewer-onboarding__doc-guide">
          <h2>What each document is for</h2>
          <p>A quick rule of thumb for choosing the right artifact before writing.</p>
          <div class="viewer-onboarding__doc-grid">${docs}</div>
        </section>
        <footer class="viewer-onboarding__footer">
          <button class="btn primary" type="button" data-viewer-onboarding-action="open-logics-insights">Open Insights</button>
          <button class="btn" type="button" data-viewer-onboarding-action="health">Open Health</button>
          <button class="btn" type="button" data-viewer-onboarding-action="workshop-explorer">Open Explorer</button>
        </footer>
      </div>
    `;
  }

export function renderWorkshopTabs(activeTab) {
    const buttons = workshopTabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return `<button class="viewer-cdx__mode${isActive ? " is-active" : ""}" type="button" role="tab" aria-selected="${isActive ? "true" : "false"}" data-viewer-workshop-tab="${escapeHtml(tab.id)}" title="${escapeHtml(tab.title)}">${escapeHtml(tab.label)}</button>`;
    }).join("");
    return `<div class="viewer-cdx__modes" role="tablist" aria-label="Workshop sub-screens">${buttons}</div>`;
  }

export function renderWorkspace(treePayload, previewPayload) {
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

export function renderWorkspacePreview(previewPayload) {
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
    `;
  }

export function resizeWorkshopTerminal(sessionId, rows, cols) {
    if (!sessionId || rows <= 0 || cols <= 0) return;
    const safeRows = Math.max(rows, WORKSHOP_TERMINAL_MIN_ROWS);
    const safeCols = Math.max(cols, WORKSHOP_TERMINAL_MIN_COLS);
    fetch("/api/workshop-terminal-resize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, rows: safeRows, cols: safeCols }),
    }).catch(() => { /* noop */ });
  }

export function sanitizeViewerFilterState(value) {
    const nextState = { ...defaultFilterState };
    if (!value || typeof value !== "object") {
      return nextState;
    }
    Object.keys(defaultFilterState).forEach((key) => {
      if (typeof value[key] === "string" && value[key]) {
        nextState[key] = value[key];
      }
    });
    return nextState;
  }

export function setDeviceCredentials({ token, deviceId, label }) {
    try {
      window.localStorage.setItem(deviceTokenKey, token || "");
      window.localStorage.setItem(deviceIdKey, deviceId || "");
      window.localStorage.setItem(deviceLabelKey, label || "");
    } catch { /* noop */ }
  }

export async function startDevicePairing() {
    const defaultLabel = String(window.navigator?.platform || "").trim() || "LAN device";
    const label = String(await showThemedInputModal({
      title: "Pair device",
      message: "Name this browser so the host can identify it before granting write access.",
      defaultValue: defaultLabel,
      placeholder: "Windows test",
      submitLabel: "Request PIN"
    }) || "").trim();
    if (!label) return;
    let pairingId = "";
    try {
      const startResponse = await fetch("/api/lan/pair/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const startData = await startResponse.json();
      if (!startResponse.ok || !startData.ok) {
        await showThemedMessageModal({ title: "Pairing refused", message: String(startData.error || startResponse.status) });
        return;
      }
      pairingId = String(startData.payload?.pairingId || "");
    } catch (err) {
      await showThemedMessageModal({ title: "Pairing failed", message: String(err?.message || err) });
      return;
    }
    const pin = String(await showThemedInputModal({
      title: "Enter pairing PIN",
      message: "Enter the 6-digit PIN displayed on the host terminal.",
      placeholder: "000000",
      submitLabel: "Pair device",
      inputMode: "numeric",
      maxLength: 6
    }) || "").trim();
    if (!pin) return;
    try {
      const completeResponse = await fetch("/api/lan/pair/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingId, pin, label }),
      });
      const completeData = await completeResponse.json();
      if (!completeResponse.ok || !completeData.ok) {
        await showThemedMessageModal({ title: "Pairing failed", message: String(completeData.error || completeResponse.status) });
        return;
      }
      setDeviceCredentials({
        token: String(completeData.payload?.deviceToken || ""),
        deviceId: String(completeData.payload?.deviceId || ""),
        label: String(completeData.payload?.label || label),
      });
      refreshLanBannerPairingState();
      await showThemedMessageModal({
        title: "Device paired",
        message: `Paired as ${completeData.payload?.label || label}. Write access is enabled on this device.`
      });
    } catch (err) {
      await showThemedMessageModal({ title: "Pairing failed", message: String(err?.message || err) });
    }
  }

export function syncWorkshopTerminalSize(entry, { useHysteresis = false } = {}) {
    if (!entry || !entry.terminal || !entry.fitAddon) return;
    try {
      // proposeDimensions() measures the host WITHOUT resizing; fit() would
      // resize xterm immediately to the raw (possibly sub-floor) dimensions.
      // Under hysteresis we then skip pushing that size to the PTY, so xterm
      // sits at one width while the PTY stays at another and the app wraps
      // against the wider grid (the overflow/ghosting bug). Decide from the
      // measurement first, then resize xterm and the PTY together to the same
      // clamped value so they can never diverge.
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

export function updateDocumentBadge(stage) {
    const badge = document.getElementById("viewer-document-badge");
    if (!(badge instanceof HTMLElement)) {
      return;
    }
    const normalized = String(stage || "").trim().toLowerCase();
    const label = stageBadgeLabels[normalized];
    if (!label) {
      badge.hidden = true;
      badge.textContent = "";
      badge.removeAttribute("data-stage");
      return;
    }
    badge.textContent = label;
    badge.dataset.stage = normalized;
    badge.title = `${label} document`;
    badge.hidden = false;
  }

export function withLanAuthorization(input, init) {
    const token = getActiveToken();
    if (!token) return init;
    const next = init ? { ...init } : {};
    const headers = new Headers(next.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    next.headers = headers;
    return next;
  }

export function writeActivityStateForRoot(baseState, root, activityState) {
    const key = activityRootKey(root);
    const previousByRoot = baseState.activityByRoot && typeof baseState.activityByRoot === "object" ? baseState.activityByRoot : {};
    return {
      ...baseState,
      activityByRoot: {
        ...previousByRoot,
        [key]: {
          activitySnapshot: activityState.activitySnapshot && typeof activityState.activitySnapshot === "object" ? activityState.activitySnapshot : {},
          activityHistory: Array.isArray(activityState.activityHistory) ? activityState.activityHistory.slice(0, activityStorageLimit) : []
        }
      }
    };
  }

export function writeStoredState(value) {
    window.localStorage.setItem(stateKey, JSON.stringify(value || null));
  }
