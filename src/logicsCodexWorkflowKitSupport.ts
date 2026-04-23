import * as fs from "fs";
import { getBundledLogicsManagerScriptPath, runPythonWithOutput } from "./logicsProviderUtils";

export type FallbackKitInstallResult = {
  installed: boolean;
  method?: "bootstrap";
  failureMessage?: string;
};

export async function fallbackInstallKit(root: string): Promise<FallbackKitInstallResult> {
  const scriptPath = getBundledLogicsManagerScriptPath();
  if (!fs.existsSync(scriptPath)) {
    return {
      installed: false,
      failureMessage: `Bundled Logics bootstrap entrypoint is missing: ${scriptPath}`
    };
  }

  const bootstrapResult = await runPythonWithOutput(root, scriptPath, ["bootstrap"]);
  if (bootstrapResult.error) {
    const detail = `${bootstrapResult.stderr}\n${bootstrapResult.stdout}\n${bootstrapResult.error.message}`.trim();
    return {
      installed: false,
      failureMessage: detail || bootstrapResult.error.message
    };
  }

  return {
    installed: true,
    method: "bootstrap"
  };
}

export function appendBootstrapConvergenceNote(
  message: string,
  convergence: {
    attempted: boolean;
    applied: boolean;
    failureMessage?: string;
  }
): string {
  if (!convergence.attempted) {
    return message;
  }
  if (convergence.applied) {
    return `${message} Repo-local bootstrap files were reconciled with the current runtime.`;
  }
  if (convergence.failureMessage) {
    return `${message} Repo-local bootstrap convergence still needs attention: ${convergence.failureMessage}`;
  }
  return message;
}
