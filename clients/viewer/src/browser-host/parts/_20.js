          </section>
        </div>
      </div>
    `;
  }

  function releaseBadgeTone(value) {
    const state = String(value || "").toLowerCase();
    if (["ready", "passed"].includes(state)) {
      return "passing";
    }
    if (["blocked", "failed", "stale"].includes(state)) {
      return "failing";
    }
    if (["pending", "planning", "preparing", "local_validation", "commit_ready", "pushed", "ci_verification", "github_release", "external_publication"].includes(state)) {
      return "running";
    }
    return "unknown";
  }

  function releaseEvidenceRows(evidence) {
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

  function renderReleaseGate(gate) {
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

  function renderReleaseRunSection(runsPayload) {
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

  function renderReleaseStatus(payload, runsPayload) {
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

  async function showReleaseStatus(options = {}) {
    latestCiScreenMode = "release";
    if (!options.silent) {
      setMeta("Checking release workflow state...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    let runsData = {};
    try {
      const [statusResponse, runsResponse] = await Promise.all([
        fetch("/api/release-status", { signal: view.signal }),
        fetch("/api/release-runs", { signal: view.signal }).catch(() => null),
      ]);
      response = statusResponse;
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (runsResponse && runsResponse.ok) {
        try {
          runsData = await runsResponse.json();
        } catch {
          runsData = {};
        }
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
      throw new Error(data.error || "Unable to load release workflow state.");
    }
    const runsPayload = runsData && runsData.ok ? runsData.payload : null;
    if (runsPayload) {
      latestReleaseRunsStatusSignature = runtimeStatusSignature(runsPayload);
      updateMainReleaseBadge(runsPayload);
    }
    setDocument("Remote", renderReleaseStatus(data.payload, runsPayload));
    const state = data.payload?.state || "unknown";
    const button = ciButton();
    if (button instanceof HTMLElement) {
      button.title = data.payload?.next_action || "Show CI and release workflow state";
    }
    setMeta(options.silent ? "Release workflow refreshed." : `Release workflow state: ${state}.`);
  }

  // Clear the recorded release gate evidence (server-side) so every gate
  // returns to pending, then reload the Release sub-screen.
  async function resetReleaseState() {
    setMeta("Resetting release evidence...");
    let data = {};
    try {
      const response = await fetch("/api/release-reset", { method: "POST", headers: { "Content-Type": "application/json" } });
      data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to reset release evidence.");
      }
    } catch (error) {
      setMeta(`Release reset failed: ${error?.message || error}`);
      return;
    }
    await showReleaseStatus({ force: true });
    const cleared = Number(data.payload?.cleared || 0);
    setMeta(cleared > 0
      ? `Release evidence reset — cleared ${cleared} entr${cleared === 1 ? "y" : "ies"}; gates are pending.`
      : "Release evidence already empty; gates are pending.");
  }

  async function showCiStatus(options = {}) {
    latestCiScreenMode = "runs";
    if (!isCapabilityAvailable("ci")) {
      const message = capabilityMessage("ci", "CI is not available for this project.");
      setDocument("Remote", renderCiStatus({ visible: false, state: capability("ci").state, message }));
      setMeta(message);
      return;
    }
    if (!options.silent) {
      setMeta("Checking CI status...");
    }
    const view = options.view || beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/ci-status", { signal: view.signal });
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
      setDocument("Remote", renderCiStatus({
        visible: true,
        state: "unavailable",
        badgeState: "unavailable",
        message: "CI status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      setMeta("Restart the local viewer to enable CI status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load CI status.");
    }
    const nextCiSignature = runtimeStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestCiStatusSignature && nextCiSignature === latestCiStatusSignature) {
      updateMainCiBadge(data.payload);
      if (!options.silent) {
        setMeta(`Checked CI status just now · no changes (${new Date().toLocaleTimeString()})`);
      }
      return;
    }
    latestCiStatusSignature = nextCiSignature;
    updateMainCiBadge(data.payload);
    setDocument("Remote", renderCiStatus(data.payload));
    setMeta(options.silent ? "CI status refreshed." : "CI status loaded.");
  }

  function renderGitStatus(payload) {
    if (!payload || payload.state !== "ok") {
      return `
        <div class="viewer-git">
          ${renderCiModeSwitcher("git")}
          <div class="viewer-git__state">${escapeHtml(payload?.message || "Git status is unavailable.")}</div>
        </div>
      `;
    }
    const counts = payload.counts || {};
    const stagedCount = Number(counts.staged || 0);
    const modifiedCount = Number(counts.modified || 0);
    const deletedCount = Number(counts.deleted || 0);
    const renamedCount = Number(counts.renamed || 0);
    const untrackedCount = Number(counts.untracked || 0);
    const cards = [
      renderGitSummaryCard("Branch", payload.branch || "HEAD"),
      renderGitSummaryCard("Tracking", payload.tracking || "None"),
      renderGitSummarySegments("Ahead / Behind", [
        ["Ahead", payload.ahead || 0],
        ["Behind", payload.behind || 0]
      ]),
      renderGitSummaryCard("State", payload.clean ? "Clean" : "Dirty"),
      renderGitSummarySegments("Files", [
        ["Staged", stagedCount],
        ["Worktree", modifiedCount + deletedCount + renamedCount],
        ["Untracked", untrackedCount]
      ])
    ].join("");
    const groupDefs = [
      ["staged", "Staged", "staged"],
      ["modified", "Modified", "worktree"],
      ["deleted", "Deleted", "worktree"],
      ["renamed", "Renamed", "worktree"],
      ["untracked", "Untracked", "untracked"]
    ];
    const domainDefs = [
      ["changes", "Changes", stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount],
      ["staged", "Staged", stagedCount],
      ["worktree", "Worktree", modifiedCount + deletedCount + renamedCount],
      ["untracked", "Untracked", untrackedCount],
      ["history", "History", formatGitHistoryCount(payload)],
      ["remote", "Remote", payload.tracking ? 1 : 0]
    ];
    const domains = domainDefs.map(([key, label, count], index) => `
      <button class="viewer-git__domain${index === 0 ? " is-active" : ""}" type="button" data-viewer-git-domain="${escapeHtml(key)}" aria-pressed="${index === 0 ? "true" : "false"}">
        <span class="viewer-git__domain-label">${escapeHtml(label)}${key === "changes" ? gitBadgeHtml("changes") : ""}${key === "history" ? gitBadgeHtml("history") : ""}</span><strong>${escapeHtml(count)}</strong>
      </button>
    `).join("");
    const renderChangeStats = (entry) => {
      const additions = Number(entry?.additions);
      const deletions = Number(entry?.deletions);
      if (!Number.isFinite(additions) || !Number.isFinite(deletions)) {
        return "";
      }
      return `<span class="viewer-git__file-changes" title="Line changes"><span class="viewer-git__file-additions">+${escapeHtml(additions)}</span><span class="viewer-git__file-deletions">-${escapeHtml(deletions)}</span></span>`;
    };
    const renderFileSections = (allowedKeys) => groupDefs.filter(([key]) => allowedKeys.includes(key)).map(([key, label]) => {
      const entries = Array.isArray(payload.groups?.[key]) ? payload.groups[key] : [];
      if (!entries.length) {
        return "";
      }
      return `
        <section class="viewer-git__section">
          <h2>${escapeHtml(label)}</h2>
          <ul class="viewer-git__files">${entries.map((entry) => `
            <li>
              <button class="viewer-git__file" type="button" data-viewer-git-file="${escapeHtml(entry.path)}" data-viewer-git-cached="${key === "staged" ? "1" : "0"}">
                <span class="viewer-git__file-path">${escapeHtml(entry.from ? `${entry.from} -> ${entry.path}` : entry.path)}</span>
                ${renderChangeStats(entry)}
                ${entry.logicsType ? `<span class="viewer-git__file-kind">${escapeHtml(entry.logicsType)}</span>` : ""}
              </button>
            </li>
          `).join("")}</ul>
        </section>
      `;
    }).join("");
    const changesSections = renderFileSections(["staged", "modified", "deleted", "renamed", "untracked"]);
    const stagedSections = renderFileSections(["staged"]);
    const worktreeSections = renderFileSections(["modified", "deleted", "renamed"]);
    const untrackedSections = renderFileSections(["untracked"]);
    const clean = payload.clean ? '<p class="viewer-git__state">Working tree clean.</p>' : "";
    const recentCommits = Array.isArray(payload.recentCommits) ? payload.recentCommits : [];
    const historyCount = formatGitHistoryCount(payload);
    const renderGitHistoryReveal = (hiddenCount) => {
      if (hiddenCount <= 0) {
        return "";
      }
      const nextCount = Math.min(gitHistoryPageSize, hiddenCount);
      return `<li class="viewer-git__commit-row viewer-git__commit-row--reveal"><button class="viewer-git__reveal" type="button" data-viewer-git-history-reveal>Show ${escapeHtml(nextCount)} more</button></li>`;
    };
    const historyRows = recentCommits.length
      ? recentCommits.map((commit, index) => `
        <li class="viewer-git__commit-row" ${index >= gitHistoryPageSize ? "hidden data-viewer-git-history-hidden" : ""}>
          <div class="viewer-git__commit-main">
            <code>${escapeHtml(commit.hash || "")}</code>
            <strong>${escapeHtml(commit.subject || "Untitled commit")}</strong>
          </div>
          <div class="viewer-git__commit-meta">
            <span>${escapeHtml([commit.author, commit.date].filter(Boolean).join(" · ") || "Unknown")}</span>
            ${commit.refs ? `<span class="viewer-git__commit-refs">${escapeHtml(commit.refs)}</span>` : ""}
          </div>
        </li>
      `).join("") + renderGitHistoryReveal(Math.max(0, recentCommits.length - gitHistoryPageSize))
      : `<li class="viewer-git__commit-row">${escapeHtml(payload.latestCommit || "No commit history available.")}</li>`;
    const history = `
      <section class="viewer-git__section">
        <h2>History</h2>
        <ul class="viewer-git__commits">${historyRows}</ul>
      </section>
    `;
    const remote = `
      <section class="viewer-git__section">
        <h2>Remote</h2>
        <p class="viewer-git__state">${escapeHtml(payload.tracking ? `Tracking ${payload.tracking}` : "No upstream branch detected.")}</p>
        <p class="viewer-git__state">${escapeHtml(`Ahead ${payload.ahead || 0}, behind ${payload.behind || 0}`)}</p>
      </section>
    `;
    return `
      <div class="viewer-git">
        ${renderCiModeSwitcher("git")}
        <div class="viewer-git__summary">${cards}</div>
        <div class="viewer-git__workspace has-diff-detail">
          <nav class="viewer-git__domains" aria-label="Git domains">${domains}</nav>
          <div class="viewer-git__content" aria-label="Git domain content">
            <section class="viewer-git__panel" data-viewer-git-panel="changes">
              <header class="viewer-git__panel-header"><span>Changes</span><strong>${escapeHtml(stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount)} files</strong></header>
              ${clean}
              ${changesSections || '<p class="viewer-git__state">No file changes detected.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="staged" hidden>
              <header class="viewer-git__panel-header"><span>Staged</span><strong>${escapeHtml(stagedCount)} files</strong></header>
              ${stagedSections || '<p class="viewer-git__state">No staged files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="worktree" hidden>
              <header class="viewer-git__panel-header"><span>Worktree</span><strong>${escapeHtml(modifiedCount + deletedCount + renamedCount)} files</strong></header>
              ${worktreeSections || '<p class="viewer-git__state">No modified, deleted, or renamed files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="untracked" hidden>
              <header class="viewer-git__panel-header"><span>Untracked</span><strong>${escapeHtml(untrackedCount)} files</strong></header>
              ${untrackedSections || '<p class="viewer-git__state">No untracked files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="history" hidden>
              <header class="viewer-git__panel-header"><span>History</span><strong>${escapeHtml(historyCount)} commits</strong></header>
              ${history}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="remote" hidden>
              <header class="viewer-git__panel-header"><span>Remote</span><strong>${escapeHtml(payload.tracking || "none")}</strong></header>
              ${remote}
            </section>
          </div>
          <section class="viewer-git__detail" aria-label="Git diff" data-viewer-git-detail>
            <div class="viewer-git__detail-title">Diff preview</div>
            <div class="viewer-git__diff" data-viewer-git-diff>Select a changed file to preview its diff.</div>
          </section>
        </div>
      </div>
    `;
  }

  function formatGitHistoryCount(payload) {
    const count = Array.isArray(payload?.recentCommits) ? payload.recentCommits.length : (payload?.latestCommit ? 1 : 0);
    return `${count}${payload?.recentCommitsHasMore ? "+" : ""}`;
  }

  function setActiveGitFile(button) {
    document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
  }
