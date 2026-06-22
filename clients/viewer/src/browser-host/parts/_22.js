    });
    document.getElementById("viewer-health")?.addEventListener("click", () => {
      setRefreshMenuOpen(false);
      withPrimaryAction("health", "Checking health", showHealth);
    });
    document.getElementById("viewer-lan-banner-copy")?.addEventListener("click", async () => {
      const share = latestLanShareUrl;
      if (!share) return;
      const ok = await copyTextToClipboard(share);
      if (ok) {
        setMeta("LAN share URL copied to the clipboard.");
      } else {
        setMeta(`Copy failed — long-press to select: ${share}`);
      }
    });
    // The Workshop / Remote / CDX buttons toggle their sub-section menu rather
    // than navigating directly: a click opens the menu so its items stay
    // clickable; choosing an item (handled below) performs the navigation.
    ["viewer-workshop", "viewer-ci", "viewer-cdx"].forEach((id) => {
      const button = document.getElementById(id);
      // Guard against the init block running more than once (the load event can
      // fire twice), which would otherwise double-bind and cancel the toggle.
      if (!(button instanceof HTMLElement) || button.dataset.navBound === "1") return;
      button.dataset.navBound = "1";
      button.addEventListener("click", () => {
        const wrapper = button.closest(".viewer-nav-menu");
        if (!(wrapper instanceof HTMLElement)) return;
        setNavMenuOpen(wrapper, !wrapper.classList.contains("is-open"));
      });
    });
    repoPill()?.addEventListener("click", () => {
      const menu = projectMenu();
      setProjectMenuOpen(Boolean(menu?.hidden));
    });
    repoFolderButton()?.addEventListener("click", () => {
      withPrimaryAction("open-repo-folder", "Opening repository folder", openRepositoryFolder);
    });
    activityClearControl()?.addEventListener("click", () => {
      clearActivityHistory();
    });
    document.getElementById("activity-toggle")?.addEventListener("click", () => {
      setTimeout(() => {
        if (activityPanelIsOpen()) {
          dispatchViewerActivityUpdate();
        }
      }, 0);
    });
    document.querySelectorAll("[data-viewer-filter-group]").forEach((element) => {
      if (element instanceof HTMLSelectElement) {
        element.addEventListener("change", () => {
          applyViewerFilter(element.getAttribute("data-viewer-filter-group") || "", element.value || "");
        });
        return;
      }
      if (!(element instanceof HTMLElement)) {
        return;
      }
      element.addEventListener("click", () => {
        applyViewerFilter(element.getAttribute("data-viewer-filter-group") || "", element.getAttribute("data-viewer-filter-value") || "");
      });
    });
    document.getElementById("filter-reset")?.addEventListener("click", () => {
      clearLocalPreset();
    });
    const editButton = editDocumentButton();
    if (editButton instanceof HTMLElement) {
      editButton.addEventListener("click", () => {
        withPrimaryAction("edit-document", "Opening document", () => editDocument(selectedItem()));
      });
    }
    document.addEventListener("change", (event) => {
      const sessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session]") : null;
      const cdxSessionConfigInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-input]") : null;
      const cdxInputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-input]") : null;
      const cdxRunModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-mode]") : null;
      const cdxPromptTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-prompt]") : null;
      const cdxColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-column]") : null;
      const cdxRunColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-column]") : null;
      const cdxRunSessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-session]") : null;
      const cdxHistoryColumnTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-column]") : null;
      const cdxHistorySessionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-session]") : null;
      const cdxProviderTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider]") : null;
      if (cdxPromptTarget instanceof HTMLTextAreaElement) {
        // Store the operator-edited prompt without resetting the plan so the
        // edit survives until the next Preview or Launch run.
        latestCdxMissionState.promptOverride = cdxPromptTarget.value || "";
        return;
      }
      if (cdxSessionConfigInputTarget instanceof HTMLElement) {
        updateCdxSessionConfigFromModal(cdxSessionConfigInputTarget.closest("[data-viewer-cdx-session-config-modal]"));
        return;
      }
      if (cdxRunModeTarget instanceof HTMLSelectElement) {
        latestCdxMissionState.runMode = cdxRunModeTarget.value === "terminal" ? "terminal" : "background";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
        return;
      }
      if (sessionTarget instanceof HTMLSelectElement) {
        latestCdxMissionState.sessionId = sessionTarget.value || "";
        delete latestCdxMissionState.missionInputs.model;
        latestCdxMissionState.planPayload = null;
        latestCdxMissionState.runPayload = null;
        latestCdxMissionState.applyPayload = null;
        latestCdxMissionState.outputMode = "plan";
        latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
      }
      if (cdxInputTarget instanceof HTMLInputElement || cdxInputTarget instanceof HTMLTextAreaElement || cdxInputTarget instanceof HTMLSelectElement) {
        const key = cdxInputTarget.getAttribute("data-viewer-cdx-input") || "";
        if (key) {
          latestCdxMissionState.missionInputs[key] = cdxInputTarget instanceof HTMLInputElement && cdxInputTarget.type === "checkbox" ? (cdxInputTarget.checked ? "true" : "false") : (cdxInputTarget.value || "");
          latestCdxMissionState.planPayload = null;
          latestCdxMissionState.runPayload = null;
          latestCdxMissionState.applyPayload = null;
          latestCdxMissionState.outputMode = "plan";
          latestCdxMissionState.promptOverride = "";
        }
      }
      if (cdxColumnTarget instanceof HTMLInputElement) {
        persistCdxColumnVisibility(cdxColumnTarget.getAttribute("data-viewer-cdx-column") || "", cdxColumnTarget.checked);
        rerenderCdxStatusFromPreferences();
      }
      if (cdxRunColumnTarget instanceof HTMLInputElement) {
        persistCdxRunColumnVisibility(cdxRunColumnTarget.getAttribute("data-viewer-cdx-run-column") || "", cdxRunColumnTarget.checked);
        preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
      }
      if (cdxRunSessionTarget instanceof HTMLInputElement) {
        const session = cdxRunSessionTarget.getAttribute("data-viewer-cdx-run-session") || "";
        const current = cdxRunSessionFilterPreference();
        const selected = new Set(current.mode === "subset" ? current.selected : knownCdxRunSessions(latestCdxRunsPayload?.runs || []));
        if (cdxRunSessionTarget.checked) {
          selected.add(session);
        } else {
          selected.delete(session);
        }
        persistCdxRunSessionFilter({ mode: "subset", selected: Array.from(selected) });
        preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
      }
      if (cdxHistoryColumnTarget instanceof HTMLInputElement) {
        persistCdxHistoryColumnVisibility(cdxHistoryColumnTarget.getAttribute("data-viewer-cdx-history-column") || "", cdxHistoryColumnTarget.checked);
        preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
      }
      if (cdxHistorySessionTarget instanceof HTMLInputElement) {
        const session = cdxHistorySessionTarget.getAttribute("data-viewer-cdx-history-session") || "";
        const current = cdxHistorySessionFilterPreference();
        const selected = new Set(current.mode === "subset" ? current.selected : knownCdxHistorySessions(latestCdxHistoryPayload?.history || []));
        if (cdxHistorySessionTarget.checked) {
          selected.add(session);
        } else {
          selected.delete(session);
        }
        persistCdxHistorySessionFilter({ mode: "subset", selected: Array.from(selected) });
        preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
      }
      if (cdxProviderTarget instanceof HTMLInputElement) {
        const provider = cdxProviderTarget.getAttribute("data-viewer-cdx-provider") || "";
        const status = latestCdxStatusPayload?.status || {};
        const allProviders = cdxKnownProviders(status, cdxProviders(status), cdxSessions(status));
        const current = cdxProviderFilterPreference();
        const selected = new Set(current.mode === "subset" ? current.selected : allProviders);
        if (cdxProviderTarget.checked) {
          selected.add(provider);
        } else {
          selected.delete(provider);
        }
        const nextSelected = Array.from(selected).filter((entry) => allProviders.includes(entry));
        persistCdxProviderFilter(nextSelected.length === allProviders.length ? { mode: "all", selected: [] } : { mode: "subset", selected: nextSelected });
        rerenderCdxStatusFromPreferences();
      }
    });
    document.addEventListener("dragstart", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement)) return;
      if (event.target instanceof Element && event.target.closest("[data-viewer-workshop-terminal-close], [data-viewer-workshop-terminal-clear], [data-viewer-workshop-terminal-rename], [data-viewer-cdx-usage-refresh]")) {
        event.preventDefault();
        return;
      }
      const id = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (!id) return;
      workshopTerminalState.draggingId = id;
      row.classList.add("is-dragging");
      row.setAttribute("aria-grabbed", "true");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
      }
    });
    document.addEventListener("dragover", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement) || !workshopTerminalState.draggingId) return;
      const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (!targetId || targetId === workshopTerminalState.draggingId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".viewer-workshop__terminal-row.is-drop-target").forEach((node) => {
        if (node !== row) node.classList.remove("is-drop-target");
      });
      row.classList.add("is-drop-target");
    });
    document.addEventListener("drop", (event) => {
      const row = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-drag]") : null;
      if (!(row instanceof HTMLElement)) {
        clearWorkshopTerminalDragState();
        return;
      }
      const sourceId = workshopTerminalState.draggingId || event.dataTransfer?.getData("text/plain") || "";
      const targetId = row.getAttribute("data-viewer-workshop-terminal-drag") || "";
      if (sourceId && targetId && sourceId !== targetId) {
        event.preventDefault();
        moveWorkshopTerminalBefore(sourceId, targetId);
        workshopTerminalState.suppressSelectUntil = Date.now() + 250;
      }
      clearWorkshopTerminalDragState();
    });
    document.addEventListener("dragend", () => {
      workshopTerminalState.suppressSelectUntil = Date.now() + 250;
      clearWorkshopTerminalDragState();
    });
    document.addEventListener("click", (event) => {
      window.setTimeout(() => applyLocalViewerChrome(), 0);
      const activeCdxMenu = event.target instanceof Element ? event.target.closest(".viewer-cdx__menu, .viewer-workshop__command-run-menu") : null;
      closeCdxMenus(activeCdxMenu);
      // Close any open topbar sub-section menu when clicking outside of it.
      if (!(event.target instanceof Element) || !event.target.closest(".viewer-nav-menu")) {
        closeNavMenus();
      }
      // Close the project switcher when clicking anywhere outside the menu and
      // its toggling pill (the pill click below re-opens it as needed). Without
      // this the menu never lost focus and stayed open until a project was
      // picked.
      if (!(event.target instanceof Element)
        || (!event.target.closest("#viewer-project-menu") && !event.target.closest("#viewer-repo-pill"))) {
        setProjectMenuOpen(false);
      }
      const target = event.target instanceof Element ? event.target.closest("[data-viewer-doc-path]") : null;
      const healthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-open-health]") : null;
      const filterTarget = event.target instanceof Element ? event.target.closest("[data-viewer-filter-group][data-viewer-filter-value]") : null;
      const revealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-reveal]") : null;
      const gitHistoryRevealTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-history-reveal]") : null;
      const gitDomainTarget = event.target instanceof Element ? event.target.closest(".viewer-git__domain[data-viewer-git-domain]") : null;
      const gitFileTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-file]") : null;
      const gitPreviewFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-git-preview-full]") : null;
      const workspaceTreeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-tree]") : null;
      const workspacePreviewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview]") : null;
      const workspacePreviewFullTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workspace-preview-full]") : null;
      const workshopTabTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-tab]") : null;
      const workshopRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run]") : null;
      const workshopRunTerminalTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-run-terminal]") : null;
      const workshopStopTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-command-stop]") : null;
      const workshopTerminalNewTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-new]") : null;
      const workshopTerminalCustomTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-custom]") : null;
      const workshopTerminalSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-select]") : null;
      const workshopTerminalCloseTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-close]") : null;
      const workshopTerminalClearTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-clear]") : null;
      const workshopTerminalRenameTarget = event.target instanceof Element ? event.target.closest("[data-viewer-workshop-terminal-rename]") : null;
      const workshopCdxUsageTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-usage-refresh]") : null;
      const projectSwitcherTarget = event.target instanceof Element ? event.target.closest("#viewer-repo-pill") : null;
      const projectFavoriteTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-favorite]") : null;
      const projectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-id]") : null;
      const projectPickTarget = event.target instanceof Element ? event.target.closest("[data-viewer-project-pick]") : null;
      const ciModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-ci-mode]") : null;
      const cdxModeTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mode]") : null;
      const cdxBackRunsTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-back-runs]") : null;
      const cdxReportTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-report]") : null;
      const cdxArtifactTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-artifact-path]") : null;
      const cdxProviderAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-provider-all]") : null;
      const cdxMissionSelectTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission-select]") : null;
      const cdxStrengthTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-strength]") : null;
      const cdxPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-plan]") : null;
      const cdxRunTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run]") : null;
      const cdxApplyPlanTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-apply-plan]") : null;
      const cdxMissionOutputTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-mission-output]") : null;
      const cdxToggleTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-toggle]") : null;
      const cdxSessionActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-action]") : null;
      const cdxSessionConfigSubmitTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-submit]") : null;
      const cdxSessionConfigCancelTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-session-config-cancel]") : null;
      const cdxLoginTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-login]") : null;
      const navTarget = event.target instanceof Element ? event.target.closest("[data-viewer-nav-target]") : null;
      const onboardingActionTarget = event.target instanceof Element ? event.target.closest("[data-viewer-onboarding-action]") : null;
      if (onboardingActionTarget instanceof HTMLElement) {
        event.preventDefault();
        runOnboardingAction(onboardingActionTarget.getAttribute("data-viewer-onboarding-action") || "");
        return;
      }
      if (navTarget instanceof HTMLElement) {
        event.preventDefault();
        const [screen, section] = (navTarget.getAttribute("data-viewer-nav-target") || "").split(":");
        // Collapse the menu once a sub-section is chosen.
        closeNavMenus();
        if (screen === "workshop") {
          withPrimaryAction("workshop-nav", `Opening Workshop ${section}`, () => showWorkshop({ tab: section }));
        } else if (screen === "remote") {
          if (section === "release") {
            withPrimaryAction("remote-release", "Checking release workflow", showReleaseStatus);
          } else if (section === "runs") {
            withPrimaryAction("remote-runs", "Checking CI status", showCiStatus);
          } else {
            withPrimaryAction("remote-git", "Checking Git status", () => showGitStatus());
          }
        } else if (screen === "cdx") {
          if (section === "runs") {
            withPrimaryAction("cdx-runs", "Loading CDX reports", showCdxRuns);
          } else if (section === "missions") {
            withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
          } else if (section === "history") {
            withPrimaryAction("cdx-history", "Loading CDX history", showCdxHistory);
          } else {
            withPrimaryAction("cdx", "Checking CDX status", showCdxStatus);
          }
        }
        return;
      }
      if (cdxToggleTarget instanceof HTMLButtonElement) {
        event.preventDefault();
        const sessionName = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle") || "";
        const currentState = cdxToggleTarget.getAttribute("data-viewer-cdx-toggle-state") || "on";
        const enable = currentState === "off";
        if (!sessionName) return;
        pendingCdxSessionToggles.set(sessionName, enable);
        const rollbackCdxToggle = applyOptimisticCdxSessionToggle(sessionName, enable);
        fetch("/api/cdx-toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: sessionName, enable }),
        }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
          if (!ok || !data.ok) {
            throw new Error(data.error || "Toggle failed.");
          }
          return showCdxStatus({ silent: true, force: true }).catch(() => {});
        }).catch((error) => {
          rollbackCdxToggle();
          setMeta(`CDX toggle: ${error?.message || error}`);
        }).finally(() => {
          pendingCdxSessionToggles.delete(sessionName);
          rerenderCdxStatusFromPreferences();
        });
        return;
      }
      if (cdxSessionConfigSubmitTarget instanceof HTMLElement) {
        event.preventDefault();
        const modal = cdxSessionConfigSubmitTarget.closest("[data-viewer-cdx-session-config-modal]");
        applyCdxSessionConfigModal(modal);
        return;
      }
      if (cdxSessionConfigCancelTarget instanceof HTMLElement) {
        event.preventDefault();
        closeThemedModal(cdxSessionConfigCancelTarget.closest("[data-viewer-cdx-session-config-modal]"));
        return;
      }
      if (ciModeTarget instanceof HTMLElement) {
        const mode = ciModeTarget.getAttribute("data-viewer-ci-mode") || "git";
        if (mode === "release") {
          withPrimaryAction("ci-release", "Checking release workflow", showReleaseStatus);
        } else if (mode === "runs") {
          withPrimaryAction("ci-runs", "Checking CI status", showCiStatus);
        } else {
          withPrimaryAction("ci-git", "Checking Git status", () => showGitStatus());
        }
        return;
      }
      if (cdxSessionActionTarget instanceof HTMLElement) {
        event.preventDefault();
        const action = cdxSessionActionTarget.getAttribute("data-viewer-cdx-session-action") || "new";
        const sessionName = cdxSessionActionTarget.getAttribute("data-viewer-cdx-session") || "";
        const handoffSource = cdxSessionActionTarget.getAttribute("data-viewer-cdx-handoff-source") || "";
        cdxSessionActionTarget.closest("details")?.removeAttribute("open");
        if (!sessionName) {
          return;
        }
        if (action === "config") {
          showCdxSessionConfigModal(sessionName);
        } else if (action === "resume") {
          spawnWorkshopTerminal({ command: ["cdx", "resume", sessionName], label: `cdx resume ${sessionName}` });
        } else if (action === "handoff" && handoffSource) {
          spawnWorkshopTerminal({ command: ["cdx", "handoff", handoffSource, sessionName], label: `cdx handoff ${handoffSource} ${sessionName}` });
        } else if (action === "remove") {
          cdxSessionActionTarget.disabled = true;
          fetch("/api/cdx-remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session: sessionName }),
          }).then((r) => r.json().then((data) => ({ ok: r.ok, data }))).then(({ ok, data }) => {
            if (!ok || !data.ok) {
              throw new Error(data.error || "Remove failed.");
            }
            setMeta(data.payload?.message || `Removed ${sessionName}.`);
            showCdxStatus({ silent: true, force: true }).catch(() => {});
          }).catch((error) => {
            setMeta(`CDX remove: ${error?.message || error}`);
          }).finally(() => { cdxSessionActionTarget.disabled = false; });
        } else {
          spawnWorkshopTerminal({ command: ["cdx", sessionName], label: `cdx ${sessionName}` });
        }
        return;
      }
      if (cdxLoginTarget instanceof HTMLElement) {
        event.preventDefault();
        const sessionName = cdxLoginTarget.getAttribute("data-viewer-cdx-login") || "";
        if (sessionName) {
          spawnWorkshopTerminal({ command: ["cdx", "login", sessionName], label: `cdx login ${sessionName}` });
        }
        return;
      }
      if (cdxMissionSelectTarget instanceof HTMLElement) {
        selectCdxMissionFromModal().catch((error) => setMeta(`Mission selection failed: ${error?.message || error}`));
        return;
      }
      if (cdxStrengthTarget instanceof HTMLElement) {
        latestCdxMissionState.strengthId = cdxStrengthTarget.getAttribute("data-viewer-cdx-strength") || "standard";
        latestCdxMissionState.planPayload = null;
        latestCdxMissionState.runPayload = null;
        latestCdxMissionState.applyPayload = null;
        latestCdxMissionState.outputMode = "plan";
        latestCdxMissionState.promptOverride = "";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
        return;
      }
      if (cdxMissionOutputTarget instanceof HTMLElement) {
        latestCdxMissionState.outputMode = cdxMissionOutputTarget.getAttribute("data-viewer-cdx-mission-output") === "run" ? "run" : "plan";
        setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload, latestCdxMissionState.planPayload, latestCdxMissionState.runPayload, latestCdxMissionState.applyPayload));
        return;
      }
      if (cdxPlanTarget instanceof HTMLElement) {
        withCdxMissionAction("cdx-plan", "Building CDX mission plan", previewCdxMission);
        return;
      }
      if (cdxRunTarget instanceof HTMLElement) {
        withCdxMissionAction("cdx-run", "Launching CDX mission", launchCdxMission);
        return;
      }
      if (cdxApplyPlanTarget instanceof HTMLElement) {
        withCdxMissionAction("cdx-apply-plan", "Applying CDX mission plan", applyCdxMissionPlan);
        return;
      }
      if (cdxProviderAllTarget instanceof HTMLElement) {
        persistCdxProviderFilter({ mode: "all", selected: [] });
        rerenderCdxStatusFromPreferences();
        return;
      }
      const cdxRunSessionAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-run-session-all]") : null;
      if (cdxRunSessionAllTarget instanceof HTMLElement) {
        persistCdxRunSessionFilter({ mode: "all", selected: [] });
        preserveActiveCdxMenu(() => setDocument("CDX reports", renderCdxRuns(latestCdxRunsPayload || { state: "ok", message: "", runs: [] })));
        return;
      }
      const cdxHistorySessionAllTarget = event.target instanceof Element ? event.target.closest("[data-viewer-cdx-history-session-all]") : null;
      if (cdxHistorySessionAllTarget instanceof HTMLElement) {
        persistCdxHistorySessionFilter({ mode: "all", selected: [] });
        preserveActiveCdxMenu(() => setDocument("CDX history", renderCdxHistory(latestCdxHistoryPayload || { state: "ok", message: "", history: [] })));
        return;
