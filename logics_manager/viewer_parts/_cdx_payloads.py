def _bounded_process_text(value: str, limit: int = 12000) -> str:
    text = value.strip()
    if len(text) <= limit:
        return text
    return f"{text[:limit]}\n... truncated ..."


def cdx_mission_plan_payload(
    repo_root: Path,
    body: dict[str, Any],
    *,
    cdx_runner: Any | None = None,
    git_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    tool_which = which or shutil.which
    if not tool_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "plan": None}
    mission_id = str(body.get("missionId") or CDX_DEFAULT_MISSION_ID)
    mission = CDX_MISSION_CATALOG.get(mission_id)
    if mission is None:
        return {"state": "error", "message": "Unknown CDX mission.", "plan": None}
    strength = str(body.get("strengthId") or "standard")
    strength_def = CDX_MISSION_STRENGTHS.get(strength)
    if strength_def is None:
        return {"state": "error", "message": "Unknown CDX mission strength.", "plan": None}
    model = _mission_text_input(body, "model", max_chars=120)
    reasoning_effort = _mission_text_input(body, "reasoningEffort", max_chars=20)
    power = _mission_text_input(body, "power", max_chars=20)
    if reasoning_effort and reasoning_effort not in CDX_MISSION_LEVELS:
        return {"state": "error", "message": "Unknown CDX reasoning effort.", "plan": None}
    if power and power not in CDX_MISSION_LEVELS:
        return {"state": "error", "message": "Unknown CDX model power.", "plan": None}
    effective_reasoning_effort = reasoning_effort or str(strength_def.get("reasoningEffort") or "medium")
    effective_power = power or str(strength_def.get("power") or "medium")

    status_payload = cdx_status_payload(repo_root, runner=cdx_runner, which=which)
    session = _normalize_cdx_session(body.get("sessionId"), status_payload if status_payload.get("state") == "ok" else None)
    if not session:
        sessions = _cdx_status_sessions(status_payload)
        session = sessions[0] if sessions else ""
    if not session:
        return {"state": "error", "message": "No usable CDX session is available.", "plan": None, "status": status_payload}

    release_tag = ""
    warnings: list[str] = []
    mission_inputs: dict[str, str] = {}
    if mission_id == "wish-to-request":
        wish_text = _mission_text_input(body, "wishText")
        if not wish_text:
            return {"state": "error", "message": "Enter a wish or intent before previewing this mission.", "plan": None, "catalog": cdx_mission_catalog_payload(), "status": status_payload}
        mission_inputs["wishText"] = wish_text
    if mission_id in {"full-audit", "release-review"}:
        mission_inputs["directFixes"] = "true" if _mission_bool_input(body, "directFixes") else "false"
    if mission_id == "pre-release":
        release_version = _mission_text_input(body, "releaseVersion", max_chars=40)
        if not re.fullmatch(r"v\d+\.\d+\.\d+", release_version):
            return {"state": "error", "message": "Enter a semantic version in vX.X.X format before previewing this mission.", "plan": None, "catalog": cdx_mission_catalog_payload(), "status": status_payload}
        mission_inputs["releaseVersion"] = release_version
        mission_inputs["runFullValidation"] = "true" if _mission_bool_input(body, "runFullValidation") else "false"
    if mission.get("requiresReleaseTag"):
        release_tag = _latest_release_tag(repo_root, runner=git_runner, which=which)
        if not release_tag:
            return {"state": "error", "message": "No release tag was found for this mission.", "plan": None, "status": status_payload}
    if status_payload.get("state") != "ok":
        warnings.append(str(status_payload.get("message") or "CDX status could not be confirmed."))

    requested_file_writes = _mission_bool_input(body, "allowFileWrites")
    requested_commit_at_end = _mission_bool_input(body, "commitAtEnd")
    direct_fixes = mission_inputs.get("directFixes") == "true"
    supports_file_writes = bool(mission.get("supportsFileWrites", True))
    requires_file_writes = bool(mission.get("requiresFileWrites"))
    allow_file_writes = (requested_file_writes or direct_fixes or requires_file_writes) and supports_file_writes
    commit_at_end = requested_commit_at_end and allow_file_writes
    if requested_file_writes and not supports_file_writes:
        warnings.append("This mission is plan-first; direct CDX file writes are disabled. Use Apply allowed actions after CDX returns actions.")
    if requested_commit_at_end and not allow_file_writes:
        warnings.append("Commit-at-end was requested but direct file writes are disabled for this mission.")
    permission = _cdx_mission_permission(allow_file_writes=allow_file_writes)
    prompt_override = _mission_prompt_override(body)
    command = _cdx_mission_command(
        repo_root,
        mission_id,
        session=session,
        strength=strength_def,
        model=model,
        reasoning_effort=reasoning_effort,
        power=power,
        release_tag=release_tag,
        mission_inputs=mission_inputs,
        allow_file_writes=allow_file_writes,
        commit_at_end=commit_at_end,
        prompt_override=prompt_override,
    )
    prompt_text = ""
    if "--prompt" in command:
        prompt_index = command.index("--prompt")
        if prompt_index + 1 < len(command):
            prompt_text = command[prompt_index + 1]
    if prompt_override:
        warnings.append("Using an operator-edited prompt. Session, permission, and timeout remain enforced by the server.")
    plan = {
        "mission": mission,
        "missionId": mission_id,
        "sessionId": session,
        "strength": strength_def,
        "strengthId": strength,
        "model": model,
        "reasoningEffort": effective_reasoning_effort,
        "power": effective_power,
        "missionInputs": mission_inputs,
        "prompt": prompt_text,
        "promptEdited": bool(prompt_override),
        "scope": mission["scope"],
        "releaseTag": release_tag,
        "allowFileWrites": allow_file_writes,
        "requestedFileWrites": requested_file_writes,
        "commitAtEnd": commit_at_end,
        "requestedCommitAtEnd": requested_commit_at_end,
        "supportsFileWrites": supports_file_writes,
        "permission": permission,
        "timeoutSeconds": _cdx_mission_timeout(strength_def, allow_file_writes=allow_file_writes, commit_at_end=commit_at_end),
        "command": ["cdx", *command],
        "arguments": command,
        "warnings": warnings,
        "requiresConfirmation": bool(mission.get("requiresPlanConfirmation")),
        "canRun": True,
    }
    if mission_id == "corpus-ready":
        plan["allowedPlanActions"] = [
            "promote-request-to-backlog",
            "promote-backlog-to-task",
            "refresh-corpus-context",
        ]
    return {"state": "ok", "message": "", "plan": plan, "catalog": cdx_mission_catalog_payload(), "status": status_payload}


