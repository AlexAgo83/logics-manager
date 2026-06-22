def _state_from_gates(gates: list[dict[str, Any]]) -> str:
    required = [gate for gate in gates if gate.get("required")]
    if any(gate["status"] in {"failed", "stale", "blocked"} for gate in required):
        return "blocked"
    if all(gate["status"] == "passed" for gate in required):
        return "ready"
    for gate in required:
        if gate["status"] in {"pending", "not_configured"}:
            return str(gate.get("state") or "planning")
    return "planning"


def release_status_payload(repo_root: Path) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        return _not_configured_payload(repo_root)
    contract = context.contract
    target_version, version_sources = _current_version(repo_root, contract)
    commit = _current_commit(repo_root)
    evidence = _load_evidence(repo_root, contract)
    raw_gates = contract.get("gates") if isinstance(contract.get("gates"), list) else []
    gates = [_gate_payload(gate, evidence, target_version, commit, contract) for gate in raw_gates if isinstance(gate, dict)]
    version_blocking_reasons = _version_source_blocking_reasons(version_sources)
    state = "blocked" if version_blocking_reasons else _state_from_gates(gates)
    blocking_reasons = [
        *version_blocking_reasons,
        *[f"{gate['id']}: {gate['blocking_reason']}" for gate in gates if gate.get("required") and gate.get("blocking_reason")],
    ]
    next_action = "Release evidence is complete." if state == "ready" else (blocking_reasons[0] if blocking_reasons else "Collect evidence for the next pending gate.")
    return {
        "ok": state == "ready",
        "configured": True,
        "state": state,
        "target_version": target_version,
        "commit": commit,
        "contract_path": CONTRACT_PATH.as_posix(),
        "version_sources": version_sources,
        "gates": gates,
        "blocking_reasons": blocking_reasons,
        "next_action": next_action,
        "evidence": evidence,
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_context_pack_payload(repo_root: Path) -> dict[str, Any]:
    status = release_status_payload(repo_root)
    gates = [
        {
            "id": gate.get("id"),
            "state": gate.get("state"),
            "required": gate.get("required"),
            "status": gate.get("status"),
            "blocking_reason": gate.get("blocking_reason"),
        }
        for gate in status.get("gates", [])
        if isinstance(gate, dict)
    ]
    return {
        "configured": bool(status.get("configured")),
        "target_version": status.get("target_version"),
        "state": status.get("state"),
        "next_action": status.get("next_action"),
        "contract_path": status.get("contract_path"),
        "required_gates": [gate for gate in gates if gate.get("required")],
        "blocking_reasons": status.get("blocking_reasons", []),
        "safe_actions": [
            "logics-manager release status",
            "logics-manager release plan <version>",
            "logics-manager release validate <version>",
        ],
        "publication_actions": [
            "GitHub release publication",
            "external publication",
        ],
        "guidance": [
            "Release readiness must come from project-owned evidence, not conversational memory.",
            "Use release status or validate before preparing or claiming release readiness.",
            "Publication-oriented actions are explicit operator actions and are separate from safe read/validate actions.",
        ],
    }


def release_plan_payload(repo_root: Path, version: str) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is None:
        payload = _not_configured_payload(repo_root)
        payload.update({"command": "release-plan", "target_version": version, "steps": []})
        return payload
    contract = context.contract
    steps: list[dict[str, Any]] = []
    for source in contract.get("version_sources", []):
        if isinstance(source, dict):
            steps.append({"kind": "version_source", "path": source.get("path"), "expected_version": version})
    changelog = contract.get("changelog") if isinstance(contract.get("changelog"), dict) else {}
    for path_rule in changelog.get("paths", []) if isinstance(changelog.get("paths"), list) else []:
        if isinstance(path_rule, dict) and isinstance(path_rule.get("path"), str):
            steps.append({"kind": "changelog", "path": _render_path_template(path_rule["path"], version), "required": path_rule.get("required", changelog.get("required", True))})
    for command in contract.get("validation_commands", []) if isinstance(contract.get("validation_commands"), list) else []:
        if isinstance(command, dict):
            steps.append({"kind": "validation_command", "id": command.get("id"), "command": command.get("command"), "required": command.get("required", True), "publication_action": False})
    git = contract.get("git") if isinstance(contract.get("git"), dict) else {}
    tag_policy = git.get("tag_policy") if isinstance(git.get("tag_policy"), dict) else {}
    steps.append({"kind": "git", "release_branch_policy": git.get("release_branch_policy"), "tag": str(tag_policy.get("pattern", "v{version}")).replace("{version}", version), "required": True, "publication_action": False})
    github_release = contract.get("github_release") if isinstance(contract.get("github_release"), dict) else {}
    steps.append({"kind": "github_release", "mode": github_release.get("mode"), "required": github_release.get("required", False), "publication_action": True})
    for external in contract.get("external_publication", []) if isinstance(contract.get("external_publication"), list) else []:
        if isinstance(external, dict):
            steps.append({"kind": "external_publication", "id": external.get("id"), "required": external.get("required", False), "url": str(external.get("url_template", "")).replace("{version}", version) if external.get("url_template") else None, "publication_action": True})
    return {
        "ok": True,
        "configured": True,
        "command": "release-plan",
        "target_version": version,
        "contract_path": CONTRACT_PATH.as_posix(),
        "steps": steps,
        "safe_read_validate_actions": ["release status", "release plan", "release validate"],
        "publication_requires_explicit_operator_action": True,
        "next_action": "Update release files, collect validation evidence, commit, push, verify CI, then publish explicitly.",
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def _read_json_file(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _read_text_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _project_identity(repo_root: Path) -> dict[str, str]:
    package_json = _read_json_file(repo_root / "package.json") or {}
    raw_name = package_json.get("name")
    if isinstance(raw_name, str) and raw_name.strip():
        project_id = raw_name.rsplit("/", 1)[-1].strip()
        display_name = project_id.replace("-", " ").replace("_", " ").title()
        return {"id": project_id, "display_name": display_name}
    pyproject = _read_text_file(repo_root / "pyproject.toml")
    project_match = re.search(r"(?m)^name\s*=\s*[\"']([^\"']+)[\"']", pyproject)
    if project_match:
        project_id = project_match.group(1).strip()
        return {"id": project_id, "display_name": project_id.replace("-", " ").replace("_", " ").title()}
    return {"id": repo_root.name, "display_name": repo_root.name.replace("-", " ").replace("_", " ").title()}


def _discover_version_sources(repo_root: Path) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    if (repo_root / "VERSION").is_file():
        sources.append({"path": "VERSION", "format": "plain_text", "required": True})
    if (repo_root / "package.json").is_file():
        sources.append({"path": "package.json", "format": "json", "selector": "version", "required": True})
    if (repo_root / "pyproject.toml").is_file():
        sources.append({"path": "pyproject.toml", "format": "toml", "selector": "project.version", "required": True})
    readme = repo_root / "README.md"
    if readme.is_file() and "img.shields.io/badge/version-v" in _read_text_file(readme):
        sources.append({"path": "README.md", "format": "plain_text", "selector": "badge.version", "required": False})
    if not sources:
        sources.append({"path": "VERSION", "format": "plain_text", "required": False})
    return sources


def _discover_changelog(repo_root: Path) -> dict[str, Any]:
    if (repo_root / "changelogs").is_dir():
        return {
            "required": True,
            "version_heading_required": True,
            "paths": [{"path": "changelogs/CHANGELOGS_{version_underscore}.md", "format": "markdown", "required": True}],
        }
    if (repo_root / "CHANGELOG.md").is_file():
        return {
            "required": True,
            "version_heading_required": True,
            "paths": [{"path": "CHANGELOG.md", "format": "markdown", "required": True}],
        }
    return {
        "required": True,
        "version_heading_required": True,
        "paths": [{"path": "CHANGELOG.md", "format": "markdown", "required": False}],
    }


def _package_scripts(repo_root: Path) -> dict[str, str]:
    package_json = _read_json_file(repo_root / "package.json") or {}
    scripts = package_json.get("scripts")
    return {key: value for key, value in scripts.items() if isinstance(key, str) and isinstance(value, str)} if isinstance(scripts, dict) else {}


def _discover_validation_commands(repo_root: Path) -> list[dict[str, Any]]:
    scripts = _package_scripts(repo_root)
    preferred = ["ci:check", "ci:blocking", "release:validate", "release:changelog:validate", "lint", "test", "build"]
    commands = []
    for script_name in preferred:
        if script_name in scripts:
            commands.append({"id": script_name.replace(":", "_"), "command": ["npm", "run", script_name], "required": True, "evidence_kind": "command"})
    if not commands and (repo_root / "pyproject.toml").is_file():
        commands.append({"id": "python_tests", "command": ["python3", "-m", "pytest"], "required": True, "evidence_kind": "command"})
    return commands


def _has_workflow(repo_root: Path, name: str) -> bool:
    workflows = repo_root / ".github" / "workflows"
    return any(path.name == name for path in workflows.glob("*")) if workflows.is_dir() else False


def _discover_external_publication(repo_root: Path) -> list[dict[str, Any]]:
    checks: list[dict[str, Any]] = []
    package_json = _read_json_file(repo_root / "package.json") or {}
    package_name = package_json.get("name")
    if isinstance(package_name, str) and package_name.strip():
        checks.append({"id": "npm_package", "kind": "package_registry", "required": _has_workflow(repo_root, "publish-npm.yml"), "url_template": f"https://www.npmjs.com/package/{package_name}/v/{{version}}"})
    pyproject = _read_text_file(repo_root / "pyproject.toml")
    project_match = re.search(r"(?m)^name\s*=\s*[\"']([^\"']+)[\"']", pyproject)
    if project_match:
        checks.append({"id": "pypi_package", "kind": "package_registry", "required": _has_workflow(repo_root, "publish-pypi.yml"), "url_template": f"https://pypi.org/project/{project_match.group(1)}/{{version}}/"})
    if (repo_root / "render.yaml").is_file():
        checks.append({"id": "production_deployment", "kind": "deployment", "required": True, "description": "Verify the production deployment for the target commit and version."})
    return checks


def release_discover_payload(repo_root: Path, *, write: bool = False, force: bool = False) -> dict[str, Any]:
    context = load_release_context(repo_root)
    if context.contract is not None and not force:
        return {
            "ok": True,
            "configured": True,
            "command": "release-discover",
            "contract_path": CONTRACT_PATH.as_posix(),
            "draft_path": None,
            "draft_written": False,
            "next_action": f"Use {CONTRACT_PATH.as_posix()} as the active release contract.",
            "generated_at": _now_iso(),
            "repo_root": repo_root.as_posix(),
        }

    identity = _project_identity(repo_root)
    external_publication = _discover_external_publication(repo_root)
    github_release_required = _has_workflow(repo_root, "release.yml") or _has_workflow(repo_root, "deploy-release.yml")
    draft: dict[str, Any] = {
        "schema_version": "1.0",
        "project": {**identity, "release_profile": "discovered-local"},
        "version_sources": _discover_version_sources(repo_root),
        "changelog": _discover_changelog(repo_root),
        "operator_intents": [
            {
                "utterance": "prepare release",
                "boundary": "Prepare metadata, changelog, and validation evidence only. Do not tag, push, publish, upload assets, or create a GitHub release unless explicitly requested.",
                "publication_action": False,
            },
            {
                "utterance": "commit and push, fix if CI is not green",
                "boundary": "Push first, then inspect the real remote CI run for the exact pushed commit before making fixes.",
                "publication_action": False,
            },
            {
                "utterance": "publish release",
                "boundary": "Publish only after required local and remote gates are green, then verify downstream publication or deployment evidence.",
                "publication_action": True,
            },
        ],
        "missing_contract_discovery": {
            "draft_path": {"path": DISCOVERY_DRAFT_PATH.as_posix(), "format": "json", "required": False},
            "local_first": True,
            "neighbor_projects_allowed": True,
            "local_sources": [
                {"path": "LOGICS.md", "required": False},
                {"path": "README.md", "required": False},
                {"path": "package.json", "required": False},
                {"path": "pyproject.toml", "required": False},
                {"path": ".github/workflows/", "required": False},
                {"path": "changelogs/", "required": False},
                {"path": "VERSION", "required": False},
                {"path": "checksums/", "required": False},
            ],
            "assistant_rule": "Infer this draft from local repository signals first. Use neighboring projects only as comparison evidence after local surfaces have been inspected.",
        },
        "state_machine": DEFAULT_STATE_MACHINE,
        "gates": [
            {"id": "version_metadata", "state": "preparing", "required": True, "evidence_kinds": ["file"]},
            {"id": "changelog", "state": "preparing", "required": True, "evidence_kinds": ["file"]},
            {"id": "local_validation", "state": "local_validation", "required": True, "evidence_kinds": ["command"]},
            {"id": "git_push", "state": "pushed", "required": True, "evidence_kinds": ["git"]},
            {"id": "ci", "state": "ci_verification", "required": True, "evidence_kinds": ["ci"]},
            {"id": "github_release", "state": "github_release", "required": github_release_required, "evidence_kinds": ["github_release"]},
        ],
        "evidence": {
            "store": {"path": "logics/release/evidence.jsonl", "format": "jsonl", "required": True},
            "freshness": {
                "match_target_version": True,
                "match_commit_for_source_gates": True,
                "match_tag_for_publication_gates": True,
            },
            "required_fields": ["kind", "status", "observed_at", "target_version", "commit", "summary"],
        },
        "validation_commands": _discover_validation_commands(repo_root),
        "git": {
            "release_branch_policy": "main_only",
            "allowed_branches": ["main"],
            "tag_policy": {"required": github_release_required, "pattern": "v{version}"},
            "require_clean_worktree": True,
            "require_pushed_commit": True,
        },
        "github_release": {
            "required": github_release_required,
            "mode": "gh_cli" if github_release_required else "manual",
            "draft_allowed": False,
            "asset_paths": [],
        },
        "assistant_readiness": {
            "must_inspect_status_before_claiming_ready": True,
            "readiness_source": "project_owned_evidence",
            "publication_requires_explicit_operator_approval": True,
        },
    }
    if external_publication:
        draft["external_publication"] = external_publication
        draft["gates"].extend(
            {"id": check["id"], "state": "external_publication", "required": bool(check.get("required")), "evidence_kinds": ["external"]}
            for check in external_publication
        )

    draft_path = repo_root / DISCOVERY_DRAFT_PATH
    if write:
        draft_path.parent.mkdir(parents=True, exist_ok=True)
        draft_path.write_text(json.dumps(draft, indent=2, sort_keys=False) + "\n", encoding="utf-8")

    return {
        "ok": True,
        "configured": False,
        "command": "release-discover",
        "contract_path": CONTRACT_PATH.as_posix(),
        "draft_path": DISCOVERY_DRAFT_PATH.as_posix(),
        "draft_written": write,
        "draft": draft,
        "local_sources": draft["missing_contract_discovery"]["local_sources"],
        "next_action": f"Review {DISCOVERY_DRAFT_PATH.as_posix()} and promote it to {CONTRACT_PATH.as_posix()} when it matches the repo release process.",
        "generated_at": _now_iso(),
        "repo_root": repo_root.as_posix(),
    }


def release_validate_payload(repo_root: Path, version: str) -> dict[str, Any]:
    status = release_status_payload(repo_root)
    checks: list[dict[str, Any]] = []
    if not status.get("configured"):
        return {**status, "command": "release-validate", "target_version": version, "checks": [{"id": "config", "status": "failed", "message": "release contract is missing"}]}
    contract = load_release_context(repo_root).contract or {}
    for result in status.get("version_sources", []):
        check_status = "passed" if result.get("ok") and result.get("version") == version else "failed"
        message = "version matches target" if check_status == "passed" else str(result.get("reason") or f"expected {version}, found {result.get('version')}")
        checks.append({"id": f"version:{result.get('path')}", "status": check_status, "message": message})
    changelog = contract.get("changelog") if isinstance(contract.get("changelog"), dict) else {}
    for path_rule in changelog.get("paths", []) if isinstance(changelog.get("paths"), list) else []:
        if isinstance(path_rule, dict) and isinstance(path_rule.get("path"), str) and path_rule.get("required", changelog.get("required", True)):
            rel_path = _render_path_template(path_rule["path"], version)
            exists = (repo_root / rel_path).is_file()
            checks.append({"id": f"changelog:{rel_path}", "status": "passed" if exists else "failed", "message": "file exists" if exists else "required changelog is missing"})
    clean = _worktree_clean(repo_root)
    git = contract.get("git") if isinstance(contract.get("git"), dict) else {}
    if git.get("require_clean_worktree", True):
        checks.append({"id": "git:clean_worktree", "status": "passed" if clean else "failed", "message": "worktree is clean" if clean else "worktree has changes or git is unavailable"})
    for gate in status.get("gates", []):
        if isinstance(gate, dict) and gate.get("required"):
            passed = gate.get("status") == "passed"
            checks.append({"id": f"gate:{gate.get('id')}", "status": "passed" if passed else "failed", "message": gate.get("blocking_reason") or gate.get("status")})
    ok = all(check["status"] == "passed" for check in checks)
    return {
        **status,
        "ok": ok,
        "command": "release-validate",
        "target_version": version,
        "checks": checks,
        "next_action": "Release validation passed." if ok else next((check["message"] for check in checks if check["status"] != "passed"), "Fix failing release checks."),
    }


def render_release_status(payload: dict[str, Any]) -> str:
    lines = [
        f"Release state: {payload['state']}",
        f"Configured: {'yes' if payload.get('configured') else 'no'}",
        f"Target version: {payload.get('target_version') or '<unknown>'}",
        f"Next action: {payload.get('next_action')}",
    ]
    gates = payload.get("gates") if isinstance(payload.get("gates"), list) else []
    if gates:
        lines.append("Gates:")
        for gate in gates:
            lines.append(f"- {gate['id']}: {gate['status']}" + (f" ({gate['blocking_reason']})" if gate.get("blocking_reason") else ""))
    return "\n".join(lines)


def render_release_plan(payload: dict[str, Any]) -> str:
    lines = [f"Release plan for {payload.get('target_version')}", f"Configured: {'yes' if payload.get('configured') else 'no'}"]
    steps = payload.get("steps") if isinstance(payload.get("steps"), list) else []
    for step in steps:
        label = step.get("id") or step.get("path") or step.get("kind")
        lines.append(f"- {step.get('kind')}: {label}")
    lines.append(f"Next action: {payload.get('next_action')}")
    return "\n".join(lines)


def render_release_discover(payload: dict[str, Any]) -> str:
    lines = [
        f"Release contract configured: {'yes' if payload.get('configured') else 'no'}",
        f"Draft path: {payload.get('draft_path') or '<none>'}",
        f"Draft written: {'yes' if payload.get('draft_written') else 'no'}",
        f"Next action: {payload.get('next_action')}",
    ]
    draft = payload.get("draft") if isinstance(payload.get("draft"), dict) else {}
    commands = draft.get("validation_commands") if isinstance(draft.get("validation_commands"), list) else []
    if commands:
        lines.append("Validation commands:")
        for command in commands:
            lines.append(f"- {command.get('id')}: {' '.join(command.get('command') or [])}")
    return "\n".join(lines)


def render_release_validate(payload: dict[str, Any]) -> str:
    lines = [f"Release validation: {'passed' if payload.get('ok') else 'failed'}", f"Target version: {payload.get('target_version') or '<unknown>'}"]
    for check in payload.get("checks", []) if isinstance(payload.get("checks"), list) else []:
        lines.append(f"- {check['id']}: {check['status']} ({check['message']})")
    lines.append(f"Next action: {payload.get('next_action')}")
    return "\n".join(lines)


def render_release_evidence_add(payload: dict[str, Any]) -> str:
    entry = payload.get("entry") if isinstance(payload.get("entry"), dict) else {}
    return "\n".join(
        [
            f"Release evidence recorded: {'yes' if payload.get('recorded') else 'no'}",
            f"Gate: {entry.get('gate_id') or '<unknown>'}",
            f"Status: {entry.get('status') or '<unknown>'}",
            f"Evidence store: {payload.get('evidence_path') or '<unknown>'}",
            f"Next action: {payload.get('next_action')}",
        ]
    )


