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
    focus: "active",
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
    architecture: ["Draft", "Proposed", "Accepted", "Validated", "Rejected", "Superseded", "Settled", "Archived"],
    spec: ["Draft", "Ready", "In progress", "Done", "Validated", "Settled", "Archived"]
  };

export const onboardingStages = [
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

export const onboardingDocGuide = [
    ["If you think \"here is the problem and context...\"", "-> request"],
    ["If you think \"this needs a scoped delivery slice...\"", "-> item"],
    ["If you think \"we want...\"", "-> product brief"],
    ["If you think \"we decided...\"", "-> ADR"],
    ["If you think \"the system should...\"", "-> spec"],
    ["If you think \"let's do...\"", "-> task"]
  ];

export const stageBadgeLabels = {
    request: "Request",
    backlog: "Backlog",
    task: "Task",
    product: "Product",
    architecture: "Architecture",
    spec: "Spec"
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

export const workshopTabs = [
    { id: "terminals", label: "Terminals", title: "In-app PTY terminals" },
    { id: "commands", label: "Commands", title: "Discovered package and project scripts" },
    { id: "explorer", label: "Explorer", title: "Browse repository files" },
  ];

export const WORKSHOP_TERMINAL_MIN_COLS = 80;

export const WORKSHOP_TERMINAL_MIN_ROWS = 24;

export const WORKSHOP_TERMINAL_RESIZE_COL_STEP = 10;

export const WORKSHOP_TERMINAL_RESIZE_ROW_STEP = 5;