def cdx_mission_run_payload(
    repo_root: Path,
    body: dict[str, Any],
    *,
    cdx_runner: Any | None = None,
    git_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    plan_payload = cdx_mission_plan_payload(repo_root, body, cdx_runner=cdx_runner, git_runner=git_runner, which=which)
    if plan_payload.get("state") != "ok":
        return {"state": plan_payload.get("state") or "error", "message": plan_payload.get("message") or "Unable to plan CDX mission.", "plan": plan_payload.get("plan"), "run": None}
    plan = plan_payload["plan"]
    timeout = int(plan.get("timeoutSeconds") or plan["strength"].get("timeout") or 180)
    process_timeout = timeout + CDX_MISSION_PARENT_TIMEOUT_GRACE_SECONDS
    try:
        result = _run_cdx_mission(repo_root, list(plan["arguments"]), timeout=process_timeout, runner=cdx_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX mission timed out.", "plan": plan, "run": None}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX mission: {exc}", "plan": plan, "run": None}

    parsed: Any = None
    if result.stdout.strip():
        try:
            parsed = json.loads(result.stdout)
        except json.JSONDecodeError:
            parsed = None
    parsed = _merge_cdx_mission_output(parsed)
    usage = _extract_cdx_usage(parsed)
    run_id = ""
    if isinstance(parsed, dict):
        run = parsed.get("run") if isinstance(parsed.get("run"), dict) else {}
        run_id = str(parsed.get("run_id") or parsed.get("runId") or run.get("run_id") or run.get("runId") or "")
    run_payload = {
        "returnCode": result.returncode,
        "runId": run_id,
        "stdout": _bounded_process_text(result.stdout or ""),
        "stderr": _bounded_process_text(result.stderr or ""),
        "parsed": parsed if isinstance(parsed, dict) else None,
        "usage": usage,
    }
    denials = _extract_cdx_permission_denials(parsed)
    if denials:
        run_payload["permissionDenials"] = denials
        return {"state": "blocked", "message": "CDX mission reported permission denials; no applied work should be inferred from this run.", "plan": plan, "run": run_payload}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX mission failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "plan": plan, "run": run_payload}
    return {"state": "ok", "message": "", "plan": plan, "run": run_payload}


