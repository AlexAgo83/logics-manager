/**
 * The cdx screen: status, runs, history, disk, memory and missions.
 *
 * Lifted out of the browser host by req_311. It was 1979 lines of a file that also held
 * the viewer, git and the workshop, and it turned out to be the separable one: measured
 * against the host's shared state it touched exactly one binding it did not own,
 * `viewerPreferences`, which it only reads. Its own state moved with it and is private
 * here; everything the viewer owns is reached through `host`.
 *
 * The factory returns its functions by name so the host can destructure them back into
 * scope, which is what let 43 call sites move without being touched.
 */
import {
  cdxHistoryColumns,
  cdxRunColumns,
  cdxStatusColumns,
} from "./constants.js";
import {
  cdxHistorySessionName,
  cdxKnownProviders,
  cdxProviderName,
  cdxProviders,
  cdxRows,
  cdxRunSessionName,
  cdxSessions,
  clearNavMenuBadges,
  detectHljsLanguage,
  escapeHtml,
  knownCdxHistorySessions,
  knownCdxRunSessions,
  pickFirstArray,
  preserveActiveCdxMenu,
  renderCdxUsageGauge,
  renderCodeViewer,
  runtimeStatusSignature,
  setNavMenuBadges,
  showThemedChoiceModal,
  showThemedMessageModal,
} from "./render.js";
import {
  activeCdxInteractionMenu,
  applyCdxBadge,
  asArray,
  cdxBadgeLabel,
  cdxField,
  cdxHistoryList,
  cdxLabel,
  cdxMissionActionControls,
  cdxMissionCatalog,
  cdxMissionTerminalProgressScript,
  cdxPct,
  cdxPermissionValues,
  cdxRemainingClass,
  cdxRemainingPct,
  cdxReportMissionOutput,
  cdxReportSummary,
  cdxRunStatusDetail,
  cdxRunsList,
  cdxSectionBadgeTitle,
  cdxStateClass,
  cdxUsageNumber,
  closeThemedModal,
  createThemedModal,
  downloadBase64File,
  fileToBase64,
  formatCdxCredits,
  formatCdxDuration,
  formatCdxTokenUsage,
  formatRelativeTime,
  isAbortError,
  markdownApi,
  navMenuItem,
  objectEntries,
  parseCdxDate,
  parseCdxLogJson,
  pickFirstObject,
  renderCdxModeSwitcher,
  showCdxFormStatus,
} from "./util.js";

