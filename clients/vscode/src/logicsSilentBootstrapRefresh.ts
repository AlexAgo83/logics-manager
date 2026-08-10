/**
 * req_331/item_691: silently refresh only managed bootstrap artifacts for an
 * existing, valid corpus -- never creates a new corpus, never touches Git,
 * never commits. A thin wrapper over `logics-manager bootstrap
 * --refresh-managed`; the managed/user-content distinction and the
 * existing-corpus-only guard live in `bootstrap.py`, not duplicated here.
 */
import { runPythonWithOutput } from "./logicsProviderUtils";

export type ManagedBootstrapRefreshResult =
  | { status: "no-corpus" }
  | { status: "unchanged" }
  | { status: "refreshed"; updatedPaths: string[] }
  | { status: "failed"; message: string };

type BootstrapRefreshPayload = {
  reason?: string;
  updated_paths?: string[];
  created_paths?: string[];
};

export async function refreshManagedBootstrap(root: string): Promise<ManagedBootstrapRefreshResult> {
  const result = await runPythonWithOutput(root, "", ["bootstrap", "--refresh-managed", "--format", "json"]);
  if (result.error) {
    return { status: "failed", message: result.stderr.trim() || result.error.message };
  }

  let payload: BootstrapRefreshPayload;
  try {
    payload = JSON.parse(result.stdout) as BootstrapRefreshPayload;
  } catch {
    return { status: "failed", message: "Could not parse `bootstrap --refresh-managed` output." };
  }

  if (payload.reason === "no_corpus") {
    return { status: "no-corpus" };
  }
  const changedPaths = [...(payload.updated_paths ?? []), ...(payload.created_paths ?? [])];
  if (changedPaths.length === 0) {
    return { status: "unchanged" };
  }
  return { status: "refreshed", updatedPaths: changedPaths };
}
