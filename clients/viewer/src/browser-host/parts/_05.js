  }

  function setButtonUnavailable(button, message) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = true;
    button.setAttribute("aria-disabled", "true");
    button.title = message;
  }

  function setButtonAvailable(button, title) {
    if (!(button instanceof HTMLElement) || !("disabled" in button)) {
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-disabled");
    button.title = title;
  }

  function updateCapabilityControls() {
    const bootstrapButton = bootstrapLogicsButton();
    if (bootstrapButton instanceof HTMLButtonElement) {
      bootstrapButton.hidden = !latestCanBootstrapLogics;
      bootstrapButton.disabled = !latestCanBootstrapLogics;
      bootstrapButton.title = latestBootstrapLogicsTitle || "Bootstrap Logics in this project";
    }

    const workshop = workshopButton();
    if (workshop instanceof HTMLElement) {
      // The Explorer screen now lives as a Workshop sub-tab (alongside
      // Terminals and Commands), so Workshop stays reachable whenever either
      // the workshop or the workspace capability is available.
      const workshopAvailable = isCapabilityAvailable("workshop");
      const workspaceAvailable = isCapabilityAvailable("workspace");
      const workshopVisible = workshopAvailable || workspaceAvailable;
      workshop.hidden = !workshopVisible;
      if (workshopVisible) {
        setButtonAvailable(workshop, "Show Workshop (terminals, commands, explorer)");
      } else {
        setButtonUnavailable(workshop, capabilityMessage("workshop", "Workshop is not available for this project."));
      }
      updateWorkshopBadges();
      hydrateWorkshopTerminals();
    }

    // Git and CI now share a single "Remote" button (Git is the first
    // section of the merged screen, before CI runs and Release). The button
    // is reachable whenever either capability is available; the git counters
    // and the CI status badge are both rendered onto it.
    const gitCi = ciButton();
    if (gitCi instanceof HTMLElement) {
      const gitAvailable = isCapabilityAvailable("git");
      const ciAvailable = isCapabilityAvailable("ci");
      gitCi.hidden = !(gitAvailable || ciAvailable);
      if (gitAvailable || ciAvailable) {
        setButtonAvailable(gitCi, "Show Git status, CI runs, and release state");
      } else {
        setButtonUnavailable(gitCi, capabilityMessage("git", "Git and CI are not available for this project."));
      }
    }

    const cdx = document.getElementById("viewer-cdx");
    if (cdx instanceof HTMLElement) {
      if (isCapabilityAvailable("cdx")) {
        setButtonAvailable(cdx, "Show CDX status");
      } else {
        setButtonUnavailable(cdx, capabilityMessage("cdx", "CDX is not available for this project."));
      }
    }
  }

  function updateRepositoryShortcuts() {
    const github = repoGithubLink();
    const folder = repoFolderButton();
    if (github instanceof HTMLAnchorElement) {
      if (latestRepository.webUrl) {
        github.hidden = false;
        github.href = latestRepository.webUrl;
        const providerLabel = latestRepository.provider === "gitlab" ? "GitLab" : latestRepository.provider === "github" ? "GitHub" : "remote";
        github.title = `Open ${providerLabel} repository`;
        github.setAttribute("aria-label", `Open ${providerLabel} repository`);
      } else {
        github.hidden = true;
        github.removeAttribute("href");
      }
    }
    if (folder instanceof HTMLButtonElement) {
      folder.hidden = !latestRepository.root;
    }
  }

  function updateVersionLink(updateInfo = latestUpdateInfo) {
    latestUpdateInfo = updateInfo && typeof updateInfo === "object" ? updateInfo : {};
    const link = versionLink();
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }
    const currentVersion = String(latestUpdateInfo.currentVersion || "").trim();
    link.textContent = currentVersion ? `v${currentVersion.replace(/^v/i, "")}` : "v0.0.0";
    link.href = latestRepository.webUrl || "https://github.com/AlexAgo83/logics-manager";
    link.title = latestRepository.webUrl ? "Open repository" : "Open Logics Manager on GitHub";
  }

  async function openRepositoryFolder() {
    if (!latestRepository.root) {
      setMeta("Repository folder is unavailable.");
      return;
    }
    try {
      const response = await fetch("/api/open-repo-folder", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to open repository folder.");
      }
      setMeta("Repository folder opened.");
    } catch (error) {
      await openProjectPickerModal(error instanceof Error ? error.message : "Unable to open repository folder.");
    }
  }

  function normalizeGitBadgeCounts(payload) {
    const counts = payload && typeof payload === "object" ? payload.badgeCounts || {} : {};
    return {
      unpushedCommits: Math.max(0, Number(counts.unpushedCommits || payload?.ahead || 0)),
      uncommittedFiles: Math.max(0, Number(counts.uncommittedFiles || 0))
    };
  }

  function renderGitBadge(kind, count) {
    const value = Number(count || 0);
    if (value <= 0) {
      return "";
    }
    const label = kind === "commits"
      ? `${value} commits locaux non pushés`
      : `${value} fichiers modifiés non commités`;
    return `<span class="viewer-git-badge viewer-git-badge--${kind}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(value)}</span>`;
  }

  function gitBadgeHtml(scope) {
    const commitsVisible = latestGitBadgeCounts.unpushedCommits > 0 && (
      scope === "main" || scope === "history"
    );
    const filesVisible = latestGitBadgeCounts.uncommittedFiles > 0 && (
      scope === "main" || scope === "changes"
    );
    const html = [
      commitsVisible ? renderGitBadge("commits", latestGitBadgeCounts.unpushedCommits) : "",
      filesVisible ? renderGitBadge("files", latestGitBadgeCounts.uncommittedFiles) : ""
    ].filter(Boolean).join("");
    return html ? `<span class="viewer-git-badges" data-viewer-git-badges="${escapeHtml(scope)}">${html}</span>` : "";
  }

  function navMenuItem(target) {
    return Array.from(document.querySelectorAll("[data-viewer-nav-target]"))
      .find((item) => item.getAttribute("data-viewer-nav-target") === target) || null;
  }

  function clearNavMenuBadges(targets) {
    targets.forEach((target) => {
      navMenuItem(target)?.querySelector("[data-viewer-menu-badges]")?.remove();
    });
  }

  function setNavMenuBadges(target, html) {
    const item = navMenuItem(target);
    if (!(item instanceof HTMLElement)) {
      return;
    }
    item.querySelector("[data-viewer-menu-badges]")?.remove();
    if (html) {
      item.insertAdjacentHTML("beforeend", `<span class="viewer-nav-menu__badges" data-viewer-menu-badges>${html}</span>`);
    }
  }

  let workshopBadgeCounts = { terminals: 0, commands: 0 };

  function updateWorkshopBadges() {
    const button = document.getElementById("viewer-workshop");
    if (!(button instanceof HTMLElement)) return;
    button.querySelector('[data-viewer-workshop-badges]')?.remove();
    clearNavMenuBadges(["workshop:terminals", "workshop:commands"]);
    const { terminals, commands } = workshopBadgeCounts;
    if (terminals <= 0 && commands <= 0) return;
    const html = [
      terminals > 0
        ? `<span class="viewer-git-badge viewer-git-badge--commits" title="${escapeHtml(terminals + " terminal session(s) running")}" aria-label="${escapeHtml(terminals + " terminal session(s) running")}">${escapeHtml(String(terminals))}</span>`
        : "",
      commands > 0
        ? `<span class="viewer-git-badge viewer-git-badge--files" title="${escapeHtml(commands + " command(s) running")}" aria-label="${escapeHtml(commands + " command(s) running")}">${escapeHtml(String(commands))}</span>`
        : "",
    ].filter(Boolean).join("");
    if (html) {
      button.insertAdjacentHTML("beforeend", `<span class="viewer-git-badges" data-viewer-workshop-badges>${html}</span>`);
    }
    if (terminals > 0) {
      setNavMenuBadges("workshop:terminals", renderGitBadge("commits", terminals));
    }
    if (commands > 0) {
      setNavMenuBadges("workshop:commands", renderGitBadge("files", commands));
    }
  }

  function recomputeWorkshopBadges() {
    const isRunning = (state) => state === "running" || state === "starting";
    let terminals = 0;
    for (const entry of workshopTerminalState.sessions.values()) {
      if (isRunning(entry.state)) terminals += 1;
    }
    let commands = 0;
    for (const entry of workshopCommandState.sessions.values()) {
      if (isRunning(entry.state)) commands += 1;
    }
    if (workshopBadgeCounts.terminals === terminals && workshopBadgeCounts.commands === commands) return;
    workshopBadgeCounts = { terminals, commands };
    updateWorkshopBadges();
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

  function ciBadgeTone(value) {
    const state = String(value || "").toLowerCase();
    if (state === "passing") {
      return "passing";
    }
    if (state === "failing") {
      return "failing";
    }
    if (state === "running" || state === "queued") {
      return "running";
    }
    if (state === "cancelled") {
      return "cancelled";
    }
    if (state === "unavailable") {
      return "unavailable";
    }
    return "unknown";
  }

  function ciBadgeLabel(value) {
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

  function renderCiButtonBadge(payload) {
    const state = payload?.badgeState || payload?.state || "unknown";
    const label = ciBadgeLabel(state);
    const tone = ciBadgeTone(state);
    return `<span class="viewer-ci-badge viewer-ci-badge--${escapeHtml(tone)}" data-viewer-ci-badge title="${escapeHtml(payload?.message || `CI ${label}`)}">${escapeHtml(label)}</span>`;
  }

  function updateMainCiBadge(payload = latestCiStatus) {
    latestCiStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    // Only manage the CI status badge here. Button visibility now belongs to
    // updateCapabilityControls (git OR ci available), since the button is
    // shared with Git and must stay visible when only git is available.
    button.querySelector("[data-viewer-ci-badge]")?.remove();
    clearNavMenuBadges(["remote:runs"]);
    if (!latestCiStatus.visible) {
      return;
    }
    // Surface the latest CI message in the shared button tooltip when CI is live.
    button.title = latestCiStatus.message || "Show Git status, CI runs, and release state";
    const badge = renderCiButtonBadge(latestCiStatus);
    button.insertAdjacentHTML("beforeend", badge);
    setNavMenuBadges("remote:runs", badge);
  }

  async function refreshCiBadgeCounters() {
    if (!isCapabilityAvailable("ci")) {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "CI is not available for this project.") });
      return;
    }
    try {
      const response = await fetch("/api/ci-status");
      if (response.status === 404) {
        updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status endpoint unavailable." });
        return;
      }
      const data = await response.json();
      if (response.ok && data.ok) {
        latestCiStatusSignature = runtimeStatusSignature(data.payload);
        updateMainCiBadge(data.payload);
      }
    } catch {
      updateMainCiBadge({ visible: false, badgeState: "unknown", message: "CI status unavailable." });
    }
  }

  function renderReleaseRunsButtonBadge(payload) {
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

  function updateMainReleaseBadge(payload = latestReleaseRunsStatus) {
    latestReleaseRunsStatus = payload && typeof payload === "object" ? payload : { visible: false, badgeState: "unknown", message: "" };
    const button = ciButton();
    if (!(button instanceof HTMLElement)) {
      return;
    }
    // Manage only the release status badge here; the shared "Remote" button
    // visibility is owned by updateCapabilityControls. Order on the button is
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
    if (!isCapabilityAvailable("ci")) {
      updateMainReleaseBadge({ visible: false, badgeState: "unknown", message: capabilityMessage("ci", "Release runs are not available for this project.") });
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

  function cdxSectionBadgeTitle(section, count) {
    if (section === "missions") {
      return count === 1 ? "1 mission run in progress" : `${count} mission runs in progress`;
    }
    if (section === "runs") {
      return count === 1 ? "1 new report" : `${count} new reports`;
    }
    return count === 1 ? "1 new history entry" : `${count} new history entries`;
  }

  function renderCdxUnreadBadge(section, label, count) {
    const title = cdxSectionBadgeTitle(section, count);
    return `<span class="viewer-cdx-button-badge viewer-cdx-button-badge--unread" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${escapeHtml(label)}</span>`;
  }

  // Shared rule: 0 hides the badge, 1 shows "!", and anything above shows the
  // number itself.
  function cdxBadgeLabel(count) {
    if (!Number.isFinite(count) || count <= 0) return null;
    return count === 1 ? "!" : String(count);
  }

  // Identity helpers used to diff "new since last seen" sections. Runs expose a
  // stable run id; history entries don't, so we synthesise one from the fields
  // that uniquely pin a launch.
  function cdxRunIdentity(run) {
    return String(cdxField(run, ["run_id", "runId", "id"], "")).trim();
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

