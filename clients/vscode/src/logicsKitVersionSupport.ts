import * as fs from "fs";
import * as path from "path";
import {
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

function parseMajorMinor(raw: string | null | undefined): [number, number] | null {
  if (!raw) {
    return null;
  }
  const parts = raw.trim().split(".").map(Number);
  if (parts.length < 2 || parts.slice(0, 2).some((part) => Number.isNaN(part))) {
    return null;
  }
  return [parts[0], parts[1]];
}

/**
 * The upper bound is the plugin's own version, not a constant beside it. The plugin and
 * the runtime are released together at the same version, so a hand-maintained bound went
 * stale the first time nobody bumped it: the warning ended up firing on the very pairing
 * the release had produced, which trains an operator to dismiss the one case it exists for.
 *
 * The lower bound stays a constant. It is a real compatibility floor, not a mirror of the
 * current version.
 *
 * With no plugin version to compare against there is no honest upper bound, so nothing is
 * reported as too new. Too old is still decidable and still reported.
 */
export function inspectKitUpdateNeed(root: string, pluginVersion?: string | null): LogicsKitUpdateNeed | null {
  const versionPath = path.join(root, "VERSION");
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
  const bound = parseMajorMinor(pluginVersion);
  const isTooOld =
    major < MIN_LOGICS_KIT_MAJOR || (major === MIN_LOGICS_KIT_MAJOR && minor < MIN_LOGICS_KIT_MINOR);
  const isTooNew =
    bound !== null && (major > bound[0] || (major === bound[0] && minor > bound[1]));
  if (!isTooOld && !isTooNew) {
    return null;
  }
  const minimumVersion = `${MIN_LOGICS_KIT_MAJOR}.${MIN_LOGICS_KIT_MINOR}.x`;
  const maximumVersion = bound === null ? "unknown" : `${bound[0]}.${bound[1]}.x`;
  return {
    currentVersion: raw,
    minimumVersion,
    maximumVersion,
    kind: isTooOld ? "too-old" : "too-new",
    signature: isTooOld ? `kit-too-old:${raw}->${minimumVersion}` : `kit-too-new:${major}.${minor}.x->${maximumVersion}`
  };
}
