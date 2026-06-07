(() => {
  const stateKey = "logics.localViewer.state";
  const meta = () => document.getElementById("viewer-meta");
  const documentPanel = () => document.getElementById("viewer-document");
  const documentTitle = () => document.getElementById("viewer-document-title");
  const documentContent = () => document.getElementById("viewer-document-content");
  let latestItems = [];

  function setMeta(text) {
    const node = meta();
    if (node) {
      node.textContent = text;
    }
  }

  function postToApp(payload) {
    latestItems = Array.isArray(payload.items) ? payload.items : [];
    window.dispatchEvent(new MessageEvent("message", { data: { type: "data", payload } }));
    const rootName = payload.root ? payload.root.split(/[\\/]/).filter(Boolean).pop() : "repository";
    setMeta(`${rootName} · ${payload.items.length} docs · refreshed ${new Date().toLocaleTimeString()}`);
  }

  async function loadItems(method = "GET") {
    setMeta("Refreshing...");
    const response = await fetch(method === "POST" ? "/api/refresh" : "/api/items", { method });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to load viewer data.");
    }
    postToApp(data.payload);
  }

  async function showDocument(item) {
    if (!item || !item.relPath) {
      return;
    }
    const response = await fetch(`/api/doc?path=${encodeURIComponent(item.relPath)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      setMeta(data.error || "Unable to read document.");
      return;
    }
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    if (title) {
      title.textContent = data.document.path;
    }
    if (content) {
      content.textContent = data.document.content;
    }
    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({ block: "nearest" });
    }
  }

  async function showHealth() {
    setMeta("Checking health...");
    const [lintResponse, auditResponse] = await Promise.all([fetch("/api/lint"), fetch("/api/audit")]);
    const [lintData, auditData] = await Promise.all([lintResponse.json(), auditResponse.json()]);
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    if (title) {
      title.textContent = "Validation health";
    }
    if (content) {
      content.textContent = JSON.stringify(
        {
          lint: lintData.payload,
          audit: auditData.payload
        },
        null,
        2
      );
    }
    if (panel) {
      panel.hidden = false;
    }
    setMeta("Health loaded.");
  }

  window.acquireVsCodeApi = function acquireVsCodeApi() {
    return {
      postMessage(message) {
        if (!message || typeof message.type !== "string") {
          return;
        }
        if (message.type === "ready") {
          loadItems().catch((error) => setMeta(error.message));
          return;
        }
        if (message.type === "refresh") {
          loadItems("POST").catch((error) => setMeta(error.message));
          return;
        }
        if (message.type === "open" || message.type === "read") {
          const item = latestItems.find((entry) => entry.id === message.id);
          showDocument(item).catch((error) => setMeta(error.message));
          return;
        }
        setMeta("This action is read-only in the local viewer. Use the CLI for workflow changes.");
      },
      getState() {
        try {
          return JSON.parse(window.localStorage.getItem(stateKey) || "null");
        } catch {
          return null;
        }
      },
      setState(value) {
        window.localStorage.setItem(stateKey, JSON.stringify(value || null));
      }
    };
  };
  window.addEventListener("load", () => {
    document.getElementById("viewer-health")?.addEventListener("click", () => {
      showHealth().catch((error) => setMeta(error.message));
    });
    document.getElementById("viewer-document-close")?.addEventListener("click", () => {
      const panel = documentPanel();
      if (panel) {
        panel.hidden = true;
      }
    });
  });
})();
