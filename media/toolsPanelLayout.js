(() => {
  window.createCdxLogicsToolsPanelLayoutApi = function createCdxLogicsToolsPanelLayoutApi(options) {
    const { toolsPanel, getCanBootstrapLogics, getBootstrapLogicsTitle, getShouldRecommendCheckEnvironment } = options;
    let activeToolsView = "workflow";
    const toolButtons = toolsPanel
      ? new Map(
          Array.from(toolsPanel.querySelectorAll(".tools-panel__item")).map((button) => [button.dataset.action, button])
        )
      : new Map();
    const toolViewToggles = toolsPanel
      ? new Map(
          Array.from(toolsPanel.querySelectorAll("[data-tools-view-toggle]")).map((button) => [
            button.getAttribute("data-tools-view-toggle"),
            button
          ])
        )
      : new Map();
    const toolViews = toolsPanel
      ? new Map(
          Array.from(toolsPanel.querySelectorAll("[data-tools-view]")).map((view) => [
            view.getAttribute("data-tools-view"),
            view
          ])
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
      workflow: ["open-onboarding", "select-agent", "new-request-guided", "create-companion-doc", "bootstrap-logics", "refresh"],
      assist: [
        "assist-next-step",
        "assist-triage",
        "assist-commit-all",
        "assist-diff-risk",
        "assist-summarize-changelog",
        "assist-prepare-release",
        "assist-publish-release",
        "assist-summarize-validation",
        "assist-validation-checklist",
        "assist-doc-consistency"
      ],
      runtime: ["launch-codex-overlay", "launch-claude", "check-environment", "check-hybrid-runtime", "open-hybrid-insights"],
      kit: ["update-logics-kit", "repair-logics-kit"],
      workspace: ["change-project-root", "reset-project-root", "refresh"],
      maintenance: ["fix-docs", "about"]
    };

    function getOrderedViewNames() {
      return Array.from(toolViewToggles.keys());
    }

    function focusViewToggle(viewName) {
      const button = toolViewToggles.get(viewName);
      if (button && typeof button.focus === "function") {
        button.focus();
      }
    }

    function applyActiveToolsView() {
      toolViewToggles.forEach((button, viewName) => {
        const isActive = viewName === activeToolsView;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
        button.tabIndex = isActive ? 0 : -1;
      });
      toolViews.forEach((view, viewName) => {
        view.hidden = viewName !== activeToolsView;
      });
    }

    function setActiveToolsView(viewName, shouldFocus) {
      if (!toolViews.has(viewName) || !toolViewToggles.has(viewName)) {
        return;
      }
      activeToolsView = viewName;
      applyActiveToolsView();
      if (shouldFocus) {
        focusViewToggle(viewName);
      }
    }

    function getAdjacentViewName(direction) {
      const viewNames = getOrderedViewNames();
      const currentIndex = viewNames.indexOf(activeToolsView);
      if (currentIndex < 0 || viewNames.length === 0) {
        return null;
      }
      return viewNames[(currentIndex + direction + viewNames.length) % viewNames.length] || null;
    }

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
      if (getShouldRecommendCheckEnvironment()) {
        return ["check-environment", "change-project-root"];
      }
      return ["new-request-guided", "assist-next-step", "assist-triage"];
    }

    function renderToolsPanelStructure() {
      if (!toolsPanel) {
        return;
      }

      applyActiveToolsView();

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

    toolViewToggles.forEach((button, viewName) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setActiveToolsView(viewName, false);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          const nextView = getAdjacentViewName(1);
          if (nextView) {
            setActiveToolsView(nextView, true);
          }
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const previousView = getAdjacentViewName(-1);
          if (previousView) {
            setActiveToolsView(previousView, true);
          }
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          const firstView = getOrderedViewNames()[0];
          if (firstView) {
            setActiveToolsView(firstView, true);
          }
          return;
        }
        if (event.key === "End") {
          event.preventDefault();
          const viewNames = getOrderedViewNames();
          const lastView = viewNames[viewNames.length - 1];
          if (lastView) {
            setActiveToolsView(lastView, true);
          }
        }
      });
    });

    return {
      formatActivityUpdated,
      renderToolsPanelStructure
    };
  };
})();
