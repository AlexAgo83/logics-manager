import * as fs from "fs";
import * as path from "path";
import { parseDocument } from "yaml";

export type ReleaseBranchConsentState = {
  available: boolean;
  allowed: boolean;
  title: string;
  reason?: string;
  configPath: string;
};

const CONSENT_PATH = ["release", "maintenance", "allow_fast_forward_local_release_branch"] as const;

export function inspectReleaseBranchFastForwardConsent(root: string): ReleaseBranchConsentState {
  const configPath = path.join(root, "logics.yaml");
  if (!fs.existsSync(configPath)) {
    return {
      available: false,
      allowed: false,
      title: "Release branch fast-forward consent cannot be stored until logics.yaml exists.",
      reason: "missing-logics-yaml",
      configPath
    };
  }
  try {
    const document = parseDocument(fs.readFileSync(configPath, "utf-8"));
    const value = document.getIn([...CONSENT_PATH]);
    if (value === true) {
      return {
        available: true,
        allowed: true,
        title: "Repo-local consent allows non-destructive fast-forward updates of the local release branch before publish.",
        reason: "granted",
        configPath
      };
    }
    return {
      available: true,
      allowed: false,
      title: "Repo-local consent for automatic local release-branch fast-forward is not granted.",
      reason: "not-granted",
      configPath
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      available: false,
      allowed: false,
      title: `Release branch fast-forward consent could not be read from logics.yaml: ${message}`,
      reason: "read-failed",
      configPath
    };
  }
}

export function grantReleaseBranchFastForwardConsent(root: string): ReleaseBranchConsentState {
  const configPath = path.join(root, "logics.yaml");
  if (!fs.existsSync(configPath)) {
    throw new Error("logics.yaml is required to store release branch fast-forward consent.");
  }
  const document = parseDocument(fs.readFileSync(configPath, "utf-8"));
  document.setIn([...CONSENT_PATH], true);
  fs.writeFileSync(configPath, document.toString(), "utf-8");
  return inspectReleaseBranchFastForwardConsent(root);
}
