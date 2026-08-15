// De-monolith pass 3: immutable data constants from browser-host/index.js.
// Verified read-only (primitives + never-mutated structures). Verbatim.

export const stateKey = "logics.localViewer.state";

export const preferenceKey = "logics.localViewer.preferences.v1";

export const lanTokenKey = "logics.lan.token";

export const deviceTokenKey = "logics.lan.deviceToken";

export const deviceIdKey = "logics.lan.deviceId";

export const deviceLabelKey = "logics.lan.deviceLabel";

export const preferenceVersion = 1;

export const activityStorageLimit = 80;

export const gitHistoryPageSize = 10;

export const minAutoRefreshIntervalSeconds = 5;

export const maxAutoRefreshIntervalSeconds = 60;

export const defaultAutoRefreshIntervalMs = 15 * 1000;

export const defaultFilterState = {
    focus: "all",
    type: "all",
    status: "any",
    relation: "any",
    activity: "any"
  };

export const cdxStatusColumns = [
    { id: "session", label: "SESSION" },
    { id: "provider", label: "PROV." },
    { id: "status", label: "STATUS" },
    { id: "auth", label: "AUTH" },
    { id: "permission", label: "PERM." },
    { id: "ok", label: "OK" },
    { id: "remaining5h", label: "5H" },
    { id: "remainingWeek", label: "WEEK" },
    { id: "banked", label: "BANKED" },
    { id: "block", label: "BLOCK", defaultVisible: false },
    { id: "credits", label: "CR", defaultVisible: false },
    { id: "reset5h", label: "RESET 5H" },
    { id: "resetWeek", label: "RESET WEEK" },
    { id: "updated", label: "UPDATED" }
  ];

export const cdxRunColumns = [
    { id: "run", label: "RUN" },
    { id: "status", label: "STATUS" },
    { id: "kind", label: "KIND", defaultVisible: false },
    { id: "session", label: "SESSION" },
    { id: "tokens", label: "TOKENS" },
    { id: "cwd", label: "CWD", defaultVisible: false },
    { id: "report", label: "REPORT" }
  ];

export const cdxHistoryColumns = [
    { id: "session", label: "SESSION" },
    { id: "status", label: "STATUS" },
    { id: "action", label: "ACTION" },
    { id: "started", label: "STARTED" },
    { id: "duration", label: "DURATION" },
    { id: "tokens", label: "TOKENS" },
    { id: "artifacts", label: "ARTIFACTS" }
  ];

