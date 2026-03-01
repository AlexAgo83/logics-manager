(() => {
  const nowIso = new Date().toISOString();
  const scenarios = {
    empty: {
      items: [],
      root: "/workspace/mock"
    },
    error: {
      error: "Simulated debug error: no logics/ folder found in /workspace/mock."
    },
    populated: {
      root: "/workspace/mock",
      selectedId: "item_008_web_debug_harness",
      items: [
        {
          id: "req_007_references_compatibility",
          title: "Logics References Compatibility",
          stage: "request",
          path: "/workspace/mock/logics/request/req_007_references_compatibility.md",
          relPath: "logics/request/req_007_references_compatibility.md",
          filename: "req_007_references_compatibility.md",
          updatedAt: nowIso,
          indicators: {
            Status: "Draft",
            Understanding: "95%",
            Confidence: "90%"
          },
          isPromoted: true,
          references: [
            {
              kind: "backlog",
              label: "Backlog",
              path: "logics/backlog/item_007_references_compatibility.md"
            }
          ],
          usedBy: [
            {
              id: "item_007_references_compatibility",
              title: "References Compatibility Item",
              stage: "backlog",
              relPath: "logics/backlog/item_007_references_compatibility.md"
            }
          ]
        },
        {
          id: "item_008_web_debug_harness",
          title: "Web Debug Harness",
          stage: "backlog",
          path: "/workspace/mock/logics/backlog/item_008_web_debug_harness.md",
          relPath: "logics/backlog/item_008_web_debug_harness.md",
          filename: "item_008_web_debug_harness.md",
          updatedAt: nowIso,
          indicators: {
            Status: "Ready",
            Progress: "25%",
            Complexity: "Medium"
          },
          isPromoted: false,
          references: [
            {
              kind: "from",
              label: "Derived from",
              path: "logics/request/req_008_web_debug_harness.md"
            }
          ],
          usedBy: []
        },
        {
          id: "task_012_ci_tests",
          title: "Orchestration for tests and CI",
          stage: "task",
          path: "/workspace/mock/logics/tasks/task_012_ci_tests.md",
          relPath: "logics/tasks/task_012_ci_tests.md",
          filename: "task_012_ci_tests.md",
          updatedAt: nowIso,
          indicators: {
            Status: "In progress",
            Progress: "60%"
          },
          isPromoted: false,
          references: [
            {
              kind: "from",
              label: "Derived from",
              path: "logics/backlog/item_009_add_automated_tests_and_github_ci_workflow_script.md"
            },
            {
              kind: "manual",
              label: "Reference",
              path: "src/logicsIndexer.ts"
            }
          ],
          usedBy: []
        },
        {
          id: "spec_001_reference_contract",
          title: "Reference Contract Spec",
          stage: "spec",
          path: "/workspace/mock/logics/specs/spec_001_reference_contract.md",
          relPath: "logics/specs/spec_001_reference_contract.md",
          filename: "spec_001_reference_contract.md",
          updatedAt: nowIso,
          indicators: {
            Status: "Draft"
          },
          isPromoted: false,
          references: [],
          usedBy: []
        }
      ]
    }
  };

  const params = new URLSearchParams(window.location.search);
  let scenarioName = params.get("scenario") || "populated";
  if (!Object.prototype.hasOwnProperty.call(scenarios, scenarioName)) {
    scenarioName = "populated";
  }

  let persistedState = {};

  function postData(payload) {
    window.postMessage({ type: "data", payload }, "*");
  }

  function publishScenario() {
    postData(scenarios[scenarioName]);
    const badge = document.getElementById("debug-scenario-name");
    if (badge) {
      badge.textContent = scenarioName;
    }
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "9999";
    panel.style.background = "var(--vscode-editor-background, #1e1e1e)";
    panel.style.border = "1px solid var(--vscode-editorWidget-border, #555)";
    panel.style.padding = "8px 10px";
    panel.style.borderRadius = "8px";
    panel.style.display = "flex";
    panel.style.gap = "8px";
    panel.style.alignItems = "center";
    panel.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace";
    panel.style.fontSize = "12px";

    const label = document.createElement("span");
    label.textContent = "Debug scenario:";
    panel.appendChild(label);

    const select = document.createElement("select");
    select.style.background = "transparent";
    select.style.color = "inherit";
    select.style.border = "1px solid currentColor";
    select.style.borderRadius = "4px";
    select.style.padding = "2px 4px";
    for (const name of Object.keys(scenarios)) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      if (name === scenarioName) {
        option.selected = true;
      }
      select.appendChild(option);
    }
    select.addEventListener("change", () => {
      scenarioName = select.value;
      publishScenario();
    });
    panel.appendChild(select);

    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.textContent = "Replay";
    refresh.style.border = "1px solid currentColor";
    refresh.style.borderRadius = "4px";
    refresh.style.background = "transparent";
    refresh.style.color = "inherit";
    refresh.style.padding = "2px 6px";
    refresh.addEventListener("click", publishScenario);
    panel.appendChild(refresh);

    const current = document.createElement("span");
    current.id = "debug-scenario-name";
    current.textContent = scenarioName;
    panel.appendChild(current);

    document.body.appendChild(panel);
  }

  const vscodeApi = {
    postMessage(message) {
      if (!message || typeof message.type !== "string") {
        return;
      }
      if (message.type === "ready" || message.type === "refresh") {
        publishScenario();
        return;
      }
      // In harness mode, commands are logged only.
      console.info("[webview-harness] outbound message", message);
    },
    getState() {
      return persistedState;
    },
    setState(nextState) {
      persistedState = nextState || {};
    }
  };

  window.acquireVsCodeApi = () => vscodeApi;
  window.addEventListener("DOMContentLoaded", createPanel);
})();

