def _build_doc_consistency(repo_root: Path) -> dict[str, object]:
    doctor = _assist.doctor_payload(repo_root)
    lint = _assist.lint_payload(repo_root, require_status=True)
    issues: list[dict[str, object]] = []
    for issue in doctor["issues"]:
        issues.append(
            {
                "source": "doctor",
                "path": issue["path"],
                "message": issue["message"],
                "remediation": issue["remediation"],
                "code": issue["code"],
            }
        )
    for issue in lint["issues"]:
        issues.append(
            {
                "source": "lint",
                "path": issue["path"],
                "message": issue["message"],
                "remediation": "Update the doc so lint and workflow conventions stay aligned.",
                "code": "lint_issue",
            }
        )
    for warning in lint["warnings"]:
        issues.append(
            {
                "source": "lint",
                "path": warning["path"],
                "message": warning["message"],
                "remediation": "Review the warning and confirm it is intentional.",
                "code": "lint_warning",
            }
        )
    overall = "clean" if not issues else "issues-found"
    summary = "Workflow docs are consistent across doctor and lint checks." if overall == "clean" else "Workflow docs have consistency issues that should be reviewed."
    follow_up: list[str] = []
    if doctor["issue_count"]:
        follow_up.append("Fix the doctor issues first because they affect workflow shape and required indicators.")
    if lint["issue_count"]:
        follow_up.append("Fix lint issues next so changed docs preserve indicators and status conventions.")
    if lint["warning_count"]:
        follow_up.append("Review lint warnings to confirm they are intentional.")
    if not follow_up:
        follow_up.append("No follow-up required.")
    return {
        "overall": overall,
        "summary": summary,
        "issues": issues,
        "follow_up": follow_up,
        "confidence": 1.0 if overall == "clean" else 0.86,
        "doctor": {
            "ok": doctor["ok"],
            "issue_count": doctor["issue_count"],
            "workflow_doc_count": doctor["workflow_doc_count"],
            "missing_schema_version_count": doctor["missing_schema_version_count"],
        },
        "lint": {
            "ok": lint["ok"],
            "issue_count": lint["issue_count"],
            "warning_count": lint["warning_count"],
        },
    }


def _build_review_checklist(repo_root: Path) -> dict[str, object]:
    changed_paths = _assist._git_changed_paths(repo_root)
    surface = _build_changed_surface_summary(changed_paths)
    consistency = _build_doc_consistency(repo_root)
    checklist: list[str] = [
        "Read the diff with the native `diff-risk` summary before approving.",
        "Verify the impacted docs or code paths match the intended scope.",
    ]
    if surface["primary_category"] == "python-runtime":
        checklist.append("Run the Python CLI smoke tests for the modified runtime paths.")
    if surface["primary_category"] == "plugin":
        checklist.append("Run the plugin command paths touched by the change and confirm the UI still delegates correctly.")
    if surface["primary_category"] == "workflow-docs":
        checklist.append("Check `lint` and `doctor` output for workflow doc consistency.")
    if consistency["overall"] != "clean":
        checklist.append("Resolve doc consistency issues before merging.")
    else:
        checklist.append("Document checks are clean; confirm no hidden workflow regressions remain.")
    checklist.extend([
        "Confirm the change does not reintroduce a manual `skills/` bootstrap step.",
        "Confirm the change does not add a new compatibility residue for the old kit boundary.",
    ])
    return {
        "summary": surface["summary"],
        "surface": surface,
        "doc_consistency": {
            "overall": consistency["overall"],
            "confidence": consistency["confidence"],
            "doctor_issues": consistency["doctor"]["issue_count"],
            "lint_issues": consistency["lint"]["issue_count"],
        },
        "checklist": checklist,
        "confidence": 0.84 if changed_paths else 1.0,
    }


