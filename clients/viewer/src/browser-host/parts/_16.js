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

  function cdxMissionCatalog(payload = {}) {
    return payload.catalog || {
      missions: [
        { id: "full-audit", title: "Full audit", description: "Audit the repository, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.", scope: "repository", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "release-review", title: "Review since latest release", description: "Review changes since the latest release, always draft a Logics request, and optionally apply fixes with a full request→item→task chain.", scope: "latest-release", requiresPlanConfirmation: false, supportsFileWrites: true, requiresFileWrites: true, inputFields: [{ id: "directFixes", label: "Fix directly", type: "checkbox" }] },
        { id: "corpus-ready", title: "Prepare dev-ready corpus", description: "Produce a corpus plan for explicit deterministic application.", scope: "open-logics-workflow", requiresPlanConfirmation: true, supportsFileWrites: false },
        { id: "wish-to-request", title: "Wish to request", description: "Create or draft a structured Logics request from a free-form wish.", scope: "request-draft", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "wishText", label: "Wish or intent", type: "textarea", required: true }] },
        { id: "pre-release", title: "Guarded pre-release", description: "Prepare release metadata, changelog, validation, and fixes without tagging or publishing.", scope: "pre-release-report", requiresPlanConfirmation: false, supportsFileWrites: true, inputFields: [{ id: "releaseVersion", label: "Version", type: "text", placeholder: "vX.X.X", required: true }, { id: "runFullValidation", label: "Run full validation and report fixes before pre-release", type: "checkbox" }] }
      ],
      strengths: [
        { id: "standard", label: "Standard" },
        { id: "deep", label: "Deep" },
        { id: "max", label: "Max" }
      ],
      defaultMissionId: "full-audit",
      defaultStrengthId: "standard"
    };
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
    setDocument("CDX missions", renderCdxMissions(latestCdxMissionState.statusPayload));
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
      persistCdxSessionConfig(sessionName, { power, model }).catch((error) => setMeta(`CDX config: ${error?.message || error}`));
      if (permission && cdxPermissionValues().includes(permission)) {
        const current = pendingCdxSessionPermissions.has(sessionName)
          ? pendingCdxSessionPermissions.get(sessionName)
          : cdxSessionPermission(cdxSessions(latestCdxStatusPayload?.status || {}).find((entry) => cdxSessionName(entry && typeof entry === "object" ? entry : { value: entry }) === sessionName) || {});
        if (permission !== current) {
          applyCdxSessionPermission(sessionName, permission).catch((error) => setMeta(`CDX permission: ${error?.message || error}`));
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
    setMeta(data.payload?.message || `Config saved for ${sessionName}.`);
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
    setMeta(`CDX config updated for ${sessionName}.`);
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
