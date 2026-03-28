(() => {
  window.createCdxLogicsToolsPanelLayoutApi = function createCdxLogicsToolsPanelLayoutApi(options) {
    const { toolsPanel, getCanBootstrapLogics, getBootstrapLogicsTitle } = options;
    const toolButtons = toolsPanel
      ? new Map(
          Array.from(toolsPanel.querySelectorAll(".tools-panel__item")).map((button) => [button.dataset.action, button])
        )
      : new Map();
    const toolSectionBodies = toolsPanel
      ? new Map(
          Array.from(toolsPanel.querySelectorAll("[data-tools-body]")).map((body) => [body.getAttribute("data-tools-body"), body])
        )
      : new Map();
    const toolSections = toolsPanel
      ? new Map(
          Array.from(toolsPanel.querySelectorAll("[data-tools-section]")).map((section) => [
            section.getAttribute("data-tools-section"),
            section
          ])
        )
      : new Map();
    const toolSectionLayout = {
      workflow: ["select-agent", "new-request-guided", "create-companion-doc", "bootstrap-logics"],
      assist: [
        "assist-next-step",
        "assist-triage",
        "assist-commit-all",
        "assist-diff-risk",
        "assist-summarize-validation",
        "assist-validation-checklist",
        "assist-doc-consistency"
      ],
      runtime: ["launch-codex-overlay", "check-environment", "check-hybrid-runtime", "open-hybrid-insights"],
      kit: ["update-logics-kit", "sync-codex-overlay"],
      workspace: ["change-project-root", "reset-project-root", "refresh"],
      maintenance: ["fix-docs", "about"]
    };

    function formatActivityUpdated(updatedAt) {
      const timestamp = Date.parse(updatedAt || "");
      if (!Number.isFinite(timestamp)) {
        return "Updated: Unknown";
      }
      const date = new Date(timestamp);
      const deltaMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
      if (deltaMinutes < 24 * 60) {
        const relativeLabel =
          deltaMinutes < 1
            ? "just now"
            : deltaMinutes < 60
              ? `${deltaMinutes}m ago`
              : `${Math.floor(deltaMinutes / 60)}h ago`;
        const preciseTime = new Intl.DateTimeFormat(undefined, {
          hour: "2-digit",
          minute: "2-digit"
        }).format(date);
        return `Updated: ${relativeLabel} • ${preciseTime}`;
      }
      return `Updated: ${date.toLocaleDateString("en-CA")}`;
    }

    function getRecommendedToolActions() {
      const bootstrapTitle = (getBootstrapLogicsTitle() || "").toLowerCase();
      if (getCanBootstrapLogics()) {
        return ["bootstrap-logics", "check-environment", "change-project-root"];
      }
      if (bootstrapTitle.includes("repaired")) {
        return ["check-environment", "update-logics-kit", "change-project-root"];
      }
      return ["new-request-guided", "assist-next-step", "assist-triage"];
    }

    function renderToolsPanelStructure() {
      if (!toolsPanel) {
        return;
      }

      const assigned = new Set();
      const recommendedBody = toolSectionBodies.get("recommended");
      if (recommendedBody) {
        recommendedBody.replaceChildren();
        getRecommendedToolActions().forEach((action) => {
          const button = toolButtons.get(action);
          if (!button) {
            return;
          }
          recommendedBody.appendChild(button);
          assigned.add(action);
        });
      }

      Object.entries(toolSectionLayout).forEach(([sectionName, actions]) => {
        const body = toolSectionBodies.get(sectionName);
        if (!body) {
          return;
        }
        body.replaceChildren();
        actions.forEach((action) => {
          if (assigned.has(action)) {
            return;
          }
          const button = toolButtons.get(action);
          if (!button) {
            return;
          }
          body.appendChild(button);
        });
      });

      toolSections.forEach((section, sectionName) => {
        const body = toolSectionBodies.get(sectionName);
        section.hidden = !body || body.childElementCount === 0;
      });
    }

    return {
      formatActivityUpdated,
      renderToolsPanelStructure
    };
  };
})();
