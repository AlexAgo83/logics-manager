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

  function cdxReportMissionOutput(report, run, taskReport) {
    const parsed = report?.parsed && typeof report.parsed === "object" ? report.parsed : {};
    const candidates = [
      report?.missionOutput,
      report?.mission_output,
      parsed.missionOutput,
      parsed.mission_output,
      run?.missionOutput,
      run?.mission_output,
      taskReport?.missionOutput,
      taskReport?.mission_output
    ];
    return candidates.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate)) || null;
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

  function renderCdxDetailRow(label, value) {
    return `
      <li class="viewer-cdx__row viewer-cdx__row--block">
        <span>${escapeHtml(label)}</span>
        <div class="viewer-cdx__detail-value">${renderCdxDetailValue(value)}</div>
      </li>
    `;
  }

  function cdxReportSummary(report, taskReport, missionOutput, runError, permissionDenials) {
    const direct = taskReport?.summary || missionOutput?.summary || report?.summary || "";
    if (direct) {
      return String(direct);
    }
    if (permissionDenials.length) {
      return "Run stopped on permission checks.";
    }
    if (runError?.message) {
      return String(runError.message);
    }
    return "No summary was reported for this run.";
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

  function parseCdxLogJson(content) {
    const raw = String(content || "").trim();
    if (!raw) {
      return null;
    }
    try {
      return { kind: "json", value: JSON.parse(raw) };
    } catch {
      // Fall through to JSONL detection.
    }
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) {
      return null;
    }
    const values = [];
    for (const line of lines) {
      try {
        values.push(JSON.parse(line));
      } catch {
        return null;
      }
    }
    return { kind: "jsonl", value: values };
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

  async function showCdxStatus(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      setDocument("CDX status", renderCdxStatus({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking CDX status...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
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
    if (isViewStale(view)) {
      return;
    }
    if (response.status === 404) {
      setDocument("CDX status", renderCdxStatus({
        state: "unavailable",
        message: "CDX status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      setMeta("Restart the local viewer to enable CDX status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX status.");
    }
    const nextCdxSignature = runtimeStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestCdxStatusSignature && nextCdxSignature === latestCdxStatusSignature) {
      updateMainCdxBadge(data.payload);
      if (!options.silent) {
        setMeta(`Checked CDX status just now · no changes (${new Date().toLocaleTimeString()})`);
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
    setDocument("CDX status", renderCdxStatus(data.payload));
    setupCdxImportExportHandlers();
    setMeta(options.silent ? "CDX status refreshed." : "CDX status loaded.");
  }

  async function showCdxMissions(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      setDocument("CDX missions", renderCdxMissions({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Loading CDX missions...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
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
    if (isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX mission status.");
    }
    latestCdxMissionState.statusPayload = data.payload;
    const sessions = cdxSessions(data.payload?.status || {});
    if (!latestCdxMissionState.sessionId && sessions.length) {
      latestCdxMissionState.sessionId = cdxField(sessions[0], ["id", "name", "session_name", "value"], "");
