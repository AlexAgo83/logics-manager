(() => {
  window.createCdxLogicsHarnessApi = function createCdxLogicsHarnessApi(options) {
    const {
      isHarnessMode,
      harnessBridge,
      markdownApi,
      escapeHtml,
      showStatus,
      projectGithubUrl
    } = options;

    let currentRoot = null;
    let harnessRootHandle = null;
    let canResetProjectRoot = false;

    function encodePathForUrl(relativePath) {
      return relativePath
        .split("/")
        .filter((part) => part.length > 0)
        .map((part) => encodeURIComponent(part))
        .join("/");
    }

    function getItemRelativePath(item) {
      if (!item) {
        return "";
      }
      if (typeof item.relPath === "string" && item.relPath.trim()) {
        return item.relPath.trim().replace(/\\/g, "/").replace(/^\.?\//, "");
      }
      if (typeof item.path === "string" && item.path.trim()) {
        const normalizedPath = item.path.replace(/\\/g, "/");
        if (currentRoot && normalizedPath.startsWith(currentRoot)) {
          const relative = normalizedPath.slice(currentRoot.length).replace(/^\/+/, "");
          if (relative) {
            return relative;
          }
        }
        if (!normalizedPath.startsWith("/") && !normalizedPath.includes(":")) {
          return normalizedPath.replace(/^\.?\//, "");
        }
      }
      return "";
    }

    function buildHarnessDocUrl(item) {
      const relativePath = getItemRelativePath(item);
      if (!relativePath) {
        return "";
      }
      return `/${encodePathForUrl(relativePath)}`;
    }

    async function readHarnessFileFromHandle(relativePath) {
      if (!harnessRootHandle || typeof harnessRootHandle.getDirectoryHandle !== "function") {
        return null;
      }
      const segments = relativePath
        .split("/")
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && part !== ".");
      if (!segments.length || segments.includes("..")) {
        return null;
      }
      const filename = segments[segments.length - 1];
      if (!filename) {
        return null;
      }

      let directoryHandle = harnessRootHandle;
      for (const segment of segments.slice(0, -1)) {
        directoryHandle = await directoryHandle.getDirectoryHandle(segment, { create: false });
      }
      const fileHandle = await directoryHandle.getFileHandle(filename, { create: false });
      const file = await fileHandle.getFile();
      return file.text();
    }

    function openHarnessContentTab(item, mode, sourceLabel, content) {
      const popup = window.open("", "_blank", "noopener,noreferrer");
      if (!popup) {
        showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
        return false;
      }
      const editMode = mode === "edit";
      const body = editMode
        ? `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${escapeHtml(
            item && item.title ? item.title : "Logics item"
          )}</title><style>body{font-family:system-ui,sans-serif;margin:20px;line-height:1.45;}code{background:#f4f4f4;padding:2px 4px;border-radius:4px;}</style></head><body><h1>${escapeHtml(
            item && item.title ? item.title : "Logics item"
          )}</h1><p>Source: <code>${escapeHtml(sourceLabel || "unknown")}</code></p><textarea style="width:100%;height:70vh;font:13px ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(
            content || ""
          )}</textarea><p style="font-size:12px;opacity:0.8;">Harness edit mode is preview-only (saving is disabled).</p></body></html>`
        : markdownApi.buildReadPreviewDocument(item, sourceLabel, content);
      popup.document.open();
      popup.document.write(body);
      popup.document.close();
      return true;
    }

    async function resolveHarnessItemContent(item) {
      const relativePath = getItemRelativePath(item);
      if (!relativePath) {
        return { relativePath: "", content: "", source: "", error: "missing-path" };
      }

      if (harnessRootHandle) {
        try {
          const content = await readHarnessFileFromHandle(relativePath);
          if (typeof content === "string") {
            return { relativePath, content, source: `filesystem:${currentRoot || "selected-root"}`, error: "" };
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          showStatus(`Could not read from selected root (${reason}). Falling back to server path.`, "warn");
        }
      }

      const target = `/${encodePathForUrl(relativePath)}`;
      try {
        const response = await fetch(target);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const content = await response.text();
        return { relativePath, content, source: target, error: "" };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return { relativePath, content: "", source: target, error: reason };
      }
    }

    function openHarnessInfoTab(item, heading, message) {
      const popup = window.open("", "_blank", "noopener,noreferrer");
      if (!popup) {
        showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
        return;
      }
      const safeTitle = escapeHtml(item && item.title ? item.title : "Logics item");
      const safeHeading = escapeHtml(heading);
      const safeMessage = escapeHtml(message);
      popup.document.open();
      popup.document.write(`<!doctype html><html lang="en"><head><meta charset="UTF-8" /><title>${safeTitle}</title><style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.5;}code{background:#f4f4f4;padding:2px 4px;border-radius:4px;}</style></head><body><h1>${safeHeading}</h1><p>${safeMessage}</p></body></html>`);
      popup.document.close();
    }

    async function openHarnessEditTab(item) {
      const target = buildHarnessDocUrl(item);
      if (!target) {
        openHarnessInfoTab(item, "Edit view unavailable", "No file path is available for this mocked item in harness mode.");
        showStatus("No file path available for this item in harness mode.", "warn");
        return;
      }

      const resolved = await resolveHarnessItemContent(item);
      if (!resolved.error) {
        const opened = openHarnessContentTab(item, "edit", resolved.source, resolved.content);
        if (opened) {
          showStatus(`Opened edit tab for ${resolved.relativePath} (${resolved.source}).`, "info");
        }
        return;
      }

      const opened = window.open(target, "_blank", "noopener,noreferrer");
      if (!opened) {
        showStatus("Popup blocked by the browser. Enable popups to open files from harness mode.", "warn");
        return;
      }
      showStatus(`Opened ${target} in a new tab.`, "info");
    }

    async function openHarnessReadTab(item) {
      const target = buildHarnessDocUrl(item);
      if (!target) {
        openHarnessInfoTab(item, "Read view unavailable", "No file path is available for this mocked item in harness mode.");
        showStatus("No file path available for this item in harness mode.", "warn");
        return;
      }

      const resolved = await resolveHarnessItemContent(item);
      if (!resolved.error) {
        const opened = openHarnessContentTab(item, "read", resolved.source, resolved.content);
        if (opened) {
          showStatus(`Opened read preview for ${resolved.relativePath} (${resolved.source}).`, "info");
        }
        return;
      }

      const opened = window.open(target, "_blank", "noopener,noreferrer");
      if (!opened) {
        showStatus("Popup blocked by the browser. Enable popups for harness preview.", "warn");
        return;
      }
      const reason = resolved.error || "preview unavailable";
      showStatus(`Preview unavailable (${reason}). Opened raw file instead.`, "warn");
    }

    function openHarnessItem(item, mode) {
      if (mode === "read") {
        void openHarnessReadTab(item);
      } else {
        void openHarnessEditTab(item);
      }
    }

    function pickDirectoryFromInput() {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        let settled = false;
        const finalize = (value) => {
          if (settled) {
            return;
          }
          settled = true;
          window.removeEventListener("focus", onWindowFocus, true);
          input.remove();
          resolve(value);
        };
        const onWindowFocus = () => {
          window.setTimeout(() => {
            if (settled) {
              return;
            }
            const files = input.files;
            if (!files || files.length === 0) {
              finalize(null);
            }
          }, 0);
        };

        input.type = "file";
        input.multiple = true;
        input.webkitdirectory = true;
        input.style.display = "none";
        input.addEventListener("change", () => {
          const files = input.files;
          if (!files || files.length === 0) {
            finalize(null);
            return;
          }
          const first = files[0];
          const relative = typeof first.webkitRelativePath === "string" ? first.webkitRelativePath : "";
          const rootName = relative.split("/")[0] || first.name;
          finalize(rootName || null);
        });
        document.body.appendChild(input);
        window.addEventListener("focus", onWindowFocus, true);
        input.click();
      });
    }

    function applyHarnessRoot(rootLabel, nextHandle = null) {
      currentRoot = rootLabel || null;
      harnessRootHandle = nextHandle || null;
      canResetProjectRoot = Boolean(rootLabel);
      if (harnessBridge && typeof harnessBridge.setProjectRootLabel === "function") {
        harnessBridge.setProjectRootLabel(rootLabel || null);
      }
    }

    async function handleHarnessChangeProjectRoot() {
      try {
        if (typeof window.showDirectoryPicker === "function") {
          const directoryHandle = await window.showDirectoryPicker({ mode: "read" });
          const label = directoryHandle && directoryHandle.name ? directoryHandle.name : "selected-folder";
          applyHarnessRoot(label, directoryHandle);
          showStatus(`Harness project root set to "${label}".`, "info");
          return;
        }
      } catch (error) {
        if (!(error && error.name === "AbortError")) {
          const reason = error instanceof Error ? error.message : String(error);
          showStatus(`Directory picker unavailable (${reason}). Trying fallback.`, "warn");
        } else {
          showStatus("Project root selection canceled.", "warn");
          return;
        }
      }

      const fallbackRoot = await pickDirectoryFromInput();
      if (fallbackRoot) {
        applyHarnessRoot(fallbackRoot, null);
        showStatus(`Harness project root set to "${fallbackRoot}" (directory selection fallback).`, "info");
        return;
      }

      const manual = window.prompt(
        "Directory picker unavailable. Enter a root hint/path for harness mode:",
        currentRoot || ""
      );
      if (manual && manual.trim()) {
        applyHarnessRoot(manual.trim(), null);
        showStatus(`Harness project root set to "${manual.trim()}".`, "info");
        return;
      }
      showStatus("Project root selection canceled.", "warn");
    }

    return {
      isHarnessMode,
      getCurrentRoot() {
        return currentRoot;
      },
      setCurrentRoot(value) {
        currentRoot = value || null;
      },
      canResetProjectRoot() {
        return canResetProjectRoot;
      },
      setCanResetProjectRoot(value) {
        canResetProjectRoot = Boolean(value);
      },
      applyHarnessRoot,
      handleHarnessChangeProjectRoot,
      openHarnessItem,
      about() {
        const opened = window.open(projectGithubUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          showStatus("Popup blocked by the browser. Enable popups to open project page.", "warn");
        }
      }
    };
  };
})();