def cdx_mission_apply_plan_payload(repo_root: Path, body: dict[str, Any], *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    tool_which = which or shutil.which
    if not tool_which("logics-manager"):
        return {"state": "unavailable", "message": "logics-manager executable is not available on PATH.", "results": []}
    actions = body.get("actions") if isinstance(body.get("actions"), list) else []
    if not actions:
        return {"state": "error", "message": "No corpus plan actions were provided.", "results": []}

    allowed: dict[str, list[str]] = {
        "promote-request-to-backlog": ["flow", "promote", "request-to-backlog"],
        "promote-backlog-to-task": ["flow", "promote", "backlog-to-task"],
        "refresh-corpus-context": ["sync", "refresh-mermaid-signatures"],
    }
    results: list[dict[str, Any]] = []
    for action in actions:
        if not isinstance(action, dict):
            return {"state": "error", "message": "Corpus plan actions must be objects.", "results": results}
        action_type = str(action.get("type") or "")
        command = allowed.get(action_type)
        if command is None:
            return {"state": "error", "message": f"Unsupported corpus plan action: {action_type}", "results": results}
        target = str(action.get("target") or "").strip()
        args = [*command]
        if target and action_type != "refresh-corpus-context":
            if not re.match(r"^[A-Za-z0-9_.:/-]{1,160}$", target):
                return {"state": "error", "message": "Invalid corpus plan action target.", "results": results}
            args.append(target)
        try:
            result = _run_logics_command(repo_root, args, runner=runner)
        except subprocess.TimeoutExpired:
            return {"state": "timeout", "message": "Logics corpus plan application timed out.", "results": results}
        except (OSError, subprocess.SubprocessError) as exc:
            return {"state": "error", "message": f"Unable to apply corpus plan action: {exc}", "results": results}
        item = {
            "type": action_type,
            "target": target,
            "command": ["logics-manager", *args],
            "returnCode": result.returncode,
            "stdout": _bounded_process_text(result.stdout or "", 4000),
            "stderr": _bounded_process_text(result.stderr or "", 4000),
        }
        results.append(item)
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "Corpus plan action failed.").strip().splitlines()[0]
            return {"state": "error", "message": message, "results": results}
    return {"state": "ok", "message": "", "results": results}


def cdx_toggle_payload(
    repo_root: Path,
    session: str,
    enable: bool,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    action = "enable" if enable else "disable"
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", action, session, "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": f"CDX {action} timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or f"CDX {action} failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or f"{action.capitalize()} complete."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or f"{action.capitalize()} complete."}


def cdx_remove_payload(
    repo_root: Path,
    session: str,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", "rmv", session, "--force", "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX remove timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX remove failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Remove complete."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Remove complete."}


def cdx_permission_payload(
    repo_root: Path,
    session: str,
    permission: str,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    if permission not in {"review", "default", "auto", "full"}:
        return {"ok": False, "error": "Invalid permission value."}
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            ["cdx", "set", session, "--permission", permission, "--json"],
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX permission update timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX permission update failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Permission update complete.", "permission": permission}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Permission update complete.", "permission": permission}


def cdx_config_payload(
    repo_root: Path,
    session: str,
    *,
    power: str | None = None,
    model: str | None = None,
    fast: bool | None = None,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    """Persist launch settings (power/model/fast) for a session via `cdx set`."""
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    if not session:
        return {"ok": False, "error": "Session name is required."}
    if not re.match(r"^[A-Za-z0-9_.:-]{1,120}$", session):
        return {"ok": False, "error": "Invalid session name."}
    command = ["cdx", "set", session]
    applied: dict[str, Any] = {}
    if power is not None:
        if power not in {"minimal", "low", "medium", "high", "xhigh"}:
            return {"ok": False, "error": "Invalid power value."}
        command += ["--power", power]
        applied["power"] = power
    if model is not None:
        model = model.strip()
        if model:
            if len(model) > 200 or not re.match(r"^[A-Za-z0-9_.:\-/]+$", model):
                return {"ok": False, "error": "Invalid model value."}
            command += ["--model", model]
            applied["model"] = model
    if fast is not None:
        command += ["--fast", "on" if fast else "off"]
        applied["fast"] = bool(fast)
    if not applied:
        return {"ok": False, "error": "No settings to update."}
    command.append("--json")
    cdx_runner = runner or subprocess.run
    try:
        result = cdx_runner(
            command,
            cwd=repo_root,
            text=True,
            capture_output=True,
            timeout=_scaled_timeout(repo_root, 10),
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "CDX config update timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX config update failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Config update complete.", **applied}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Config update complete.", **applied}


def cdx_import_payload(
    repo_root: Path,
    file_bytes: bytes,
    passphrase: str,
    merge: bool = True,
    force: bool = False,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    import tempfile
    with tempfile.TemporaryDirectory() as tmp_dir:
        import_path = Path(tmp_dir) / "cdx-import.cdx"
        import_path.write_bytes(file_bytes)
        args = ["import", str(import_path), "--json"]
        if merge:
            args.append("--merge")
        if force:
            args.append("--force")
        env = {**os.environ}
        if passphrase:
            env["CDX_IMPORT_PASS"] = passphrase
            args += ["--passphrase-env", "CDX_IMPORT_PASS"]
        cdx_runner = runner or subprocess.run
        try:
            result = cdx_runner(
                ["cdx", *args],
                cwd=repo_root,
                text=True,
                capture_output=True,
                timeout=_scaled_timeout(repo_root, 30),
                env=env,
            )
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "CDX import timed out."}
    if result.returncode != 0:
        msg = (result.stderr or result.stdout or "").strip()
        return {"ok": False, "error": msg or "CDX import failed."}
    try:
        parsed = json.loads(result.stdout)
        return {"ok": True, "message": parsed.get("message") or "Import complete."}
    except Exception:
        return {"ok": True, "message": result.stdout.strip() or "Import complete."}
