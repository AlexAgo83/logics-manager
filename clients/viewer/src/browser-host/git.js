/**
 * The git and CI screen: status, commits, diffs, previews, and the release runs.
 *
 * Lifted out of the browser host by req_312, last of the three and the one that had been
 * recorded as blocked. It was: before the cdx screen moved, this surface touched twelve
 * bindings it did not own, seven of them cdx payloads. Once those sat behind the cdx
 * accessor it touched two -- the repository root and the board filter state -- and both
 * are only read.
 *
 * The screen router that measurement had flagged turned out not to exist: `showGitStatus`
 * is 65 lines, not the 500-line dispatcher a naive span measurement had made it look.
 */
import {
  gitHistoryPageSize,
} from "./constants.js";
import {
  activityStateForRoot,
  clearNavMenuBadges,
  detectHljsLanguage,
  escapeHtml,
  gitStatusSignature,
  readStoredState,
  renderCodeViewer,
  renderGitBadge,
  renderGitSummaryCard,
  renderGitSummarySegments,
  renderReleaseRunsButtonBadge,
  renderReleaseStatus,
  runtimeStatusSignature,
  setNavMenuBadges,
  showThemedMessageModal,
  writeActivityStateForRoot,
  writeStoredState,
} from "./render.js";
import {
  activityPanelIsOpen,
  applyGitDomain,
  closeThemedModal,
  createThemedModal,
  currentGitViewState,
  findGitFileButton,
  formatGitHistoryCount,
  formatRelativeTime,
  gitCommitModalEntries,
  isAbortError,
  normalizeGitBadgeCounts,
  renderCiModeSwitcher,
  setActiveGitFile,
} from "./util.js";

