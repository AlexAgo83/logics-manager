type UnknownRecord = Record<string, unknown>;

export type HybridAssistPayload = UnknownRecord & {
  backend?: UnknownRecord;
  sources?: UnknownRecord;
  result?: UnknownRecord;
  backend_used?: string;
  backend_requested?: string;
  result_status?: string;
  degraded?: boolean;
  degraded_reasons?: string[];
  plan?: {
    steps?: HybridCommitPlanStep[];
  };
};

export type HybridAssistOutcome = {
  backendUsed: string | null;
  backendRequested: string | null;
  degradedReasons: string[];
  degraded: boolean;
};

export type HybridCommitPlanStep = {
  scope?: string;
  summary?: string;
};

export type HybridNextStepResult = {
  decision?: {
    action?: string;
    target_ref?: string;
  };
  mapped_command?: {
    summary?: string;
  };
};

export type HybridTriageResult = {
  classification?: string;
  summary?: string;
  next_actions?: string[];
};

export type HybridDiffRiskResult = {
  risk?: string;
  summary?: string;
  drivers?: string[];
};

export type HybridValidationSummaryResult = {
  overall?: string;
  summary?: string;
};

export type HybridValidationChecklistResult = {
  profile?: string;
  checks?: string[];
};

export type HybridDocConsistencyResult = {
  overall?: string;
  summary?: string;
  issues?: string[];
};

export type HybridInsightsSources = {
  audit_log?: string;
  measurement_log?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isCommitPlanStep(value: unknown): value is HybridCommitPlanStep {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value.scope === undefined || typeof value.scope === "string") &&
    (value.summary === undefined || typeof value.summary === "string")
  );
}

function isOptionalStringRecord(value: unknown, keys: string[]): value is UnknownRecord {
  if (!isRecord(value)) {
    return false;
  }
  return keys.every((key) => value[key] === undefined || typeof value[key] === "string");
}

export function parseHybridAssistPayload(value: unknown): HybridAssistPayload | null {
  if (!isRecord(value)) {
    return null;
  }
  return value as HybridAssistPayload;
}

export function describeHybridAssistOutcome(payload: HybridAssistPayload): HybridAssistOutcome {
  const backend = isRecord(payload.backend) ? payload.backend : undefined;
  const backendUsed =
    typeof payload.backend_used === "string"
      ? payload.backend_used
      : typeof backend?.selected_backend === "string"
        ? backend.selected_backend
        : null;
  const backendRequested =
    typeof payload.backend_requested === "string"
      ? payload.backend_requested
      : typeof backend?.requested_backend === "string"
        ? backend.requested_backend
        : null;
  const degradedReasons = isStringArray(payload.degraded_reasons) ? payload.degraded_reasons.filter(Boolean) : [];
  return {
    backendUsed,
    backendRequested,
    degradedReasons,
    degraded: Boolean(payload.degraded) || payload.result_status === "degraded" || degradedReasons.length > 0
  };
}

export function parseHybridCommitPlanSteps(payload: HybridAssistPayload): HybridCommitPlanStep[] {
  const plan = isRecord(payload.plan) ? payload.plan : undefined;
  const steps = plan?.steps;
  return Array.isArray(steps) ? steps.filter(isCommitPlanStep) : [];
}

export function parseHybridNextStepResult(payload: HybridAssistPayload): HybridNextStepResult | null {
  const result = payload.result;
  if (!isRecord(result)) {
    return null;
  }
  const decision = isOptionalStringRecord(result.decision, ["action", "target_ref"])
    ? result.decision as HybridNextStepResult["decision"]
    : undefined;
  const mappedCommand = isOptionalStringRecord(result.mapped_command, ["summary"])
    ? result.mapped_command as HybridNextStepResult["mapped_command"]
    : undefined;
  return decision || mappedCommand ? { decision, mapped_command: mappedCommand } : null;
}

export function parseHybridTriageResult(payload: HybridAssistPayload): HybridTriageResult | null {
  const result = payload.result;
  if (!isRecord(result)) {
    return null;
  }
  const nextActions = isStringArray(result.next_actions) ? result.next_actions : undefined;
  if (
    result.classification === undefined &&
    result.summary === undefined &&
    nextActions === undefined
  ) {
    return null;
  }
  return {
    classification: typeof result.classification === "string" ? result.classification : undefined,
    summary: typeof result.summary === "string" ? result.summary : undefined,
    next_actions: nextActions
  };
}

export function parseHybridDiffRiskResult(payload: HybridAssistPayload): HybridDiffRiskResult | null {
  const result = payload.result;
  if (!isRecord(result)) {
    return null;
  }
  const drivers = isStringArray(result.drivers) ? result.drivers : undefined;
  if (result.risk === undefined && result.summary === undefined && drivers === undefined) {
    return null;
  }
  return {
    risk: typeof result.risk === "string" ? result.risk : undefined,
    summary: typeof result.summary === "string" ? result.summary : undefined,
    drivers
  };
}

export function parseHybridValidationSummaryResult(payload: HybridAssistPayload): HybridValidationSummaryResult | null {
  const result = payload.result;
  if (!isOptionalStringRecord(result, ["overall", "summary"])) {
    return null;
  }
  return {
    overall: typeof result.overall === "string" ? result.overall : undefined,
    summary: typeof result.summary === "string" ? result.summary : undefined
  };
}

export function parseHybridValidationChecklistResult(
  payload: HybridAssistPayload
): HybridValidationChecklistResult | null {
  const result = payload.result;
  if (!isRecord(result)) {
    return null;
  }
  const checks = isStringArray(result.checks) ? result.checks : undefined;
  if (result.profile === undefined && checks === undefined) {
    return null;
  }
  return {
    profile: typeof result.profile === "string" ? result.profile : undefined,
    checks
  };
}

export function parseHybridDocConsistencyResult(payload: HybridAssistPayload): HybridDocConsistencyResult | null {
  const result = payload.result;
  if (!isRecord(result)) {
    return null;
  }
  const issues = isStringArray(result.issues) ? result.issues : undefined;
  if (result.overall === undefined && result.summary === undefined && issues === undefined) {
    return null;
  }
  return {
    overall: typeof result.overall === "string" ? result.overall : undefined,
    summary: typeof result.summary === "string" ? result.summary : undefined,
    issues
  };
}

export function parseHybridInsightsSources(payload: HybridAssistPayload): HybridInsightsSources | null {
  const sources = payload.sources;
  if (!isOptionalStringRecord(sources, ["audit_log", "measurement_log"])) {
    return null;
  }
  return {
    audit_log: typeof sources.audit_log === "string" ? sources.audit_log : undefined,
    measurement_log: typeof sources.measurement_log === "string" ? sources.measurement_log : undefined
  };
}
