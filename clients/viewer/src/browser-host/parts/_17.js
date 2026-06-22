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

  function renderTextRemaining(item) {
    const percent = cdxRemainingPct(item);
    return percent === null ? "" : `${percent}% remaining`;
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

  function renderCdxModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes" role="tablist" aria-label="CDX views">
        <button class="viewer-cdx__mode${active === "status" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="status" aria-selected="${active === "status" ? "true" : "false"}">Sessions</button>
        <button class="viewer-cdx__mode${active === "missions" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="missions" aria-selected="${active === "missions" ? "true" : "false"}">Missions</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">Reports</button>
        <button class="viewer-cdx__mode${active === "history" ? " is-active" : ""}" type="button" data-viewer-cdx-mode="history" aria-selected="${active === "history" ? "true" : "false"}">History</button>
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
        setDocument("CDX status", renderCdxStatus(latestCdxStatusPayload));
        setupCdxImportExportHandlers();
      });
    }
  }

  function cdxSessionName(item) {
    return cdxField(item, ["session_name", "name", "id", "value"], "");
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

  function updateCdxSessionPermissionEntry(item, sessionName, permission) {
    if (!item || typeof item !== "object" || cdxSessionName(item) !== sessionName) {
      return false;
    }
    item.permission = permission;
    item.permission_mode = permission;
    item.permissionMode = permission;
    return true;
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
      setMeta(data.payload?.message || `Permission updated for ${sessionName}.`);
      await showCdxStatus({ silent: true, force: true }).catch(() => {});
    } catch (error) {
      rollbackCdxPermission();
      setMeta(`CDX permission: ${error?.message || error}`);
    } finally {
      pendingCdxSessionPermissions.delete(sessionName);
      rerenderCdxStatusFromPreferences();
    }
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
          const data = await response.json();
          if (data.ok) {
            showCdxFormStatus(statusEl, "ok", data.payload?.message || "Import complete.");
            if (fileInput) fileInput.value = "";
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || "Import failed.");
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
          const data = await response.json();
          if (data.ok) {
            downloadBase64File(data.payload?.fileBase64 || "", data.payload?.filename || "cdx-accounts.cdx");
            showCdxFormStatus(statusEl, "ok", "Export ready — file downloaded.");
            if (passInput) passInput.value = "";
          } else {
            showCdxFormStatus(statusEl, "error", data.error || "Export failed.");
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

  function formatCdxDuration(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) {
      return "-";
    }
    const totalSeconds = Math.round(value / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  function renderCdxHistory(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-cdx">
          ${renderCdxModeSwitcher("history")}
          <div class="viewer-cdx__state">${escapeHtml(payload?.message || "CDX history is unavailable.")}</div>
        </div>
      `;