export const statusOptionsByStage = {
    request: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    backlog: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    task: ["Draft", "Ready", "In progress", "Blocked", "Done", "Obsolete", "Archived"],
    product: ["Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    roadmap: ["Draft", "Proposed", "Active", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    architecture: ["Draft", "Proposed", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    spec: ["Draft", "Ready", "In progress", "Done", "Validated", "Settled", "Archived"],
    runbook: ["Draft", "Active", "Archived"]
  };

export const onboardingStages = [
    {
      label: "Workflow Intake",
      tagline: "Capture the reason before the work",
      description: "Start with a request when the need is still a problem, question, or goal. Use product briefs for product framing and roadmaps when the answer needs staged delivery instead of one task.",
      prompts: [
        "Draft a request for this need and ask only the questions required to make it actionable.",
        "Create or update the product brief, then propose a roadmap with 0.1, 0.2, and 1.0 slices."
      ],
      mapping: "Maps to logics/request/, logics/product/, and logics/roadmap/.",
      corpusStages: ["request", "product", "roadmap"],
      actions: [{ label: "New Request", action: "new-request" }, { label: "Open the board", action: "board" }]
    },
    {
      label: "Delivery Slices",
      tagline: "Turn intent into scoped work",
      description: "Promote framed work into backlog items, then create orchestration tasks when a slice is ready to execute. Keep each task small enough to validate and commit cleanly.",
      prompts: [
        "Split this request or roadmap slice into backlog items with acceptance criteria.",
        "Create orchestration tasks for the next useful delivery slice."
      ],
      mapping: "Maps to logics/backlog/ and logics/tasks/.",
      corpusStages: ["backlog"],
      // item_752: this stage ended in nothing while the others ended in an action, so the
      // guide stopped being a sequence at its second step. The board is where the slices it
      // describes actually appear.
      actions: [{ label: "Open the board", action: "board" }, { label: "Open Insights", action: "open-logics-insights" }]
    },
    {
      label: "Execution",
      tagline: "Work from the task, commit by wave",
      description: "Use the active task as the execution contract. Commit after each coherent wave or task, keep validation evidence close, and avoid leaving unrelated changes mixed in.",
      prompts: [
        "Execute task <task id>. Commit after each useful wave and keep going until it is done.",
        "Validate the changed surface, update docs if needed, then close the task with evidence."
      ],
      mapping: "Maps to task execution, commits, checks, and activity in the viewer.",
      corpusStages: ["task"],
      actions: [{ label: "CDX Missions", action: "cdx-missions" }, { label: "Open the board", action: "board" }]
    },
    {
      label: "Closeout",
      tagline: "Settle the documents that are no longer open",
      description: "When a subject is finished, update linked requests, product briefs, specs, ADRs, and roadmaps instead of leaving stale open context. Use Settled or Superseded for planning docs that are done or replaced.",
      prompts: [
        "Close out the linked Logics chain for this task and mark replaced planning docs as superseded.",
        "Audit the viewer for open docs that should be Done, Settled, or Superseded after this work."
      ],
      mapping: "Maps to statuses across request, backlog, task, product, roadmap, ADR, and spec docs.",
      corpusStages: ["architecture", "spec"],
      actions: [{ label: "Open Health", action: "health" }, { label: "Open Insights", action: "open-logics-insights" }]
    }
  ];

export const onboardingDocGuide = [
    ["Problem, goal, or user request", "-> request"],
    ["Product intent, constraints, and positioning", "-> product brief"],
    ["Longer staged plan such as MVP, 0.1, 0.2, V1", "-> roadmap"],
    ["Scoped delivery slice with acceptance criteria", "-> backlog item"],
    ["Decision that should survive implementation", "-> ADR"],
    ["Behavior, contract, or UX requirement", "-> spec"],
    ["Executable work package for an agent or human", "-> task"],
    ["Project-owned copy/locales", "-> i18n contract"],
    ["Design tokens and editable project theme", "-> theme"]
  ];

export const stageBadgeLabels = {
    request: "Request",
    backlog: "Backlog",
    task: "Task",
    product: "Product",
    roadmap: "Roadmap",
    architecture: "Architecture",
    spec: "Spec",
    runbook: "Runbook"
  };

export const HLJS_EXT_LANGUAGE = {
    js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp",
    php: "php", swift: "swift", kt: "kotlin", scala: "scala",
    sh: "bash", bash: "bash", zsh: "bash", fish: "bash",
    json: "json", yml: "yaml", yaml: "yaml", toml: "ini", ini: "ini",
    xml: "xml", html: "xml", htm: "xml", svg: "xml",
    css: "css", scss: "scss", less: "less",
    md: "markdown", markdown: "markdown",
    sql: "sql", dockerfile: "dockerfile", makefile: "makefile",
    diff: "diff", patch: "diff"
  };

// item_792: Runbooks moved out of Workshop's tab bar into the Corpus nav group
// (`corpus:runbooks` in index.js) -- it lives here no longer.
export const workshopTabs = [
    { id: "terminals", label: "Terminals", title: "In-app PTY terminals" },
    { id: "commands", label: "Commands", title: "Discovered package and project scripts" },
    { id: "explorer", label: "Explorer", title: "Browse repository files" },
  ];

export const WORKSHOP_TERMINAL_MIN_COLS = 80;

export const WORKSHOP_TERMINAL_MIN_ROWS = 24;

export const WORKSHOP_TERMINAL_RESIZE_COL_STEP = 10;

export const WORKSHOP_TERMINAL_RESIZE_ROW_STEP = 5;
