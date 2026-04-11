import * as fs from "fs";
import * as path from "path";
import {
  MAX_LOGICS_KIT_MAJOR,
  MAX_LOGICS_KIT_MINOR,
  MIN_LOGICS_KIT_MAJOR,
  MIN_LOGICS_KIT_MINOR
} from "./logicsViewProviderConstants";

export type LogicsKitUpdateNeed = {
  currentVersion: string;
  minimumVersion: string;
  maximumVersion: string;
  kind: "too-old" | "too-new";
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
  const isTooNew =
    major > MAX_LOGICS_KIT_MAJOR || (major === MAX_LOGICS_KIT_MAJOR && minor > MAX_LOGICS_KIT_MINOR);
  if (!isTooOld && !isTooNew) {
    return null;
  }
  const minimumVersion = `${MIN_LOGICS_KIT_MAJOR}.${MIN_LOGICS_KIT_MINOR}.x`;
  const maximumVersion = `${MAX_LOGICS_KIT_MAJOR}.${MAX_LOGICS_KIT_MINOR}.x`;
  return {
    currentVersion: raw,
    minimumVersion,
    maximumVersion,
    kind: isTooOld ? "too-old" : "too-new",
    signature: isTooOld ? `kit-too-old:${raw}->${minimumVersion}` : `kit-too-new:${raw}->${maximumVersion}`
  };
}
