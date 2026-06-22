def _build_backlog_groom(repo_root: Path, request_ref: str) -> dict[str, object]:
    request_path = _assist._resolve_workflow_doc(repo_root, request_ref)
    if request_path is None:
        raise SystemExit(f"Unknown request ref `{request_ref}`.")
    if request_path.parent.name != "request":
        raise SystemExit(f"`backlog-groom` requires a request ref. Got `{request_ref}`.")

    lines = request_path.read_text(encoding="utf-8").splitlines()
    title = _extract_title_from_doc(request_path)
    backlog_title = title
    ref = _next_backlog_ref(repo_root, backlog_title)
    problem = _split_backlog_problem(lines)
    acceptance = _split_request_acceptance(lines)
    complexity = "High" if len(acceptance) >= 4 or "runtime" in title.lower() or "plugin" in title.lower() else "Medium"
    theme = "Operator workflow and runtime integration"
    scope_in = [
        "one coherent delivery slice from the source request",
    ]
    scope_out = [
        "unrelated sibling slices that should stay in separate backlog items instead of widening this doc",
    ]
    decision_product = "Not needed"
    decision_architecture = "Not needed"
    product_brief = "logics/product/prod_009_logics_cli_as_the_primary_operator_surface_and_unified_runtime_api.md"
    content = "\n".join(
        [
            f"## {ref} - {backlog_title}",
            f"> From version: {_parse_package_version(repo_root)}",
            "> Schema version: 1.0",
            "> Status: Ready",
            "> Understanding: 90%",
            "> Confidence: 85%",
            "> Progress: 0%",
            f"> Complexity: {complexity}",
            f"> Theme: {theme}",
            "> Reminder: Update status/understanding/confidence/progress and linked request/task references when you edit this doc.",
            "",
            "# Problem",
            *(problem or [f"Deliver the bounded slice for {backlog_title} without widening scope."]),
            "",
            "# Scope",
            "- In:",
            *[f"  - {item}" for item in scope_in],
            "- Out:",
            *[f"  - {item}" for item in scope_out],
            "",
            "# Acceptance criteria",
            *[f"- {item}" for item in acceptance or [
                "AC1: The backlog slice stays bounded and reviewable.",
                "AC2: The backlog slice preserves the request's core acceptance criteria.",
            ]],
            "",
            "# AC Traceability",
            *(f"- request-AC{idx + 1} -> This backlog slice. Proof: {item}" for idx, item in enumerate(acceptance or ["The request remains bounded and reviewable."])),
            "",
            "# Decision framing",
            f"- Product framing: {decision_product}",
            "- Product signals: (none detected)",
            "- Product follow-up: No product brief follow-up is expected based on current signals.",
            f"- Architecture framing: {decision_architecture}",
            "- Architecture signals: (none detected)",
            "- Architecture follow-up: No architecture decision follow-up is expected based on current signals.",
            "",
            "# Links",
            f"- Product brief(s): `{product_brief}`",
            "- Architecture decision(s): (none yet)",
            f"- Request: `logics/request/{request_ref}.md`",
            "- Primary task(s): (none yet)",
            "",
            "# AI Context",
            f"- Summary: {backlog_title}",
            f"- Keywords: backlog-groom, request, {backlog_title.lower()}, bounded slice",
            f"- Use when: Use when implementing or reviewing the delivery slice for {backlog_title}.",
            "- Skip when: Skip when the change is unrelated to this delivery slice or its linked request.",
            "",
            "# Priority",
            "- Impact:",
            "- Urgency:",
            "",
            "# Notes",
            f"- Hybrid rationale: Derived from request `{request_ref}` and kept bounded to one coherent delivery slice.",
            f"- Source file: `logics/request/{request_ref}.md`.",
            "- Generated locally by logics-manager.",
            "",
        ]
    ).rstrip() + "\n"
    return {
        "ref": ref,
        "title": backlog_title,
        "path": f"logics/backlog/{ref}.md",
        "request_ref": request_ref,
        "request_path": request_path.relative_to(repo_root).as_posix(),
        "content": content,
        "problem": problem,
        "acceptance": acceptance or [
            "AC1: The backlog slice stays bounded and reviewable.",
            "AC2: The backlog slice preserves the request's core acceptance criteria.",
        ],
        "complexity": complexity,
    }


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
            timeout=15,
        )
    except (OSError, subprocess.TimeoutExpired):
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
    if any(path.startswith("clients/vscode/src/") or path.startswith("clients/shared-web/media/") for path in changed_paths):
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


def _build_validation_checklist(changed_paths: list[str]) -> dict[str, object]:
    surface = _build_changed_surface_summary(changed_paths)
    checks: list[str] = [
        "Run `python3 -m pytest tests/python/test_logics_manager_cli.py -q`.",
        "Run `python3 -m compileall logics_manager`.",
        "Run `npm run lint:logics`.",
    ]
    if any(path.startswith("clients/vscode/src/") or path.startswith("clients/shared-web/media/") for path in changed_paths):
        checks.append("Run the plugin test suite that exercises the VS Code entrypoints.")
    if any(path.startswith("logics_manager/") for path in changed_paths):
        checks.append("Smoke-test `python3 -m logics_manager --help` and the affected native subcommands.")
    if any(path.startswith("logics/") for path in changed_paths):
        checks.append("Run `python3 -m logics_manager lint --require-status` and inspect the workflow docs manually.")
    if any(path.startswith("tests/") or path.startswith("tests/python/") for path in changed_paths):
        checks.append("Run the focused affected tests before broad regression sweeps.")
    if not changed_paths:
        checks.append("No validation needed beyond a clean smoke check; there are no tracked changes.")
    return {
        "profile": "deterministic",
        "checks": checks,
        "confidence": 0.91 if changed_paths else 1.0,
        "rationale": surface["summary"],
    }


def _build_test_impact_summary(changed_paths: list[str]) -> dict[str, object]:
    categories = _build_changed_surface_summary(changed_paths)["counts"]
    recommended: list[str] = []
    if "python-runtime" in categories:
        recommended.append("python3 -m pytest tests/python/test_logics_manager_cli.py -q")
    if "plugin" in categories:
        recommended.append("npm run lint")
    if "workflow-docs" in categories:
        recommended.append("npm run lint:logics")
    if "tests" in categories:
        recommended.append("python3 -m pytest tests/python/test_logics_manager_cli.py -q")
    if not recommended:
        recommended.append("python3 -m pytest tests/python/test_logics_manager_cli.py -q")
    return {
        "summary": "Recommended test order derived from the current change surface.",
        "categories": categories,
        "recommended_commands": list(dict.fromkeys(recommended)),
        "confidence": 0.88 if changed_paths else 1.0,
    }


