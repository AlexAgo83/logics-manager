(() => {
  window.createCdxLogicsHostApi = function createCdxLogicsHostApi(options) {
    const {
      vscode,
      debugLog,
      showStatus,
      isHarnessMode,
      handleHarnessChangeProjectRoot,
      applyHarnessRoot,
      openHarnessItem,
      harnessBridge,
      setCanResetProjectRoot,
      projectGithubUrl
    } = options;

    function post(message) {
      debugLog("host:post", message);
      vscode.postMessage(message);
    }

    function invokeHostOnly(type, payload, label) {
      if (isHarnessMode) {
        showStatus(`${label} requires the VS Code extension host. Action forwarded to harness mock.`, "warn");
      }
      post({ type, ...payload });
    }

    function confirmLifecycleAction(item, action) {
      if (!item) {
        return false;
      }
      const itemLabel = item.title ? `${item.id} (${item.title})` : item.id;
      if (action === "obsolete") {
        return window.confirm(
          `Mark ${itemLabel} as obsolete?\n\nThis is a more cautionary lifecycle change and should only be used when the item should no longer be pursued.`
        );
      }
      return window.confirm(`Mark ${itemLabel} as done?`);
    }

    return {
      post,
      ready() {
        post({ type: "ready" });
      },
      refresh() {
        post({ type: "refresh" });
      },
      createItem(kind) {
        invokeHostOnly("create-item", { kind }, "Create item");
      },
      createCompanionDoc(id, preferredKind) {
        invokeHostOnly("create-companion-doc", { id, preferredKind }, "Create companion doc");
      },
      renameEntry(id) {
        invokeHostOnly("rename-entry", { id }, "Rename entry");
      },
      addReference(id) {
        invokeHostOnly("add-reference", { id }, "Add reference");
      },
      addUsedBy(id) {
        invokeHostOnly("add-used-by", { id }, "Add used-by link");
      },
      fixDocs() {
        invokeHostOnly("fix-docs", {}, "Fix Logics");
      },
      newGuidedRequest() {
        invokeHostOnly("new-request-guided", {}, "New Request");
      },
      bootstrapLogics() {
        invokeHostOnly("bootstrap-logics", {}, "Bootstrap Logics");
      },
      selectAgent() {
        invokeHostOnly("select-agent", {}, "Select Agent");
      },
      promote(id) {
        invokeHostOnly("promote", { id }, "Promote");
      },
      markDone(item) {
        if (!confirmLifecycleAction(item, "done")) {
          return;
        }
        invokeHostOnly("mark-done", { id: item.id }, "Mark as done");
      },
      markObsolete(item) {
        if (!confirmLifecycleAction(item, "obsolete")) {
          return;
        }
        invokeHostOnly("mark-obsolete", { id: item.id }, "Mark as obsolete");
      },
      async changeProjectRoot() {
        if (isHarnessMode) {
          await handleHarnessChangeProjectRoot();
          return;
        }
        post({ type: "change-project-root" });
      },
      resetProjectRoot() {
        if (isHarnessMode) {
          applyHarnessRoot(null);
          if (harnessBridge && typeof harnessBridge.resetProjectRoot === "function") {
            harnessBridge.resetProjectRoot();
          }
          setCanResetProjectRoot(false);
          showStatus("Harness project root reset to default mock workspace.", "info");
          return;
        }
        post({ type: "reset-project-root" });
      },
      about() {
        if (isHarnessMode) {
          const opened = window.open(projectGithubUrl, "_blank", "noopener,noreferrer");
          if (!opened) {
            showStatus("Popup blocked by the browser. Enable popups to open project page.", "warn");
          }
          return;
        }
        post({ type: "about" });
      },
      openItem(item, mode) {
        if (!item) {
          return;
        }
        if (isHarnessMode) {
          if (typeof openHarnessItem === "function") {
            openHarnessItem(item, mode);
          }
          return;
        }
        post({ type: mode, id: item.id });
      }
    };
  };
})();
