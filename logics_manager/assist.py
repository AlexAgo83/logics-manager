from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
import subprocess
from shutil import which
from typing import Any

from .config import find_repo_root, load_repo_config


DEFAULT_HYBRID_AUDIT_LOG = "logics/.cache/hybrid_assist_audit.jsonl"
DEFAULT_HYBRID_MEASUREMENT_LOG = "logics/.cache/hybrid_assist_measurements.jsonl"
DEFAULT_HYBRID_ROI_RECENT_LIMIT = 8
DEFAULT_HYBRID_ROI_WINDOW_DAYS = 14
DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN = 1200


CLAUDE_BRIDGE_VARIANTS: tuple[dict[str, str], ...] = (
    {
        "id": "hybrid-assist",
        "command_path": ".claude/commands/logics-assist.md",
        "agent_path": ".claude/agents/logics-hybrid-delivery-assistant.md",
    },
    {
        "id": "flow-manager",
        "command_path": ".claude/commands/logics-flow.md",
        "agent_path": ".claude/agents/logics-flow-manager.md",
    },
)

ASSIST_FLOW_DEFAULTS: dict[str, dict[str, object]] = {
    "context-pack": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
    "request-draft": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
    "next-step": {"mode": "diff-first", "profile": "deep", "include_graph": True, "include_registry": True, "include_doctor": True},
    "diff-risk": {"mode": "diff-first", "profile": "tiny", "include_graph": False, "include_registry": False, "include_doctor": False},
    "commit-plan": {"mode": "summary-only", "profile": "normal", "include_graph": False, "include_registry": False, "include_doctor": False},
}


def _get_nested(config: dict[str, object], *keys: str, default: object) -> object:
    current: object = config
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key, default)
    return default if current is None else current


def _hybrid_audit_log(config: dict[str, object]) -> str:
    return str(_get_nested(config, "hybrid_assist", "audit_log", default=DEFAULT_HYBRID_AUDIT_LOG))


def _hybrid_measurement_log(config: dict[str, object]) -> str:
    return str(_get_nested(config, "hybrid_assist", "measurement_log", default=DEFAULT_HYBRID_MEASUREMENT_LOG))


def _repo_path(repo_root: Path, value: str | None, default: str) -> Path:
    return (repo_root / (value or default)).resolve()


def _load_jsonl_records(path: Path) -> tuple[list[dict[str, Any]], int]:
    if not path.is_file():
        return [], 0
    records: list[dict[str, Any]] = []
    invalid_lines = 0
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            invalid_lines += 1
            continue
        if isinstance(payload, dict):
            records.append(payload)
        else:
            invalid_lines += 1
    return records, invalid_lines


