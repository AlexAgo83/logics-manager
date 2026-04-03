import * as fs from "fs";
import * as path from "path";
import { detectGitCommand } from "./gitRuntime";
import { CodexOverlaySnapshot, inspectCodexWorkspaceOverlay } from "./logicsCodexWorkspace";
import { detectPythonRuntime, PythonCommand, runPythonCommand } from "./pythonRuntime";

export type CapabilityStatus = "available" | "unavailable";
export type RepositoryState = "no-root" | "missing-logics" | "missing-kit" | "missing-flow-manager" | "partial-bootstrap" | "ready";
export type HybridRuntimeState = "unavailable" | "degraded" | "ready";

export type Capability = {
  status: CapabilityStatus;
  summary: string;
};

export type HybridRuntimeSnapshot = {
  state: HybridRuntimeState;
  summary: string;
  backend: "ollama" | "codex" | null;
  requestedBackend: "auto" | "ollama" | "codex" | null;
  degraded: boolean;
  degradedReasons: string[];
  claudeBridgeAvailable: boolean;
  windowsSafeEntrypoint: string;
};

export type ClaudeBridgeStatus = {
  available: boolean;
  preferredVariant: "hybrid-assist" | "flow-manager" | null;
  detectedVariants: string[];
  supportedVariants: string[];
};

const CLAUDE_BRIDGE_VARIANTS = [
  {
    id: "hybrid-assist",
    commandPath: [".claude", "commands", "logics-assist.md"],
    agentPath: [".claude", "agents", "logics-hybrid-delivery-assistant.md"]
  },
  {
    id: "flow-manager",
    commandPath: [".claude", "commands", "logics-flow.md"],
    agentPath: [".claude", "agents", "logics-flow-manager.md"]
  }
] as const;

export function detectClaudeBridgeStatus(root: string): ClaudeBridgeStatus {
  const detectedVariants = CLAUDE_BRIDGE_VARIANTS.filter(
    (variant) =>
      fs.existsSync(path.join(root, ...variant.commandPath)) &&
      fs.existsSync(path.join(root, ...variant.agentPath))
  ).map((variant) => variant.id);
  return {
    available: detectedVariants.length > 0,
    preferredVariant: detectedVariants[0] ?? null,
    detectedVariants: [...detectedVariants],
    supportedVariants: CLAUDE_BRIDGE_VARIANTS.map((variant) => variant.id)
  };
}

export type LogicsEnvironmentSnapshot = {
  root: string | null;
  invalidOverridePath?: string;
  repositoryState: RepositoryState;
  hasLogicsDir: boolean;
  hasSkillsDir: boolean;
  hasFlowManagerScript: boolean;
  hasBootstrapScript: boolean;
  missingWorkflowDirs: string[];
  git: {
    available: boolean;
  };
  python: {
    available: boolean;
    command: PythonCommand | null;
  };
  codexOverlay: CodexOverlaySnapshot;
  hybridRuntime?: HybridRuntimeSnapshot;
  capabilities: {
    readOnly: Capability;
    workflowMutation: Capability;
    bootstrapRepair: Capability;
    codexRuntime: Capability;
    hybridAssist?: Capability;
    diagnostics: Capability;
  };
};

type DetectorOptions = {
  detectGit?: () => Promise<boolean>;
  detectPython?: () => Promise<PythonCommand | null>;
  inspectOverlay?: (root: string | null, pythonCommand?: PythonCommand | null) => CodexOverlaySnapshot;
  inspectHybridRuntime?: (root: string | null, pythonCommand?: PythonCommand | null) => Promise<HybridRuntimeSnapshot>;
};

