import * as fs from "fs";
import * as path from "path";
import { MIN_LOGICS_KIT_MAJOR, MIN_LOGICS_KIT_MINOR } from "./logicsViewProviderConstants";

export type LogicsKitUpdateNeed = {
  currentVersion: string;
  minimumVersion: string;
  signature: string;
};

export function inspectKitUpdateNeed(root: string): LogicsKitUpdateNeed | null {
  const versionPath = path.join(root, "logics", "skills", "VERSION");
  if (!fs.existsSync(versionPath)) {
    return null;
  }
  let raw: string;
  try {
    raw = fs.readFileSync(versionPath, "utf-8").trim();
  } catch {
    return null;
  }
  const parts = raw.split(".").map(Number);
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [major, minor] = parts;
  const isTooOld =
    major < MIN_LOGICS_KIT_MAJOR || (major === MIN_LOGICS_KIT_MAJOR && minor < MIN_LOGICS_KIT_MINOR);
  if (!isTooOld) {
    return null;
  }
  const minimumVersion = `${MIN_LOGICS_KIT_MAJOR}.${MIN_LOGICS_KIT_MINOR}.x`;
  return {
    currentVersion: raw,
    minimumVersion,
    signature: `kit-too-old:${raw}->${minimumVersion}`
  };
}
