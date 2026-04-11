import { describe, expect, it } from "vitest";
import {
  describeHybridAssistOutcome,
  parseHybridAssistPayload,
  parseHybridChangelogSummaryResult,
  parseHybridCommitPlanSteps,
  parseHybridDiffRiskResult,
  parseHybridDocConsistencyResult,
  parseHybridInsightsSources,
  parseHybridNextStepResult,
  parseHybridPrepareReleaseResult,
  parseHybridPublishReleaseResult,
  parseHybridRuntimeProviders,
  parseHybridTriageResult,
  parseHybridValidationChecklistResult,
  parseHybridValidationSummaryResult
} from "../src/logicsHybridAssistTypes";

describe("logicsHybridAssistTypes", () => {
  it("parses only record payloads", () => {
    expect(parseHybridAssistPayload(null)).toBeNull();
    expect(parseHybridAssistPayload("payload")).toBeNull();
    expect(parseHybridAssistPayload({ ok: true })).toEqual({ ok: true });
  });

  it("describes hybrid assist outcomes with backend and degraded fallbacks", () => {
    expect(
      describeHybridAssistOutcome({
        backend_used: "deterministic",
        backend_requested: "auto",
        degraded: false,
        degraded_reasons: []
      })
    ).toEqual({
      backendUsed: "deterministic",
      backendRequested: "auto",
      degradedReasons: [],
      degraded: false
    });

    expect(
      describeHybridAssistOutcome({
        backend: {
          selected_backend: "ollama",
          requested_backend: "auto"
        },
        result_status: "degraded",
        degraded_reasons: ["missing provider", ""]
      })
    ).toEqual({
      backendUsed: "ollama",
      backendRequested: "auto",
      degradedReasons: ["missing provider"],
      degraded: true
    });

    expect(
      describeHybridAssistOutcome({
        backend: { selected_backend: "fallback" },
        degraded: false,
        degraded_reasons: ["one reason"]
      })
    ).toEqual({
      backendUsed: "fallback",
      backendRequested: null,
      degradedReasons: ["one reason"],
      degraded: true
    });
  });

  it("parses commit plan steps and filters invalid entries", () => {
    expect(parseHybridCommitPlanSteps({})).toEqual([]);
    expect(
      parseHybridCommitPlanSteps({
        plan: {
          steps: [
            { scope: "wave1", summary: "keep" },
            { scope: "wave2" },
            { summary: "also keep" },
            "skip",
            null
          ] as never
        }
      })
    ).toEqual([{ scope: "wave1", summary: "keep" }, { scope: "wave2" }, { summary: "also keep" }]);
  });

  it("parses next-step results only when at least one nested object is valid", () => {
    expect(parseHybridNextStepResult({})).toBeNull();
    expect(
      parseHybridNextStepResult({
        result: {
          decision: { action: "open", target_ref: "req_001" },
          mapped_command: { summary: "Open request" }
        }
      })
    ).toEqual({
      decision: { action: "open", target_ref: "req_001" },
      mapped_command: { summary: "Open request" }
    });
    expect(
      parseHybridNextStepResult({
        result: {
          decision: { action: 42 }
        }
      })
    ).toBeNull();
  });

  it("parses triage, diff risk, validation summary, changelog, checklist, and doc consistency results", () => {
    expect(parseHybridTriageResult({})).toBeNull();
    expect(
      parseHybridTriageResult({
        result: {
          classification: "blocked",
          summary: "Needs follow-up",
          next_actions: ["Investigate", "Escalate"]
        }
      })
    ).toEqual({
      classification: "blocked",
      summary: "Needs follow-up",
      next_actions: ["Investigate", "Escalate"]
    });
    expect(parseHybridTriageResult({ result: { classification: 1 } as never })).toEqual({
      classification: undefined,
      summary: undefined,
      next_actions: undefined
    });

    expect(parseHybridDiffRiskResult({})).toBeNull();
    expect(
      parseHybridDiffRiskResult({
        result: {
          risk: "high",
          summary: "Large diff",
          drivers: ["many files"]
        }
      })
    ).toEqual({
      risk: "high",
      summary: "Large diff",
      drivers: ["many files"]
    });

    expect(parseHybridValidationSummaryResult({ result: {} })).toEqual({
      overall: undefined,
      summary: undefined
    });
    expect(
      parseHybridValidationSummaryResult({
        result: {
          overall: "pass",
          summary: "All good"
        }
      })
    ).toEqual({
      overall: "pass",
      summary: "All good"
    });
    expect(parseHybridValidationSummaryResult({ result: { overall: 1 } as never })).toBeNull();

    expect(parseHybridChangelogSummaryResult({})).toBeNull();
    expect(
      parseHybridChangelogSummaryResult({
        result: {
          title: "Release summary",
          entries: ["one", "two"]
        }
      })
    ).toEqual({
      title: "Release summary",
      entries: ["one", "two"]
    });

    expect(parseHybridValidationChecklistResult({ result: {} })).toBeNull();
    expect(
      parseHybridValidationChecklistResult({
        result: {
          profile: "normal",
          checks: ["lint", "test"]
        }
      })
    ).toEqual({
      profile: "normal",
      checks: ["lint", "test"]
    });

    expect(parseHybridDocConsistencyResult({ result: {} })).toBeNull();
    expect(
      parseHybridDocConsistencyResult({
        result: {
          overall: "clean",
          summary: "No issues",
          issues: ["none"]
        }
      })
    ).toEqual({
      overall: "clean",
      summary: "No issues",
      issues: ["none"]
    });
  });

  it("parses release results only when the changelog status is present", () => {
    expect(parseHybridPrepareReleaseResult({ ready: true })).toBeNull();
    expect(
      parseHybridPrepareReleaseResult({
        ready: true,
        changelog_status: {
          exists: true,
          tag: "v1.2.3",
          next_tag: "v1.2.4",
          version: "1.2.3",
          next_version: "1.2.4",
          summary: "Ready",
          already_published: false
        },
        prep_steps: ["bumped version"],
        prep_errors: ["none"]
      })
    ).toEqual({
      ready: true,
      changelog_status: {
        exists: true,
        tag: "v1.2.3",
        next_tag: "v1.2.4",
        version: "1.2.3",
        next_version: "1.2.4",
        summary: "Ready",
        already_published: false
      },
      prep_steps: ["bumped version"],
      prep_errors: ["none"]
    });

    expect(parseHybridPublishReleaseResult({ ready: true })).toBeNull();
    expect(
      parseHybridPublishReleaseResult({
        ready: true,
        changelog_status: {
          exists: true,
          tag: "v1.2.3",
          version: "1.2.3",
          summary: "Ready"
        },
        release_branch: {
          name: "release",
          current_branch: "main",
          exists: true,
          needs_update: false,
          can_fast_forward: true,
          suggestion: "Push the branch",
          command: "git push"
        },
        publish_result: {
          ok: true,
          blocking: ["none"],
          suggestion: "Publish"
        }
      })
    ).toEqual({
      ready: true,
      changelog_status: {
        exists: true,
        tag: "v1.2.3",
        version: "1.2.3",
        summary: "Ready"
      },
      release_branch: {
        name: "release",
        current_branch: "main",
        exists: true,
        needs_update: false,
        can_fast_forward: true,
        suggestion: "Push the branch",
        command: "git push"
      },
      publish_result: {
        ok: true,
        blocking: ["none"],
        suggestion: "Publish"
      }
    });
  });

  it("parses sources and runtime providers with narrow guards", () => {
    expect(parseHybridInsightsSources({})).toBeNull();
    expect(
      parseHybridInsightsSources({
        sources: {
          audit_log: "audit.jsonl",
          measurement_log: "measurements.jsonl"
        }
      })
    ).toEqual({
      audit_log: "audit.jsonl",
      measurement_log: "measurements.jsonl"
    });
    expect(parseHybridInsightsSources({ sources: { audit_log: 1 } as never })).toBeNull();

    expect(parseHybridRuntimeProviders({})).toEqual({});
    expect(
      parseHybridRuntimeProviders({
        providers: {
          openai: {
            name: "OpenAI",
            healthy: true,
            enabled: true,
            credential_present: false,
            selected_backend: "codex",
            endpoint: "https://example.invalid",
            model: "gpt-4.1",
            reasons: ["cached"]
          },
          invalid: "skip" as never
        }
      })
    ).toEqual({
      openai: {
        name: "OpenAI",
        healthy: true,
        enabled: true,
        credential_present: false,
        selected_backend: "codex",
        endpoint: "https://example.invalid",
        model: "gpt-4.1",
        reasons: ["cached"]
      }
    });
  });
});