export async function inspectLogicsEnvironment(
  root: string | null,
  invalidOverridePath?: string,
  options: DetectorOptions = {}
): Promise<LogicsEnvironmentSnapshot> {
  const detectGit = options.detectGit ?? detectGitCommand;
  const detectPython = options.detectPython ?? detectPythonRuntime;
  const inspectOverlay = options.inspectOverlay ?? inspectCodexWorkspaceOverlay;
  const inspectHybridRuntime = options.inspectHybridRuntime ?? inspectHybridAssistRuntime;
  const projectRoot = root ?? "";
  const hasLogicsDir = Boolean(root) && fs.existsSync(path.join(projectRoot, "logics"));
  const hasSkillsDir = Boolean(root) && fs.existsSync(path.join(projectRoot, "logics", "skills"));
  const hasFlowManagerScript =
    Boolean(root) &&
    fs.existsSync(path.join(projectRoot, "logics", "skills", "logics-flow-manager", "scripts", "logics_flow.py"));
  const hasBootstrapScript =
    Boolean(root) &&
    fs.existsSync(path.join(projectRoot, "logics", "skills", "logics-bootstrapper", "scripts", "logics_bootstrap.py"));
  const missingWorkflowDirs = root ? getMissingWorkflowDirs(root) : [];
  const [gitAvailable, pythonCommand] = await Promise.all([detectGit(), detectPython()]);
  const pythonAvailable = Boolean(pythonCommand);
  const codexOverlay = inspectOverlay(root, pythonCommand);
  const hybridRuntime = await inspectHybridRuntime(root, pythonCommand);
  const repositoryState = computeRepositoryState({
    root,
    hasLogicsDir,
    hasSkillsDir,
    hasFlowManagerScript,
    missingWorkflowDirs
  });

  return {
    root,
    invalidOverridePath,
    repositoryState,
    hasLogicsDir,
    hasSkillsDir,
    hasFlowManagerScript,
    hasBootstrapScript,
    missingWorkflowDirs,
    git: {
      available: gitAvailable
    },
    python: {
      available: pythonAvailable,
      command: pythonCommand
    },
    codexOverlay,
    hybridRuntime,
    capabilities: {
      readOnly: buildReadOnlyCapability(repositoryState, root, invalidOverridePath),
      workflowMutation: buildWorkflowMutationCapability(hasLogicsDir, hasFlowManagerScript, pythonAvailable),
      bootstrapRepair: buildBootstrapCapability(root, gitAvailable, pythonAvailable, hasBootstrapScript),
      codexRuntime: buildCodexRuntimeCapability(root, codexOverlay),
      hybridAssist: buildHybridAssistCapability(root, hybridRuntime),
      diagnostics: {
        status: "available",
        summary: "Always available from the command palette or Tools menu."
      }
    }
  };
}

function buildCodexRuntimeCapability(root: string | null, overlay: CodexOverlaySnapshot): Capability {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Requires a selected workspace or project root."
    };
  }
  if (overlay.status === "healthy" || overlay.status === "warning") {
    return {
      status: "available",
      summary: overlay.summary
    };
  }
  return {
    status: "unavailable",
    summary: overlay.summary
  };
}

function buildHybridAssistCapability(root: string | null, hybridRuntime: HybridRuntimeSnapshot): Capability {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Requires a selected workspace or project root."
    };
  }
  if (hybridRuntime.state === "ready" || hybridRuntime.state === "degraded") {
    return {
      status: "available",
      summary: hybridRuntime.summary
    };
  }
  return {
    status: "unavailable",
    summary: hybridRuntime.summary
  };
}

function getMissingWorkflowDirs(root: string): string[] {
  const candidates = [
    { label: "logics/request", fullPath: path.join(root, "logics", "request") },
    { label: "logics/backlog", fullPath: path.join(root, "logics", "backlog") },
    { label: "logics/tasks", fullPath: path.join(root, "logics", "tasks") }
  ];
  return candidates.filter((candidate) => !fs.existsSync(candidate.fullPath)).map((candidate) => candidate.label);
}

function computeRepositoryState(input: {
  root: string | null;
  hasLogicsDir: boolean;
  hasSkillsDir: boolean;
  hasFlowManagerScript: boolean;
  missingWorkflowDirs: string[];
}): RepositoryState {
  if (!input.root) {
    return "no-root";
  }
  if (!input.hasLogicsDir) {
    return "missing-logics";
  }
  if (!input.hasSkillsDir) {
    return "missing-kit";
  }
  if (!input.hasFlowManagerScript) {
    return "missing-flow-manager";
  }
  if (input.missingWorkflowDirs.length > 0) {
    return "partial-bootstrap";
  }
  return "ready";
}

function buildReadOnlyCapability(
  repositoryState: RepositoryState,
  root: string | null,
  invalidOverridePath?: string
): Capability {
  if (!root) {
    const summary = invalidOverridePath
      ? `Unavailable until a valid project root is selected. Missing configured root: ${invalidOverridePath}.`
      : "Unavailable until a workspace or project root is selected.";
    return { status: "unavailable", summary };
  }
  if (repositoryState === "missing-logics") {
    return {
      status: "unavailable",
      summary: "This branch does not have a logics/ folder yet. Bootstrap or repair this branch to enable browsing."
    };
  }
  return {
    status: "available",
    summary: "Browsing existing Logics docs remains available even when Git or Python prerequisites are missing."
  };
}

function buildWorkflowMutationCapability(
  hasLogicsDir: boolean,
  hasFlowManagerScript: boolean,
  pythonAvailable: boolean
): Capability {
  if (!hasLogicsDir) {
    return {
      status: "unavailable",
      summary: "Requires a logics/ folder in the selected project root."
    };
  }
  if (!hasFlowManagerScript) {
    return {
      status: "unavailable",
      summary: "Requires logics/skills plus the flow-manager scripts. Run Bootstrap Logics to repair the kit."
    };
  }
  if (!pythonAvailable) {
    return {
      status: "unavailable",
      summary: "Requires Python 3 on PATH for create, promote, and fix actions."
    };
  }
  return {
    status: "available",
    summary: "Create, promote, fix, and related script-backed actions are available."
  };
}