def _parse_recorded_at(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _round_rate(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _normalize_reason_label(value: Any, fallback: str = "unspecified") -> str:
    text = "" if value is None else str(value).strip()
    return text or fallback


def _stringify_scalar(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value).strip()


def _summarize_validated_payload(payload: dict[str, Any]) -> str:
    for key in ("summary", "title", "subject", "overall", "classification", "risk"):
        text = _stringify_scalar(payload.get(key))
        if text:
            return " ".join(text.split())[:240]
    if isinstance(payload.get("decision"), dict):
        decision = payload["decision"]
        action = _stringify_scalar(decision.get("action"))
        target = _stringify_scalar(decision.get("target_ref"))
        confidence = decision.get("confidence")
        parts = [part for part in (action, target) if part]
        if confidence is not None:
            parts.append(f"confidence {confidence}")
        if parts:
            return "Decision: " + ", ".join(parts)
    return json.dumps(payload, sort_keys=True)[:240]


def _build_validated_excerpt(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    excerpt: dict[str, Any] = {}
    for key in ("summary", "title", "subject", "overall", "classification", "risk", "target_ref"):
        value = payload.get(key)
        if value not in (None, "", [], {}):
            excerpt[key] = value
    if isinstance(payload.get("decision"), dict):
        decision = payload["decision"]
        excerpt["decision"] = {
            "action": decision.get("action"),
            "target_ref": decision.get("target_ref"),
            "confidence": decision.get("confidence"),
        }
    return excerpt or None


def _fallback_triggered(record: dict[str, Any]) -> bool:
    requested = _stringify_scalar(record.get("backend_requested") or record.get("requested_backend"))
    used = _stringify_scalar(record.get("backend_used") or record.get("selected_backend"))
    return used == "codex" and requested in {"auto", "ollama", "openai", "gemini"}


def _measurement_review_recommended(record: dict[str, Any]) -> bool:
    if bool(record.get("review_recommended")):
        return True
    confidence = record.get("confidence")
    return isinstance(confidence, (int, float)) and float(confidence) < 0.7


def _audit_review_recommended(record: dict[str, Any]) -> bool:
    if bool(record.get("review_recommended")):
        return True
    if record.get("result_status") == "degraded":
        return True
    if record.get("degraded_reasons"):
        return True
    validated_payload = record.get("validated_payload")
    if isinstance(validated_payload, dict):
        confidence = validated_payload.get("confidence")
        if isinstance(confidence, (int, float)) and float(confidence) < 0.7:
            return True
        decision = validated_payload.get("decision")
        if isinstance(decision, dict):
            decision_confidence = decision.get("confidence")
            if isinstance(decision_confidence, (int, float)) and float(decision_confidence) < 0.7:
                return True
    return False


def _execution_path_label(requested_backend: str, used_backend: str) -> str:
    if used_backend == "ollama":
        return "local"
    if used_backend in {"openai", "gemini"}:
        return "remote"
    if used_backend == "deterministic":
        return "deterministic"
    if used_backend == "codex" and requested_backend in {"auto", "ollama", "openai", "gemini"}:
        return "fallback"
    if used_backend == "codex":
        return "codex-direct"
    return "unknown"


def _git_changed_paths(repo_root: Path) -> list[str]:
    try:
        completed = subprocess.run(
            ["git", "diff", "--name-only", "--relative=."],
            cwd=repo_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except OSError:
        return []
    if completed.returncode != 0:
        return []
    return [line.strip() for line in completed.stdout.splitlines() if line.strip()]


def _is_low_risk_generated_path(path: str) -> bool:
    normalized = path.strip().replace("\\", "/")
    filename = normalized.rsplit("/", 1)[-1]
    lowered = normalized.lower()
    return (
        filename in {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "Cargo.lock", "Pipfile.lock", "poetry.lock", "composer.lock"}
        or ".generated." in lowered
        or lowered.endswith(".snap")
        or lowered.startswith("dist/")
        or lowered.startswith("build/")
    )


def _is_schema_or_migration_path(path: str) -> bool:
    lowered = path.strip().replace("\\", "/").lower()
    return (
        "/migrations/" in lowered
        or lowered.startswith("migrations/")
        or "/migration/" in lowered
        or lowered.startswith("migration/")
        or lowered.endswith("schema.prisma")
        or lowered.endswith("schema.sql")
        or lowered.endswith("/schema.ts")
        or lowered.endswith("/schema.js")
        or "/db/schema" in lowered
        or "/alembic/" in lowered
    )


def _classify_diff_risk(changed_paths: list[str]) -> dict[str, object]:
    if not changed_paths:
        return {
            "risk": "low",
            "summary": "Deterministic pre-classifier marked the empty diff as low risk.",
            "drivers": ["No changed paths were detected in the working tree."],
            "confidence": 0.97,
            "rationale": "An empty diff does not require AI classification.",
            "classification_reason": "empty-diff",
        }
    if any(_is_schema_or_migration_path(path) for path in changed_paths):
        return {
            "risk": "high",
            "summary": "Deterministic pre-classifier escalated the diff because schema or migration files changed.",
            "drivers": ["The change surface includes schema or migration files that require careful review."],
            "confidence": 0.95,
            "rationale": "Schema and migration changes are treated as high risk without an AI round-trip.",
            "classification_reason": "schema-or-migration",
        }
    if all(_is_low_risk_generated_path(path) for path in changed_paths):
        return {
            "risk": "low",
            "summary": "Deterministic pre-classifier marked the diff as low risk because it only touches lock or generated files.",
            "drivers": ["Only lock-file or generated-artifact paths changed."],
            "confidence": 0.94,
            "rationale": "Lock-file-only and generated-only diffs are handled deterministically before any AI dispatch.",
            "classification_reason": "lock-or-generated-only",
        }
    return {
        "risk": "medium",
        "summary": "Deterministic pre-classifier marked the diff as medium risk because it includes general source edits.",
        "drivers": ["The diff includes non-generated source paths.", "No schema or migration paths were detected."],
        "confidence": 0.78,
        "rationale": "General source edits stay bounded but still deserve a review pass.",
        "classification_reason": "mixed-source",
    }


def _render_diff_risk_text(payload: dict[str, object]) -> str:
    lines = [
        f"Diff risk: {payload['risk']}",
        f"- summary: {payload['summary']}",
        f"- confidence: {payload['confidence']}",
        f"- changed paths: {len(payload['changed_paths'])}",
    ]
    for driver in payload["drivers"]:
        lines.append(f"- {driver}")
    return "\n".join(lines)


def _summarize_commit_scope(changed_paths: list[str]) -> tuple[str, str]:
    if not changed_paths:
        return "root", "No changes detected; nothing to commit."
    if any(path.startswith("src/") for path in changed_paths):
        return "plugin", "Plugin surface changes detected."
    if any(path.startswith("logics_manager/") for path in changed_paths):
        return "python-runtime", "Native Logics manager changes detected."
    if any(path.startswith("logics/") for path in changed_paths):
        return "docs", "Workflow documentation changes detected."
    return "misc", "Mixed repository changes detected."


def _build_commit_plan(changed_paths: list[str]) -> dict[str, object]:
    scope, rationale = _summarize_commit_scope(changed_paths)
    risk = _classify_diff_risk(changed_paths)
    subject = {
        "root": "chore: no changes",
        "plugin": "feat: update plugin runtime wiring",
        "python-runtime": "feat: extend native logics-manager runtime",
        "docs": "docs: update Logics workflow documentation",
        "misc": "chore: update repository changes",
    }.get(scope, "chore: update repository changes")
    body_lines = [
        f"- scope: {scope}",
        f"- changed paths: {len(changed_paths)}",
        f"- risk: {risk['risk']}",
        f"- rationale: {rationale}",
    ]
    if changed_paths:
        body_lines.append("- paths:")
        body_lines.extend(f"  - {path}" for path in changed_paths[:8])
        if len(changed_paths) > 8:
            body_lines.append(f"  - ... and {len(changed_paths) - 8} more")
    return {
        "subject": subject,
        "body": "\n".join(body_lines),
        "scope": scope,
        "confidence": 0.82 if changed_paths else 1.0,
        "rationale": rationale,
        "risk": risk["risk"],
        "changed_paths": changed_paths,
        "review_recommended": risk["risk"] != "low" or len(changed_paths) > 6,
    }


def _build_hybrid_roi_report(
    repo_root: Path,
    *,
    audit_log: Path,
    measurement_log: Path,
    recent_limit: int = DEFAULT_HYBRID_ROI_RECENT_LIMIT,
    window_days: int = DEFAULT_HYBRID_ROI_WINDOW_DAYS,
) -> dict[str, Any]:
    effective_recent_limit = max(1, recent_limit)
    effective_window_days = max(1, window_days)
    audit_records, audit_invalid_lines = _load_jsonl_records(audit_log)
    measurement_records, measurement_invalid_lines = _load_jsonl_records(measurement_log)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(days=effective_window_days)

    measurement_records_sorted = sorted(
        measurement_records,
        key=lambda record: _parse_recorded_at(record.get("recorded_at")) or datetime.min.replace(tzinfo=timezone.utc),
    )
    audit_records_sorted = sorted(
        audit_records,
        key=lambda record: _parse_recorded_at(record.get("recorded_at")) or datetime.min.replace(tzinfo=timezone.utc),
    )

    total_runs = len(measurement_records_sorted)
    by_flow: dict[str, dict[str, Any]] = {}
    backend_requested_counter: Counter[str] = Counter()
    backend_used_counter: Counter[str] = Counter()
    execution_path_counter: Counter[str] = Counter()
    result_status_counter: Counter[str] = Counter()
    recent_result_distribution_counter: Counter[str] = Counter()
    degraded_reason_counter: Counter[str] = Counter()
    fallback_reason_counter: Counter[str] = Counter()
    review_recommended_count = 0
    degraded_count = 0
    fallback_count = 0
    local_runs_count = 0

    for record in measurement_records_sorted:
        flow = _normalize_reason_label(record.get("flow"), fallback="unknown-flow")
        requested_backend = _normalize_reason_label(record.get("backend_requested"), fallback="unknown")
        used_backend = _normalize_reason_label(record.get("backend_used"), fallback="unknown")
        execution_path = _normalize_reason_label(record.get("execution_path"), fallback=_execution_path_label(requested_backend, used_backend))
        result_status = _normalize_reason_label(record.get("result_status"), fallback="unknown")
        review_recommended = _measurement_review_recommended(record)
        degraded_reasons = [
            _normalize_reason_label(reason)
            for reason in record.get("degraded_reasons", [])
            if _normalize_reason_label(reason)
        ]
        recorded_at = _parse_recorded_at(record.get("recorded_at"))

        backend_requested_counter[requested_backend] += 1
        backend_used_counter[used_backend] += 1
        execution_path_counter[execution_path] += 1
        result_status_counter[result_status] += 1
        if used_backend == "ollama":
            local_runs_count += 1
        if review_recommended:
            review_recommended_count += 1
        if result_status == "degraded" or degraded_reasons:
            degraded_count += 1
        if _fallback_triggered(record):
            fallback_count += 1

        if recorded_at is not None and recorded_at >= window_start:
            recent_result_distribution_counter[result_status] += 1
        for reason in degraded_reasons:
            degraded_reason_counter[reason] += 1

        flow_bucket = by_flow.setdefault(
            flow,
            {
                "run_count": 0,
                "backend_requested": {},
                "backend_used": {},
                "execution_paths": {},
                "result_statuses": {},
                "fallback_count": 0,
                "degraded_count": 0,
                "review_recommended_count": 0,
            },
        )
        flow_bucket["run_count"] += 1
        flow_bucket["backend_requested"][requested_backend] = flow_bucket["backend_requested"].get(requested_backend, 0) + 1
        flow_bucket["backend_used"][used_backend] = flow_bucket["backend_used"].get(used_backend, 0) + 1
        flow_bucket["execution_paths"][execution_path] = flow_bucket["execution_paths"].get(execution_path, 0) + 1
        flow_bucket["result_statuses"][result_status] = flow_bucket["result_statuses"].get(result_status, 0) + 1
        if _fallback_triggered(record):
            flow_bucket["fallback_count"] += 1
        if result_status == "degraded" or degraded_reasons:
            flow_bucket["degraded_count"] += 1
        if review_recommended:
            flow_bucket["review_recommended_count"] += 1

    for flow_bucket in by_flow.values():
        run_count = int(flow_bucket["run_count"])
        flow_bucket["fallback_rate"] = _round_rate(int(flow_bucket["fallback_count"]), run_count)
        flow_bucket["degraded_rate"] = _round_rate(int(flow_bucket["degraded_count"]), run_count)
        flow_bucket["review_recommended_rate"] = _round_rate(int(flow_bucket["review_recommended_count"]), run_count)

    recent_runs: list[dict[str, Any]] = []
    for audit_record in reversed(audit_records_sorted):
        backend = audit_record.get("backend")
        backend_requested = "unknown"
        backend_used = "unknown"
        if isinstance(backend, dict):
            backend_requested = _normalize_reason_label(backend.get("requested_backend"), fallback="unknown")
            backend_used = _normalize_reason_label(backend.get("selected_backend"), fallback="unknown")
            backend_reason_values = backend.get("reasons")
            if isinstance(backend_reason_values, list):
                for reason in backend_reason_values:
                    if backend_used == "codex" and backend_requested in {"auto", "ollama"}:
                        fallback_reason_counter[_normalize_reason_label(reason)] += 1
        transport = audit_record.get("transport") if isinstance(audit_record.get("transport"), dict) else {}
        if backend_used == "codex" and backend_requested in {"auto", "ollama"}:
            transport_reason = transport.get("reason") if isinstance(transport, dict) else None
            fallback_reason_counter[_normalize_reason_label(transport_reason)] += 1
        recent_runs.append(
            {
                "recorded_at": audit_record.get("recorded_at"),
                "flow": _normalize_reason_label(audit_record.get("flow"), fallback="unknown-flow"),
                "result_status": _normalize_reason_label(audit_record.get("result_status"), fallback="unknown"),
                "backend_requested": backend_requested,
                "backend_used": backend_used,
                "execution_path": _execution_path_label(backend_requested, backend_used),
                "degraded_reasons": [
                    _normalize_reason_label(reason)
                    for reason in audit_record.get("degraded_reasons", [])
                    if _normalize_reason_label(reason)
                ],
                "review_recommended": _audit_review_recommended(audit_record),
                "safety_class": _normalize_reason_label(audit_record.get("safety_class"), fallback="unknown"),
                "seed_ref": (
                    audit_record.get("context_summary", {}).get("seed_ref")
                    if isinstance(audit_record.get("context_summary"), dict)
                    else None
                ),
                "transport": transport if isinstance(transport, dict) else {},
                "validated_summary": _summarize_validated_payload(audit_record.get("validated_payload", {}))
                if isinstance(audit_record.get("validated_payload"), dict)
                else "",
                "validated_excerpt": _build_validated_excerpt(audit_record.get("validated_payload")),
            }
        )
        if len(recent_runs) >= effective_recent_limit:
            break

    recent_runs.reverse()
    fallback_heavy = _round_rate(fallback_count, total_runs) >= 0.25 if total_runs else False
    degraded_heavy = _round_rate(degraded_count, total_runs) >= 0.2 if total_runs else False
    review_heavy = _round_rate(review_recommended_count, total_runs) >= 0.35 if total_runs else False
    local_offload_rate = _round_rate(local_runs_count, total_runs)
    estimated_remote_token_avoidance = local_runs_count * DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN

    health_summary: list[str] = []
    if total_runs == 0:
        health_summary.append("No hybrid assist measurement records are available yet.")
    else:
        if fallback_heavy:
            health_summary.append("Fallback routing is elevated, which suggests local backend instability or explicit codex preference.")
        if degraded_heavy:
            health_summary.append("Degraded outcomes are elevated and should be reviewed before treating the ROI proxies as healthy.")
        if review_heavy:
            health_summary.append("Review-recommended outcomes are frequent, so operator follow-up remains important.")
        if not health_summary:
            health_summary.append("Recent hybrid assist activity looks operationally healthy under the current bounded metrics.")

    return {
        "schema_version": "1.0",
        "report_kind": "hybrid-assist-roi-report",
        "generated_at": now.isoformat(),
        "ok": True,
        "sources": {
            "audit_log": audit_log.relative_to(repo_root).as_posix() if audit_log.is_absolute() else audit_log.as_posix(),
            "measurement_log": measurement_log.relative_to(repo_root).as_posix() if measurement_log.is_absolute() else measurement_log.as_posix(),
            "audit_records": len(audit_records_sorted),
            "measurement_records": total_runs,
            "invalid_audit_lines": audit_invalid_lines,
            "invalid_measurement_lines": measurement_invalid_lines,
        },
        "limits": {
            "recent_limit": effective_recent_limit,
            "window_days": effective_window_days,
            "window_start": window_start.isoformat(),
        },
        "semantics": {
            "measured": "Values under `measured` come directly from hybrid assist measurement records and recent audit provenance.",
            "derived": "Values under `derived` are deterministic summaries or rates computed from measured counters.",
            "estimated": "Values under `estimated` are conservative proxies only. They are not billing truth and must be read alongside degraded and fallback rates.",
        },
        "measured": {
            "totals": {
                "runs": total_runs,
                "fallback_runs": fallback_count,
                "degraded_runs": degraded_count,
                "review_recommended_runs": review_recommended_count,
                "local_runs": local_runs_count,
            },
            "runs_by_flow": dict(sorted((flow, bucket["run_count"]) for flow, bucket in by_flow.items())),
            "backend_requested": dict(sorted(backend_requested_counter.items())),
            "backend_used": dict(sorted(backend_used_counter.items())),
            "execution_paths": dict(sorted(execution_path_counter.items())),
            "result_statuses": dict(sorted(result_status_counter.items())),
            "review_recommended_by_flow": {flow: bucket["review_recommended_count"] for flow, bucket in sorted(by_flow.items())},
            "recent_result_distribution": dict(sorted(recent_result_distribution_counter.items())),
            "flow_breakdown": dict(sorted(by_flow.items())),
        },
        "derived": {
            "rates": {
                "fallback_rate": _round_rate(fallback_count, total_runs),
                "degraded_rate": _round_rate(degraded_count, total_runs),
                "review_recommended_rate": _round_rate(review_recommended_count, total_runs),
                "local_offload_rate": local_offload_rate,
            },
            "dispatch_split": [{"label": label, "count": count} for label, count in backend_used_counter.most_common()],
            "execution_path_split": [{"label": label, "count": count} for label, count in execution_path_counter.most_common()],
            "top_degraded_reasons": [{"label": label, "count": count} for label, count in degraded_reason_counter.most_common(5)],
            "top_fallback_reasons": [{"label": label, "count": count} for label, count in fallback_reason_counter.most_common(5)],
            "health_summary": health_summary,
            "report_state": {
                "fallback_heavy": fallback_heavy,
                "degraded_heavy": degraded_heavy,
                "review_heavy": review_heavy,
            },
        },
        "estimated": {
            "assumptions": {
                "remote_tokens_per_local_run": DEFAULT_ESTIMATED_REMOTE_TOKENS_PER_LOCAL_RUN,
                "token_avoidance_note": "Each successful local Ollama run is treated as one avoided remote assist dispatch with a conservative illustrative token budget.",
                "interpretation_note": "Use these proxies for relative trend review only. They are not exact cost or billing metrics.",
            },
            "proxies": {
                "estimated_remote_dispatches_avoided": local_runs_count,
                "estimated_remote_token_avoidance": estimated_remote_token_avoidance,
                "estimated_local_offload_share": local_offload_rate,
            },
        },
        "recent_runs": recent_runs,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="logics-manager assist",
        description="Inspect the local assist/runtime surface.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    runtime = sub.add_parser("runtime-status", help="Report local assist runtime readiness.")
    runtime.add_argument("--backend")
    runtime.add_argument("--model-profile")
    runtime.add_argument("--model")
    runtime.add_argument("--ollama-host")
    runtime.add_argument("--timeout", type=float)
    runtime.add_argument("--format", choices=("text", "json"), default="text")
    runtime.add_argument("--out", help="Write the JSON status payload to this relative path.")
    runtime.add_argument("--dry-run", action="store_true")
    runtime.set_defaults(func=cmd_runtime_status)

    diff_risk = sub.add_parser("diff-risk", help="Classify the current git diff using deterministic heuristics.")
    diff_risk.add_argument("--format", choices=("text", "json"), default="text")
    diff_risk.add_argument("--dry-run", action="store_true")
    diff_risk.set_defaults(func=cmd_diff_risk)

    commit_plan = sub.add_parser("commit-plan", help="Draft a minimal commit plan from the current git diff.")
    commit_plan.add_argument("--format", choices=("text", "json"), default="text")
    commit_plan.add_argument("--dry-run", action="store_true")
    commit_plan.set_defaults(func=cmd_commit_plan)

    roi = sub.add_parser("roi-report", help="Summarize hybrid assist ROI from local audit and measurement logs.")
    roi.add_argument("--audit-log")
    roi.add_argument("--measurement-log")
    roi.add_argument("--recent-limit", type=int, default=DEFAULT_HYBRID_ROI_RECENT_LIMIT)
    roi.add_argument("--window-days", type=int, default=DEFAULT_HYBRID_ROI_WINDOW_DAYS)
    roi.add_argument("--format", choices=("text", "json"), default="text")
    roi.add_argument("--out", help="Write the JSON report payload to this relative path.")
    roi.add_argument("--dry-run", action="store_true")
    roi.set_defaults(func=cmd_roi_report)

    context = sub.add_parser("context", help="Build a shared assist context bundle for a flow.")
    context.add_argument("flow_name", choices=tuple(sorted(ASSIST_FLOW_DEFAULTS.keys())))
    context.add_argument("ref", nargs="?", help="Optional workflow ref for flows that target a doc.")
    context.add_argument("--context-mode", choices=("summary-only", "diff-first", "full"))
    context.add_argument("--profile", choices=("tiny", "normal", "deep"))
    context.add_argument("--include-graph", action="store_true", default=None)
    context.add_argument("--include-registry", action="store_true", default=None)
    context.add_argument("--include-doctor", action="store_true", default=None)
    context.add_argument("--format", choices=("text", "json"), default="text")
    context.add_argument("--out", help="Write the JSON context bundle to this relative path.")
    context.add_argument("--dry-run", action="store_true")
    context.set_defaults(func=cmd_context)

    return parser


def _claude_bridge_status(repo_root: Path) -> dict[str, object]:
    detected_variants: list[str] = []
    for variant in CLAUDE_BRIDGE_VARIANTS:
        if (repo_root / variant["command_path"]).is_file() and (repo_root / variant["agent_path"]).is_file():
            detected_variants.append(variant["id"])
    return {
        "available": bool(detected_variants),
        "preferred_variant": detected_variants[0] if detected_variants else None,
        "detected_variants": detected_variants,
        "supported_variants": [variant["id"] for variant in CLAUDE_BRIDGE_VARIANTS],
    }


def _select_backend(requested_backend: str | None, bridge_status: dict[str, object]) -> tuple[str, list[str]]:
    if requested_backend and requested_backend != "auto":
        return requested_backend, []
    if bridge_status.get("available"):
        return "codex", ["claude bridge files detected"]
    return "deterministic", ["no bridge files detected"]


def _workflow_docs(repo_root: Path) -> list[Path]:
    docs: list[Path] = []
    for directory in ("request", "backlog", "tasks"):
        docs.extend(sorted((repo_root / "logics" / directory).glob("*.md")))
    return docs


def _build_context_pack(repo_root: Path, seed_ref: str, *, mode: str, profile: str) -> dict[str, object]:
    docs = _workflow_docs(repo_root)
    selected: list[Path] = []
    for path in docs:
        text = path.read_text(encoding="utf-8")
        if seed_ref in path.stem or seed_ref in text:
            selected.append(path)
    if not selected:
        selected = docs[:4]
    selected = selected[: {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)]
    return {
        "ref": seed_ref,
        "mode": mode,
        "profile": profile,
        "budgets": {"max_docs": {"tiny": 2, "normal": 4, "deep": 8}.get(profile, 4)},
        "changed_paths": [],
        "docs": [
            {
                "ref": path.stem,
                "path": path.relative_to(repo_root).as_posix(),
                "kind": path.parent.name,
                "title": path.read_text(encoding="utf-8").splitlines()[0].replace("#", "").strip() if path.read_text(encoding="utf-8").splitlines() else path.stem,
            }
            for path in selected
        ],
        "estimates": {
            "doc_count": len(selected),
            "char_count": sum(len(path.read_text(encoding="utf-8")) for path in selected),
        },
    }


def cmd_diff_risk(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    changed_paths = _git_changed_paths(repo_root)
    classification = _classify_diff_risk(changed_paths)
    payload = {
        "command": "assist",
        "kind": "diff-risk",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "changed_paths": changed_paths,
        **classification,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(_render_diff_risk_text(payload))
    return payload


def cmd_commit_plan(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    changed_paths = _git_changed_paths(repo_root)
    plan = _build_commit_plan(changed_paths)
    payload = {
        "command": "assist",
        "kind": "commit-plan",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        **plan,
    }
    if args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Commit plan: {payload['subject']}")
        print(f"- scope: {payload['scope']}")
        print(f"- confidence: {payload['confidence']}")
        print(f"- review recommended: {'yes' if payload['review_recommended'] else 'no'}")
    return payload


def cmd_roi_report(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    audit_log = _repo_path(repo_root, args.audit_log, _hybrid_audit_log(config))
    measurement_log = _repo_path(repo_root, args.measurement_log, _hybrid_measurement_log(config))
    payload = _build_hybrid_roi_report(
        repo_root,
        audit_log=audit_log,
        measurement_log=measurement_log,
        recent_limit=args.recent_limit,
        window_days=args.window_days,
    )
    payload["command"] = "assist"
    payload["kind"] = "roi-report"
    payload["repo_root"] = repo_root.as_posix()
    payload["config_path"] = str(config_path.relative_to(repo_root)) if config_path is not None else None

    if args.out:
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Assist ROI report: OK")
        print(f"- runs: {payload['measured']['totals']['runs']}")
        print(f"- local offload rate: {payload['derived']['rates']['local_offload_rate']}")
        print(f"- estimated remote token avoidance: {payload['estimated']['proxies']['estimated_remote_token_avoidance']}")
    return payload


def cmd_runtime_status(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    hybrid = config.get("hybrid_assist", {})
    model_profiles = hybrid.get("model_profiles", {}) if isinstance(hybrid, dict) else {}
    default_profile = args.model_profile or str(hybrid.get("default_model_profile", "unknown"))
    profile_entry = model_profiles.get(default_profile, {}) if isinstance(model_profiles, dict) else {}
    bridge_status = _claude_bridge_status(repo_root)

    requested_backend = args.backend or str(hybrid.get("default_backend", "auto"))
    selected_backend, reasons = _select_backend(requested_backend, bridge_status)
    resolved_model = args.model or str(profile_entry.get("model") or hybrid.get("default_model", "unknown"))
    resolved_host = args.ollama_host or str(hybrid.get("ollama_host", "http://127.0.0.1:11434"))
    timeout_seconds = args.timeout or float(hybrid.get("timeout_seconds", 20.0))

    payload = {
        "command": "assist",
        "kind": "runtime-status",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "requested_backend": requested_backend,
        "selected_backend": selected_backend,
        "selection_reasons": reasons,
        "requested_model_profile": args.model_profile,
        "resolved_model_profile": default_profile,
        "requested_model": args.model,
        "resolved_model": resolved_model,
        "ollama_host": resolved_host,
        "timeout_seconds": timeout_seconds,
        "bridge_status": bridge_status,
        "runtime_commands": {
            "codex": which("codex"),
            "python": which("python3"),
        },
        "healthy": bool(bridge_status["available"]) or selected_backend == "deterministic",
        "model_profiles": sorted(model_profiles.keys()) if isinstance(model_profiles, dict) else [],
    }

    if args.out:
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print("Assist runtime status: " + ("OK" if payload["healthy"] else "DEGRADED"))
        print(f"- selected backend: {selected_backend}")
        print(f"- model profile: {default_profile}")
        print(f"- model: {resolved_model}")
        print(f"- bridge available: {'yes' if bridge_status['available'] else 'no'}")
        if bridge_status["preferred_variant"]:
            print(f"- bridge variant: {bridge_status['preferred_variant']}")
    return payload


def cmd_context(args: argparse.Namespace) -> dict[str, object]:
    repo_root = find_repo_root(Path.cwd())
    config, config_path = load_repo_config(repo_root)
    spec = ASSIST_FLOW_DEFAULTS[args.flow_name]
    context_mode = args.context_mode or spec["mode"]
    profile = args.profile or spec["profile"]
    bridge_status = _claude_bridge_status(repo_root)
    payload = {
        "command": "assist",
        "kind": "context",
        "repo_root": repo_root.as_posix(),
        "config_path": str(config_path.relative_to(repo_root)) if config_path is not None else None,
        "flow_name": args.flow_name,
        "seed_ref": args.ref,
        "context_profile": {
            "mode": context_mode,
            "profile": profile,
            "include_graph": args.include_graph if args.include_graph is not None else spec["include_graph"],
            "include_registry": args.include_registry if args.include_registry is not None else spec["include_registry"],
            "include_doctor": args.include_doctor if args.include_doctor is not None else spec["include_doctor"],
        },
        "contract": spec,
        "assist_schema_version": "1.0",
        "bridge_status": bridge_status,
        "context_pack": _build_context_pack(
            repo_root,
            args.ref,
            mode=context_mode,
            profile=profile,
        ) if args.ref else {
            "ref": None,
            "mode": context_mode,
            "profile": profile,
            "budgets": {"max_docs": 0},
            "changed_paths": [],
            "docs": [],
            "estimates": {"doc_count": 0, "char_count": 0},
        },
    }

    if args.out:
        out_path = (repo_root / args.out).resolve()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(serialized, encoding="utf-8")
        print(f"Wrote {out_path.relative_to(repo_root)}")
        payload["output_path"] = out_path.relative_to(repo_root).as_posix()
    elif args.format == "json":
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(f"Assist context: {args.flow_name}")
        print(f"- ref: {args.ref or '<flow-default>'}")
        print(f"- mode: {context_mode}")
        print(f"- profile: {profile}")
        print(f"- bridge available: {'yes' if bridge_status['available'] else 'no'}")
    return payload


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    payload = args.func(args)
    return 0 if isinstance(payload, dict) else 1