export function createGitScreen(host) {
  const repoGithubLink = () => document.getElementById("viewer-repo-github");

  const ciButton = () => document.getElementById("viewer-ci");

  let latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };

  let latestCiStatus = { visible: false, badgeState: "unknown", message: "" };

  let latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };

  let latestReleaseRunsStatusSignature = "";

  let latestGitStatusSignature = "";

  let latestGitStatusPayload = null;

  let latestCiScreenMode = "git";

  let latestReviewPayload = null;

  let latestReviewBurstId = "";

  function ciActivityEvents(ciStatus = latestCiStatus) {
    // req_487: reuse the recentRuns the CI badge already fetched (/api/ci-status) as
    // ci-kind activity events. No extra fetch; the shared feed + filter handle kind:"ci".
    const runs = ciStatus && Array.isArray(ciStatus.recentRuns) ? ciStatus.recentRuns : [];
    return runs
      .filter((run) => run && typeof run === "object")
      .map((run, index) => {
        const workflow = String(run.workflowName || "CI");
        const state = String(run.badgeState || "unknown");
        return {
          id: String(run.id ? `ci-${run.id}` : `ci-run-${index}`),
          kind: "ci",
          category: "ci",
          stage: "ci",
          marker: "C",
          action: "CI run",
          title: `${workflow} — ${state}`,
          label: state,
          meta: String(run.title || `${workflow} ${state}`),
          // req_284/item_516+517: discrete fields for the coloured marker and the
          // recomposed "workflow · outcome · time" meta line.
          workflow,
          outcome: state,
          badgeState: state,
          at: run.updatedAt || "",
          updatedAt: run.updatedAt || ""
        };
      });
  }

  function recordGitActivity(action, meta = "") {
    const storedState = readStoredState();
    const baseState = storedState && typeof storedState === "object" ? storedState : {};
    const scopedState = activityStateForRoot(baseState, host.shared.latestRepoRoot);
    const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
    const now = new Date().toISOString();
    const safeAction = String(action || "Git").trim() || "Git";
    history.unshift({
      id: `git-action-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      type: "git-action",
      action: safeAction,
      title: `Git ${safeAction}`,
      label: safeAction,
      meta: meta || `Git ${safeAction.toLowerCase()} started`,
      at: now,
      updatedAt: now
    });
    writeStoredState(writeActivityStateForRoot({
      ...baseState,
      viewerFilterState: { ...host.shared.viewerFilterState }
    }, host.shared.latestRepoRoot, { activitySnapshot: scopedState.activitySnapshot || {}, activityHistory: history }));
    host.dispatchViewerActivityUpdate();
  }

  function syncGitCommitActivity(payload) {
    const commits = Array.isArray(payload?.recentCommits) ? payload.recentCommits : [];
    if (!commits.length) {
      return;
    }
    // req_284/item_517: the repo's current branch is the best per-commit context
    // the git status payload carries; attach it (degrades to "" when absent).
    const branch = String(payload?.branch || "").trim();
    const storedState = readStoredState();
    const baseState = storedState && typeof storedState === "object" ? storedState : {};
    const scopedState = activityStateForRoot(baseState, host.shared.latestRepoRoot);
    const history = Array.isArray(scopedState.activityHistory) ? [...scopedState.activityHistory] : [];
    const knownIds = new Set(history.map((entry) => String(entry?.id || "")));
    const newEntries = commits
      .filter((commit) => commit && typeof commit === "object" && commit.hash)
      .map((commit) => {
        const hash = String(commit.hash || "").trim();
        const subject = String(commit.subject || "Untitled commit").trim() || "Untitled commit";
        const author = String(commit.author || "").trim();
        const date = String(commit.date || "").trim();
        return {
          id: `git-commit-${hash}`,
          type: "git-commit",
          action: "Commit",
          title: subject,
          label: "Commit",
          meta: [hash, author, date].filter(Boolean).join(" · "),
          sha: hash.slice(0, 7),
          branch,
          at: date,
          updatedAt: date
        };
      })
      .filter((entry) => entry.id && !knownIds.has(entry.id));
    if (!newEntries.length) {
      return;
    }
    writeStoredState(writeActivityStateForRoot({
      ...baseState,
      viewerFilterState: { ...host.shared.viewerFilterState }
    }, host.shared.latestRepoRoot, { activitySnapshot: scopedState.activitySnapshot || {}, activityHistory: [...newEntries, ...history] }));
    if (activityPanelIsOpen()) {
      host.dispatchViewerActivityUpdate();
    }
  }

  function gitBadgeHtml(scope) {
    const behindVisible = latestGitBadgeCounts.unpulledCommits > 0 && (
      scope === "main" || scope === "history"
    );
    const commitsVisible = latestGitBadgeCounts.unpushedCommits > 0 && (
      scope === "main" || scope === "history"
    );
    const filesVisible = latestGitBadgeCounts.uncommittedFiles > 0 && (
      scope === "main" || scope === "changes"
    );
    const html = [
      behindVisible ? renderGitBadge("commits-behind", latestGitBadgeCounts.unpulledCommits) : "",
      commitsVisible ? renderGitBadge("commits", latestGitBadgeCounts.unpushedCommits) : "",
      filesVisible ? renderGitBadge("files", latestGitBadgeCounts.uncommittedFiles) : ""
    ].filter(Boolean).join("");
    return html ? `<span class="viewer-git-badges" data-viewer-git-badges="${escapeHtml(scope)}">${html}</span>` : "";
  }

  function updateMainGitBadges() {
    // Git shares the merged "Remote" button with CI; the git counters render
    // alongside the CI status badge (each owns its own data-attr container).
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    button.querySelector('[data-viewer-git-badges="main"]')?.remove();
    const html = gitBadgeHtml("main");
    if (html) {
      // Insert git counters before the CI status badge so order stays stable.
      const ciBadge = button.querySelector("[data-viewer-ci-badge]");
      if (ciBadge) {
        ciBadge.insertAdjacentHTML("beforebegin", html);
      } else {
        button.insertAdjacentHTML("beforeend", html);
      }
    }
    setNavMenuBadges("remote:git", gitBadgeHtml("main"));
  }

  function updateMainReleaseBadge(payload = latestReleaseRunsStatus) {
    latestReleaseRunsStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    // Manage only the release status badge here; the shared "Remote" button
    // visibility is owned by host.updateCapabilityControls. Order on the button is
    // git counters -> CI badge -> release badge.
    button.querySelector("[data-viewer-release-badge]")?.remove();
    clearNavMenuBadges(["remote:release"]);
    if (!latestReleaseRunsStatus.visible) {
      return;
    }
    const badge = renderReleaseRunsButtonBadge(latestReleaseRunsStatus);
    button.insertAdjacentHTML("beforeend", badge);
    setNavMenuBadges("remote:release", badge);
  }

  async function refreshReleaseBadgeCounters() {
    if (!host.isCapabilityAvailable("ci")) {
      updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: host.capabilityMessage("ci", "Release runs are not available for this project.") });
      return;
    }
    try {
      const response = await fetch("/api/release-runs");
      if (response.status === 404) {
        updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: "Release runs endpoint unavailable." });
        return;
      }
      const data = await response.json();
      if (response.ok && data.ok) {
        latestReleaseRunsStatusSignature = runtimeStatusSignature(data.payload);
        updateMainReleaseBadge(data.payload);
      }
    } catch {
      updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: "Release runs unavailable." });
    }
  }

  function setGitBadgeCountsFromPayload(payload, options = {}) {
    latestGitBadgeCounts = normalizeGitBadgeCounts(payload);
    if (options.updateMain !== false) {
      updateMainGitBadges();
    }
  }

  async function refreshGitBadgeCounters() {
    if (!host.isCapabilityAvailable("git")) {
      latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
      return;
    }
    try {
      const response = await fetch("/api/git-status");
      const data = await response.json();
      if (response.ok && data.ok && data.payload?.state === "ok") {
        latestGitStatusPayload = data.payload;
        latestGitStatusSignature = gitStatusSignature(data.payload);
        syncGitCommitActivity(data.payload);
        setGitBadgeCountsFromPayload(data.payload);
      }
    } catch {
      latestGitBadgeCounts = { unpushedCommits: 0, unpulledCommits: 0, uncommittedFiles: 0 };
      updateMainGitBadges();
    }
  }

  function isGitCiScreenOpen() {
    const panel = host.documentPanel();
    const title = host.documentTitle();
    return Boolean(panel && !panel.hidden && title && title.textContent === "Remote");
  }

  async function fetchGitRemote() {
    try {
      const response = await fetch("/api/git-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        host.setMeta(data.error || "Git fetch failed.");
        return false;
      }
      recordGitActivity("Fetch", "Fetched remote-tracking refs");
      return true;
    } catch {
      host.setMeta("Git fetch failed.");
      return false;
    }
  }

  function setGitActionsMenuOpen(open) {
    host.setDropdownOpen(
      document.getElementById("viewer-git-actions-menu"),
      document.getElementById("viewer-git-actions-button"),
      open,
    );
  }

  async function showReleaseStatus(options = {}) {
    latestCiScreenMode = "release";
    if (!options.silent) {
      host.setMeta("Checking release workflow state...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
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
    if (host.isViewStale(view)) {
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
    host.setDocument("Remote", renderReleaseStatus(data.payload, runsPayload));
    const state = data.payload?.state || "unknown";
    const button = ciButton();
    if (button instanceof HTMLElement) {
      button.title = data.payload?.next_action || "Show CI and release workflow state";
    }
    host.setMeta(options.silent ? "Release workflow refreshed." : `Release workflow state: ${state}.`);
  }

  async function resetReleaseState() {
    host.setMeta("Resetting release evidence...");
    let data = {};
    try {
      const response = await fetch("/api/release-reset", { method: "POST", headers: { "Content-Type": "application/json" } });
      data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to reset release evidence.");
      }
    } catch (error) {
      host.setMeta(`Release reset failed: ${error?.message || error}`);
      return;
    }
    await showReleaseStatus({ force: true });
    const cleared = Number(data.payload?.cleared || 0);
    host.setMeta(cleared > 0
      ? `Release evidence reset — cleared ${cleared} entr${cleared === 1 ? "y" : "ies"}; gates are pending.`
      : "Release evidence already empty; gates are pending.");
  }

  /** The domain the freshly rendered markup marked active, so runtime and render agree. */
  function renderedGitDomain() {
    const active = document.querySelector(".viewer-git__domain.is-active[data-viewer-git-domain]");
    return active instanceof HTMLElement ? active.getAttribute("data-viewer-git-domain") || "" : "";
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
    // item_733: the Files tile printed Staged, Worktree and Untracked -- the same three
    // counts the domain rail below it carries, where they are also the control that scopes
    // the list. A count in two places is a count an operator has to reconcile, and the rail
    // is the one that does something when clicked.
    // item_731: the screen led with a large `Clean` tile while `Ahead 5` -- the one fact
    // that needed acting on -- was a small pill beside it. The verdict answers the question
    // the operator came with, in one sentence, and carries the action that follows from it.
    // The action is not a new mechanism: it clicks the control the Actions menu already
    // owns, so there is one push and one place it lives.
    const gitVerdict = (() => {
      const ahead = Number(payload.ahead || 0);
      const behind = Number(payload.behind || 0);
      const changed = stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount;
      if (!payload.tracking) {
        return { tone: "attention", text: "No upstream branch, so nothing can be pushed yet.", action: null };
      }
      if (behind > 0 && ahead > 0) {
        return {
          tone: "attention",
          text: `Diverged: ${ahead} to push, ${behind} to pull.`,
          action: { id: "viewer-git-pull", label: "Pull first" }
        };
      }
      if (behind > 0) {
        return { tone: "attention", text: `${behind} commit${behind === 1 ? "" : "s"} to pull.`, action: { id: "viewer-git-pull", label: "Pull" } };
      }
      // Unpushed commits and uncommitted changes are two separate answers, and the screen's
      // question is what can be done now. With both, the commits are pushable and the
      // changes are not part of them -- saying only the changes hid 42 commits behind 5
      // files on this very repository.
      const changeNote = changed > 0 ? ` ${changed} file${changed === 1 ? "" : "s"} changed here are not part of them.` : "";
      if (ahead > 0) {
        return {
          tone: "ready",
          text: `${ahead} commit${ahead === 1 ? "" : "s"} ready to push.${changeNote}`,
          action: { id: "viewer-git-push", label: "Push" }
        };
      }
      if (stagedCount > 0) {
        return { tone: "ready", text: `${stagedCount} file${stagedCount === 1 ? "" : "s"} staged and ready to commit.`, action: { id: "viewer-git-commit", label: "Commit" } };
      }
      if (changed > 0) {
        return { tone: "attention", text: `${changed} file${changed === 1 ? "" : "s"} changed, none staged.`, action: null };
      }
      return { tone: "clean", text: "Nothing to push. Working tree clean and up to date.", action: null };
    })();
    const verdictHtml = `
      <section class="viewer-git__verdict viewer-git__verdict--${escapeHtml(gitVerdict.tone)}" role="status">
        <p class="viewer-git__verdict-text">${escapeHtml(gitVerdict.text)}</p>
        ${gitVerdict.action
          ? `<button class="btn viewer-git__verdict-action" type="button" data-viewer-git-run="${escapeHtml(gitVerdict.action.id)}">${escapeHtml(gitVerdict.action.label)}</button>`
          : ""}
      </section>
    `;
    const cards = [
      renderGitSummaryCard("Branch", payload.branch || "HEAD"),
      renderGitSummaryCard("Tracking", payload.tracking || "None"),
      renderGitSummarySegments("Ahead / Behind", [
        ["Ahead", payload.ahead || 0],
        ["Behind", payload.behind || 0]
      ]),
      renderGitSummaryCard("State", payload.clean ? "Clean" : "Dirty")
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
      ["history", "History", formatGitHistoryCount(payload)]
      // item_733: the Remote domain's entire content was `Tracking <ref>` and
      // `Ahead N, behind M` -- both printed verbatim in the tiles above it. A navigation
      // entry whose only content is elsewhere on the same screen is a place to go that
      // takes you nowhere.
    ];
    // item_731: `changes` was the default whatever the repository held, so a clean tree
    // opened the screen on two blank panes. The opening domain is the first one that has
    // something in it, in the order they are declared; history is the fallback, because a
    // repository always has some.
    const openingDomain = (() => {
      const withContent = domainDefs.find(([, , count]) => Number(String(count).replace(/[^0-9]/g, "")) > 0);
      return withContent ? withContent[0] : "history";
    })();
    const domains = domainDefs.map(([key, label, count]) => `
      <button class="viewer-git__domain${key === openingDomain ? " is-active" : ""}" type="button" data-viewer-git-domain="${escapeHtml(key)}" aria-pressed="${key === openingDomain ? "true" : "false"}">
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
          <button class="viewer-git__commit" type="button" data-viewer-git-commit="${escapeHtml(commit.hash || "")}">
            <span class="viewer-git__commit-main">
              <code>${escapeHtml(commit.hash || "")}</code>
              <strong>${escapeHtml(commit.subject || "Untitled commit")}</strong>
            </span>
            <span class="viewer-git__commit-meta">
              <span>${escapeHtml([commit.author, commit.date].filter(Boolean).join(" · ") || "Unknown")}</span>
              ${commit.refs ? `<span class="viewer-git__commit-refs">${escapeHtml(commit.refs)}</span>` : ""}
            </span>
          </button>
        </li>
      `).join("") + renderGitHistoryReveal(Math.max(0, recentCommits.length - gitHistoryPageSize))
      : `<li class="viewer-git__commit-row">${escapeHtml(payload.latestCommit || "No commit history available.")}</li>`;
    const history = `
      <section class="viewer-git__section">
        <h2>History</h2>
        <ul class="viewer-git__commits">${historyRows}</ul>
      </section>
    `;
    return `
      <div class="viewer-git">
        ${renderCiModeSwitcher("git")}
        ${verdictHtml}
        <div class="viewer-git__summary viewer-git__summary--strip">${cards}</div>
        <div class="viewer-git__workspace has-diff-detail">
          <nav class="viewer-git__domains" aria-label="Git domains">${domains}</nav>
          <div class="viewer-git__content" aria-label="Git domain content">
            <section class="viewer-git__panel" data-viewer-git-panel="changes" ${openingDomain === "changes" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Changes</span><strong>${escapeHtml(stagedCount + modifiedCount + deletedCount + renamedCount + untrackedCount)} files</strong></header>
              ${clean}
              ${changesSections || '<p class="viewer-git__state">No file changes detected.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="staged" ${openingDomain === "staged" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Staged</span><strong>${escapeHtml(stagedCount)} files</strong></header>
              ${stagedSections || '<p class="viewer-git__state">No staged files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="worktree" ${openingDomain === "worktree" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Worktree</span><strong>${escapeHtml(modifiedCount + deletedCount + renamedCount)} files</strong></header>
              ${worktreeSections || '<p class="viewer-git__state">No modified, deleted, or renamed files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="untracked" ${openingDomain === "untracked" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>Untracked</span><strong>${escapeHtml(untrackedCount)} files</strong></header>
              ${untrackedSections || '<p class="viewer-git__state">No untracked files.</p>'}
            </section>
            <section class="viewer-git__panel" data-viewer-git-panel="history" ${openingDomain === "history" ? "" : "hidden"}>
              <header class="viewer-git__panel-header"><span>History</span><strong>${escapeHtml(historyCount)} commits</strong></header>
              ${history}
            </section>
          </div>
          <section class="viewer-git__detail" aria-label="Git diff" data-viewer-git-detail>
            <div class="viewer-git__detail-title">Diff preview</div>
            <div class="viewer-git__diff" data-viewer-git-diff>Select a changed file or history commit to preview its diff.</div>
          </section>
        </div>
      </div>
    `;
  }

  function gitDiffLineKind(line) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      return "add";
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      return "delete";
    }
    if (line.startsWith("@@")) {
      return "hunk";
    }
    if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("+++") || line.startsWith("---")) {
      return "meta";
    }
    return "context";
  }

  /** item_732: the first five lines of every diff were `diff --git`, `index <blob>..<blob>`,
   *  `--- a/<path>` and `+++ b/<path>` -- the path the pane's own header already states and
   *  two hashes nobody reads, pushing the actual change below the fold on a short pane. The
   *  diff pane shows the diff. */
  function stripGitDiffHeader(content) {
    const lines = String(content || "").split("\n");
    const firstHunk = lines.findIndex((line) => line.startsWith("@@"));
    if (firstHunk <= 0) return String(content || "");
    const kept = lines.slice(firstHunk);
    return kept.join("\n");
  }

  function renderGitDiffPreview(content) {
    return renderCodeViewer(stripGitDiffHeader(content), {
      language: "diff",
      lineClassName: (line) => `viewer-git__diff-line viewer-git__diff-line--${gitDiffLineKind(line)}`,
      renderLineHtml: (line) => escapeHtml(line || " ")
    });
  }

  function setActiveGitCommit(button) {
    document.querySelectorAll("[data-viewer-git-commit]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
    document.querySelectorAll("[data-viewer-git-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.remove("is-active");
      }
    });
  }

  async function loadGitDiff(path, cached, button = null, options = {}) {
    const diffPanel = document.querySelector("[data-viewer-git-diff]");
    const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
    if (!(diffPanel instanceof HTMLElement) || !path) {
      return;
    }
    if (button instanceof HTMLElement) {
      setActiveGitFile(button);
    }
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "Diff preview";
    }
    diffPanel.textContent = "Loading diff...";
    const params = new URLSearchParams({ path });
    if (cached) {
      params.set("cached", "1");
    }
    if (options.full) {
      params.set("full", "1");
    }
    const response = await fetch(`/api/git-diff?${params.toString()}`);
    const data = await response.json();
    const payload = data.payload || {};
    if (!response.ok || !data.ok || payload.state !== "ok") {
      diffPanel.textContent = payload.message || data.error || "Unable to load diff.";
      return;
    }
    const content = payload.diff || "";
    if (!content.trim()) {
      await loadGitFilePreview(path, diffPanel, detailTitle);
      return;
    }
    // item_732: "truncated" told the operator the diff was cut and offered nothing. When the
    // server says more is available, the pane says how to get it.
    const more = payload.canForce
      ? `<button class="btn viewer-git__diff-more" type="button" data-viewer-git-diff-full="${escapeHtml(payload.path || path)}" data-viewer-git-diff-cached="${cached ? "1" : "0"}">Load the rest of this diff</button>`
      : "";
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} · ${escapeHtml(payload.mode || "worktree")}${payload.truncated ? " · truncated" : ""}</div>${renderGitDiffPreview(content)}${more}`;
  }

  async function loadGitCommitDiff(ref, button = null, options = {}) {
    const diffPanel = document.querySelector("[data-viewer-git-diff]");
    const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
    if (!(diffPanel instanceof HTMLElement) || !ref) {
      return;
    }
    if (button instanceof HTMLElement) {
      setActiveGitCommit(button);
    }
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "Commit diff";
    }
    diffPanel.textContent = "Loading commit diff...";
    const params = new URLSearchParams({ ref });
    if (options.path) {
      params.set("path", options.path);
    }
    const response = await fetch(`/api/git-commit-diff?${params.toString()}`);
    const data = await response.json();
    const payload = data.payload || {};
    if (!response.ok || !data.ok || payload.state !== "ok") {
      diffPanel.textContent = payload.message || data.error || "Unable to load commit diff.";
      return;
    }
    const content = payload.diff || "";
    if (!content.trim()) {
      diffPanel.textContent = payload.message || "No diff is available for this commit.";
      return;
    }
    const label = payload.path ? `${payload.path} · ${payload.ref || ref}` : `${payload.ref || ref}`;
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(label)} · commit${payload.truncated ? " · truncated" : ""}</div>${renderGitDiffPreview(content)}`;
  }

  function reviewBursts() {
    return latestReviewPayload && Array.isArray(latestReviewPayload.bursts) ? latestReviewPayload.bursts : [];
  }

  function activeReviewBurst() {
    const bursts = reviewBursts();
    return bursts.find((burst) => burst?.id === latestReviewBurstId) || bursts[0] || null;
  }

  function reviewTimelineBursts() {
    const bursts = reviewBursts();
    const working = bursts.find((burst) => burst?.kind === "working-tree");
    const commits = bursts.filter((burst) => burst?.kind !== "working-tree").reverse();
    return working ? [...commits, working] : commits;
  }

  function reviewBurstMeta(burst) {
    const timestamp = String(burst?.timestamp || "").trim();
    const stamp = Date.parse(timestamp);
    const relative = Number.isFinite(stamp) ? formatRelativeTime(stamp) : "";
    const stat = Number(burst?.additions || 0) || Number(burst?.deletions || 0) ? `+${Number(burst?.additions || 0)}-${Number(burst?.deletions || 0)}` : "";
    return [relative || String(burst?.meta || "").trim() || "No timestamp", stat].filter(Boolean).join(" · ");
  }

  function renderReviewFileButton(file, burst) {
    const path = String(file?.path || "");
    const parts = path.split("/");
    const name = parts.pop() || path;
    const directory = parts.join("/");
    const additions = Number(file?.additions || 0);
    const deletions = Number(file?.deletions || 0);
    const stat = additions || deletions ? `<span class="viewer-review__file-stat">+${additions}-${deletions}</span>` : "";
    return `<button class="viewer-review__file" type="button" title="${escapeHtml(path)}" data-viewer-review-file="${escapeHtml(path)}" data-viewer-review-burst-id="${escapeHtml(String(burst?.id || ""))}" data-viewer-review-kind="${escapeHtml(String(burst?.kind || ""))}" data-viewer-review-ref="${escapeHtml(String(burst?.ref || ""))}" data-viewer-review-cached="${file?.cached ? "1" : "0"}">
      <span class="viewer-review__file-name">${escapeHtml(name)}</span>
      <span class="viewer-review__file-directory">${escapeHtml(directory || ".")}</span>
      <span class="viewer-review__file-kind">${escapeHtml(String(file?.kind || "M"))}</span>
      ${stat}
    </button>`;
  }

  function renderReviewTimeline(payload = latestReviewPayload) {
    if (!payload || payload.state !== "ok") {
      return `<section class="viewer-review"><p class="viewer-git__state">${escapeHtml(payload?.message || "Review timeline is unavailable.")}</p></section>`;
    }
    const bursts = reviewTimelineBursts();
    const active = activeReviewBurst();
    const ghostRows = Array.from({ length: 5 }, () => '<span class="viewer-review__burst viewer-review__burst--ghost" aria-hidden="true"><span class="viewer-review__burst-label"></span><span class="viewer-review__burst-title"></span><span class="viewer-review__burst-meta"></span></span>').join("");
    const burstRows = bursts.map((burst) => `<button class="viewer-review__burst${burst === active ? " is-active" : ""}${burst?.kind === "working-tree" ? " viewer-review__burst--working" : ""}" type="button" data-viewer-review-burst="${escapeHtml(String(burst?.id || ""))}" aria-pressed="${burst === active ? "true" : "false"}">
      <span class="viewer-review__burst-label">${escapeHtml(String(burst?.label || burst?.ref || "Change"))}</span>
      <span class="viewer-review__burst-title">${escapeHtml(String(burst?.title || ""))}</span>
      <span class="viewer-review__burst-meta">${escapeHtml(reviewBurstMeta(burst))}</span>
    </button>`).join("");
    const files = Array.isArray(active?.files) ? active.files : [];
    return `<section class="viewer-review" data-viewer-review>
      <div class="viewer-review__bursts" role="listbox" aria-label="Review timeline">${burstRows ? burstRows + ghostRows : '<p class="viewer-git__state">No changes are available.</p>'}</div>
      <div class="viewer-review__body viewer-split">
        <div class="viewer-review__files viewer-split__list" role="listbox" aria-label="Changed files">${files.map((file) => renderReviewFileButton(file, active)).join("") || '<p class="viewer-git__state">No files for this change.</p>'}</div>
        <div class="viewer-git__detail viewer-review__detail viewer-split__detail" data-viewer-git-detail>
          <div class="viewer-git__detail-title">File diff</div>
          <div class="viewer-git__diff" data-viewer-git-diff data-viewer-review-diff>Select a file to preview its change.</div>
        </div>
      </div>
    </section>`;
  }

  function firstReviewFileButton() {
    return document.querySelector("[data-viewer-review-file]");
  }

  function moveReviewButton(selector, current, delta) {
    const nodes = Array.from(document.querySelectorAll(selector)).filter((node) => node instanceof HTMLElement);
    if (!nodes.length) return;
    const focusedIndex = current instanceof HTMLElement ? nodes.indexOf(current) : -1;
    const selectedIndex = nodes.findIndex((node) => node instanceof HTMLElement && (node.classList.contains("is-active") || node.getAttribute("aria-pressed") === "true"));
    const index = focusedIndex >= 0 ? focusedIndex : Math.max(0, selectedIndex);
    const next = nodes[(index + delta + nodes.length) % nodes.length];
    if (next instanceof HTMLElement) {
      next.focus();
      next.click();
    }
  }

  function bindReviewKeyboard() {
    const root = document.querySelector("[data-viewer-review]");
    if (!(root instanceof HTMLElement)) return;
    root.addEventListener("keydown", (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        moveReviewButton("[data-viewer-review-burst]", event.target.closest("[data-viewer-review-burst]"), event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        moveReviewButton("[data-viewer-review-file]", event.target.closest("[data-viewer-review-file]"), event.key === "ArrowDown" ? 1 : -1);
      }
    });
  }

  async function selectReviewBurst(id) {
    latestReviewBurstId = id;
    const burst = activeReviewBurst();
    if (burst && !Array.isArray(burst.files)) {
      const params = new URLSearchParams({ kind: String(burst.kind || "") });
      if (burst.ref) params.set("ref", String(burst.ref));
      const response = await fetch(`/api/review-burst-files?${params.toString()}`);
      const data = await response.json();
      const payload = data.payload || {};
      if (!response.ok || !data.ok || payload.state !== "ok") {
        latestReviewPayload = { state: "error", message: payload.message || data.error || "Unable to load Review files.", bursts: reviewBursts() };
      } else {
        burst.files = Array.isArray(payload.files) ? payload.files : [];
        burst.fileCount = payload.fileCount ?? burst.files.length;
        burst.additions = payload.additions ?? burst.additions ?? 0;
        burst.deletions = payload.deletions ?? burst.deletions ?? 0;
      }
    }
    host.setSurfacePanel("review-panel", renderReviewTimeline());
    bindReviewKeyboard();
    Array.from(document.querySelectorAll("[data-viewer-review-burst]"))
      .find((node) => node instanceof HTMLElement && node.getAttribute("data-viewer-review-burst") === id)
      ?.focus();
    const firstFile = firstReviewFileButton();
    if (firstFile instanceof HTMLElement) {
      await loadReviewFile(firstFile);
    }
  }

  async function loadReviewFile(button) {
    if (!(button instanceof HTMLElement)) {
      return;
    }
    document.querySelectorAll("[data-viewer-review-file]").forEach((node) => {
      if (node instanceof HTMLElement) {
        node.classList.toggle("is-active", node === button);
      }
    });
    const path = button.getAttribute("data-viewer-review-file") || "";
    const kind = button.getAttribute("data-viewer-review-kind") || "";
    if (kind === "commit") {
      await loadGitCommitDiff(button.getAttribute("data-viewer-review-ref") || "", null, { path });
      document.querySelector("[data-viewer-review-diff]")?.scrollTo?.(0, 0);
      return;
    }
    await loadGitDiff(path, button.getAttribute("data-viewer-review-cached") === "1", null);
    document.querySelector("[data-viewer-review-diff]")?.scrollTo?.(0, 0);
  }

  async function showReviewTimeline(options = {}) {
    if (!host.isCapabilityAvailable("git")) {
      const message = host.capabilityMessage("git", "Git is not available for this project.");
      host.setSurfacePanel("review-panel", renderReviewTimeline({ state: host.capability("git").state, message, bursts: [] }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Loading Review timeline...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    const response = await fetch("/api/review-bursts", { signal: view.signal });
    const data = await response.json();
    if (host.isViewStale(view)) {
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load Review timeline.");
    }
    latestReviewPayload = data.payload || {};
    latestReviewBurstId = String(reviewTimelineBursts().at(-1)?.id || "");
    host.setSurfacePanel("review-panel", renderReviewTimeline());
    bindReviewKeyboard();
    if (latestReviewBurstId) {
      await selectReviewBurst(latestReviewBurstId);
    }
    host.setMeta(latestReviewPayload.message || "Review timeline ready.");
  }

  async function loadGitFilePreview(path, diffPanel, detailTitle = null, options = {}) {
    if (detailTitle instanceof HTMLElement) {
      detailTitle.textContent = "File preview";
    }
    diffPanel.textContent = "Loading file preview...";
    const params = new URLSearchParams({ path });
    if (options.full) {
      params.set("full", "1");
    }
    const response = await fetch(`/api/git-file-preview?${params.toString()}`);
    const data = await response.json();
    const payload = data.payload || {};
    if (!response.ok || !data.ok) {
      diffPanel.textContent = data.error || "Unable to load file preview.";
      return;
    }
    if (payload.state !== "ok") {
      diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(payload.path || path)} · file preview unavailable</div><p class="viewer-git__state">${escapeHtml(payload.message || "File preview is unavailable.")}</p>`;
      return;
    }
    const content = payload.content || "";
    const previewPath = payload.path || path;
    const forceButtonHtml = payload.canForce
      ? `<button class="btn viewer-code__force" type="button" data-viewer-git-preview-full="${escapeHtml(previewPath)}">Load anyway</button>`
      : "";
    diffPanel.innerHTML = `<div class="viewer-git__diff-meta">${escapeHtml(previewPath)} · file preview${payload.truncated ? " · truncated" : ""}</div>${renderCodeViewer(content, {
      language: detectHljsLanguage(previewPath),
      lineCount: payload.lineCount,
      truncated: Boolean(payload.truncated),
      hardCapHit: Boolean(payload.hardCapHit),
      forceButtonHtml
    })}`;
  }

  async function openGitCommitModal() {
    let payload = latestGitStatusPayload;
    if (!payload || payload.state !== "ok") {
      const response = await fetch("/api/git-status");
      const data = await response.json();
      if (!response.ok || !data.ok || data.payload?.state !== "ok") {
        throw new Error(data.error || data.payload?.message || "Unable to load Git changes.");
      }
      payload = data.payload;
      latestGitStatusPayload = payload;
    }
    const entries = gitCommitModalEntries(payload);
    if (!entries.length) {
      await showThemedMessageModal({ title: "Commit", message: "No changed files are available to commit." });
      return;
    }

    const modal = createThemedModal({
      title: "Commit",
      message: "Select files, enter a message, then create the commit.",
      submitLabel: "Commit"
    });
    const body = modal.querySelector(".viewer-themed-modal__body");
    const submit = modal.querySelector(".viewer-themed-modal__submit");
    const error = document.createElement("div");
    error.className = "viewer-git-commit__error";
    error.hidden = true;
    const files = document.createElement("div");
    files.className = "viewer-git-commit__files";
    for (const entry of entries) {
      const label = document.createElement("label");
      label.className = "viewer-git-commit__file";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = entry.path;
      checkbox.checked = true;
      const text = document.createElement("span");
      text.textContent = `${entry.group}: ${entry.from ? `${entry.from} -> ${entry.path}` : entry.path}`;
      label.append(checkbox, text);
      files.appendChild(label);
    }
    const message = document.createElement("textarea");
    message.className = "viewer-themed-modal__input viewer-git-commit__message";
    message.placeholder = "Commit message";
    message.rows = 3;
    body?.append(files, message, error);

    const selectedFiles = () => Array.from(files.querySelectorAll("input[type='checkbox']"))
      .filter((node) => node instanceof HTMLInputElement && node.checked)
      .map((node) => node.value);
    const updateSubmit = () => {
      if (submit instanceof HTMLButtonElement) {
        submit.disabled = !selectedFiles().length || !message.value.trim();
      }
    };
    const close = () => closeThemedModal(modal);
    const fail = (text) => {
      error.textContent = text;
      error.hidden = false;
    };
    files.addEventListener("change", updateSubmit);
    message.addEventListener("input", updateSubmit);
    modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close);
    modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close);
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (submit instanceof HTMLButtonElement && !submit.disabled) submit.click();
      }
    });
    submit?.addEventListener("click", async () => {
      const filesToCommit = selectedFiles();
      const commitMessage = message.value.trim();
      if (!filesToCommit.length || !commitMessage) {
        updateSubmit();
        return;
      }
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      error.hidden = true;
      try {
        const response = await fetch("/api/git-commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: filesToCommit, message: commitMessage })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || data.payload?.message || "Git commit failed.");
        }
        close();
        latestGitStatusPayload = null;
        latestGitStatusSignature = "";
        recordGitActivity("Commit", `Created commit ${data.payload?.shortHash || ""}`.trim());
        await showGitStatus({ force: true });
        host.setMeta(`Commit created${data.payload?.shortHash ? `: ${data.payload.shortHash}` : "."}`);
      } catch (err) {
        fail(err?.message || "Git commit failed.");
        updateSubmit();
      }
    });
    updateSubmit();
    window.setTimeout(() => message.focus(), 0);
  }

  async function showGitStatus(options = {}) {
    latestCiScreenMode = "git";
    // item_731: on a fresh open this said `changes` outright, which is the third place that
    // constant lived and the one that actually won -- the markup chose an opening domain,
    // the restore call fell back to another, and this overrode both. A fresh open now has no
    // opinion, so the render's choice stands; a preserved view still keeps the operator's.
    const previous = options.preserve ? currentGitViewState() : { domain: "", path: "", cached: false };
    if (!host.isCapabilityAvailable("git")) {
      const message = host.capabilityMessage("git", "Git is not available for this project.");
      host.setDocument("Remote", renderGitStatus({ state: host.capability("git").state, message }));
      host.setMeta(message);
      return;
    }
    if (!options.silent) {
      host.setMeta("Checking Git status...");
    }
    const view = options.view || host.beginView({ silent: Boolean(options.silent) });
    let response;
    let data = {};
    try {
      response = await fetch("/api/git-status", { signal: view.signal });
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
      host.setDocument("Remote", renderGitStatus({
        state: "unavailable",
        message: "Git status endpoint unavailable. Restart the local viewer so it loads the current logics-manager backend."
      }));
      host.setMeta("Restart the local viewer to enable Git status.");
      return;
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load Git status.");
    }
    syncGitCommitActivity(data.payload);
    const nextGitSignature = gitStatusSignature(data.payload);
    if (options.skipUnchanged && !options.force && latestGitStatusSignature && nextGitSignature === latestGitStatusSignature) {
      setGitBadgeCountsFromPayload(data.payload, { updateMain: false });
      updateMainGitBadges();
      if (!options.silent) {
        host.setMeta(`Checked Git status just now · no changes (${new Date().toLocaleTimeString()})`);
      }
      return;
    }
    latestGitStatusSignature = nextGitSignature;
    latestGitStatusPayload = data.payload;
    setGitBadgeCountsFromPayload(data.payload, { updateMain: false });
    updateMainGitBadges();
    host.setDocument("Remote", renderGitStatus(data.payload));
    // item_731: this fell back to the constant "changes", which undid the opening domain the
    // markup had just chosen from what the repository holds -- so a clean tree still landed
    // on two blank panes. The operator's last domain still wins; the fallback is what the
    // render decided, not a name fixed in advance.
    applyGitDomain(previous.domain || renderedGitDomain() || "changes");
    const restoredFile = previous.path ? findGitFileButton(previous.path, previous.cached) : null;
    const firstFile = restoredFile || document.querySelector("[data-viewer-git-file]");
    if (firstFile instanceof HTMLElement) {
      await loadGitDiff(firstFile.getAttribute("data-viewer-git-file") || "", firstFile.getAttribute("data-viewer-git-cached") === "1", firstFile);
    }
    host.setMeta(options.silent ? "Git status refreshed." : "Git status loaded.");
  }

  const state = {};
  Object.defineProperties(state, {
    repoGithubLink: { get: () => repoGithubLink },
    ciButton: { get: () => ciButton },
    latestGitBadgeCounts: { get: () => latestGitBadgeCounts, set: (value) => { latestGitBadgeCounts = value; } },
    latestCiStatus: { get: () => latestCiStatus, set: (value) => { latestCiStatus = value; } },
    latestReleaseRunsStatus: { get: () => latestReleaseRunsStatus, set: (value) => { latestReleaseRunsStatus = value; } },
    latestReleaseRunsStatusSignature: { get: () => latestReleaseRunsStatusSignature, set: (value) => { latestReleaseRunsStatusSignature = value; } },
    latestGitStatusSignature: { get: () => latestGitStatusSignature, set: (value) => { latestGitStatusSignature = value; } },
    latestGitStatusPayload: { get: () => latestGitStatusPayload, set: (value) => { latestGitStatusPayload = value; } },
    latestCiScreenMode: { get: () => latestCiScreenMode, set: (value) => { latestCiScreenMode = value; } },
  });

  return {
    state,
    ciActivityEvents,
    fetchGitRemote,
    gitBadgeHtml,
    gitDiffLineKind,
    isGitCiScreenOpen,
    loadGitCommitDiff,
    loadGitDiff,
    loadGitFilePreview,
    openGitCommitModal,
    recordGitActivity,
    refreshGitBadgeCounters,
    refreshReleaseBadgeCounters,
    renderGitDiffPreview,
    renderGitStatus,
    resetReleaseState,
    setActiveGitCommit,
    setGitActionsMenuOpen,
    setGitBadgeCountsFromPayload,
    showGitStatus,
    showReviewTimeline,
    selectReviewBurst,
    loadReviewFile,
    showReleaseStatus,
    syncGitCommitActivity,
    updateMainGitBadges,
    updateMainReleaseBadge,
  };
}
