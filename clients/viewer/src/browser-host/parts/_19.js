    }
    updateMainCdxBadge(data.payload);
    setDocument("CDX missions", renderCdxMissions(data.payload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
    markCdxSectionSeen("missions", data.payload);
    setMeta(options.silent ? "CDX missions refreshed." : "CDX missions loaded.");
  }

  async function previewCdxMission() {
    setMeta("Preparing CDX mission preview...");
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
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload || data.payload?.status, data.payload, null, null));
    setMeta(data.payload?.state === "ok" ? "CDX mission preview ready." : (data.payload?.message || "CDX mission preview failed."));
  }

  function cdxMissionTerminalProgressScript() {
    return [
      'mission_id="$1"',
      'session_id="$2"',
      'report_hint="$3"',
      'shift 3',
      'mode="${CDX_MISSION_PROGRESS_MODE:-compact}"',
      'start_ts="$(date +%s)"',
      'last_activity="$start_ts"',
      'last_total=0',
      'stdout_file="${TMPDIR:-/tmp}/cdx-mission-stdout-$$.log"',
      'stderr_file="${TMPDIR:-/tmp}/cdx-mission-stderr-$$.log"',
      'command_label="$1"',
      'if [ $# -ge 2 ]; then command_label="$1 $2"; fi',
      'printf "%s\\n" "[cdx mission] start mission=${mission_id:-unknown} session=${session_id:-unknown}"',
      'printf "%s\\n" "[cdx mission] report/transcript: ${report_hint:-Reports tab after completion}"',
      'printf "%s\\n" "[cdx mission] command: ${command_label:-cdx run}"',
      'printf "%s\\n" "[cdx mission] progress mode: $mode (set CDX_MISSION_PROGRESS_MODE=verbose or watch for more detail)"',
      'printf "\\n"',
      '"$@" >"$stdout_file" 2>"$stderr_file" &',
      'pid="$!"',
      'printf "%s\\n" "[cdx mission] event: process-started pid=$pid"',
      'while kill -0 "$pid" 2>/dev/null; do',
      '  sleep 5',
      '  now="$(date +%s)"',
      '  elapsed=$((now - start_ts))',
      '  stdout_bytes="$(wc -c < "$stdout_file" | tr -d " ")"',
      '  stderr_bytes="$(wc -c < "$stderr_file" | tr -d " ")"',
      '  total_bytes=$((stdout_bytes + stderr_bytes))',
      '  if [ "$total_bytes" -gt "$last_total" ]; then',
      '    last_activity="$now"',
      '    last_total="$total_bytes"',
      '    activity="output activity"',
      '  elif [ $((now - last_activity)) -ge 60 ]; then',
      '    activity="no recent activity"',
      '  else',
      '    activity="waiting on command output"',
      '  fi',
      '  idle=$((now - last_activity))',
      '  if [ "$mode" = "watch" ]; then printf "\\033[H\\033[2J"; fi',
      '  printf "%s\\n" "[cdx mission] heartbeat elapsed=${elapsed}s idle=${idle}s phase=running command=${command_label:-cdx run} active=${elapsed}s state=$activity"',
      '  if [ "$mode" = "verbose" ]; then',
      '    if [ "$stdout_bytes" -gt 0 ]; then printf "%s\\n" "[cdx mission] stdout tail:"; tail -n 5 "$stdout_file"; fi',
      '    if [ "$stderr_bytes" -gt 0 ]; then printf "%s\\n" "[cdx mission] stderr tail:"; tail -n 5 "$stderr_file"; fi',
      '  fi',
      'done',
      'wait "$pid"',
      'rc="$?"',
      'end_ts="$(date +%s)"',
      'elapsed=$((end_ts - start_ts))',
      'stdout_bytes="$(wc -c < "$stdout_file" | tr -d " ")"',
      'stderr_bytes="$(wc -c < "$stderr_file" | tr -d " ")"',
      'if [ "$rc" -eq 0 ]; then status="success"; else status="failure"; fi',
      'printf "\\n%s\\n" "[cdx mission] final status=$status exit=$rc elapsed=${elapsed}s stdout_bytes=$stdout_bytes stderr_bytes=$stderr_bytes report/transcript=${report_hint:-Reports tab after completion}"',
      'if [ "$stdout_bytes" -gt 0 ]; then',
      '  printf "%s\\n" "[cdx mission] stdout:"',
      '  cat "$stdout_file"',
      'fi',
      'if [ "$stderr_bytes" -gt 0 ]; then',
      '  printf "%s\\n" "[cdx mission] stderr tail:"',
      '  tail -n 40 "$stderr_file"',
      'fi',
      'if [ "$rc" -ne 0 ]; then printf "%s\\n" "[cdx mission] next action: inspect the terminal output and the Reports tab for the failed run."; fi',
      'rm -f "$stdout_file" "$stderr_file"',
      'exit "$rc"'
    ].join("\n");
  }

  async function launchCdxMissionInTerminal() {
    setMeta("Preparing CDX mission for a new terminal...");
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
      setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, data.payload, null, null));
      setMeta(data.payload?.message || "CDX mission could not be prepared for a terminal.");
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
    const terminalId = await spawnWorkshopTerminal({
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
      setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, null));
    }
    setMeta(launched ? "CDX mission launched in a new terminal." : "CDX mission terminal launch failed.");
  }

  async function launchCdxMission() {
    if (latestCdxMissionState.runMode === "terminal") {
      return launchCdxMissionInTerminal();
    }
    setMeta("Launching CDX mission...");
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
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, pendingPayload, null));
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
      setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, data.payload, null));
    }
    setMeta(data.payload?.state === "ok" ? "CDX mission launched." : (data.payload?.message || "CDX mission failed."));
  }

  async function applyCdxMissionPlan() {
    const actions = latestCdxMissionState.runPayload?.run?.parsed?.actions;
    if (!Array.isArray(actions) || !actions.length) {
      setMeta("No corpus actions to apply.");
      return;
    }
    setMeta("Applying allowed corpus actions...");
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
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, data.payload));
    setMeta(data.payload?.state === "ok" ? "Corpus actions applied." : (data.payload?.message || "Corpus apply failed."));
  }

  async function showCdxRuns(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      latestCdxRunsPayload = { state: capability("cdx").state, message };
      setDocument("CDX reports", renderCdxRuns({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking CDX reports...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
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
    if (isViewStale(view)) {
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
    setDocument("CDX reports", renderCdxRuns(data.payload));
    if (options.silent && !wasOpen) {
      recordCdxUnreadSnapshot("runs", data.payload);
    } else {
      markCdxSectionSeen("runs", data.payload);
    }
    setMeta(options.silent ? "CDX reports refreshed." : "CDX reports loaded.");
  }

  async function showCdxHistory(options = {}) {
    if (!isCapabilityAvailable("cdx")) {
      const message = capabilityMessage("cdx", "CDX is not available for this project.");
      latestCdxHistoryPayload = { state: capability("cdx").state, message };
      setDocument("CDX history", renderCdxHistory({ state: capability("cdx").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Loading CDX history...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
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
    if (isViewStale(view)) {
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
    setDocument("CDX history", renderCdxHistory(data.payload));
    if (options.silent && !wasOpen) {
      recordCdxUnreadSnapshot("history", data.payload);
    } else {
      markCdxSectionSeen("history", data.payload);
    }
    setMeta(options.silent ? "CDX history refreshed." : "CDX history loaded.");
  }

  async function showCdxReport(runId, options = {}) {
    if (!runId) {
      return;
    }
    setMeta("Loading CDX report...");
    const view = options.view || beginView();
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
    if (isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX report.");
    }
    setDocument("CDX run report", renderCdxReport(data.payload));
    cdxCloseTarget = { type: "cdx-runs" };
    setMeta("CDX report loaded.");
  }

  async function openCdxArtifact(path) {
    if (!path) {
      return;
    }
    setMeta("Loading CDX log...");
    const response = await fetch("/api/cdx-artifact-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CDX artifact.");
    }
    const reportSnapshot = currentDocumentSnapshot("CDX run report");
    setDocument(data.payload?.name ? `CDX log · ${data.payload.name}` : "CDX log", renderCdxLogPreview(data.payload));
    cdxCloseTarget = { type: "cdx-report", title: reportSnapshot.title, html: reportSnapshot.html };
    setMeta(`Loaded ${data.payload?.path || path}.`);
  }

  function renderCiBadge(value) {
    const tone = ciBadgeTone(value);
    return `<span class="viewer-ci__badge viewer-ci__badge--${escapeHtml(tone)}">${escapeHtml(ciBadgeLabel(value))}</span>`;
  }

  function formatCiDate(value) {
    const timestamp = Date.parse(String(value || ""));
    if (!Number.isFinite(timestamp)) {
      return "";
    }
    return new Date(timestamp).toLocaleString();
  }

  function renderCiModeSwitcher(active) {
    return `
      <div class="viewer-cdx__modes viewer-ci__modes" role="tablist" aria-label="Git and CI views">
        <button class="viewer-cdx__mode${active === "git" ? " is-active" : ""}" type="button" data-viewer-ci-mode="git" aria-selected="${active === "git" ? "true" : "false"}">Git</button>
        <button class="viewer-cdx__mode${active === "runs" ? " is-active" : ""}" type="button" data-viewer-ci-mode="runs" aria-selected="${active === "runs" ? "true" : "false"}">CI</button>
        <button class="viewer-cdx__mode${active === "release" ? " is-active" : ""}" type="button" data-viewer-ci-mode="release" aria-selected="${active === "release" ? "true" : "false"}">Release</button>
      </div>
    `;
  }

  function renderCiStatus(payload) {
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
