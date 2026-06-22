      }
      focusApplied = true;
      return payload;
    }
    const nextPayload = { ...payload, selectedId: item.id };
    if (focusApplied) {
      persistSelectedItem(item.id);
      return nextPayload;
    }
    viewerFilterState = { ...viewerFilterState, focus: "all", type: "all", status: "any", relation: "any", activity: "any" };
    persistSelectedItem(item.id);
    focusApplied = true;
    window.setTimeout(() => {
      revealFocusedCard(item);
      if (request.read) {
        showDocument(item).catch((error) => setMeta(error.message));
      } else {
        setMeta(`Focused ${item.relPath || item.id}.`);
      }
    }, 0);
    return nextPayload;
  }

  function selectedItem() {
    const selectedCard = document.querySelector(".card--selected[data-id]");
    const selectedCardId = selectedCard instanceof HTMLElement ? selectedCard.dataset.id : "";
    if (selectedCardId) {
      return latestItems.find((entry) => entry.id === selectedCardId) || null;
    }
    try {
      const state = readStoredState();
      const selectedId = typeof state?.selectedId === "string" ? state.selectedId : "";
      return latestItems.find((entry) => entry.id === selectedId) || null;
    } catch {
      return null;
    }
  }

  // Map a setDocument title to the short subtitle shown in the document
  // header. Replaces the old static "Read-only preview" label; the goal
  // is one line describing what the user is currently looking at.
  function describeDocumentScreen(titleText) {
    const title = String(titleText || "").trim();
    if (!title) return "";
    const exact = {
      "Getting Started": "Logics workflow guide",
      "Remote": "Git status, CI runs, and release gates",
      "Workshop": "Terminals, commands, and file explorer",
      "Validation health": "Lint and audit summary",
      "Corpus insights": "Workflow corpus dashboard",
      "CDX status": "Configured agents and runtime checks",
      "CDX missions": "Guided missions and plans",
      "CDX reports": "Recent CDX session reports",
      "CDX run report": "Run summary and logs",
      "CDX log": "Streaming log output",
    };
    if (exact[title]) return exact[title];
    if (title.startsWith("CDX log")) return "Streaming log output";
    if (title.startsWith("logics/request/")) return "Logics request";
    if (title.startsWith("logics/task/")) return "Logics task";
    if (title.startsWith("logics/backlog")) return "Logics backlog";
    if (title.endsWith(".md")) return "Logics document";
    return "";
  }

  const onboardingStages = [
    {
      label: "Need",
      tagline: "Capture what matters",
      description: "Start by writing down what you need: a goal, a problem, or an idea. Logics keeps this as a request so you can refine it and track where it goes.",
      prompts: [
        "Draft a new request for this problem: <describe the need or pain point>.",
        "Ask me any clarifying questions and suggest options that would make the request stronger."
      ],
      mapping: "Maps to a Logics request document in logics/request/.",
      actions: [{ label: "New Request", action: "new-request" }]
    },
    {
      label: "Framing",
      tagline: "Understand before you act",
      description: "Shape the need into something actionable. Add context, scope, and acceptance criteria so a human or assistant can pick it up without re-explaining the whole problem.",
      prompts: [
        "Split the new request into backlog items and separate delivery slices.",
        "Ask me any questions that would improve confidence or understanding before finalizing the backlog."
      ],
      mapping: "Maps to a Logics backlog document in logics/backlog/.",
      actions: [{ label: "Triage Item", action: "assist-triage" }]
    },
    {
      label: "Orchestration Tasks",
      tagline: "Create the task plan before execution",
      description: "Turn backlog work into explicit tasks. Preserve dependencies and keep the delivery sequence visible so execution stays focused.",
      prompts: [
        "Create orchestration tasks from this backlog item and split the work into the smallest useful delivery slices.",
        "List the tasks needed to execute this backlog item in order, with brief context for each one."
      ],
      mapping: "Maps to orchestration task planning in logics/tasks/.",
      actions: []
    },
    {
      label: "Execution",
      tagline: "Deliver with context",
      description: "Use the task document to carry the full history of decisions while work is delivered, validated, and closed out.",
      prompts: [
        "Execute task <task id or title>. Commit after each wave and keep going until the work is done.",
        "If needed, make brief assumptions and keep moving."
      ],
      mapping: "Maps to a Logics task document in logics/tasks/.",
      actions: [{ label: "CDX Missions", action: "cdx-missions" }]
    }
  ];

  const onboardingDocGuide = [
    ["If you think \"here is the problem and context...\"", "-> request"],
    ["If you think \"this needs a scoped delivery slice...\"", "-> item"],
    ["If you think \"we want...\"", "-> product brief"],
    ["If you think \"we decided...\"", "-> ADR"],
    ["If you think \"the system should...\"", "-> spec"],
    ["If you think \"let's do...\"", "-> task"]
  ];

  function renderViewerOnboarding() {
    const stages = onboardingStages.map((stage, index) => {
      const prompts = stage.prompts.map((prompt) => `
        <div class="viewer-onboarding__prompt">
          <div class="viewer-onboarding__prompt-label">Example prompt</div>
          <div class="viewer-onboarding__prompt-text">${escapeHtml(prompt)}</div>
        </div>
      `).join("");
      const actions = stage.actions.map((action) => `
        <button class="btn viewer-onboarding__action" type="button" data-viewer-onboarding-action="${escapeHtml(action.action)}">${escapeHtml(action.label)}</button>
      `).join("");
      return `
        <section class="viewer-onboarding__stage">
          <div class="viewer-onboarding__stage-number" aria-hidden="true">${index + 1}</div>
          <div class="viewer-onboarding__stage-body">
            <h2>${escapeHtml(stage.label)}</h2>
            <p class="viewer-onboarding__tagline">${escapeHtml(stage.tagline)}</p>
            <p>${escapeHtml(stage.description)}</p>
            <div class="viewer-onboarding__prompts">${prompts}</div>
            <p class="viewer-onboarding__mapping">${escapeHtml(stage.mapping)}</p>
            ${actions ? `<div class="viewer-onboarding__actions">${actions}</div>` : ""}
          </div>
        </section>
      `;
    }).join("");
    const docs = onboardingDocGuide.map(([cue, destination]) => `
      <div class="viewer-onboarding__doc-card">
        <div>${escapeHtml(cue)}</div>
        <strong>${escapeHtml(destination)}</strong>
      </div>
    `).join("");
    return `
      <div class="viewer-onboarding">
        <header class="viewer-onboarding__header">
          <h1>Logics in four steps</h1>
          <p>Logics is a lightweight delivery workflow that keeps project context in plain Markdown: readable by humans, diffable in git, and usable by AI assistants without re-explaining history every time.</p>
        </header>
        <div class="viewer-onboarding__stages">${stages}</div>
        <section class="viewer-onboarding__doc-guide">
          <h2>What each document is for</h2>
          <p>A quick rule of thumb for choosing the right artifact before writing.</p>
          <div class="viewer-onboarding__doc-grid">${docs}</div>
        </section>
        <footer class="viewer-onboarding__footer">
          <button class="btn primary" type="button" data-viewer-onboarding-action="open-logics-insights">Open Insights</button>
          <button class="btn" type="button" data-viewer-onboarding-action="health">Open Health</button>
          <button class="btn" type="button" data-viewer-onboarding-action="workshop-explorer">Open Explorer</button>
        </footer>
      </div>
    `;
  }

  function showGettingStarted() {
    setDocument("Getting Started", renderViewerOnboarding());
    setMeta("Getting Started opened.");
  }

  async function createNewRequest(draft) {
    const response = await fetch("/api/new-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: draft || {} })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Unable to create request.");
    }
    postToApp(data.payload, { force: true });
    if (data.created?.id) {
      selectItem(data.created.id);
    }
    setMeta(`Created ${data.created?.path || "request"}.`);
  }

  async function startNewRequest() {
    const modals = window.logicsViewerModals;
    const draft = modals && typeof modals.requestDraft === "function" ? await modals.requestDraft() : null;
    if (!draft) {
      return;
    }
    await createNewRequest(draft);
  }

  function runOnboardingAction(action) {
    const key = String(action || "");
    if (key === "open-logics-insights") {
      withPrimaryAction("insights", "Loading insights", showCorpusInsights);
      return;
    }
    if (key === "health") {
      withPrimaryAction("health", "Checking health", showHealth);
      return;
    }
    if (key === "workshop-explorer") {
      withPrimaryAction("workshop-explorer", "Opening Explorer", () => showWorkshop({ tab: "explorer" }));
      return;
    }
    if (key === "cdx-missions") {
      withPrimaryAction("cdx-missions", "Loading CDX missions", showCdxMissions);
      return;
    }
    if (key === "new-request") {
      startNewRequest().catch((error) => setMeta(error.message));
      return;
    }
    if (key === "assist-triage") {
      setMeta("Triage assistance is available from the VS Code extension tools.");
      return;
    }
    setMeta("This onboarding action is not available in the local viewer.");
  }

  function updateScreenActions(titleText) {
    const isGit = titleText === "Remote" && latestCiScreenMode === "git";
    const isRelease = titleText === "Remote" && latestCiScreenMode === "release";
    const pull = document.getElementById("viewer-git-pull");
    const commit = document.getElementById("viewer-git-commit");
    const push = document.getElementById("viewer-git-push");
    const releaseReset = document.getElementById("viewer-release-reset");
    const status = documentStatusButton();
    if (pull) pull.hidden = !isGit;
    if (commit) commit.hidden = !isGit;
    if (push) push.hidden = !isGit;
    if (releaseReset) releaseReset.hidden = !isRelease;
    if (status instanceof HTMLButtonElement) {
      const options = statusOptionsByStage[currentDocumentItem?.stage] || [];
      const currentStatus = String(currentDocumentItem?.indicators?.Status || currentDocumentItem?.status || "").trim();
      status.hidden = !(currentDocumentItem && currentDocumentItem.relPath && options.length);
      status.disabled = status.hidden;
      status.title = currentStatus ? `Change status from ${currentStatus}` : "Change status";
    }
  }

  // Open a new view transition. `silent` transitions (auto-refresh) are
  // subordinate: they never abort an operator's in-flight fetch and never
  // commit once the operator has navigated elsewhere. Operator transitions
  // abort the previous operator fetch so the latest navigation always wins.
  function beginView(options = {}) {
    const silent = Boolean(options.silent);
    const seq = ++viewSeq;
    let userSeq = userViewSeq;
    let signal;
    if (!silent) {
      userSeq = ++userViewSeq;
      if (activeUserViewController) {
        activeUserViewController.abort();
      }
      activeUserViewController = new AbortController();
      signal = activeUserViewController.signal;
    }
    return { seq, userSeq, silent, signal };
  }

  function invalidatePendingViews() {
    viewSeq += 1;
    userViewSeq += 1;
  }

  // True when a newer transition has superseded `view` and it must not commit.
  function isViewStale(view) {
    if (!view) {
      return false; // untracked callers always commit
    }
    if (view.silent) {
      // Subordinate: yield to any later transition, and to any operator nav.
      return view.userSeq !== userViewSeq || view.seq !== viewSeq;
    }
    // Operator transition: superseded only by a later operator transition.
    // A silent auto-refresh must never suppress the operator's own commit.
    return view.userSeq !== userViewSeq;
  }

  function isAbortError(error) {
    return Boolean(error) && (error.name === "AbortError" || error.code === 20);
  }

  // Find the nearest scrollable ancestor so we can preserve scroll position
  // across an in-place re-render. Falls back to the page scrolling element.
  function scrollableAncestor(el) {
    let node = el;
    while (node && node !== document.body && node.parentElement) {
      const overflowY = (window.getComputedStyle(node).overflowY || "");
      if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return document.scrollingElement || document.documentElement || el;
  }

  // Capture scroll position, open <details> (keyed by summary text), and the
  // focused element (keyed by id / data-viewer-focus-key) so an auto-refresh
  // repaint of the same screen does not jump the user back to the top or
  // collapse what they had open. Mirrors the state-preservation the Git screen
  // already does, generalized to every screen.
  function captureDocumentViewState(content) {
    const scroller = scrollableAncestor(content);
    const openDetails = Array.from(content.querySelectorAll("details[open]"))
      .map((node) => (node.querySelector("summary")?.textContent || "").trim())
      .filter(Boolean);
    const active = document.activeElement;
    let focusKey = null;
    if (active && content.contains(active) && active !== content) {
      if (active.id) {
        focusKey = `#${(window.CSS && CSS.escape) ? CSS.escape(active.id) : active.id}`;
      } else {
        const key = active.getAttribute("data-viewer-focus-key");
        if (key) focusKey = `[data-viewer-focus-key="${key}"]`;
      }
    }
    return { scroller, scrollTop: scroller ? scroller.scrollTop : 0, openDetails, focusKey };
  }

  function restoreDocumentViewState(content, state) {
    if (!state) return;
    if (state.openDetails.length) {
      const wanted = new Set(state.openDetails);
      content.querySelectorAll("details").forEach((node) => {
        const summary = (node.querySelector("summary")?.textContent || "").trim();
        if (summary && wanted.has(summary)) node.open = true;
      });
    }
    if (state.focusKey) {
      const target = content.querySelector(state.focusKey);
      if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
    }
    if (state.scroller) state.scroller.scrollTop = state.scrollTop;
  }

  function setDocumentChromeOpen(open) {
    document.body?.classList.toggle("viewer-screen-document", Boolean(open));
  }

  function updateDocumentHeaderNav(content) {
    const nav = document.getElementById("viewer-document-nav");
    if (!(nav instanceof HTMLElement)) {
      return;
    }
    nav.replaceChildren();
    const tablist = content?.querySelector(".viewer-workshop__tabs, .viewer-cdx__modes");
    if (!(tablist instanceof HTMLElement)) {
      nav.hidden = true;
      return;
    }
    tablist.closest(".viewer-workshop, .viewer-cdx")?.classList.add("viewer-screen-tabs-external");
    nav.appendChild(tablist);
    nav.hidden = false;
  }

  function setDocument(titleText, html, options = {}) {
    invalidatePendingViews();
    cdxCloseTarget = null;
    currentDocumentItem = options.item || null;
    const panel = documentPanel();
    const title = documentTitle();
    const content = documentContent();
    const eyebrow = document.getElementById("viewer-document-eyebrow");
    // A same-screen repaint (e.g. an auto-refresh tick re-rendering the screen
    // already shown) should preserve the user's scroll / open sections / focus
    // instead of resetting to the top. Navigations to a different screen, or an
    // explicit options.forceReset, render fresh.
    const previousTitle = title ? title.textContent : "";
    const sameScreenRepaint = Boolean(content)
      && content.childNodes.length > 0
      && !options.forceReset
      && previousTitle === (titleText || "Document");
    const preserved = sameScreenRepaint ? captureDocumentViewState(content) : null;
    if (title) {
      title.textContent = titleText || "Document";
    }
    if (eyebrow instanceof HTMLElement) {
      const description = describeDocumentScreen(titleText);
      eyebrow.textContent = description;
      eyebrow.hidden = !description;
    }
    updateScreenActions(titleText);
    if (content) {
      content.innerHTML = html || "";
      updateDocumentHeaderNav(content);
    }
    if (panel) {
      panel.hidden = false;
      setDocumentChromeOpen(true);
      if (!sameScreenRepaint && typeof panel.scrollIntoView === "function") {
        panel.scrollIntoView({ block: "nearest" });
      }
    }
    renderMermaidDiagrams();
    if (preserved) restoreDocumentViewState(content, preserved);
  }

  function currentDocumentSnapshot(fallbackTitle = "Document") {
    const title = documentTitle();
    const content = documentContent();
    return {
      title: title?.textContent || fallbackTitle,
      html: content?.innerHTML || ""
    };
  }

  async function closeDocumentPanel() {
    const target = cdxCloseTarget;
    cdxCloseTarget = null;
    if (target?.type === "cdx-report") {
      setDocument(target.title || "CDX run report", target.html || "");
      cdxCloseTarget = { type: "cdx-runs" };
      setMeta("Returned to CDX run report.");
      return;
    }
    if (target?.type === "cdx-runs") {
      await showCdxRuns({ silent: true });
      setMeta("Returned to CDX reports.");
      return;
    }
    const panel = documentPanel();
    if (panel) {
      invalidatePendingViews();
      panel.hidden = true;
      setDocumentChromeOpen(false);
    }
    updateScreenActions("");
  }

  function showMermaidFallback(message) {
    document.querySelectorAll(".markdown-preview__mermaid-fallback").forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }
      node.hidden = false;