def _build_validation_summary(repo_root: Path) -> dict[str, object]:
    changed_paths = _assist._git_changed_paths(repo_root)
    doc_consistency = _build_doc_consistency(repo_root)
    validation_checklist = _build_validation_checklist(changed_paths)
    test_impact = _build_test_impact_summary(changed_paths)
    overall = "ok" if doc_consistency["overall"] == "clean" else "needs-attention"
    summary = "Repository validations look healthy." if overall == "ok" else "Repository validations need attention."
    next_actions = list(validation_checklist["checks"][:3])
    if doc_consistency["overall"] != "clean":
        next_actions.insert(0, "Fix doc consistency issues before moving forward.")
    if test_impact["recommended_commands"]:
        next_actions.append(f"Primary test command: {test_impact['recommended_commands'][0]}")
    return {
        "overall": overall,
        "summary": summary,
        "doc_consistency": {
            "overall": doc_consistency["overall"],
            "doctor_issues": doc_consistency["doctor"]["issue_count"],
            "lint_issues": doc_consistency["lint"]["issue_count"],
        },
        "validation_checklist": validation_checklist,
        "test_impact": test_impact,
        "next_actions": next_actions,
        "confidence": 0.9 if overall == "ok" else 0.82,
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


def _get_global_claude_home() -> Path:
    return Path(os.environ.get("LOGICS_CLAUDE_GLOBAL_HOME") or (Path.home() / ".claude")).resolve()


def _claude_bridge_status(_repo_root: Path) -> dict[str, object]:
    global_home = _get_global_claude_home()
    detected_variants: list[str] = []
    for variant in CLAUDE_BRIDGE_VARIANTS:
        command_path = global_home / str(variant["command_path"]).replace(".claude/", "")
        agent_path = global_home / str(variant["agent_path"]).replace(".claude/", "")
        if command_path.is_file() and agent_path.is_file():
            detected_variants.append(variant["id"])
    return {
        "available": bool(detected_variants),
        "preferred_variant": detected_variants[0] if detected_variants else None,
        "detected_variants": detected_variants,
        "supported_variants": [variant["id"] for variant in CLAUDE_BRIDGE_VARIANTS],
    }


def _render_claude_bridge_lines(variant: dict[str, object], prompt: str) -> tuple[str, str]:
    title = str(variant["title"])
    command_path = str(variant["command_path"])
    agent_path = str(variant["agent_path"])
    reviewer_nudge = variant.get("reviewer_nudge")

    command_lines = [
        f"# {title}",
        "",
        f"Use the published global {title.lower()} bridge for this project.",
        "",
        "Primary prompt:",
        prompt,
        "",
    ]
    agent_lines = [
        f"# {title} Agent",
        "",
        f"Use the published global {title.lower()} agent for this project.",
        "",
        "Default prompt:",
        prompt,
        "",
    ]
    if reviewer_nudge:
        command_lines.extend(["Reviewer nudge:", str(reviewer_nudge), ""])
        agent_lines.extend(["Reviewer nudge:", str(reviewer_nudge), ""])
    command_lines.extend(["References:", f"- `{agent_path}`", "- `logics_manager`", ""])
    agent_lines.extend(["References:", f"- `{command_path}`", "- `logics_manager`", ""])
    return "\n".join(command_lines), "\n".join(agent_lines)


def _build_claude_bridge_manifest(repo_root: Path) -> dict[str, object]:
    bridges: list[dict[str, object]] = []
    for variant in CLAUDE_BRIDGE_VARIANTS:
        prompt = str(variant.get("prompt_override") or variant["fallback_prompt"])
        command_content, agent_content = _render_claude_bridge_lines(variant, prompt)
        bridges.append(
            {
                "id": variant["id"],
                "title": variant["title"],
                "command_path": variant["command_path"],
                "agent_path": variant["agent_path"],
                "prompt": prompt,
                "command_content": command_content,
                "agent_content": agent_content,
            }
        )
    return {
        "command": "assist",
        "kind": "claude-bridge-manifest",
        "repo_root": repo_root.as_posix(),
        "bridge_count": len(bridges),
        "bridges": bridges,
    }


def _build_claude_instructions(repo_root: Path) -> dict[str, object]:
    content = "\n".join(
        [
            "# Codex Context",
            "",
            "This file defines the working context for Codex in this repository.",
            "",
            "## Workflow",
            "",
            "Use the canonical `logics-manager` CLI to create, promote, and finish Logics docs:",
            "",
            "- `python3 -m logics_manager flow new request --title \"...\"`",
            "- `python3 -m logics_manager flow promote request-to-backlog logics/request/req_NNN_*.md`",
            "- `python3 -m logics_manager flow finish task logics/tasks/task_NNN_*.md`",
            "- `python3 -m logics_manager lint --require-status`",
            "- `python3 -m logics_manager audit --legacy-cutoff-version 1.1.0 --group-by-doc`",
            "",
            "Claude runtime artifacts are generated outside the repository from the integrated runtime.",
            "Do not edit generated runtime artifacts by hand unless you are deliberately repairing a generated artifact.",
            "",
            "Do not edit indicator lines or workflow links by hand.",
            "",
        ]
    ).rstrip() + "\n"
    return {
        "command": "assist",
        "kind": "claude-instructions",
        "repo_root": repo_root.as_posix(),
        "path": "logics/instructions.md",
        "content": content,
        "line_count": len(content.splitlines()),
    }