function buildBootstrapCapability(
  root: string | null,
  gitAvailable: boolean,
  pythonAvailable: boolean,
  hasBootstrapScript: boolean
): Capability {
  if (!root) {
    return {
      status: "unavailable",
      summary: "Requires a selected workspace or project root."
    };
  }
  if (!gitAvailable) {
    return {
      status: "unavailable",
      summary: "Requires Git on PATH to initialize repositories and add or repair the kit submodule."
    };
  }
  if (hasBootstrapScript && !pythonAvailable) {
    return {
      status: "unavailable",
      summary: "Git is available, but Python 3 is still required to finish the bootstrap script after the kit is present."
    };
  }
  return {
    status: "available",
    summary: "Bootstrap or repair is available from the extension. System tools still need to be installed outside VS Code."
  };
}

async function inspectHybridAssistRuntime(
  root: string | null,
  pythonCommand?: PythonCommand | null
): Promise<HybridRuntimeSnapshot> {
  if (!root) {
    return {
      state: "unavailable",
      summary: "Select a project root before checking the hybrid assist runtime.",
      backend: null,
      requestedBackend: null,
      degraded: true,
      degradedReasons: ["no-root"],
      claudeBridgeAvailable: false,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    };
  }

  const runtimeEntry = path.join(root, "logics", "skills", "logics.py");
  if (!fs.existsSync(runtimeEntry)) {
    return {
      state: "unavailable",
      summary: "Repo-local Logics runtime entrypoint is missing, so hybrid assist commands are unavailable.",
      backend: null,
      requestedBackend: null,
      degraded: true,
      degradedReasons: ["missing-logics-runtime"],
      claudeBridgeAvailable: false,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    };
  }

  const claudeBridgeStatus = detectClaudeBridgeStatus(root);
  const claudeBridgeAvailable = claudeBridgeStatus.available;

  if (!pythonCommand) {
    return {
      state: "unavailable",
      summary: "Python 3 is required to inspect or run the hybrid assist runtime.",
      backend: null,
      requestedBackend: null,
      degraded: true,
      degradedReasons: ["missing-python"],
      claudeBridgeAvailable,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    };
  }

  const result = await runPythonCommand(root, runtimeEntry, ["flow", "assist", "runtime-status", "--format", "json"]);
  if (result.error) {
    return {
      state: "unavailable",
      summary: result.stderr.trim() || result.error.message || "Hybrid assist runtime probe failed.",
      backend: null,
      requestedBackend: null,
      degraded: true,
      degradedReasons: ["runtime-probe-failed"],
      claudeBridgeAvailable,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    };
  }

  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(result.stdout) as Record<string, any>;
  } catch {
    return {
      state: "unavailable",
      summary: "Hybrid assist runtime returned invalid JSON.",
      backend: null,
      requestedBackend: null,
      degraded: true,
      degradedReasons: ["runtime-invalid-json"],
      claudeBridgeAvailable,
      windowsSafeEntrypoint: "python logics/skills/logics.py flow assist ..."
    };
  }

  const backendInfo = (payload.backend ?? {}) as Record<string, any>;
  const degradedReasons = Array.isArray(payload.degraded_reasons)
    ? payload.degraded_reasons.map((value) => String(value))
    : [];
  const backend = backendInfo.selected_backend === "ollama" || backendInfo.selected_backend === "codex" ? backendInfo.selected_backend : null;
  const requestedBackend =
    backendInfo.requested_backend === "auto" || backendInfo.requested_backend === "ollama" || backendInfo.requested_backend === "codex"
      ? backendInfo.requested_backend
      : null;
  const degraded = Boolean(payload.degraded) || degradedReasons.length > 0;
  const state: HybridRuntimeState = payload.ok ? (degraded ? "degraded" : "ready") : "unavailable";
  const summary =
    state === "ready"
      ? `Hybrid assist runtime ready (${backend || "unknown backend"}).`
      : state === "degraded"
        ? `Hybrid assist runtime degraded (${backend || "fallback"}).`
        : "Hybrid assist runtime unavailable.";

  return {
    state,
    summary,
    backend,
    requestedBackend,
    degraded,
    degradedReasons,
    claudeBridgeAvailable: Boolean(payload.claude_bridge_available) || claudeBridgeAvailable,
    windowsSafeEntrypoint:
      typeof payload.windows_safe_entrypoint === "string" && payload.windows_safe_entrypoint.trim()
        ? payload.windows_safe_entrypoint
        : "python logics/skills/logics.py flow assist ..."
  };
}