// Rendering whose only consumer is this screen, moved here by req_312: it sat in the
// module every surface imports while serving one caller, and it holds no state.
// Only the exports no other module reaches move; sweeping to a fixed point pulls in
// rendering the host still routes through, and 30 tests said so.
function activeCdxAssistantCountFromPayload(payload) {
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

function activeCdxRunCountFromPayload(payload) {
    if (!payload || payload.state !== "ok" || !Array.isArray(payload.runs)) {
      return 0;
    }
    return payload.runs.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
  }

function cdxHistoryIdentity(entry) {
    return [
      cdxField(entry, ["started_at", "startedAt", "created_at", "createdAt"], ""),
      cdxHistorySessionName(entry),
      cdxField(entry, ["action"], ""),
      cdxField(entry, ["provider"], ""),
      cdxField(entry, ["label"], "")
    ].map((part) => String(part || "")).join("|");
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

function cdxRunIdentity(run) {
    return String(cdxField(run, ["run_id", "runId", "id"], "")).trim();
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

function cdxSessionPermission(item) {
    return String(cdxField(item, ["permission", "permission_mode", "permissionMode"], "-") || "-");
  }

function filterCdxEntriesByProvider(entries, providerFilter) {
    if (providerFilter.mode !== "subset" || !providerFilter.selected.length) {
      return entries;
    }
    const selected = new Set(providerFilter.selected);
    return entries.filter((entry) => selected.has(cdxProviderName(entry)));
  }

function filterCdxHistoryBySession(history, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return history;
    }
    const selected = new Set(sessionFilter.selected);
    return history.filter((entry) => selected.has(cdxHistorySessionName(entry)));
  }

function filterCdxRunsBySession(runs, sessionFilter) {
    if (sessionFilter.mode !== "subset" || !sessionFilter.selected.length) {
      return runs;
    }
    const selected = new Set(sessionFilter.selected);
    return runs.filter((run) => selected.has(cdxRunSessionName(run)));
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

function renderCdxActionButton(label, attrs, title = "") {
    return `<button class="viewer-cdx__action-button" type="button"${title ? ` title="${escapeHtml(title)}"` : ""} ${attrs}>${escapeHtml(label)}</button>`;
  }

function renderCdxEntityRows(entries, emptyText, options = {}) {
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

function renderCdxReport(payload) {
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

function renderCdxSessionActionMenu(item, name, label, latestSessionName, canLaunchTerminal) {
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

function renderCdxUnreadBadge(section, label, count) {
    const title = cdxSectionBadgeTitle(section, count);
    return `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  }

function renderTextRemaining(item) {
    const percent = cdxRemainingPct(item);
    return percent === null ? "" : `${percent}% remaining`;
  }

function setupCdxImportExportHandlers() {
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

function updateCdxSessionEntry(item, sessionName, enable) {
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

function updateCdxSessionPermissionEntry(item, sessionName, permission) {
    if (!item || typeof item !== "object" || cdxSessionName(item) !== sessionName) {
      return false;
    }
    item.permission = permission;
    item.permission_mode = permission;
    item.permissionMode = permission;
    return true;
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

function renderCdxLogPreview(payload) {
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

function cdxReportNextAction(taskReport, missionOutput, runError, permissionDenials, findings) {
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

function cdxSessionName(item) {
    return cdxField(item, ["session_name", "name", "id", "value"], "");
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

function isCdxSessionEnabled(item) {
    if (item.enabled === false) {
      return false;
    }
    const state = String(cdxField(item, ["status", "state"], "")).toLowerCase();
    return state !== "disabled";
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

function renderCdxBadge(value, fallback = "reported") {
    const label = String(value || fallback || "reported");
    return `<span class="viewer-cdx__badge viewer-cdx__badge--${cdxStateClass(label)}">${escapeHtml(cdxLabel(label))}</span>`;
  }

function renderCdxDetailPills(item, excludedKeys) {
    const details = cdxDetailEntries(item, excludedKeys).map(([key, value]) => `
      <span class="viewer-cdx__pill"><span>${escapeHtml(cdxLabel(key))}</span><strong>${escapeHtml(formatCdxValue(key, value))}</strong></span>
    `).join("");
    return details ? `<div class="viewer-cdx__pills">${details}</div>` : "";
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

function renderCdxMissionOutput(output) {
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

function renderCdxObjectRows(value, emptyText) {
    const rows = objectEntries(value).slice(0, 12).map(([key, entry]) => `
      <li class="viewer-cdx__row">
        <span>${escapeHtml(cdxLabel(key))}</span>
        <strong>${escapeHtml(typeof entry === "object" ? JSON.stringify(entry) : entry)}</strong>
      </li>
    `).join("");
    return rows || `<li class="viewer-cdx__empty">${escapeHtml(emptyText)}</li>`;
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

function renderCdxReportKeyList(rows, emptyText = "No details reported.") {
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

function renderCdxStructuredLog(parsed) {
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

function cdxCount(value) {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (value && typeof value === "object") {
      return objectEntries(value).length;
    }
    return value ? 1 : 0;
  }

function cdxDetailEntries(item, excludedKeys) {
    return objectEntries(item)
      .filter(([key, value]) => !excludedKeys.includes(key) && value !== undefined && value !== null && value !== "")
      .slice(0, 6);
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

function renderCdxDetailRow(label, value) {
    return `
      <li class="viewer-cdx__row viewer-cdx__row--block">
        <span>${escapeHtml(label)}</span>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(value)}</div>
      </li>
    `;
  }

function formatCdxResetAt(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "-";
    }
    const timestamp = parseCdxDate(raw);
    return timestamp === null ? raw : formatRelativeTime(timestamp);
  }

function renderCdxDetailValue(value) {
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

export function createCdxScreen(host) {
  let latestCdxMissionState = {
    missionId: "full-audit",
    sessionId: "",
    strengthId: "standard",
    missionInputs: {},
    runMode: "terminal",
    outputMode: "plan",
    promptOverride: "",
    catalog: null,
    statusPayload: null,
    planPayload: null,
    runPayload: null,
    applyPayload: null
  };

  let latestCdxStatusSignature = "";

  let latestCdxStatusPayload = null;

  let latestCdxRunsPayload = null;

  let latestCdxHistoryPayload = null;

  let latestCdxMemoryPayload = null;

  let latestCdxMemoryScope = "current";

  let latestCdxMemoryView = "cleaned";

  const pendingCdxSessionToggles = new Map();

  const pendingCdxSessionPermissions = new Map();

  const pendingCdxSessionResets = new Set();

  const cdxUnreadState = {
    missions: { count: 0 },
    runs: { seen: null, count: 0 },
    history: { seen: null, count: 0 }
  };

  let cdxMissionBusyKey = "";

  let cdxCloseTarget = null;

  function cdxColumnVisibilityPreference() {
    const stored = host.shared.viewerPreferences.cdxStatusColumns;
    const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
    const visibility = {};
    cdxStatusColumns.forEach((column) => {
      visibility[column.id] = column.defaultVisible !== false;
      if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
        visibility[column.id] = storedVisibility[column.id];
      }
    });
    return visibility;
  }

  function persistCdxColumnVisibility(columnId, visible) {
    const current = cdxColumnVisibilityPreference();
    if (!cdxStatusColumns.some((column) => column.id === columnId)) {
      return;
    }
    host.updateViewerPreferences({
      cdxStatusColumns: {
        visibility: { ...current, [columnId]: Boolean(visible) }
      }
    });
  }

  function cdxRunColumnVisibilityPreference() {
    const stored = host.shared.viewerPreferences.cdxRunColumns;
    const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
    const visibility = {};
    cdxRunColumns.forEach((column) => {
      visibility[column.id] = column.defaultVisible !== false;
      if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
        visibility[column.id] = storedVisibility[column.id];
      }
    });
    return visibility;
  }

  function persistCdxRunColumnVisibility(columnId, visible) {
    const current = cdxRunColumnVisibilityPreference();
    if (!cdxRunColumns.some((column) => column.id === columnId)) {
      return;
    }
    host.updateViewerPreferences({
      cdxRunColumns: {
        visibility: { ...current, [columnId]: Boolean(visible) }
      }
    });
  }

  function cdxRunSessionFilterPreference() {
    const stored = host.shared.viewerPreferences.cdxRunSessions;
    if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
      return { mode: "all", selected: [] };
    }
    const selected = Array.isArray(stored.selected)
      ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
  }

  function persistCdxRunSessionFilter(nextFilter) {
    const selected = Array.isArray(nextFilter?.selected)
      ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    host.updateViewerPreferences({
      cdxRunSessions: selected.length
        ? { mode: "subset", selected: Array.from(new Set(selected)) }
        : { mode: "all", selected: [] }
    });
  }

  function cdxHistoryColumnVisibilityPreference() {
    const stored = host.shared.viewerPreferences.cdxHistoryColumns;
    const storedVisibility = stored && typeof stored === "object" ? stored.visibility : null;
    const visibility = {};
    cdxHistoryColumns.forEach((column) => {
      visibility[column.id] = column.defaultVisible !== false;
      if (storedVisibility && typeof storedVisibility[column.id] === "boolean") {
        visibility[column.id] = storedVisibility[column.id];
      }
    });
    return visibility;
  }

  function persistCdxHistoryColumnVisibility(columnId, visible) {
    const current = cdxHistoryColumnVisibilityPreference();
    if (!cdxHistoryColumns.some((column) => column.id === columnId)) {
      return;
    }
    host.updateViewerPreferences({
      cdxHistoryColumns: {
        visibility: { ...current, [columnId]: Boolean(visible) }
      }
    });
  }

  function cdxHistorySessionFilterPreference() {
    const stored = host.shared.viewerPreferences.cdxHistorySessions;
    if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
      return { mode: "all", selected: [] };
    }
    const selected = Array.isArray(stored.selected)
      ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
  }

  function persistCdxHistorySessionFilter(nextFilter) {
    const selected = Array.isArray(nextFilter?.selected)
      ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    host.updateViewerPreferences({
      cdxHistorySessions: selected.length
        ? { mode: "subset", selected: Array.from(new Set(selected)) }
        : { mode: "all", selected: [] }
    });
  }

  function cdxProviderFilterPreference() {
    const stored = host.shared.viewerPreferences.cdxStatusProviders;
    if (!stored || typeof stored !== "object" || stored.mode !== "subset") {
      return { mode: "all", selected: [] };
    }
    const selected = Array.isArray(stored.selected)
      ? stored.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    return selected.length ? { mode: "subset", selected: Array.from(new Set(selected)) } : { mode: "all", selected: [] };
  }

  function persistCdxProviderFilter(nextFilter) {
    const selected = Array.isArray(nextFilter?.selected)
      ? nextFilter.selected.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    host.updateViewerPreferences({
      cdxStatusProviders: selected.length
        ? { mode: "subset", selected: Array.from(new Set(selected)).sort() }
        : { mode: "all", selected: [] }
    });
  }

  function setCdxMissionBusy(actionKey, label = "") {
    cdxMissionBusyKey = actionKey || "";
    document.body?.toggleAttribute("data-viewer-cdx-mission-busy", Boolean(cdxMissionBusyKey));
    if (cdxMissionBusyKey) {
      document.body?.setAttribute("data-viewer-cdx-mission-busy-action", cdxMissionBusyKey);
    } else {
      document.body?.removeAttribute("data-viewer-cdx-mission-busy-action");
    }
    cdxMissionActionControls().forEach((control) => {
      if (!("disabled" in control)) {
        return;
      }
      control.disabled = Boolean(cdxMissionBusyKey);
      control.setAttribute("aria-busy", cdxMissionBusyKey ? "true" : "false");
      if (cdxMissionBusyKey) {
        control.setAttribute("data-viewer-action-busy", control.getAttribute("data-viewer-action-key") === actionKey ? "active" : "blocked");
      } else {
        control.removeAttribute("data-viewer-action-busy");
      }
    });
    if (!cdxMissionBusyKey) {
      host.updateCapabilityControls();
      host.applyLocalViewerChrome();
    }
    if (cdxMissionBusyKey && label) {
      host.setMeta(`${label}...`);
    }
  }

  function withCdxMissionAction(actionKey, label, action) {
    if (cdxMissionBusyKey) {
      host.setMeta("Another CDX mission action is still running.");
      return Promise.resolve(false);
    }
    setCdxMissionBusy(actionKey, label);
    return Promise.resolve()
      .then(action)
      .then(() => true)
      .catch((error) => {
        host.setMeta(error.message || "CDX mission action failed.");
        return false;
      })
      .finally(() => {
        setCdxMissionBusy("", "");
      });
  }

  function updateCdxUnreadBadges() {
    const counts = {
      missions: Math.max(0, cdxUnreadState.missions?.count || 0),
      runs: Math.max(0, cdxUnreadState.runs?.count || 0),
      history: Math.max(0, cdxUnreadState.history?.count || 0)
    };
    const total = counts.missions + counts.runs + counts.history;
    const aggregateLabel = cdxBadgeLabel(total);

    const button = document.getElementById("viewer-cdx");
    if (button instanceof HTMLElement) {
      const parts = [];
      if (counts.missions) parts.push(cdxSectionBadgeTitle("missions", counts.missions));
      if (counts.runs) parts.push(cdxSectionBadgeTitle("runs", counts.runs));
      if (counts.history) parts.push(cdxSectionBadgeTitle("history", counts.history));
      const summary = parts.join(", ");
      button.title = (button.title || "Show CDX status").replace(/\s·\sCDX activity:.*$/, "");
      if (aggregateLabel) {
        button.title = `${button.title || "Show CDX status"} · CDX activity: ${summary}`;
      }
      applyCdxBadge(button, "[data-viewer-cdx-unread-badge]", aggregateLabel, (label) =>
        `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" data-viewer-cdx-unread-badge title="${escapeHtml(`CDX activity: ${summary}`)}" aria-label="${escapeHtml(`CDX activity: ${summary}`)}">${escapeHtml(label)}</span>`);
    }

    ["missions", "runs", "history"].forEach((section) => {
      const item = navMenuItem(`cdx:${section}`);
      if (!(item instanceof HTMLElement)) return;
      const label = cdxBadgeLabel(counts[section]);
      const existing = item.querySelector("[data-viewer-cdx-unread-menu-badge]");
      const currentLabel = existing ? (existing.textContent || "").trim() : null;
      if (label === null) {
        existing?.remove();
        return;
      }
      if (currentLabel === label) return;
      existing?.remove();
      const badge = renderCdxUnreadBadge(section, label, counts[section]);
      const container = item.querySelector("[data-viewer-menu-badges]");
      if (container) {
        container.insertAdjacentHTML("beforeend", `<span data-viewer-cdx-unread-menu-badge>${badge}</span>`);
      } else {
        item.insertAdjacentHTML("beforeend", `<span class="viewer-nav-menu__badges" data-viewer-menu-badges><span data-viewer-cdx-unread-menu-badge>${badge}</span></span>`);
      }
    });
  }

  // Missions badge is a live gauge: how many mission runs are running right now.
  // It does not reset when the user looks — it follows the runs payload.

  function updateCdxMissionsCount(runsPayload) {
    const payload = (runsPayload && runsPayload.state === "ok") ? runsPayload : latestCdxRunsPayload;
    cdxUnreadState.missions.count = activeCdxRunCountFromPayload(payload);
    updateCdxUnreadBadges();
  }

  // Runs/History badges are "new since the user last looked" deltas. When the
  // section is open (or seen for the first time) we adopt the current set as the
  // baseline; otherwise we count how many current ids are not in that baseline.

  function recordCdxDelta(section, ids, { isOpen, markSeen } = {}) {
    const state = cdxUnreadState[section];
    if (!state) return;
    const current = new Set(ids.filter(Boolean));
    if (state.seen === null || isOpen || markSeen) {
      state.seen = current;
      state.count = 0;
    } else {
      let count = 0;
      current.forEach((id) => {
        if (!state.seen.has(id)) count += 1;
      });
      state.count = count;
    }
    updateCdxUnreadBadges();
  }

  function recordCdxUnreadSnapshot(section, payload, options = {}) {
    if (section === "missions") {
      // Missions tracks running runs; the status payload it is sometimes called
      // with has no runs array, so always source the count from the runs payload.
      updateCdxMissionsCount();
      return;
    }
    if (section === "runs") {
      recordCdxDelta("runs", cdxRunsList(payload).map(cdxRunIdentity), {
        isOpen: isCdxRunsOpen(),
        markSeen: options.markSeen
      });
      return;
    }
    recordCdxDelta("history", cdxHistoryList(payload).map(cdxHistoryIdentity), {
      isOpen: isCdxHistoryOpen(),
      markSeen: options.markSeen
    });
  }

  function markCdxSectionSeen(section, payload = null) {
    if (section === "missions") {
      // Live gauge — opening the panel doesn't clear it; just keep it fresh
      // from the latest runs payload (the status payload has no runs array).
      updateCdxMissionsCount();
      return;
    }
    if (section === "runs") {
      recordCdxDelta("runs", cdxRunsList(payload || latestCdxRunsPayload).map(cdxRunIdentity), { markSeen: true });
      return;
    }
    recordCdxDelta("history", cdxHistoryList(payload || latestCdxHistoryPayload).map(cdxHistoryIdentity), { markSeen: true });
  }

  // The runsPayload argument is kept for call-site compatibility but is no longer
  // used here: running runs are surfaced by the Missions badge
  // (updateCdxMissionsCount), so this badge counts active assistant sessions only
  // and no longer double-counts runs.

  function updateMainCdxBadge(payload) {
    const button = document.getElementById("viewer-cdx");
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.querySelector("[data-viewer-cdx-badge]")?.remove();
    clearNavMenuBadges(["cdx:status"]);
    const activeSessions = activeCdxAssistantCountFromPayload(payload);
    if (activeSessions <= 0) {
      button.title = host.isCapabilityAvailable("cdx")
        ? "Show CDX status"
        : host.capabilityMessage("cdx", "CDX is not available for this project.");
      updateCdxUnreadBadges();
      return;
    }
    const label = activeSessions > 9 ? "9+" : String(activeSessions);
    const title = activeSessions === 1 ? "1 active session" : `${activeSessions} active sessions`;
    button.title = `Show CDX status · ${title}`;
    const badge = `<span class="viewer-cdx-button-badge" data-viewer-cdx-badge title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
    button.insertAdjacentHTML("beforeend", badge);
    setNavMenuBadges("cdx:status", `<span class="viewer-cdx-button-badge" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`);
    updateCdxUnreadBadges();
  }

  async function refreshCdxBadgeCounters() {
    if (!host.isCapabilityAvailable("cdx")) {
      updateMainCdxBadge(null);
      return;
    }
    try {
      const [statusResponse, runsResponse] = await Promise.all([
        fetch("/api/cdx-status", { cache: "no-store" }),
        fetch("/api/cdx-runs").catch(() => null)
      ]);
      if (statusResponse.status === 404) {
        updateMainCdxBadge(null);
        return;
      }
      const data = await statusResponse.json();
      let runsPayload = null;
      if (runsResponse && runsResponse.ok) {
        const runsData = await runsResponse.json();
        runsPayload = runsData?.ok ? runsData.payload : null;
      }
      if (statusResponse.ok && data.ok) {
        latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload, runs: runsPayload });
        updateMainCdxBadge(data.payload, runsPayload);
      }
    } catch {
      updateMainCdxBadge(null);
    }
  }

  function isCdxStatusOpen() {
    const panel = host.documentPanel();
    const title = host.documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX status");
  }

  function isCdxRunsOpen() {
    const panel = host.documentPanel();
    const title = host.documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX reports");
  }

  function isCdxHistoryOpen() {
    const panel = host.documentPanel();
    const title = host.documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX history");
  }

  function isCdxMissionsOpen() {
    const panel = host.documentPanel();
    const title = host.documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "CDX missions");
  }

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

  function cdxUsageFromStatus(item) {
    const fiveHourReset = formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""));
    const fiveHour = { percent: cdxRemainingPct({ available_pct: cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN) }), reset: fiveHourReset };
    const week = { percent: cdxRemainingPct({ available_pct: cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN) }), reset: formatCdxResetAt(cdxField(item, ["reset_week_at", "resetWeekAt", "reset_at", "resetAt"], "")) };
    return { percent: cdxRemainingPct(item), reset: fiveHourReset, fiveHour, week };
  }

  // Remaining usage for a session name from latest status.

  function cdxSessionUsage(sessionName) {
    if (!sessionName) return null;
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    const match = sessions.find(
      (session) => String(cdxField(session, ["session_name", "name", "id", "value"], "")).trim() === sessionName
    );
    if (!match) return null;
    return cdxUsageFromStatus(match);
  }

  // A small vertical gauge of remaining session usage, coloured by level.
  // Clickable: refreshes this session's CDX status. Rendered for every cdx
  // session (neutral/empty when usage is not known yet) so it stays clickable.

  async function refreshCdxSessionUsage(sessionName) {
    try {
      host.setMeta(sessionName ? `Refreshing CDX usage for ${sessionName}...` : "Refreshing CDX usage...");
      const response = await fetch("/api/cdx-status", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.ok) return;
      latestCdxStatusPayload = data.payload;
      latestCdxStatusSignature = runtimeStatusSignature({ status: data.payload });
      host.renderWorkshopTerminalList();
      rerenderCdxStatusFromPreferences();
      const usage = cdxSessionUsage(sessionName);
      if (usage && usage.percent !== null && usage.percent !== undefined) {
        const resetText = usage.reset && usage.reset !== "-" ? ` · resets ${usage.reset}` : "";
        host.setMeta(`CDX usage ${sessionName}: ${usage.percent}% remaining${resetText}.`);
      } else {
        host.setMeta(`Refreshed CDX usage${sessionName ? ` for ${sessionName}` : ""}.`);
      }
    } catch (error) {
      host.setMeta(`CDX usage: ${error?.message || error}`);
    }
  }

  // Re-render the terminal list when CDX usage changes so the gauges stay live
  // without the operator opening the CDX status screen. Self-guards: only runs
  // when the list is on screen and at least one terminal is a cdx session.

  async function loadCdxSessionsForCustomTerminal() {
    if (!host.isCapabilityAvailable("cdx")) return [];
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

  function renderCdxSessionTable(sessions, emptyText, latestSessionNameOverride = "") {
    if (!sessions.length) {
      return `<div class="viewer-cdx__empty">${escapeHtml(emptyText)}</div>`;
    }
    const visibleColumns = cdxColumnVisibilityPreference();
    const workshopCap = host.capability("workshop");
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
          return `<td class="viewer-cdx__ok-cell">${renderCdxUsageGauge(cdxUsageFromStatus(item), name)}</td>`;
        }
        return `<td>${renderCdxRemainingPill(item) || escapeHtml(cdxPct(cdxField(item, ["available_pct", "availablePct"], NaN)))}</td>`;
      },
      remaining5h: (item) => {
        const pct = cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN);
        return `<td>${Number.isFinite(Number(pct)) ? escapeHtml(cdxPct(pct)) : ""}</td>`;
      },
      remainingWeek: (item) => `<td>${escapeHtml(cdxPct(cdxField(item, ["remaining_week_pct", "remainingWeekPct"], NaN)))}</td>`,
      banked: (item) => {
        const count = Number(cdxField(item, ["reset_credits_available", "resetCreditsAvailable"], NaN));
        const name = String(cdxField(item, ["session_name", "name", "id", "value"], "")).trim();
        if (!Number.isFinite(count) || count <= 0) {
          return `<td>${Number.isFinite(count) ? escapeHtml(String(count)) : "-"}</td>`;
        }
        const credits = cdxField(item, ["reset_credits", "resetCredits"], []);
        const expirations = (Array.isArray(credits) ? credits : [])
          .map((credit) => credit && (credit.expires_at || credit.expiresAt))
          .filter(Boolean)
          .sort();
        const expiresHint = expirations.length ? `, next expires ${formatCdxResetAt(expirations[0])}` : "";
        if (!name || name === "-") return `<td>${escapeHtml(String(count))}</td>`;
        const pending = pendingCdxSessionResets.has(name);
        return `<td><button class="viewer-cdx__banked-reset${pending ? " is-updating" : ""}" type="button" data-viewer-cdx-reset="${escapeHtml(name)}" title="Activate one banked reset for ${escapeHtml(name)}${escapeHtml(expiresHint)}"${pending ? " disabled" : ""}>${escapeHtml(String(count))}</button></td>`;
      },
      block: (item) => `<td>${escapeHtml(cdxSessionBlock(item))}</td>`,
      credits: (item) => `<td>${escapeHtml(formatCdxCredits(cdxField(item, ["credits", "cr"], "-")))}</td>`,
      reset5h: (item) => {
        const pct = cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN);
        return `<td>${Number.isFinite(Number(pct)) ? escapeHtml(formatCdxResetAt(cdxField(item, ["reset_5h_at", "reset5hAt", "reset_at", "resetAt"], ""))) : ""}</td>`;
      },
      resetWeek: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["reset_week_at", "resetWeekAt", "reset_at", "resetAt"], "")))}</td>`,
      updated: (item) => `<td>${escapeHtml(formatCdxResetAt(cdxField(item, ["updated_at", "updatedAt"], "")))}</td>`
    };
    const hasFiveHourQuota = sessions.some((entry) => {
      const item = entry && typeof entry === "object" ? entry : { value: entry };
      return Number.isFinite(Number(cdxField(item, ["remaining_5h_pct", "remaining5hPct"], NaN)));
    });
    const activeColumns = cdxStatusColumns.filter((column) => visibleColumns[column.id] && (column.id !== "remaining5h" || hasFiveHourQuota));
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
  }

  function cdxSessionLastUsedMs(item) {
    return Date.parse(String(cdxField(item, [
      "last_launched_at",
      "lastLaunchedAt",
      "last_used_at",
      "lastUsedAt",
      "updated_at",
      "updatedAt"
    ], ""))) || 0;
  }

  async function chooseCdxHandoffSource(destinationName) {
    const options = cdxSessions(latestCdxStatusPayload?.status || {})
      .filter((entry) => entry && typeof entry === "object" && isCdxSessionEnabled(entry))
      .map((entry) => ({ name: cdxSessionName(entry), lastUsed: cdxSessionLastUsedMs(entry) }))
      .filter((entry) => entry.name && entry.name !== "-" && entry.name !== destinationName)
      .sort((left, right) => right.lastUsed - left.lastUsed || left.name.localeCompare(right.name))
      .map((entry) => entry.name);
    if (!options.length) {
      await showThemedMessageModal({ title: "Handoff", message: "No other enabled CDX session is available." });
      return "";
    }
    return await showThemedChoiceModal({
      title: "Handoff source",
      message: `Choose the session to hand off into ${destinationName}.`,
      options,
      value: options[0],
      submitLabel: "Handoff"
    });
  }

  function selectedCdxMissionRequest() {
    const catalog = latestCdxMissionState.catalog || cdxMissionCatalog();
    const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
    const missionId = latestCdxMissionState.missionId || "full-audit";
    const mission = missions.find((entry) => entry.id === missionId) || {};
    const status = latestCdxMissionState.statusPayload?.status || {};
    const sessions = cdxSessions(status);
    const selectedSession = sessions.find((session) => cdxField(session && typeof session === "object" ? session : { value: session }, ["id", "name", "session_name", "value"], "") === latestCdxMissionState.sessionId);
    const selectedModel = cdxField(selectedSession && typeof selectedSession === "object" ? selectedSession : {}, ["model", "model_name", "modelName"], "");
    const allowFileWrites = mission.supportsFileWrites === false
      ? "false"
      : (latestCdxMissionState.missionInputs.allowFileWrites === "false" ? "false" : "true");
    const request = {
      missionId,
      sessionId: latestCdxMissionState.sessionId || "",
      strengthId: latestCdxMissionState.strengthId || "standard",
      ...latestCdxMissionState.missionInputs,
      model: Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model") ? latestCdxMissionState.missionInputs.model : selectedModel,
      allowFileWrites,
      commitAtEnd: latestCdxMissionState.missionInputs.commitAtEnd === "true" ? "true" : "false"
    };
    if (latestCdxMissionState.promptOverride) {
      request.promptOverride = latestCdxMissionState.promptOverride;
    }
    return request;
  }

  function renderCdxMissionConfigMenu(session, strength) {
    const model = Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model")
      ? latestCdxMissionState.missionInputs.model
      : cdxField(session && typeof session === "object" ? session : {}, ["model", "model_name", "modelName"], "");
    const levels = ["minimal", "low", "medium", "high", "xhigh"];
    const defaultReasoning = strength?.reasoningEffort || "medium";
    const defaultPower = strength?.power || "medium";
    const reasoningEffort = latestCdxMissionState.missionInputs.reasoningEffort || defaultReasoning;
    const power = latestCdxMissionState.missionInputs.power || defaultPower;
    const optionRows = (selected) => levels.map((level) => `<option value="${escapeHtml(level)}"${level === selected ? " selected" : ""}>${escapeHtml(cdxLabel(level))}</option>`).join("");
    return `
      <details class="viewer-cdx__menu viewer-cdx__mission-config">
        <summary class="viewer-cdx__icon-button" title="Configure CDX model and reasoning" aria-label="Configure CDX model and reasoning">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 0 0-2 .1 1.7 1.7 0 0 0-.8 1.7v.2H9.2v-.2a1.7 1.7 0 0 0-.8-1.7 1.7 1.7 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1.1H3v-3.8h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-3.4.2.1a1.7 1.7 0 0 0 2-.1 1.7 1.7 0 0 0 .8-1.7v-.2h5.6v.2a1.7 1.7 0 0 0 .8 1.7 1.7 1.7 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1.1h.1v3.8h-.1a1.7 1.7 0 0 0-1.5 1.1Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </summary>
        <div class="viewer-cdx__menu-panel viewer-cdx__menu-panel--wide viewer-cdx__mission-config-panel" role="menu" aria-label="CDX mission configuration">
          <label class="viewer-cdx__field">
            <span>Model</span>
            <input data-viewer-cdx-input="model" type="text" value="${escapeHtml(model)}" placeholder="Default session model">
          </label>
          <label class="viewer-cdx__field">
            <span>Reasoning</span>
            <select data-viewer-cdx-input="reasoningEffort">${optionRows(reasoningEffort)}</select>
          </label>
          <label class="viewer-cdx__field">
            <span>Power</span>
            <select data-viewer-cdx-input="power">${optionRows(power)}</select>
          </label>
        </div>
      </details>
    `;
  }

  function renderCdxMissionInputs(mission) {
    const fields = Array.isArray(mission?.inputFields) ? mission.inputFields : [];
    if (!fields.length) {
      return "";
    }
    const rows = fields.map((field) => {
      const id = field.id || "";
      const value = latestCdxMissionState.missionInputs[id] || "";
      if (field.type === "checkbox") {
        return `
          <label class="viewer-cdx__field viewer-cdx__field--check">
            <input data-viewer-cdx-input="${escapeHtml(id)}" type="checkbox"${value === "true" ? " checked" : ""}>
            <span>${escapeHtml(field.label || cdxLabel(id))}</span>
          </label>
        `;
      }
      if (field.type === "textarea") {
        return `
          <label class="viewer-cdx__field">
            <span>${escapeHtml(field.label || cdxLabel(id))}</span>
            <textarea data-viewer-cdx-input="${escapeHtml(id)}" placeholder="${escapeHtml(field.placeholder || "")}" rows="5">${escapeHtml(value)}</textarea>
          </label>
        `;
      }
      return `
        <label class="viewer-cdx__field">
          <span>${escapeHtml(field.label || cdxLabel(id))}</span>
          <input data-viewer-cdx-input="${escapeHtml(id)}" type="${escapeHtml(field.type || "text")}" value="${escapeHtml(value)}" placeholder="${escapeHtml(field.placeholder || "")}"${field.pattern ? ` pattern="${escapeHtml(field.pattern)}"` : ""}>
        </label>
      `;
    }).join("");
    return `<div class="viewer-cdx__inputs">${rows}</div>`;
  }

  async function selectCdxMissionFromModal() {
    const catalog = latestCdxMissionState.catalog || cdxMissionCatalog();
    const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
    if (!missions.length) {
      return;
    }
    const currentId = latestCdxMissionState.missionId || catalog.defaultMissionId || missions[0].id;
    const labels = missions.map((mission) => mission.title || mission.id);
    const currentMission = missions.find((mission) => mission.id === currentId) || missions[0];
    const selectedLabel = await showThemedChoiceModal({
      title: "Select mission",
      message: "Choose the CDX mission to configure.",
      options: labels,
      value: currentMission.title || currentMission.id,
      submitLabel: "Select"
    });
    if (!selectedLabel) {
      return;
    }
    const selectedMission = missions.find((mission) => (mission.title || mission.id) === selectedLabel);
    if (!selectedMission || selectedMission.id === currentId) {
      return;
    }
    latestCdxMissionState.missionId = selectedMission.id || "full-audit";
    latestCdxMissionState.planPayload = null;
    latestCdxMissionState.runPayload = null;
    latestCdxMissionState.applyPayload = null;
    latestCdxMissionState.missionInputs = {};
    latestCdxMissionState.outputMode = "plan";
    latestCdxMissionState.promptOverride = "";
    host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
  }

  function showCdxSessionConfigModal(sessionName) {
    const sessions = cdxSessions(latestCdxStatusPayload?.status || {});
    const session = sessions.find((entry) => cdxSessionName(entry && typeof entry === "object" ? entry : { value: entry }) === sessionName) || {};
    const levels = ["minimal", "low", "medium", "high", "xhigh"];
    const model = Object.prototype.hasOwnProperty.call(latestCdxMissionState.missionInputs, "model") && latestCdxMissionState.sessionId === sessionName
      ? latestCdxMissionState.missionInputs.model
      : cdxField(session && typeof session === "object" ? session : {}, ["model", "model_name", "modelName"], "");
    const reasoningEffort = latestCdxMissionState.sessionId === sessionName
      ? (latestCdxMissionState.missionInputs.reasoningEffort || "medium")
      : "medium";
    const power = latestCdxMissionState.sessionId === sessionName
      ? (latestCdxMissionState.missionInputs.power || "medium")
      : cdxField(session && typeof session === "object" ? session : {}, ["power", "power_level", "powerLevel"], "medium");
    const permission = pendingCdxSessionPermissions.has(sessionName)
      ? pendingCdxSessionPermissions.get(sessionName)
      : cdxSessionPermission(session && typeof session === "object" ? session : {});
    const optionRows = (selected) => levels.map((level) => `<option value="${escapeHtml(level)}"${level === selected ? " selected" : ""}>${escapeHtml(cdxLabel(level))}</option>`).join("");
    const permissionRows = (selected) => cdxPermissionValues().map((opt) => `<option value="${escapeHtml(opt)}"${opt === selected ? " selected" : ""}>${escapeHtml(cdxLabel(opt))}</option>`).join("");
    const modal = createThemedModal({
      title: "Session config",
      message: `CDX session: ${sessionName}`,
      submitLabel: "Apply"
    });
    modal.setAttribute("data-viewer-cdx-session-config-modal", sessionName);
    modal.querySelector(".viewer-themed-modal__submit")?.setAttribute("data-viewer-cdx-session-config-submit", "");
    modal.querySelector(".viewer-themed-modal__cancel")?.setAttribute("data-viewer-cdx-session-config-cancel", "");
    modal.querySelector(".viewer-themed-modal__close")?.setAttribute("data-viewer-cdx-session-config-cancel", "");
    const body = modal.querySelector(".viewer-themed-modal__body");
    if (body instanceof HTMLElement) {
      body.innerHTML = `
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Model</span>
          <input class="viewer-themed-modal__input" data-viewer-cdx-session-config-input="model" type="text" value="${escapeHtml(model)}" placeholder="Default session model">
        </label>
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Reasoning</span>
          <select class="viewer-themed-modal__select" data-viewer-cdx-session-config-input="reasoningEffort">${optionRows(reasoningEffort)}</select>
        </label>
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Power</span>
          <select class="viewer-themed-modal__select" data-viewer-cdx-session-config-input="power">${optionRows(power)}</select>
        </label>
        <label class="viewer-themed-modal__field">
          <span class="viewer-themed-modal__label">Permission</span>
          <select class="viewer-themed-modal__select" data-viewer-cdx-session-config-input="permission">${permissionRows(permission)}</select>
        </label>
      `;
    }
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeThemedModal(modal);
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) applyCdxSessionConfigModal(modal);
    });
    window.setTimeout(() => {
      const firstInput = modal.querySelector("[data-viewer-cdx-session-config-input]");
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }
    }, 0);
  }

  function applyCdxSessionConfigModal(modal) {
    if (!(modal instanceof HTMLElement)) {
      return;
    }
    const sessionName = modal.getAttribute("data-viewer-cdx-session-config-modal") || "";
    const valueFor = (key) => {
      const control = modal.querySelector(`[data-viewer-cdx-session-config-input="${key}"]`);
      return typeof control?.value === "string" ? control.value || "" : "";
    };
    const model = valueFor("model").trim();
    const power = valueFor("power") || "medium";
    const permission = valueFor("permission");
    updateCdxSessionConfigFromModal(modal);
    closeThemedModal(modal);
    if (sessionName) {
      persistCdxSessionConfig(sessionName, { power, model }).catch((error) => host.setMeta(`CDX config: ${error?.message || error}`));
      if (permission && cdxPermissionValues().includes(permission)) {
        const current = pendingCdxSessionPermissions.has(sessionName)
          ? pendingCdxSessionPermissions.get(sessionName)
          : cdxSessionPermission(cdxSessions(latestCdxStatusPayload?.status || {}).find((entry) => cdxSessionName(entry && typeof entry === "object" ? entry : { value: entry }) === sessionName) || {});
        if (permission !== current) {
          applyCdxSessionPermission(sessionName, permission).catch((error) => host.setMeta(`CDX permission: ${error?.message || error}`));
        }
      }
    }
  }

  async function persistCdxSessionConfig(sessionName, { power, model }) {
    const body = { session: sessionName, model: model || "" };
    if (power) {
      body.power = power;
    }
    const response = await fetch("/api/cdx-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Config update failed.");
    }
    host.setMeta(data.payload?.message || `Config saved for ${sessionName}.`);
    await showCdxStatus({ silent: true, force: true }).catch(() => {});
  }

  function updateCdxSessionConfigFromModal(modal) {
    if (!(modal instanceof HTMLElement)) {
      return;
    }
    const sessionName = modal.getAttribute("data-viewer-cdx-session-config-modal") || "";
    if (!sessionName) {
      return;
    }
    const valueFor = (key) => {
      const control = modal.querySelector(`[data-viewer-cdx-session-config-input="${key}"]`);
      return typeof control?.value === "string" ? control.value || "" : "";
    };
    latestCdxMissionState.sessionId = sessionName;
    latestCdxMissionState.missionInputs.model = valueFor("model");
    latestCdxMissionState.missionInputs.reasoningEffort = valueFor("reasoningEffort") || "medium";
    latestCdxMissionState.missionInputs.power = valueFor("power") || "medium";
    latestCdxMissionState.planPayload = null;
    latestCdxMissionState.runPayload = null;
    latestCdxMissionState.applyPayload = null;
    latestCdxMissionState.outputMode = "plan";
    latestCdxMissionState.promptOverride = "";
    host.setMeta(`CDX config updated for ${sessionName}.`);
  }

  function renderCdxMissionSetup(statusPayload, planPayload, runPayload, applyPayload) {
    const catalog = cdxMissionCatalog(planPayload || {});
    latestCdxMissionState.catalog = catalog;
    const missions = Array.isArray(catalog.missions) ? catalog.missions : [];
    const strengths = Array.isArray(catalog.strengths) ? catalog.strengths : [];
    const status = statusPayload?.status || {};
    const sessions = cdxSessions(status);
    const selectedSession = latestCdxMissionState.sessionId || cdxField(sessions[0] || {}, ["id", "name", "session_name", "value"], "");
    const selectedSessionItem = sessions.find((session) => cdxField(session && typeof session === "object" ? session : { value: session }, ["id", "name", "session_name", "value"], "") === selectedSession) || {};
    const missionId = latestCdxMissionState.missionId || catalog.defaultMissionId || "full-audit";
    const selectedMission = missions.find((mission) => mission.id === missionId) || {};
    const strengthId = latestCdxMissionState.strengthId || catalog.defaultStrengthId || "standard";
    const selectedStrength = strengths.find((strength) => strength.id === strengthId) || strengths.find((strength) => strength.id === catalog.defaultStrengthId) || {};
    const runMode = latestCdxMissionState.runMode === "terminal" ? "terminal" : "background";
    const supportsFileWrites = selectedMission.supportsFileWrites !== false;
    const requiresFileWrites = selectedMission.requiresFileWrites === true;
    const allowFileWrites = supportsFileWrites && latestCdxMissionState.missionInputs.allowFileWrites !== "false";
    const commitControl = `
            <label class="viewer-cdx__field viewer-cdx__field--check">
              <input data-viewer-cdx-input="commitAtEnd" type="checkbox"${latestCdxMissionState.missionInputs.commitAtEnd === "true" ? " checked" : ""}>
              <span>Commit changes at end</span>
            </label>`;
    const fileWriteControl = requiresFileWrites
      ? `
            <div class="viewer-cdx__meta viewer-cdx__mission-note">This mission always drafts a Logics request. Enabling "Fix directly" also promotes it into a backlog item and task as proof.</div>
            ${commitControl}
        `
      : supportsFileWrites
        ? `
            <label class="viewer-cdx__field viewer-cdx__field--check">
              <input data-viewer-cdx-input="allowFileWrites" type="checkbox"${allowFileWrites ? " checked" : ""}>
              <span>Allow CDX to modify files</span>
            </label>
            ${commitControl}
        `
        : `
            <div class="viewer-cdx__meta viewer-cdx__mission-note">Corpus updates are applied after CDX returns allowed actions.</div>
        `;
    latestCdxMissionState.sessionId = selectedSession;
    const missionSummary = `
      <div class="viewer-cdx__mission-summary">
        <div>
          <strong>${escapeHtml(selectedMission.title || selectedMission.id || "Mission")}</strong>
          <span>${escapeHtml(selectedMission.description || "")}</span>
          <em>${escapeHtml(cdxLabel(selectedMission.scope || ""))}</em>
        </div>
        <button class="viewer-cdx__action-button" type="button" data-viewer-cdx-mission-select>Choose mission</button>
      </div>
    `;
    const sessionOptions = sessions.map((session) => {
      const item = session && typeof session === "object" ? session : { value: session };
      const id = cdxField(item, ["id", "name", "session_name", "value"], "");
      const label = [id, cdxField(item, ["provider"], ""), renderTextRemaining(item)].filter(Boolean).join(" · ");
      return `<option value="${escapeHtml(id)}"${id === selectedSession ? " selected" : ""}>${escapeHtml(label || id)}</option>`;
    }).join("");
    const plan = planPayload?.plan;
    const warnings = Array.isArray(plan?.warnings) ? plan.warnings : [];
    const command = Array.isArray(plan?.command) ? plan.command.join(" ") : "";
    const promptValue = latestCdxMissionState.promptOverride || (plan && typeof plan.prompt === "string" ? plan.prompt : "");
    const promptEdited = Boolean(plan?.promptEdited || latestCdxMissionState.promptOverride);
    const warningRows = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    const canRun = planPayload?.state === "ok" && plan?.canRun;
    const usage = runPayload?.run?.usage || {};
    const run = runPayload?.run;
    const usageText = usage.available
      ? `${usage.totalTokens ?? "-"} total · ${usage.inputTokens ?? "-"} in · ${usage.outputTokens ?? "-"} out`
      : (usage.message || "Token usage not reported yet.");
    const parsedActions = Array.isArray(run?.parsed?.actions) ? run.parsed.actions : [];
    const applyResults = Array.isArray(applyPayload?.results) ? applyPayload.results : [];
    const actionRows = parsedActions.map((action) => `
      <li class="viewer-cdx__row"><span>${escapeHtml(cdxLabel(action.type || "action"))}</span><strong>${escapeHtml(action.target || "-")}</strong></li>
    `).join("");
    const applyRows = applyResults.map((result) => `
      <li class="viewer-cdx__row"><span>${escapeHtml(cdxLabel(result.type || "action"))}</span><strong>${escapeHtml(result.returnCode === 0 ? "applied" : "failed")}</strong></li>
    `).join("");
    const planState = planPayload
      ? (canRun ? "Ready" : cdxLabel(planPayload.state || "Previewed"))
      : "Not previewed";
    const runState = runPayload
      ? (run ? (Number(run.returnCode) === 0 ? "Succeeded" : `Failed (${run.returnCode ?? "unknown"})`) : cdxLabel(runPayload.state || "Reported"))
      : "Not launched";
    const outputMode = latestCdxMissionState.outputMode === "run" ? "run" : "plan";
    const outputSwitch = `
      <div class="viewer-cdx__panel-switch" role="tablist" aria-label="Mission output view">
        <button class="viewer-cdx__mode${outputMode === "plan" ? " is-active" : ""}" type="button" data-viewer-cdx-mission-output="plan" aria-selected="${outputMode === "plan" ? "true" : "false"}">Plan preview</button>
        <button class="viewer-cdx__mode${outputMode === "run" ? " is-active" : ""}" type="button" data-viewer-cdx-mission-output="run" aria-selected="${outputMode === "run" ? "true" : "false"}">Run output</button>
      </div>
    `;
    const planPanel = `
      ${planPayload && planPayload.state !== "ok" ? `<div class="viewer-cdx__state">${escapeHtml(planPayload.message || "Unable to build mission plan.")}</div>` : ""}
      ${command ? `<pre class="viewer-cdx__code">${escapeHtml(command)}</pre>` : '<div class="viewer-cdx__empty">Preview a mission to inspect the exact command before launch.</div>'}
      ${plan && typeof plan.prompt === "string" ? `
        <label class="viewer-cdx__field">
          <span>Prompt${promptEdited ? " (edited)" : " (editable)"}</span>
          <textarea data-viewer-cdx-prompt rows="10" spellcheck="false" placeholder="Generated mission prompt">${escapeHtml(promptValue)}</textarea>
        </label>
        <div class="viewer-cdx__meta">Edits apply on the next Preview or Launch run. Session, permission, and timeout stay enforced by the server and release contract.</div>
      ` : ""}
      ${plan?.releaseTag ? `<div class="viewer-cdx__meta">Base tag: ${escapeHtml(plan.releaseTag)}</div>` : ""}
      ${plan?.commitAtEnd ? '<div class="viewer-cdx__meta">Commit at end: enabled when mission changes files.</div>' : ""}
      ${plan?.requiresConfirmation ? '<div class="viewer-cdx__meta">Plan-first mission: Logics changes need explicit apply after CDX returns allowed actions.</div>' : ""}
      ${warningRows ? `<ul class="viewer-cdx__warnings">${warningRows}</ul>` : ""}
    `;
    const runPanel = `
      ${runPayload ? `<div class="viewer-cdx__state viewer-cdx__state--${escapeHtml(cdxStateClass(runPayload.state))}">${escapeHtml(runPayload.message || cdxLabel(runPayload.state))}</div>` : '<div class="viewer-cdx__empty">No mission run launched yet.</div>'}
      ${run ? `<ul class="viewer-cdx__list">
        <li class="viewer-cdx__row"><span>Run</span><strong>${escapeHtml(run.runId || "-")}</strong></li>
        <li class="viewer-cdx__row"><span>Usage</span><strong>${escapeHtml(usageText)}</strong></li>
        <li class="viewer-cdx__row"><span>Return code</span><strong>${escapeHtml(run.returnCode ?? "-")}</strong></li>
      </ul>` : ""}
      ${run?.stdout ? `<pre class="viewer-cdx__code">${escapeHtml(run.stdout)}</pre>` : ""}
      ${run?.stderr ? `<pre class="viewer-cdx__code viewer-cdx__code--error">${escapeHtml(run.stderr)}</pre>` : ""}
    `;
    const cards = [
      ["Missions", String(missions.length)],
      ["Sessions", String(sessions.length)],
      ["Plan", planState],
      ["Run", runState]
    ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
    return `
      <div class="viewer-cdx__summary">${cards}</div>
      <div class="viewer-cdx__workspace viewer-cdx__workspace--missions">
        <div class="viewer-cdx__stack">
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Mission</h2>
            ${missionSummary}
          </section>
          <section class="viewer-cdx__section">
            <h2 class="viewer-cdx__heading">Execution</h2>
            <div class="viewer-cdx__field-row viewer-cdx__field-row--session">
              <label class="viewer-cdx__field">
                <span>Session</span>
                <select data-viewer-cdx-session>${sessionOptions || '<option value="">No session reported</option>'}</select>
              </label>
              ${renderCdxMissionConfigMenu(selectedSessionItem, selectedStrength)}
            </div>
            ${fileWriteControl}
            ${renderCdxMissionInputs(selectedMission)}
            <label class="viewer-cdx__field">
              <span>Run in</span>
              <select data-viewer-cdx-run-mode>
                <option value="terminal"${runMode === "terminal" ? " selected" : ""}>New terminal</option>
                <option value="background"${runMode === "terminal" ? "" : " selected"}>Background runner (Experimental)</option>
              </select>
            </label>
            <div class="viewer-cdx__actions">
              <button class="btn" type="button" data-viewer-cdx-plan>Preview</button>
              <button class="btn" type="button" data-viewer-cdx-run${canRun ? "" : " disabled"}>${runMode === "terminal" ? "Launch in terminal" : "Launch run"}</button>
            </div>
          </section>
        </div>
        <div class="viewer-cdx__stack">
          <section class="viewer-cdx__section">
            <div class="viewer-ci__heading viewer-ci__heading--actions">
              <h2>${outputMode === "run" ? "Run output" : "Plan preview"}</h2>
              ${outputSwitch}
            </div>
            <div class="viewer-cdx__output-panel">
              ${outputMode === "run" ? runPanel : planPanel}
            </div>
          </section>
          ${plan?.missionId === "corpus-ready" || latestCdxMissionState.missionId === "corpus-ready" ? `
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Corpus apply</h2>
              <ul class="viewer-cdx__list">${actionRows || '<li class="viewer-cdx__empty">CDX has not returned allowed corpus actions yet.</li>'}</ul>
              <div class="viewer-cdx__actions">
                <button class="btn" type="button" data-viewer-cdx-apply-plan${parsedActions.length ? "" : " disabled"}>Apply allowed actions</button>
              </div>
              ${applyPayload ? `<div class="viewer-cdx__state viewer-cdx__state--${escapeHtml(cdxStateClass(applyPayload.state))}">${escapeHtml(applyPayload.message || cdxLabel(applyPayload.state))}</div>` : ""}
              ${applyRows ? `<ul class="viewer-cdx__list">${applyRows}</ul>` : ""}
            </section>
          ` : ""}
        </div>
      </div>
    `;
  }

  function renderCdxMissions(statusPayload, planPayload = null, runPayload = null, applyPayload = null) {
    if (!statusPayload || statusPayload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("missions")}
          <div class="viewer-cdx__state">${escapeHtml(statusPayload?.message || "CDX missions are unavailable.")}</div>
        </div>
      `;
    }
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("missions")}
        ${renderCdxMissionSetup(statusPayload, planPayload, runPayload, applyPayload)}
      </div>
    `;
  }

  function renderCdxStatus(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("status")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX status is unavailable.")}</div>
        </div>
      `;
    }
    const status = payload.status || {};
    const allProviders = cdxProviders(status);
    const allSessions = cdxSessions(status);
    const providerFilter = cdxProviderFilterPreference();
    const knownProviders = cdxKnownProviders(status, allProviders, allSessions);
    const providers = filterCdxEntriesByProvider(allProviders, providerFilter);
    const sessions = filterCdxEntriesByProvider(allSessions, providerFilter);
    const readiness = cdxReadiness(status);
    const commands = pickFirstArray(status, ["nextCommands", "next_commands", "safeCommands", "safe_commands", "commands"])
      .map((entry) => typeof entry === "string" ? entry : (entry.command || entry.value || entry.name || ""))
      .filter(Boolean);
    if (!commands.length) {
      commands.push("cdx status --json");
    }
    const runtimeState = status.state || status.status || status.availability || "ok";
    const readinessCount = objectEntries(readiness).length;
    const cards = [
      ["Runtime", runtimeState],
      ["Providers", providers.length],
      ["Sessions", sessions.length],
      ["Readiness", readinessCount ? `${readinessCount} signals` : "Not reported"]
    ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${label === "Runtime" ? renderCdxBadge(value) : escapeHtml(value)}</div>
      </div>
    `).join("");
    const commandRows = commands.slice(0, 10).map((command, index) => `
      <li>
        <span>${escapeHtml(index + 1)}</span>
        <code>${escapeHtml(command)}</code>
      </li>
    `).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("status")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxStatusControls(knownProviders, sessions.filter((s) => s.enabled !== false).map((s) => cdxField(s, ["session_name", "name", "id", "value"]) || "").filter(Boolean), cdxColumnVisibilityPreference(), providerFilter)}
        <div class="viewer-cdx__workspace">
          <div class="viewer-cdx__stack">
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Sessions</h2>
              ${renderCdxSessionTable(sessions, "No sessions reported.", latestCdxSessionName(allSessions))}
            </section>
          </div>
          <div class="viewer-cdx__stack">
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Readiness and quota</h2>
              <ul class="viewer-cdx__list">${renderCdxObjectRows(readiness, "No readiness or quota details reported.")}</ul>
            </section>
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Safe next commands</h2>
              <ul class="viewer-cdx__commands">${commandRows || '<li class="viewer-cdx__empty">No suggested commands reported.</li>'}</ul>
            </section>
            <section class="viewer-cdx__section">
              <h2 class="viewer-cdx__heading">Providers</h2>
              <ul class="viewer-cdx__list">${renderCdxEntityRows(providers, "No provider status reported.", { subtitleKeys: ["model"] })}</ul>
            </section>
          </div>
        </div>
      </div>
    `;
  }

  function rerenderCdxStatusFromPreferences() {
    if (isCdxStatusOpen() && latestCdxStatusPayload) {
      preserveActiveCdxMenu(() => {
        host.setDocument("CDX status", renderCdxStatus(latestCdxStatusPayload));
        setupCdxImportExportHandlers();
      });
    }
  }

  function applyOptimisticCdxSessionToggle(sessionName, enable) {
    if (!latestCdxStatusPayload?.status || !sessionName) {
      return () => {};
    }
    const previousPayload = JSON.parse(JSON.stringify(latestCdxStatusPayload));
    const status = latestCdxStatusPayload.status;
    let changed = false;
    ["rows", "sessions", "activeSessions", "active_sessions"].forEach((key) => {
      asArray(status[key]).forEach((entry) => {
        changed = updateCdxSessionEntry(entry, sessionName, enable) || changed;
      });
    });
    if (!changed) {
      return () => {};
    }
    latestCdxStatusSignature = runtimeStatusSignature(latestCdxStatusPayload);
    updateMainCdxBadge(latestCdxStatusPayload);
    rerenderCdxStatusFromPreferences();
    return () => {
      latestCdxStatusPayload = previousPayload;
      latestCdxStatusSignature = runtimeStatusSignature(previousPayload);
      updateMainCdxBadge(previousPayload);
      rerenderCdxStatusFromPreferences();
    };
  }

  function applyOptimisticCdxSessionPermission(sessionName, permission) {
    if (!latestCdxStatusPayload?.status || !sessionName) {
      return () => {};
    }
    const previousPayload = JSON.parse(JSON.stringify(latestCdxStatusPayload));
    const status = latestCdxStatusPayload.status;
    let changed = false;
    ["rows", "sessions", "activeSessions", "active_sessions"].forEach((key) => {
      asArray(status[key]).forEach((entry) => {
        changed = updateCdxSessionPermissionEntry(entry, sessionName, permission) || changed;
      });
    });
    if (!changed) {
      return () => {};
    }
    latestCdxStatusSignature = runtimeStatusSignature(latestCdxStatusPayload);
    updateMainCdxBadge(latestCdxStatusPayload);
    rerenderCdxStatusFromPreferences();
    return () => {
      latestCdxStatusPayload = previousPayload;
      latestCdxStatusSignature = runtimeStatusSignature(previousPayload);
      updateMainCdxBadge(previousPayload);
      rerenderCdxStatusFromPreferences();
    };
  }

  async function applyCdxSessionPermission(sessionName, selected) {
    const options = cdxPermissionValues();
    if (!sessionName || !options.includes(selected)) {
      return;
    }
    pendingCdxSessionPermissions.set(sessionName, selected);
    const rollbackCdxPermission = applyOptimisticCdxSessionPermission(sessionName, selected);
    try {
      const response = await fetch("/api/cdx-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionName, permission: selected }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Permission update failed.");
      }
      host.setMeta(data.payload?.message || `Permission updated for ${sessionName}.`);
      await showCdxStatus({ silent: true, force: true }).catch(() => {});
    } catch (error) {
      rollbackCdxPermission();
      host.setMeta(`CDX permission: ${error?.message || error}`);
    } finally {
      pendingCdxSessionPermissions.delete(sessionName);
      rerenderCdxStatusFromPreferences();
    }
  }

  function renderCdxRuns(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("runs")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX reports are unavailable.")}</div>
        </div>
      `;
    }
    const allRuns = Array.isArray(payload.runs) ? payload.runs : [];
    const sessionFilter = cdxRunSessionFilterPreference();
    const knownSessions = knownCdxRunSessions(allRuns);
    const runs = filterCdxRunsBySession(allRuns, sessionFilter);
    const staleCount = allRuns.filter((run) => String(cdxField(run, ["status", "state"], "")).toLowerCase() === "stale").length;
    const runningCount = allRuns.filter((run) => ["running", "starting", "pending"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
    const failedCount = allRuns.filter((run) => ["failed", "error", "blocked"].includes(String(cdxField(run, ["status", "state"], "")).toLowerCase())).length;
    const tokenTotal = allRuns.reduce((total, run) => total + (cdxTokenUsage(run)?.totalTokens ?? 0), 0);
    const runsSummary = staleCount
      ? `${allRuns.length} reported · ${staleCount} incomplete${runningCount ? ` · ${runningCount} running` : ""}`
      : runningCount
      ? `${allRuns.length} reported · ${runningCount} running`
      : `${allRuns.length} reported`;
    const cards = [
      ["Reports", String(allRuns.length)],
      ["Running", String(runningCount)],
      ["Attention", String(staleCount + failedCount)],
      ["Tokens", tokenTotal ? String(tokenTotal) : "Not reported"]
    ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
    const visibleColumns = cdxRunColumnVisibilityPreference();
    const activeColumns = cdxRunColumns.filter((column) => visibleColumns[column.id]);
    const cellRenderers = {
      run: (run) => {
        const runId = cdxField(run, ["run_id", "runId", "id"], "");
        const detail = cdxRunStatusDetail(run);
        return `<td><code>${escapeHtml(runId || "-")}</code>${detail ? `<div class="viewer-cdx__meta">${escapeHtml(detail)}</div>` : ""}</td>`;
      },
      status: (run) => `<td>${renderCdxBadge(cdxField(run, ["status", "state"], "unknown"))}</td>`,
      kind: (run) => `<td>${escapeHtml(cdxField(run, ["kind"], "assistant"))}</td>`,
      session: (run) => `<td>${escapeHtml(cdxRunSessionName(run))}</td>`,
      tokens: (run) => `<td>${renderCdxTokenUsage(cdxTokenUsage(run))}</td>`,
      cwd: (run) => `<td>${escapeHtml(cdxField(run, ["cwd", "workspace", "repo"], "-"))}</td>`,
      report: (run) => {
        const runId = cdxField(run, ["run_id", "runId", "id"], "");
        return `<td>${runId ? renderCdxActionButton("Open report", `data-viewer-cdx-report="${escapeHtml(runId)}"`, `Open report for ${runId}`) : ""}</td>`;
      }
    };
    const rows = runs.map((run) => {
      return `
        <tr>
          ${activeColumns.map((column) => cellRenderers[column.id](run)).join("")}
        </tr>
      `;
    }).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("runs")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxRunControls(visibleColumns, knownSessions, sessionFilter)}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Reports</h2><span>${escapeHtml(sessionFilter.mode === "subset" ? `${runs.length} shown · ${runsSummary}` : runsSummary)}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr>${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${Math.max(activeColumns.length, 1)}" class="viewer-cdx__empty">No assistant runs reported.</td></tr>`}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  function renderCdxHistory(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("history")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX history is unavailable.")}</div>
        </div>
      `;
    }
    const allHistory = Array.isArray(payload.history) ? payload.history : [];
    const sessionFilter = cdxHistorySessionFilterPreference();
    const knownSessions = knownCdxHistorySessions(allHistory);
    const history = filterCdxHistoryBySession(allHistory, sessionFilter);
    const visibleColumns = cdxHistoryColumnVisibilityPreference();
    const activeColumns = cdxHistoryColumns.filter((column) => visibleColumns[column.id]);
    const failedCount = allHistory.filter((entry) => ["failed", "error", "blocked"].includes(String(cdxField(entry, ["status", "state"], "")).toLowerCase())).length;
    const tokenTotal = allHistory.reduce((total, entry) => total + (cdxTokenUsage(entry)?.totalTokens ?? 0), 0);
    const cards = [
      ["Entries", String(allHistory.length)],
      ["Sessions", String(knownSessions.length)],
      ["Attention", String(failedCount)],
      ["Tokens", tokenTotal ? String(tokenTotal) : "Not reported"]
    ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
    const cellRenderers = {
      session: (entry) => {
        const session = cdxHistorySessionName(entry);
        const provider = cdxField(entry, ["provider"], "-");
        return `<td><strong>${escapeHtml(session)}</strong><div class="viewer-cdx__meta">${escapeHtml(provider)}</div></td>`;
      },
      status: (entry) => `<td>${renderCdxBadge(cdxField(entry, ["status", "state"], "unknown"))}</td>`,
      action: (entry) => {
        const action = cdxField(entry, ["action"], "-");
        const label = cdxField(entry, ["label", "command"], action);
        return `<td>${escapeHtml(label)}</td>`;
      },
      started: (entry) => `<td>${escapeHtml(formatCdxResetAt(cdxField(entry, ["started_at", "startedAt"], "")) || "-")}</td>`,
      duration: (entry) => `<td>${escapeHtml(formatCdxDuration(cdxField(entry, ["duration_ms", "durationMs"], NaN)))}</td>`,
      tokens: (entry) => `<td>${renderCdxTokenUsage(cdxTokenUsage(entry))}</td>`,
      artifacts: (entry) => {
        const transcript = cdxField(entry, ["transcript_path", "transcriptPath"], "");
        const stdout = cdxField(entry, ["stdout_path", "stdoutPath"], "");
        const artifactButtons = [
          transcript ? renderCdxActionButton("Transcript", `data-viewer-cdx-artifact-path="${escapeHtml(transcript)}"`, "Open transcript") : "",
          stdout ? renderCdxActionButton("Stdout", `data-viewer-cdx-artifact-path="${escapeHtml(stdout)}"`, "Open stdout") : ""
        ].filter(Boolean).join("");
        return `<td><div class="viewer-cdx__action-stack">${artifactButtons || '<span class="viewer-cdx__token-empty">-</span>'}</div></td>`;
      }
    };
    const rows = history.slice(0, 50).map((entry) => `
      <tr>
        ${activeColumns.map((column) => cellRenderers[column.id](entry)).join("")}
      </tr>
    `).join("");
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("history")}
        <div class="viewer-cdx__summary">${cards}</div>
        ${renderCdxHistoryControls(visibleColumns, knownSessions, sessionFilter)}
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>History</h2><span>${escapeHtml(sessionFilter.mode === "subset" ? `${history.length} shown · ${allHistory.length} entries` : `${allHistory.length} entries`)}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr>${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
              <tbody>${rows || `<tr><td colspan="${Math.max(activeColumns.length, 1)}" class="viewer-cdx__empty">No CDX history entries reported.</td></tr>`}</tbody>
            </table>
          </div>
        </section>
      </div>
    `;
  }

  async function showCdxStatus(options = {}) {
    if (!host.isCapabilityAvailable("cdx")) {
      const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
      host.setDocument("CDX status", renderCdxStatus({ state: host.capability("cdx").state, message }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Checking CDX status...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-status", { signal: view.signal, cache: "no-store" });
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
    if (host.isViewStale(view)) {
      return;
    }
    if (response.status === 404) {
      host.setDocument("CDX status", renderCdxStatus({
        state: "unavailable",
        message: "CDX status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      host.setMeta("Restart the local viewer to enable CDX status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX status.");
    }
    const nextCdxSignature = runtimeStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestCdxStatusSignature && nextCdxSignature === latestCdxStatusSignature) {
      updateMainCdxBadge(data.payload);
      if (!options.silent) {
        host.setMeta(`Checked CDX status just now · no changes (${new Date().toLocaleTimeString()})`);
      }
      return;
    }
    latestCdxStatusSignature = nextCdxSignature;
    latestCdxStatusPayload = data.payload;
    recordCdxUnreadSnapshot("missions", data.payload, { markSeen: isCdxMissionsOpen() });
    updateMainCdxBadge(data.payload);
    if (options.silent && activeCdxInteractionMenu()) {
      return;
    }
    host.setDocument("CDX status", renderCdxStatus(data.payload));
    setupCdxImportExportHandlers();
    host.setMeta(options.silent ? "CDX status refreshed." : "CDX status loaded.");
  }

  async function showCdxMissions(options = {}) {
    if (!host.isCapabilityAvailable("cdx")) {
      const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
      host.setDocument("CDX missions", renderCdxMissions({ state: host.capability("cdx").state, message }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Loading CDX missions...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-status", { signal: view.signal });
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
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX mission status.");
    }
    latestCdxMissionState.statusPayload = data.payload;
    const sessions = cdxSessions(data.payload?.status || {});
    if (!latestCdxMissionState.sessionId && sessions.length) {
      latestCdxMissionState.sessionId = cdxField(sessions[0], ["id", "name", "session_name", "value"], "");
    }
    updateMainCdxBadge(data.payload);
    host.setDocument("CDX missions", renderCdxMissions(data.payload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
    markCdxSectionSeen("missions", data.payload);
    host.setMeta(options.silent ? "CDX missions refreshed." : "CDX missions loaded.");
  }

  async function previewCdxMission() {
    host.setMeta("Preparing CDX mission preview...");
    const response = await fetch("/api/cdx-mission-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedCdxMissionRequest())
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to preview CDX mission.");
    }
    latestCdxMissionState.planPayload = data.payload;
    latestCdxMissionState.runPayload = null;
    latestCdxMissionState.applyPayload = null;
    latestCdxMissionState.outputMode = "plan";
    if (data.payload?.plan?.sessionId) {
      latestCdxMissionState.sessionId = data.payload.plan.sessionId;
    }
    host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload || data.payload?.status, data.payload, null, null));
    host.setMeta(data.payload?.state === "ok" ? "CDX mission preview ready." : (data.payload?.message || "CDX mission preview failed."));
  }

  async function launchCdxMissionInTerminal() {
    host.setMeta("Preparing CDX mission for a new terminal...");
    const response = await fetch("/api/cdx-mission-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedCdxMissionRequest())
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to prepare CDX mission.");
    }
    latestCdxMissionState.planPayload = data.payload;
    const plan = data.payload?.plan || null;
    if (data.payload?.state !== "ok" || !plan || !Array.isArray(plan.command) || !plan.command.length) {
      latestCdxMissionState.runPayload = null;
      latestCdxMissionState.applyPayload = null;
      latestCdxMissionState.outputMode = "plan";
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, data.payload, null, null));
      host.setMeta(data.payload?.message || "CDX mission could not be prepared for a terminal.");
      return;
    }
    if (plan.sessionId) {
      latestCdxMissionState.sessionId = plan.sessionId;
    }
    const terminalCommand = [
      "/bin/sh",
      "-c",
      cdxMissionTerminalProgressScript(),
      "cdx-mission",
      String(plan.missionId || latestCdxMissionState.missionId || ""),
      String(plan.sessionId || latestCdxMissionState.sessionId || ""),
      "Reports tab after completion",
      ...plan.command
    ];
    const terminalId = await host.spawnWorkshopTerminal({
      command: terminalCommand,
      label: `cdx mission ${plan.missionId || latestCdxMissionState.missionId}`
    });
    const launched = Boolean(terminalId);
    latestCdxMissionState.runPayload = {
      state: launched ? "terminal" : "error",
      message: launched
        ? "Mission launched in a Workshop terminal. Track its result and run id from the Reports tab once it completes."
        : "Unable to start a Workshop terminal for this mission.",
      plan,
      run: null
    };
    latestCdxMissionState.applyPayload = null;
    latestCdxMissionState.outputMode = "run";
    if (isCdxMissionsOpen()) {
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, null));
    }
    host.setMeta(launched ? "CDX mission launched in a new terminal." : "CDX mission terminal launch failed.");
  }

  async function launchCdxMission() {
    if (latestCdxMissionState.runMode === "terminal") {
      return launchCdxMissionInTerminal();
    }
    host.setMeta("Launching CDX mission...");
    const request = selectedCdxMissionRequest();
    const plan = latestCdxMissionState.planPayload?.plan || null;
    const pendingPayload = {
      state: "running",
      message: "CDX mission is running. You can keep using the viewer; this panel will update when it completes.",
      plan,
      run: {
        runId: "pending",
        returnCode: "pending",
        pending: true,
        usage: { available: false, message: "Still running." },
        stdout: "",
        stderr: ""
      }
    };
    latestCdxMissionState.runPayload = pendingPayload;
    latestCdxMissionState.applyPayload = null;
    latestCdxMissionState.outputMode = "run";
    host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, pendingPayload, null));
    const response = await fetch("/api/cdx-mission-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to launch CDX mission.");
    }
    latestCdxMissionState.planPayload = { state: data.payload?.state === "ok" ? "ok" : data.payload?.state, message: data.payload?.message || "", plan: data.payload?.plan };
    latestCdxMissionState.runPayload = data.payload;
    latestCdxMissionState.applyPayload = null;
    latestCdxMissionState.outputMode = "run";
    if (isCdxMissionsOpen()) {
      host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, data.payload, null));
    }
    host.setMeta(data.payload?.state === "ok" ? "CDX mission launched." : (data.payload?.message || "CDX mission failed."));
  }

  async function applyCdxMissionPlan() {
    const actions = latestCdxMissionState.runPayload?.run?.parsed?.actions;
    if (!Array.isArray(actions) || !actions.length) {
      host.setMeta("No corpus actions to apply.");
      return;
    }
    host.setMeta("Applying allowed corpus actions...");
    const response = await fetch("/api/cdx-mission-apply-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to apply corpus plan.");
    }
    latestCdxMissionState.applyPayload = data.payload;
    host.setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, data.payload));
    host.setMeta(data.payload?.state === "ok" ? "Corpus actions applied." : (data.payload?.message || "Corpus apply failed."));
  }

  async function showCdxRuns(options = {}) {
    if (!host.isCapabilityAvailable("cdx")) {
      const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
      latestCdxRunsPayload = { state: host.capability("cdx").state, message };
      host.setDocument("CDX reports", renderCdxRuns({ state: host.capability("cdx").state, message }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Checking CDX reports...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-runs", { signal: view.signal });
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
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX reports.");
    }
    latestCdxRunsPayload = data.payload;
    const wasOpen = isCdxRunsOpen();
    if (options.silent && activeCdxInteractionMenu()) {
      recordCdxUnreadSnapshot("runs", data.payload, { markSeen: wasOpen });
      return;
    }
    host.setDocument("CDX reports", renderCdxRuns(data.payload));
    if (options.silent && !wasOpen) {
      recordCdxUnreadSnapshot("runs", data.payload);
    } else {
      markCdxSectionSeen("runs", data.payload);
    }
    host.setMeta(options.silent ? "CDX reports refreshed." : "CDX reports loaded.");
  }

  async function showCdxHistory(options = {}) {
    if (!host.isCapabilityAvailable("cdx")) {
      const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
      latestCdxHistoryPayload = { state: host.capability("cdx").state, message };
      host.setDocument("CDX history", renderCdxHistory({ state: host.capability("cdx").state, message }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Loading CDX history...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/cdx-history", { signal: view.signal });
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
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX history.");
    }
    latestCdxHistoryPayload = data.payload;
    const wasOpen = isCdxHistoryOpen();
    if (options.silent && activeCdxInteractionMenu()) {
      recordCdxUnreadSnapshot("history", data.payload, { markSeen: wasOpen });
      return;
    }
    host.setDocument("CDX history", renderCdxHistory(data.payload));
    if (options.silent && !wasOpen) {
      recordCdxUnreadSnapshot("history", data.payload);
    } else {
      markCdxSectionSeen("history", data.payload);
    }
    host.setMeta(options.silent ? "CDX history refreshed." : "CDX history loaded.");
  }

  function renderCdxMemory(payload, scope = "current", viewMode = "cleaned") {
    const state = payload?.state || "unavailable", cleaned = String(payload?.cleaned_excerpt || ""), raw = String(payload?.raw_excerpt || ""), source = String(payload?.source_path || "");
    const bytesBefore = Number(payload?.bytes_before || 0), bytesAfter = Number(payload?.bytes_after || 0), sizeLabel = bytesBefore ? `${Math.round(bytesAfter / 1024)} KB / ${Math.round(bytesBefore / 1024)} KB` : "-";
    const warningRows = Array.isArray(payload?.warnings) && payload.warnings.length
      ? `<div class="viewer-cdx__pills">${payload.warnings.map((warning) => `<span class="viewer-cdx__pill">${escapeHtml(String(warning))}</span>`).join("")}</div>`
      : "";
    const cards = [["Memory", cdxLabel(scope)], ["Status", cdxLabel(state)], ["Cleaned", sizeLabel], ["Noise", payload?.noise_ratio !== undefined ? `${Math.round(Number(payload.noise_ratio || 0) * 100)}%` : "-"]].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(String(value))}</div>
      </div>
    `).join("");
    const scopeButtons = ["current", "global", "project"].map((item) => `
      <button class="viewer-cdx__mode${scope === item ? " is-active" : ""}" type="button" data-viewer-cdx-memory-scope="${item}">${escapeHtml(cdxLabel(item))}</button>
    `).join("");
    const viewButtons = ["cleaned", "raw"].map((item) => `
      <button class="viewer-cdx__mode${viewMode === item ? " is-active" : ""}" type="button" data-viewer-cdx-memory-view="${item}">${escapeHtml(cdxLabel(item))}</button>
    `).join("");
    const excerpt = viewMode === "raw" ? raw : cleaned, api = markdownApi();
    const body = excerpt
      ? viewMode === "raw"
        ? renderCodeViewer(excerpt, { language: "markdown", truncated: false })
        : `<div class="viewer-cdx__memory-body markdown-preview">${api && typeof api.renderMarkdownToHtml === "function" ? api.renderMarkdownToHtml(excerpt) : `<pre>${escapeHtml(excerpt)}</pre>`}</div>`
      : `<div class="viewer-cdx__empty">${escapeHtml(payload?.message || "No CDX memory content reported.")}</div>`;
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("memory")}
        <section class="viewer-cdx__section viewer-cdx__section--primary">
          <div class="viewer-ci__heading"><h2>${viewMode === "raw" ? "Raw Memory" : "Useful Handoff"}</h2><span>${escapeHtml(source)}</span></div>
          ${body}
        </section>
        <div class="viewer-cdx__summary">${cards}</div>
        <div class="viewer-cdx__controls" aria-label="CDX memory controls">
          <div class="viewer-cdx__modes" role="tablist" aria-label="CDX memory scope">${scopeButtons}</div>
          <div class="viewer-cdx__modes" role="tablist" aria-label="CDX memory excerpt">${viewButtons}</div>
        </div>
        ${warningRows}
      </div>
    `;
  }

  async function showCdxMemory(options = {}) {
    if (!host.isCapabilityAvailable("cdx")) {
      const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
      latestCdxMemoryPayload = { state: host.capability("cdx").state, message };
      host.setDocument("CDX memory", renderCdxMemory(latestCdxMemoryPayload, latestCdxMemoryScope, latestCdxMemoryView));
      host.setMeta(message);
      return;
    }
    latestCdxMemoryScope = options.scope || latestCdxMemoryScope || "current";
    if (!options.silent) {
      host.setMeta("Loading CDX memory...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch(`/api/cdx-memory?${new URLSearchParams({ scope: latestCdxMemoryScope }).toString()}`, { signal: view.signal, cache: "no-store" });
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
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX memory.");
    }
    latestCdxMemoryPayload = data.payload;
    host.setDocument("CDX memory", renderCdxMemory(data.payload, latestCdxMemoryScope, latestCdxMemoryView));
    host.setMeta(options.silent ? "CDX memory refreshed." : "CDX memory loaded.");
  }

  function renderCdxDisk(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("disk")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX disk usage is unavailable.")}</div>
        </div>
      `;
    }
    const disk = payload.disk && typeof payload.disk === "object" ? payload.disk : {};
    const profiles = Array.isArray(disk.children) ? disk.children : [];
    const candidates = Array.isArray(disk.candidates) ? disk.candidates : [];
    const totalBytes = Number(disk.bytes) || 0;
    const measured = formatCdxResetAt(String(payload.measured_at || ""));
    const cards = [
      ["Total", String(disk.size || "-")],
      ["Profiles", String(profiles.length)],
      ["Reclaimable", String(disk.reclaimable_size || "0 B")],
      ["Scanned", measured ? `${measured} · cached 5 min` : "-"]
    ].map(([label, value]) => `
      <div class="viewer-cdx__card">
        <div class="viewer-cdx__label">${escapeHtml(label)}</div>
        <div class="viewer-cdx__value">${escapeHtml(value)}</div>
      </div>
    `).join("");
    const profileRows = profiles.slice().sort((left, right) => (Number(right.bytes) || 0) - (Number(left.bytes) || 0)).map((profile) => {
      const bytes = Number(profile.bytes) || 0;
      const share = totalBytes > 0 ? `${Math.round((bytes / totalBytes) * 100)}%` : "-";
      return `
        <tr title="${escapeHtml(String(profile.path || ""))}">
          <td><strong>${escapeHtml(String(profile.name || "-"))}</strong></td>
          <td>${escapeHtml(String(profile.size || "-"))}</td>
          <td>${escapeHtml(share)}</td>
        </tr>
      `;
    }).join("");
    const candidateRows = candidates.map((candidate) => `
      <tr title="${escapeHtml(String(candidate.path || ""))}">
        <td><strong>${escapeHtml(String(candidate.profile || "-"))}</strong></td>
        <td>${escapeHtml(String(candidate.kind || "-"))}</td>
        <td>${escapeHtml(String(candidate.size || "-"))}</td>
        <td>${escapeHtml(String(candidate.reason || "-"))}</td>
      </tr>
    `).join("");
    const cleanupHint = candidates.length
      ? `<div class="viewer-cdx__meta">Reclaim from a terminal: <code>cdx clean profiles --tmp</code> or <code>cdx clean profiles --old-logs 30</code> (both confirm before deleting).</div>`
      : "";
    return `
      <div class="viewer-cdx">
        ${renderCdxModeSwitcher("disk")}
        <div class="viewer-cdx__summary">${cards}</div>
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Profiles</h2><span>${escapeHtml(String(disk.path || ""))}</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr><th>PROFILE</th><th>SIZE</th><th>SHARE</th></tr></thead>
              <tbody>${profileRows || '<tr><td colspan="3" class="viewer-cdx__empty">No profiles reported.</td></tr>'}</tbody>
            </table>
          </div>
        </section>
        <section class="viewer-cdx__section">
          <div class="viewer-ci__heading"><h2>Cleanup candidates</h2><span>${escapeHtml(disk.reclaimable_size || "0 B")} reclaimable</span></div>
          <div class="viewer-cdx__table-wrap">
            <table class="viewer-cdx__table">
              <thead><tr><th>PROFILE</th><th>KIND</th><th>SIZE</th><th>REASON</th></tr></thead>
              <tbody>${candidateRows || '<tr><td colspan="4" class="viewer-cdx__empty">Nothing safe to clean up.</td></tr>'}</tbody>
            </table>
          </div>
          ${cleanupHint}
        </section>
      </div>
    `;
  }

  async function showCdxDisk(options = {}) {
    if (!host.isCapabilityAvailable("cdx")) {
      const message = host.capabilityMessage("cdx", "CDX is not available for this project.");
      host.setDocument("CDX disk", renderCdxDisk({ state: host.capability("cdx").state, message }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Scanning CDX disk usage...");
      // First scan (or forced rescan) can take a minute on large installs;
      // show a placeholder instead of leaving the previous screen up.
      host.setDocument("CDX disk", `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("disk")}
          <div class="viewer-cdx__state">Scanning profile disk usage${options.force ? " (forced rescan)" : ""}... This can take a minute on large installs; results are then cached for 5 minutes.</div>
        </div>
      `);
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      // The server caches disk scans for 5 minutes; explicit Refresh rescans.
      response = await fetch("/api/cdx-disk", options.force
        ? { signal: view.signal, cache: "no-store", headers: { "Cache-Control": "no-cache" } }
        : { signal: view.signal });
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
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX disk usage.");
    }
    host.setDocument("CDX disk", renderCdxDisk(data.payload));
    host.setMeta(options.silent ? "CDX disk usage refreshed." : "CDX disk usage loaded.");
  }

  async function showCdxReport(runId, options = {}) {
    if (!runId) {
      return;
    }
    host.setMeta("Loading CDX report...");
    const view = options.view || host.beginView();
    let response;
    let data;
    try {
      response = await fetch(`/api/cdx-run-report?${new URLSearchParams({ runId }).toString()}`, { signal: view.signal });
      data = await response.json();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX report.");
    }
    host.setDocument("CDX run report", renderCdxReport(data.payload));
    cdxCloseTarget = { type: "cdx-runs" };
    host.setMeta("CDX report loaded.");
  }

  async function openCdxArtifact(path) {
    if (!path) {
      return;
    }
    host.setMeta("Loading CDX log...");
    const response = await fetch("/api/cdx-artifact-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX artifact.");
    }
    const reportSnapshot = host.currentDocumentSnapshot("CDX run report");
    host.setDocument(data.payload?.name ? `CDX log · ${data.payload.name}` : "CDX log", renderCdxLogPreview(data.payload));
    cdxCloseTarget = { type: "cdx-report", title: reportSnapshot.title, html: reportSnapshot.html };
    host.setMeta(`Loaded ${data.payload?.path || path}.`);
  }

  const state = {};
  Object.defineProperties(state, {
    cdxCloseTarget: { get: () => cdxCloseTarget, set: (value) => { cdxCloseTarget = value; } },
    latestCdxHistoryPayload: { get: () => latestCdxHistoryPayload, set: (value) => { latestCdxHistoryPayload = value; } },
    latestCdxMemoryPayload: { get: () => latestCdxMemoryPayload, set: (value) => { latestCdxMemoryPayload = value; } },
    latestCdxMemoryScope: { get: () => latestCdxMemoryScope, set: (value) => { latestCdxMemoryScope = value; } },
    latestCdxMemoryView: { get: () => latestCdxMemoryView, set: (value) => { latestCdxMemoryView = value; } },
    latestCdxMissionState: { get: () => latestCdxMissionState, set: (value) => { latestCdxMissionState = value; } },
    latestCdxRunsPayload: { get: () => latestCdxRunsPayload, set: (value) => { latestCdxRunsPayload = value; } },
    latestCdxStatusPayload: { get: () => latestCdxStatusPayload, set: (value) => { latestCdxStatusPayload = value; } },
    latestCdxStatusSignature: { get: () => latestCdxStatusSignature, set: (value) => { latestCdxStatusSignature = value; } },
    pendingCdxSessionResets: { get: () => pendingCdxSessionResets },
    pendingCdxSessionToggles: { get: () => pendingCdxSessionToggles },
  });

  return {
    state,
    applyCdxMissionPlan,
    applyCdxSessionConfigModal,
    applyCdxSessionPermission,
    applyOptimisticCdxSessionPermission,
    applyOptimisticCdxSessionToggle,
    cdxColumnVisibilityPreference,
    cdxHistoryColumnVisibilityPreference,
    cdxHistorySessionFilterPreference,
    cdxProviderFilterPreference,
    cdxRunColumnVisibilityPreference,
    cdxRunSessionFilterPreference,
    cdxSessionForTerminal,
    cdxSessionLastUsedMs,
    cdxSessionUsage,
    cdxUsageFromStatus,
    chooseCdxHandoffSource,
    isCdxHistoryOpen,
    isCdxMissionsOpen,
    isCdxRunsOpen,
    isCdxStatusOpen,
    launchCdxMission,
    launchCdxMissionInTerminal,
    loadCdxSessionsForCustomTerminal,
    markCdxSectionSeen,
    openCdxArtifact,
    persistCdxColumnVisibility,
    persistCdxHistoryColumnVisibility,
    persistCdxHistorySessionFilter,
    persistCdxProviderFilter,
    persistCdxRunColumnVisibility,
    persistCdxRunSessionFilter,
    persistCdxSessionConfig,
    previewCdxMission,
    recordCdxDelta,
    recordCdxUnreadSnapshot,
    refreshCdxBadgeCounters,
    refreshCdxSessionUsage,
    renderCdxDisk,
    renderCdxHistory,
    renderCdxMemory,
    renderCdxMissionConfigMenu,
    renderCdxMissionInputs,
    renderCdxMissionSetup,
    renderCdxMissions,
    renderCdxRuns,
    renderCdxSessionTable,
    renderCdxStatus,
    rerenderCdxStatusFromPreferences,
    selectCdxMissionFromModal,
    selectedCdxMissionRequest,
    setCdxMissionBusy,
    showCdxDisk,
    showCdxHistory,
    showCdxMemory,
    showCdxMissions,
    showCdxReport,
    showCdxRuns,
    showCdxSessionConfigModal,
    showCdxStatus,
    updateCdxMissionsCount,
    updateCdxSessionConfigFromModal,
    updateCdxUnreadBadges,
    updateMainCdxBadge,
    withCdxMissionAction,
  };
}
