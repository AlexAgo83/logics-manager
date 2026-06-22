      autoRefreshTimeoutId = 0;
    }
    nextAutoRefreshAt = autoRefreshEnabled ? Date.now() + autoRefreshIntervalMs : 0;
    if (autoRefreshEnabled) {
      autoRefreshTimeoutId = window.setTimeout(autoRefreshItems, autoRefreshIntervalMs);
    }
    renderMeta();
  }

  function updateRepositoryIdentity(payload) {
    latestRepoRoot = String(payload.root || latestRepoRoot || "");
    latestProjects = Array.isArray(payload.projects) ? payload.projects : latestProjects;
    const repository = payload.repository && typeof payload.repository === "object" ? payload.repository : {};
    latestRepository = {
      root: String(repository.root || latestRepoRoot || ""),
      provider: String(repository.provider || ""),
      webUrl: String(repository.webUrl || repository.githubUrl || repository.gitlabUrl || ""),
      githubUrl: String(repository.githubUrl || ""),
      gitlabUrl: String(repository.gitlabUrl || "")
    };
    const pill = repoPill();
    if (pill) {
      const repoName = String(payload.repoName || latestRepoRoot.split(/[\\/]/).filter(Boolean).pop() || "repository");
      const label = pill.querySelector("[data-viewer-project-label]");
      if (label) {
        label.textContent = repoName;
      } else {
        pill.textContent = repoName;
      }
      pill.title = latestRepoRoot || repoName;
      if ("disabled" in pill) {
        pill.disabled = false;
      }
      pill.onclick = () => {
        const menu = projectMenu();
        setProjectMenuOpen(Boolean(menu?.hidden));
      };
    }
    updateRepositoryShortcuts();
    renderProjectMenu();
  }

  function projectStateLabel(project) {
    if (project?.active) {
      return "current";
    }
    if (project?.available === false) {
      return "missing";
    }
    if (project?.hasLogics === false) {
      return "no Logics";
    }
    return "available";
  }

  function renderProjectMenu() {
    const menu = projectMenu();
    if (!(menu instanceof HTMLElement)) {
      return;
    }
    const favorites = favoriteProjectIds();
    const projects = latestProjects
      .filter((project) => project && typeof project === "object")
      .map((project, index) => ({ project, index, favorite: favorites.has(projectPreferenceId(project)) }))
      .sort((left, right) => Number(right.favorite) - Number(left.favorite) || left.index - right.index);
    const projectRows = projects.map(({ project, favorite }) => {
      const preferenceId = projectPreferenceId(project);
      return `
        <div class="viewer-project-switcher__row${project.active ? " is-active" : ""}${favorite ? " is-favorite" : ""}" role="none">
          <button class="viewer-project-switcher__favorite" type="button" aria-label="${favorite ? "Remove favorite" : "Add favorite"} ${escapeHtml(project.name || "project")}" aria-pressed="${favorite ? "true" : "false"}" data-viewer-project-favorite="${escapeHtml(preferenceId)}" title="${favorite ? "Remove favorite" : "Add favorite"}">
            <span aria-hidden="true">${favorite ? "★" : "☆"}</span>
          </button>
          <button class="viewer-project-switcher__item${project.active ? " is-active" : ""}" type="button" role="menuitem" data-viewer-project-id="${escapeHtml(project.id || "")}" title="${escapeHtml(project.root || project.name || "")}">
            <span class="viewer-project-switcher__item-name">${escapeHtml(project.name || "project")}</span>
            <span class="viewer-project-switcher__item-state">${escapeHtml(projectStateLabel(project))}</span>
            <span class="viewer-project-switcher__item-path">${escapeHtml(project.root || "")}</span>
          </button>
        </div>
      `;
    }).join("");
    const pickerRow = `
      <button class="viewer-project-switcher__item viewer-project-switcher__item--picker" type="button" role="menuitem" data-viewer-project-pick>
        <span class="viewer-project-switcher__item-name">Choose folder...</span>
        <span class="viewer-project-switcher__item-state">browse</span>
        <span class="viewer-project-switcher__item-path">Select another project location</span>
      </button>
    `;
    menu.innerHTML = `${projectRows}${pickerRow}`;
  }

  function setProjectMenuOpen(open) {
    const button = repoPill();
    const menu = projectMenu();
    if (!(button instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
      return;
    }
    const nextOpen = Boolean(open);
    menu.hidden = !nextOpen;
    button.setAttribute("aria-expanded", nextOpen ? "true" : "false");
  }

  function returnToProjectSurface() {
    const activityToggle = document.getElementById("activity-toggle");
    if (activityPanelIsOpen() && activityToggle instanceof HTMLElement) {
      activityToggle.click();
    }
    document.body?.classList.remove("viewer-screen-activity");
    document.body?.classList.add("viewer-screen-project");
  }

  async function switchViewerProject(projectId) {
    if (!projectId) {
      return;
    }
    const target = latestProjects.find((project) => project.id === projectId);
    if (!target || target.active) {
      setProjectMenuOpen(false);
      return;
    }
    setProjectMenuOpen(false);
    returnToProjectSurface();
    setMeta(`Switching to ${target.name || "project"}...`);
    const response = await fetch("/api/switch-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to switch project.");
    }
    latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
    latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(latestCiStatus);
    updateMainReleaseBadge(latestReleaseRunsStatus);
    updateMainCdxBadge(null);
    const panel = documentPanel();
    if (panel) {
      panel.hidden = true;
    }
    postToApp(data.payload);
  }

  async function pickViewerProjectRoot() {
    setProjectMenuOpen(false);
    returnToProjectSurface();
    setMeta("Opening project folder picker...");
    let response;
    let data = {};
    try {
      response = await fetch("/api/select-project-root", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      data = await response.json();
    } catch (error) {
      return openProjectPickerModal(error?.message || "Native folder picker is unavailable.");
    }
    if (!response.ok || !data.ok) {
      await openProjectPickerModal(String(data.error || "Native folder picker is unavailable."));
      return;
    }
    applySelectedProjectPayload(data.payload, `Switched to ${data.payload?.repoName || "selected project"}.`);
  }

  function applySelectedProjectPayload(payload, message) {
    returnToProjectSurface();
    latestGitBadgeCounts = { unpushedCommits: 0, uncommittedFiles: 0 };
    latestCiStatus = { visible: false, badgeState: "unknown", message: "" };
    latestReleaseRunsStatus = { visible: false, badgeState: "unknown", message: "" };
    updateMainGitBadges();
    updateMainCiBadge(latestCiStatus);
    updateMainReleaseBadge(latestReleaseRunsStatus);
    updateMainCdxBadge(null);
    const panel = documentPanel();
    if (panel) {
      panel.hidden = true;
    }
    postToApp(payload, { force: true });
    setMeta(message);
  }

  async function fetchProjectPickerTree(path = "") {
    const response = await fetch(`/api/project-picker-tree?path=${encodeURIComponent(path)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to browse folders.");
    }
    return data.payload || {};
  }

  function renderProjectPickerModalBody(body, payload) {
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

  async function openProjectPickerModal(reason = "") {
    const modal = createThemedModal({
      title: "Choose project folder",
      message: reason ? `${reason} Use the fallback folder browser below.` : "Use the fallback folder browser below.",
      submitLabel: "Close",
      cancelLabel: "Cancel"
    });
    const body = modal.querySelector(".viewer-themed-modal__body");
    const submit = modal.querySelector(".viewer-themed-modal__submit");
    if (submit instanceof HTMLButtonElement) submit.textContent = "Close";
    let currentPath = "";
    const load = async (path = "") => {
      currentPath = path;
      if (body instanceof HTMLElement) {
        body.innerHTML = '<div class="viewer-workspace__placeholder viewer-workspace__placeholder--empty"><span>Loading folders...</span></div>';
      }
      renderProjectPickerModalBody(body, await fetchProjectPickerTree(path));
    };
    const close = () => closeThemedModal(modal);
    modal.querySelector(".viewer-themed-modal__submit")?.addEventListener("click", close);
    modal.querySelector(".viewer-themed-modal__cancel")?.addEventListener("click", close);
    modal.querySelector(".viewer-themed-modal__close")?.addEventListener("click", close);
    modal.addEventListener("click", async (event) => {
      const openTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-picker-open]") : null;
      const selectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-picker-select]") : null;
      if (openTarget instanceof HTMLElement && !openTarget.hasAttribute("disabled")) {
        event.preventDefault();
        await load(openTarget.getAttribute("data-viewer-project-picker-open") || "");
        return;
      }
      if (selectTarget instanceof HTMLElement) {
        event.preventDefault();
        const selectedPath = selectTarget.getAttribute("data-viewer-project-picker-select") || currentPath;
        const response = await fetch("/api/select-project-root-path", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: selectedPath })
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          await showThemedMessageModal({ title: "Folder refused", message: String(data.error || response.status) });
          return;
        }
        closeThemedModal(modal);
        applySelectedProjectPayload(data.payload, `Switched to ${data.payload?.repoName || "selected project"}.`);
      }
    });
    try {
      await load("");
    } catch (error) {
      if (body instanceof HTMLElement) {
        body.innerHTML = `<div class="viewer-workspace__placeholder viewer-workspace__placeholder--unavailable"><span>${escapeHtml(error?.message || "Unable to browse folders.")}</span></div>`;
      }
    }
  }

  async function bootstrapLogicsProject() {
    setMeta("Bootstrapping Logics...");
    const response = await fetch("/api/bootstrap-logics", { method: "POST" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to bootstrap Logics.");
    }
    postToApp(data.payload);
    const created = Array.isArray(data.bootstrap?.created_paths) ? data.bootstrap.created_paths.length : 0;
    setMeta(created > 0 ? `Logics bootstrapped · ${created} paths created.` : "Logics bootstrap checked.");
  }

  function scheduleReloadAfterServerRestart() {
    let attempts = 0;
    const maxAttempts = 24;
    const probe = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/items?restart=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
          window.location.reload();
          return;
        }
      } catch {
        // The server is expected to be briefly unavailable during restart.
      }
      if (attempts < maxAttempts) {
        window.setTimeout(probe, 800);
        return;
      }
      setMeta("Viewer server restarted. Reload this page if it did not reconnect automatically.");
    };
    window.setTimeout(probe, 1200);
  }

  async function restartViewerServer() {
    const confirmed = await showThemedConfirmModal({
      title: "Restart viewer server",
      message: "The local viewer server will restart with the same command. This page will reconnect automatically when it is back.",
      submitLabel: "Restart server"
    });
    if (!confirmed) return;
    setMeta("Restarting viewer server...");
    const response = await fetch("/api/restart-viewer", { method: "POST" });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to restart the viewer server.");
    }
    setMeta("Viewer server restarting...");
    scheduleReloadAfterServerRestart();
  }

  async function confirmBootstrapLogics({ automatic = false } = {}) {
    if (!latestCanBootstrapLogics || bootstrapPromptOpen) {
      return false;
    }
    bootstrapPromptOpen = true;
    try {
      const confirmed = await showThemedConfirmModal({
        title: "Bootstrap Logics",
        message: latestShouldPromptBootstrapLogics
          ? "This project does not have a Logics workflow yet. Bootstrap it now to create the local workflow structure and enable the viewer."
          : "Refresh generated Logics bootstrap files for this project, including local assistant bridge files.",
        submitLabel: latestShouldPromptBootstrapLogics ? "Bootstrap" : "Refresh",
        cancelLabel: automatic ? "Not now" : "Cancel"
      });
      if (!confirmed) {
        return false;
      }
      await bootstrapLogicsProject();
      return true;
    } finally {
      bootstrapPromptOpen = false;
    }
  }

  function maybePromptBootstrapLogics() {
    if (!latestCanBootstrapLogics || !latestShouldPromptBootstrapLogics || !latestRepoRoot || bootstrapPromptOpen) {
      return;
    }
    if (promptedBootstrapRoots.has(latestRepoRoot)) {
      return;
    }
    promptedBootstrapRoots.add(latestRepoRoot);
    window.setTimeout(() => {
      confirmBootstrapLogics({ automatic: true }).catch((error) => setMeta(error?.message || "Unable to bootstrap Logics."));
    }, 0);
  }

  let latestLanShareUrl = "";

  async function copyTextToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to legacy path */ }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  function applyLanBanner(active, shareUrl, rwMode = false) {
    const banner = document.getElementById("viewer-lan-banner");
    if (!(banner instanceof HTMLElement)) return;
    // Once a device is paired the banner has nothing left to ask the user
    // for — share URL was needed only to bootstrap, pairing is done, and
    // mutations are unlocked. Hide it to give the actual viewport back.
    const paired = Boolean(getDeviceToken());
    banner.hidden = !active || paired;
    latestLanShareUrl = active ? String(shareUrl || "") : "";
    window.__logicsLanRwEnabled = Boolean(active && rwMode);
    const urlNode = document.getElementById("viewer-lan-banner-url");
    const copyButton = document.getElementById("viewer-lan-banner-copy");
    if (urlNode instanceof HTMLElement) {
      if (latestLanShareUrl) {
        urlNode.hidden = false;
        urlNode.textContent = latestLanShareUrl;
      } else {
        urlNode.hidden = true;
        urlNode.textContent = "";
      }
    }
    if (copyButton instanceof HTMLButtonElement) {
      copyButton.hidden = !latestLanShareUrl;
    }
    refreshLanBannerPairingState();
  }

  function normalizeCapabilities(payload) {
    const capabilities = payload?.capabilities && typeof payload.capabilities === "object" ? payload.capabilities : {};
    return {
      logics: capabilities.logics || { state: "ready", available: true, message: "" },
      workspace: capabilities.workspace || { state: "ready", available: true, message: "" },
      workshop: capabilities.workshop || { state: "missing", available: false, message: "" },
      git: capabilities.git || { state: "ready", available: true, message: "" },
      ci: capabilities.ci || { state: "ready", available: true, message: "" },
      cdx: capabilities.cdx || { state: "ready", available: true, message: "" },
      cdxRuns: capabilities.cdxRuns || { state: "unsupported", available: false, message: "" }
    };
  }

  function capability(name) {
    return latestCapabilities?.[name] || { state: "unknown", available: false, message: "" };
  }

  function isCapabilityAvailable(name) {
    return capability(name).available === true;
  }

  function capabilityMessage(name, fallback) {
    return String(capability(name).message || fallback || "");
