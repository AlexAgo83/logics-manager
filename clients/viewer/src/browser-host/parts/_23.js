      }
      if (cdxBackRunsTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
        return;
      }
      if (cdxReportTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-report", "Loading CDX report", () => showCdxReport(cdxReportTarget.getAttribute("data-viewer-cdx-report") || ""));
        return;
      }
      if (cdxArtifactTarget instanceof HTMLElement) {
        withPrimaryAction("cdx-artifact", "Opening CDX artifact", () => openCdxArtifact(cdxArtifactTarget.getAttribute("data-viewer-cdx-artifact-path") || ""));
        return;
      }
      if (cdxModeTarget instanceof HTMLElement) {
        const mode = cdxModeTarget.getAttribute("data-viewer-cdx-mode") || "status";
        if (mode === "runs") {
          withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
        } else if (mode === "missions") {
          withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
        } else if (mode === "history") {
          withPrimaryAction("cdx-history", "Loading CDX history", showCdxHistory);
        } else {
          withPrimaryAction("cdx", "Checking CDX status", showCdxStatus);
        }
        return;
      }
      if (workshopTabTarget instanceof HTMLElement) {
        event.preventDefault();
        const tab = workshopTabTarget.getAttribute("data-viewer-workshop-tab") || "terminals";
        withPrimaryAction("workshop-tab", `Switching to ${tab}`, () => showWorkshop({ tab }));
        return;
      }
      if (workshopTerminalCloseTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalCloseTarget.getAttribute("data-viewer-workshop-terminal-close") || "";
        if (id) stopWorkshopTerminal(id);
        return;
      }
      if (workshopTerminalClearTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalClearTarget.getAttribute("data-viewer-workshop-terminal-clear") || "";
        if (id) clearWorkshopTerminal(id);
        return;
      }
      if (workshopTerminalRenameTarget instanceof HTMLElement && event.detail >= 2) {
        event.preventDefault();
        event.stopPropagation();
        const id = workshopTerminalRenameTarget.getAttribute("data-viewer-workshop-terminal-rename") || "";
        if (id) renameWorkshopTerminal(id);
        return;
      }
      if (workshopCdxUsageTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const session = workshopCdxUsageTarget.getAttribute("data-viewer-cdx-usage-refresh") || "";
        refreshCdxSessionUsage(session);
        return;
      }
      if (workshopTerminalNewTarget instanceof HTMLElement) {
        event.preventDefault();
        spawnWorkshopTerminal();
        return;
      }
      if (workshopTerminalCustomTarget instanceof HTMLElement) {
        event.preventDefault();
        spawnCustomWorkshopTerminal(workshopTerminalCustomTarget);
        return;
      }
      if (workshopTerminalSelectTarget instanceof HTMLElement) {
        event.preventDefault();
        if (Date.now() < workshopTerminalState.suppressSelectUntil) return;
        const id = workshopTerminalSelectTarget.getAttribute("data-viewer-workshop-terminal-select") || "";
        if (id) setActiveWorkshopTerminal(id);
        return;
      }
      if (workshopRunTarget instanceof HTMLElement) {
        event.preventDefault();
        workshopRunTarget.closest("details")?.removeAttribute("open");
        const commandId = workshopRunTarget.getAttribute("data-viewer-workshop-command-run") || "";
        if (commandId) {
          updateWorkshopCommandSession(commandId, { state: "starting", logText: "" });
          startWorkshopCommand(commandId);
        }
        return;
      }
      if (workshopRunTerminalTarget instanceof HTMLElement) {
        event.preventDefault();
        workshopRunTerminalTarget.closest("details")?.removeAttribute("open");
        const commandId = workshopRunTerminalTarget.getAttribute("data-viewer-workshop-command-run-terminal") || "";
        const commands = workshopCommandState.catalog?.commands;
        const entry = Array.isArray(commands) ? commands.find((item) => item?.id === commandId) : null;
        if (entry && Array.isArray(entry.runner) && entry.runner.length) {
          spawnWorkshopTerminal({ command: entry.runner.map(String), label: String(entry.name || commandId) });
        }
        return;
      }
      if (workshopStopTarget instanceof HTMLElement) {
        event.preventDefault();
        const commandId = workshopStopTarget.getAttribute("data-viewer-workshop-command-stop") || "";
        if (commandId) {
          stopWorkshopCommand(commandId);
        }
        return;
      }
      if (workspaceTreeTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("workspace-tree", "Loading Explorer folder", () => openWorkspaceTree(workspaceTreeTarget.getAttribute("data-viewer-workspace-tree") || ""));
        return;
      }
      if (gitPreviewFullTarget instanceof HTMLElement) {
        event.preventDefault();
        const diffPanel = document.querySelector("[data-viewer-git-diff]");
        const detailTitle = document.querySelector("[data-viewer-git-detail] .viewer-git__detail-title");
        if (diffPanel instanceof HTMLElement) {
          withPrimaryAction("git-preview-full", "Loading full Git preview", () => loadGitFilePreview(gitPreviewFullTarget.getAttribute("data-viewer-git-preview-full") || "", diffPanel, detailTitle, { full: true }));
        }
        return;
      }
      if (workspacePreviewFullTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("workspace-preview-full", "Loading full file", () => openWorkspacePreview(workspacePreviewFullTarget.getAttribute("data-viewer-workspace-preview-full") || "", { full: true }));
        return;
      }
      if (workspacePreviewTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("workspace-preview", "Loading Explorer preview", () => openWorkspacePreview(workspacePreviewTarget.getAttribute("data-viewer-workspace-preview") || ""));
        return;
      }
      if (projectSwitcherTarget instanceof HTMLElement) {
        const menu = projectMenu();
        setProjectMenuOpen(Boolean(menu?.hidden));
        return;
      }
      if (projectFavoriteTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopPropagation();
        const projectId = projectFavoriteTarget.getAttribute("data-viewer-project-favorite") || "";
        const currentlyFavorite = projectFavoriteTarget.getAttribute("aria-pressed") === "true";
        persistFavoriteProject(projectId, !currentlyFavorite);
        renderProjectMenu();
        setProjectMenuOpen(true);
        return;
      }
      if (projectPickTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("select-project-root", "Selecting project folder", pickViewerProjectRoot);
        return;
      }
      if (projectTarget instanceof HTMLElement) {
        event.preventDefault();
        withPrimaryAction("switch-project", "Switching project", () => switchViewerProject(projectTarget.getAttribute("data-viewer-project-id") || ""));
        return;
      }
      if (gitHistoryRevealTarget instanceof HTMLElement) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (gitHistoryRevealTarget.dataset.viewerGitHistoryBusy === "true") {
          return;
        }
        gitHistoryRevealTarget.dataset.viewerGitHistoryBusy = "true";
        const list = gitHistoryRevealTarget.closest("ul");
        const hiddenRows = Array.from(list?.querySelectorAll("[data-viewer-git-history-hidden]") || [])
          .filter((row) => row instanceof HTMLElement);
        hiddenRows.slice(0, gitHistoryPageSize).forEach((row) => {
          if (row instanceof HTMLElement) {
            row.hidden = false;
            row.removeAttribute("data-viewer-git-history-hidden");
          }
        });
        const remaining = Array.from(list?.querySelectorAll("[data-viewer-git-history-hidden]") || []).length;
        if (remaining > 0) {
          gitHistoryRevealTarget.textContent = `Show ${Math.min(gitHistoryPageSize, remaining)} more`;
          gitHistoryRevealTarget.dataset.viewerGitHistoryBusy = "false";
        } else {
          gitHistoryRevealTarget.closest("li")?.remove();
        }
        return;
      }
      if (revealTarget instanceof HTMLElement) {
        const list = revealTarget.closest("ul");
        list?.querySelectorAll("[data-viewer-hidden-row]").forEach((row) => {
          if (row instanceof HTMLElement) {
            row.hidden = false;
            row.removeAttribute("data-viewer-hidden-row");
          }
        });
        revealTarget.closest("li")?.remove();
        return;
      }
      if (gitDomainTarget instanceof HTMLElement) {
        applyGitDomain(gitDomainTarget.getAttribute("data-viewer-git-domain") || "changes");
        return;
      }
      if (gitFileTarget instanceof HTMLElement) {
        loadGitDiff(
          gitFileTarget.getAttribute("data-viewer-git-file") || "",
          gitFileTarget.getAttribute("data-viewer-git-cached") === "1",
          gitFileTarget
        ).catch((error) => setMeta(error.message));
        return;
      }
      if (healthTarget instanceof HTMLElement) {
        withPrimaryAction("health", "Checking health", showHealth);
        return;
      }
      if (filterTarget instanceof HTMLElement) {
        applyViewerFilter(filterTarget.getAttribute("data-viewer-filter-group") || "", filterTarget.getAttribute("data-viewer-filter-value") || "");
        setMeta("Insight filter applied. Clear filters restores the normal viewer view.");
        return;
      }
      const path = target instanceof HTMLElement ? target.getAttribute("data-viewer-doc-path") : "";
      if (path) {
        withPrimaryAction("read-document", "Loading document", () => showDocumentByPath(path));
      }
    });
    document.addEventListener("focusin", (event) => {
      const activeCdxMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__menu, .viewer-workshop__command-run-menu") : null;
      closeCdxMenus(activeCdxMenu);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCdxMenus();
      }
    });
    document.getElementById("viewer-document-close")?.addEventListener("click", () => {
      withPrimaryAction("close-document", "Closing preview", closeDocumentPanel);
    });
    document.getElementById("viewer-document-refresh")?.addEventListener("click", () => {
      withPrimaryAction("refresh-document", "Refreshing", refreshCurrentScreen);
    });
    document.getElementById("viewer-release-reset")?.addEventListener("click", () => {
      withPrimaryAction("release-reset", "Resetting release state", resetReleaseState);
    });
    documentStatusButton()?.addEventListener("click", () => {
      withPrimaryAction("change-document-status", "Updating status", changeCurrentDocumentStatus);
    });
    document.getElementById("viewer-git-pull")?.addEventListener("click", () => {
      recordGitActivity("Pull", "Git pull started in a Workshop terminal");
      spawnWorkshopTerminal({ command: ["git", "pull"], label: "git pull" });
    });
    document.getElementById("viewer-git-commit")?.addEventListener("click", () => {
      openGitCommitModal().catch((error) => setMeta(error?.message || "Git commit failed."));
    });
    document.getElementById("viewer-git-push")?.addEventListener("click", () => {
      recordGitActivity("Push", "Git push started in a Workshop terminal");
      spawnWorkshopTerminal({ command: ["git", "push"], label: "git push" });
    });
    startAutoRefresh();
  });
})();
