import * as fs from "fs";
import * as path from "path";
import { detectGitCommand } from "./gitRuntime";
import { detectPythonRuntime, PythonCommand } from "./pythonRuntime";

export type CapabilityStatus = "available" | "unavailable";
export type RepositoryState = "no-root" | "missing-logics" | "missing-kit" | "missing-flow-manager" | "partial-bootstrap" | "ready";

export type Capability = {
  status: CapabilityStatus;
  summary: string;
};

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
  capabilities: {
    readOnly: Capability;
    workflowMutation: Capability;
    bootstrapRepair: Capability;
    diagnostics: Capability;
  };
};

type DetectorOptions = {
  detectGit?: () => Promise<boolean>;
  detectPython?: () => Promise<PythonCommand | null>;
};

export async function inspectLogicsEnvironment(
  root: string | null,
  invalidOverridePath?: string,
  options: DetectorOptions = {}
): Promise<LogicsEnvironmentSnapshot> {
  const detectGit = options.detectGit ?? detectGitCommand;
  const detectPython = options.detectPython ?? detectPythonRuntime;
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
    capabilities: {
      readOnly: buildReadOnlyCapability(repositoryState, root, invalidOverridePath),
      workflowMutation: buildWorkflowMutationCapability(hasLogicsDir, hasFlowManagerScript, pythonAvailable),
      bootstrapRepair: buildBootstrapCapability(root, gitAvailable, pythonAvailable, hasBootstrapScript),
      diagnostics: {
        status: "available",
        summary: "Always available from the command palette or Tools menu."
      }
    }
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
      summary: "No logics/ folder found yet. Bootstrap or repair the repository to enable browsing."
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
