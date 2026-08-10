// AUTO-GENERATED from logics_manager/statuses.json. Do not edit by hand.
// Regenerate with `npm run generate:status-constants` (checked by `npm run check:status-constants`).
export const STATUS_STAGES: Record<string, readonly string[]> = {
  "request": ["Draft","Ready","In progress","Blocked","Done","Obsolete","Archived"],
  "backlog": ["Draft","Ready","In progress","Blocked","Done","Obsolete","Archived"],
  "task": ["Draft","Ready","In progress","Blocked","Done","Obsolete","Archived"],
  "product": ["Draft","Proposed","Active","Accepted","Validated","Rejected","Superseded","Settled","Archived"],
  "roadmap": ["Draft","Proposed","Active","Accepted","Validated","Rejected","Superseded","Settled","Archived"],
  "architecture": ["Draft","Proposed","Accepted","Validated","Rejected","Superseded","Settled","Archived"],
  "spec": ["Draft","Ready","In progress","Done","Validated","Settled","Archived"],
  "runbook": ["Draft","Active","Archived"]
};

export const OPEN_STATUSES = new Set<string>(["Draft","Ready","In progress","Blocked"]);
export const CLOSED_STATUSES = new Set<string>(["Done","Obsolete","Archived","Settled"]);
export const TERMINAL_STATUSES = new Set<string>(["Archived"]);

export function statusTransitionError(stage: string, previous: string | null, target: string): string | null {
  const allowed = STATUS_STAGES[stage];
  if (allowed && !allowed.includes(target)) {
    return `${target} is not a valid status for ${stage} (allowed: ${allowed.join(", ")}).`;
  }
  const prev = (previous || "").trim();
  if (prev && prev !== target && TERMINAL_STATUSES.has(prev)) {
    return `${prev} is terminal; cannot transition to ${target}.`;
  }
  return null;
}
