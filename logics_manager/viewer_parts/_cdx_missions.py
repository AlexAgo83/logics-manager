def _normalize_cdx_session(value: Any, status_payload: dict[str, Any] | None = None) -> str:
    session = str(value or "").strip()
    if not re.match(r"^[A-Za-z0-9_.:@/-]{1,120}$", session):
        return ""
    if status_payload is None:
        return session
    known_sessions = _cdx_status_sessions(status_payload)
    if known_sessions and session not in known_sessions:
        return ""
    return session


def _latest_release_tag(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> str:
    git_which = which or shutil.which
    if not git_which("git"):
        return ""
    commands = [
        ["tag", "--sort=-version:refname", "--list", "v[0-9]*"],
        ["tag", "--sort=-version:refname", "--list", "[0-9]*"],
        ["describe", "--tags", "--abbrev=0"],
    ]
    for args in commands:
        try:
            result = _run_read_only_git(repo_root, args, runner=runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            continue
        if result.returncode != 0:
            continue
        tag = (result.stdout or "").strip().splitlines()[0] if (result.stdout or "").strip() else ""
        if tag:
            return tag[:200]
    return ""


def _mission_text_input(body: dict[str, Any], key: str, *, max_chars: int = 4000) -> str:
    raw = str(body.get(key) or "").strip()
    normalized = re.sub(r"\s+", " ", raw)
    return normalized[:max_chars]


def _mission_prompt_override(body: dict[str, Any], *, max_chars: int = 12000) -> str:
    """Read an operator-edited prompt verbatim, preserving newlines and bounding length."""
    raw = body.get("promptOverride")
    if not isinstance(raw, str):
        return ""
    return raw.strip()[:max_chars]


def _mission_bool_input(body: dict[str, Any], key: str) -> bool:
    value = body.get(key)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _release_contract_prompt_block(repo_root: Path) -> str:
    """Summarise the active release contract so the pre-release mission stays
    aligned with the project's release surfaces instead of hard-coded guesses."""
    try:
        context = load_release_context(repo_root)
    except Exception:
        return ""
    if context.contract is None:
        return "\n".join([
            "No active release contract exists at logics/release/contract.json.",
            "Infer a release contract draft from local sources first (VERSION, pyproject.toml, package.json, README.md, .github/workflows/, changelogs/). Use neighboring projects only as comparison evidence after inspecting local release surfaces.",
        ])
    contract = context.contract
    lines: list[str] = [
        "Use the project release contract (logics/release/contract.json) as the single source of truth for this pre-release.",
    ]
    version_sources = contract.get("version_sources") if isinstance(contract.get("version_sources"), list) else []
    src_descs: list[str] = []
    for src in version_sources:
        if not isinstance(src, dict):
            continue
        path = src.get("path")
        if not path:
            continue
        selector = src.get("selector")
        src_descs.append(f"{path}{f' ({selector})' if selector else ''}")
    if src_descs:
        lines.append("Update exactly these version sources to the target version: " + "; ".join(src_descs) + ".")
    changelog = contract.get("changelog") if isinstance(contract.get("changelog"), dict) else {}
    cl_paths = [entry.get("path") for entry in (changelog.get("paths") or []) if isinstance(entry, dict) and entry.get("path")]
    if cl_paths:
        heading = " A version heading is required." if changelog.get("version_heading_required") else ""
        lines.append("Create or update the changelog at: " + "; ".join(cl_paths) + "." + heading)
    validation = contract.get("validation_commands") if isinstance(contract.get("validation_commands"), list) else []
    cmd_descs: list[str] = []
    for entry in validation:
        if isinstance(entry, dict) and isinstance(entry.get("command"), list) and entry["command"]:
            cmd_descs.append(" ".join(str(part) for part in entry["command"]))
    if cmd_descs:
        lines.append("Project validation commands: " + "; ".join(cmd_descs) + ".")
    git = contract.get("git") if isinstance(contract.get("git"), dict) else {}
    tag_policy = git.get("tag_policy") if isinstance(git.get("tag_policy"), dict) else {}
    git_bits: list[str] = []
    if git.get("allowed_branches"):
        git_bits.append("allowed branches: " + ", ".join(str(branch) for branch in git["allowed_branches"]))
    if tag_policy.get("pattern"):
        git_bits.append(f"release tag pattern: {tag_policy['pattern']}")
    if git_bits:
        lines.append("Git policy — " + "; ".join(git_bits) + ".")
    for intent in (contract.get("operator_intents") if isinstance(contract.get("operator_intents"), list) else []):
        if isinstance(intent, dict) and intent.get("utterance") == "prepare release" and intent.get("boundary"):
            lines.append(f"Operator-intent boundary for preparing a release: {intent['boundary']}")
            break
    try:
        status = release_status_payload(repo_root)
    except Exception:
        status = {}
    if isinstance(status, dict) and status.get("configured"):
        if status.get("target_version"):
            lines.append(f"Current version detected across sources: {status['target_version']}.")
        if status.get("state"):
            lines.append(f"Current release state: {status['state']}.")
    return "\n".join(lines)


def _cdx_mission_prompt(
    mission_id: str,
    *,
    release_tag: str = "",
    wish_text: str = "",
    release_version: str = "",
    run_full_validation: bool = False,
    allow_file_writes: bool = False,
    direct_fixes: bool = False,
    commit_at_end: bool = False,
    contract_block: str = "",
) -> str:
    write_guidance = (
        "File edits are allowed when they directly complete the selected mission mode. Keep changes scoped, run relevant validation, and report changed files."
        if allow_file_writes
        else "Do not modify files."
    )
    commit_guidance = (
        "At the end, if and only if files were added, deleted, or modified, create one scoped git commit that includes all mission changes. Do not push, tag, publish, upload assets, or create a GitHub release. Include the commit hash and message in the returned JSON when a commit is created."
        if commit_at_end
        else "Do not create git commits."
    )
    request_only_guidance = (
        "Always capture the outcome as a bounded Logics request. Create it under logics/request/ with `logics-manager flow new request` (use the next available req_ slug), summarizing findings and the recommended follow-up. Leave it as a request draft for later triage; do not promote it to a backlog item or task, and do not directly modify product/source files."
    )
    direct_fix_chain_guidance = (
        "Fix safe, scoped issues directly in repository files when you can validate them; do not make broad refactors, and do not release, tag, push, or publish. Then capture the completed work as a full Logics workflow chain as proof: create a request under logics/request/ with `logics-manager flow new request`, then promote it with `logics-manager flow promote request-to-backlog <req_slug>` and `logics-manager flow promote backlog-to-task <item_slug>` so the request, backlog item, and task all document the applied fixes and their validation evidence."
    )
    if mission_id == "full-audit":
        if direct_fixes:
            action_guidance = direct_fix_chain_guidance
            schema = "Return concise JSON with keys: summary, findings, directFixes, changedFiles, validationEvidence, workflowRefs (the created request, backlog item, and task references)."
        else:
            action_guidance = request_only_guidance
            schema = "Return concise JSON with keys: summary, findings, recommendations, requestFiles, validationEvidence."
        return "\n".join([
            "Run a full repository audit for this Logics Manager checkout.",
            "Focus on correctness bugs, workflow risks, missing validation, stale documentation, and test gaps.",
            write_guidance,
            action_guidance,
            commit_guidance,
            schema,
        ])
    if mission_id == "release-review":
        if direct_fixes:
            action_guidance = "Fix safe, scoped release-readiness issues directly in repository files when you can validate them (stale documentation, missing release notes, narrow test failures). Do not bump versions, tag, push, publish, upload assets, or create GitHub releases. Then capture the completed work as a full Logics workflow chain as proof: create a request under logics/request/ with `logics-manager flow new request`, then promote it with `logics-manager flow promote request-to-backlog <req_slug>` and `logics-manager flow promote backlog-to-task <item_slug>` so the request, backlog item, and task all document the applied fixes and their validation evidence."
            schema = "Return concise JSON with keys: summary, findings, directFixes, changedFiles, validationEvidence, workflowRefs (the created request, backlog item, and task references)."
        else:
            action_guidance = "Always capture the outcome as a bounded Logics request. Create it under logics/request/ with `logics-manager flow new request` (use the next available req_ slug), summarizing release-readiness findings and follow-up. Leave it as a request draft for later triage; do not promote it, do not directly modify product/source files, and do not bump versions, tag, push, publish, upload assets, or create GitHub releases."
            schema = "Return concise JSON with keys: summary, findings, recommendations, requestFiles, validationEvidence."
        return "\n".join([
            f"Review repository changes since the latest release tag {release_tag}.",
            "Focus on regressions, incomplete release notes, migration risks, and missing tests.",
            write_guidance,
            action_guidance,
            commit_guidance,
            schema,
        ])
    if mission_id == "corpus-ready":
        return "\n".join([
            "Prepare the open Logics workflow corpus for development.",
            "Analyze requests, backlog items, tasks, docs, lint/audit state, and workflow consistency.",
            "Do not modify files directly. This mission is plan-first: return allowed actions for the viewer to apply explicitly.",
            "Do not run destructive commands.",
            "Return JSON only with this schema:",
            '{"summary":"...","actions":[{"type":"promote-request-to-backlog","target":"req_..."},{"type":"promote-backlog-to-task","target":"item_..."},{"type":"refresh-corpus-context","target":""}],"notes":["..."]}',
            "Allowed action types are exactly: promote-request-to-backlog, promote-backlog-to-task, refresh-corpus-context.",
            "Use only targets that exist in the repository. Omit actions that are not clearly justified.",
        ])
    if mission_id == "wish-to-request":
        request_guidance = (
            "Create the request draft file under logics/request/ using the next available req_ slug. Keep the file as a request draft only; do not promote backlog items and do not create tasks. Include the created path in generatedFiles."
            if allow_file_writes
            else "Do not create the request file; return the request draft and generatedFiles preview only."
        )
        return "\n".join([
            "Turn the following user wish into a structured Logics request draft.",
            write_guidance,
            request_guidance,
            commit_guidance,
            "Do not promote backlog items and do not create tasks.",
            "Return JSON only with this schema:",
            '{"summary":"...","requestDraft":{"title":"...","needs":["..."],"context":["..."],"acceptanceCriteria":["AC1: ..."],"definitionOfReady":{"problemExplicit":true,"scopeBounded":true,"criteriaTestable":true,"risksListed":true},"references":["..."],"questions":["..."],"openAssumptions":["..."]},"generatedFiles":[]}',
            "If the wish is underspecified, include concrete questions and open assumptions instead of inventing details.",
            "User wish:",
            wish_text,
        ])
    if mission_id == "pre-release":
        validation_mode = "Run the release contract validation commands before finalizing the report, and include actionable fixes for any failures." if run_full_validation else "Do not run full validation; identify the release contract validation commands that should be run before release."
        release_prep_guidance = (
            "Prepare release metadata for the requested version by updating the exact version sources and changelog declared by the release contract. Do not create Git tags, push branches, publish packages, upload release assets, or create GitHub releases."
            if allow_file_writes
            else "Do not modify version sources, changelog files, create Git tags, push branches, publish packages, upload release assets, or create GitHub releases."
        )
        return "\n".join([
            line for line in [
                f"Prepare a guarded pre-release for version {release_version}.",
                contract_block,
                validation_mode,
                release_prep_guidance,
                write_guidance,
                commit_guidance,
                "Return JSON only with this schema:",
                '{"summary":"...","version":"vX.X.X","validationMode":"full|plan-only","validationEvidence":["..."],"actionableFixes":[{"title":"...","command":"...","risk":"..."}],"generatedFiles":[{"path":"...","purpose":"..."}],"releasePlan":["..."],"blocked":false}',
            ] if line
        ])
    raise ValueError("Unknown CDX mission.")


def _cdx_mission_timeout(strength: dict[str, Any], *, allow_file_writes: bool = False, commit_at_end: bool = False) -> int:
    timeout = int(strength.get("timeout") or 180)
    if allow_file_writes or commit_at_end:
        return max(timeout, CDX_WRITABLE_MISSION_MIN_TIMEOUT_SECONDS)
    return timeout


def _cdx_mission_permission(*, allow_file_writes: bool = False) -> str:
    return "full" if allow_file_writes else "read-only"


def _cdx_mission_command(
    repo_root: Path,
    mission_id: str,
    *,
    session: str,
    strength: dict[str, Any],
    model: str = "",
    reasoning_effort: str = "",
    power: str = "",
    release_tag: str = "",
    mission_inputs: dict[str, str] | None = None,
    allow_file_writes: bool = False,
    commit_at_end: bool = False,
    prompt_override: str = "",
) -> list[str]:
    mission_inputs = mission_inputs or {}
    override = prompt_override.strip()
    if override:
        prompt = override
    else:
        contract_block = _release_contract_prompt_block(repo_root) if mission_id == "pre-release" else ""
        prompt = _cdx_mission_prompt(
            mission_id,
            release_tag=release_tag,
            wish_text=mission_inputs.get("wishText", ""),
            release_version=mission_inputs.get("releaseVersion", ""),
            run_full_validation=mission_inputs.get("runFullValidation") == "true",
            allow_file_writes=allow_file_writes,
            direct_fixes=mission_inputs.get("directFixes") == "true",
            commit_at_end=commit_at_end,
            contract_block=contract_block,
        )
    timeout = _cdx_mission_timeout(strength, allow_file_writes=allow_file_writes, commit_at_end=commit_at_end)
    effective_reasoning_effort = reasoning_effort or str(strength.get("reasoningEffort") or "medium")
    effective_power = power or str(strength.get("power") or "medium")
    permission = _cdx_mission_permission(allow_file_writes=allow_file_writes)
    command = [
        "run",
        session,
        "--cwd",
        str(repo_root),
        "--prompt",
        prompt,
        "--kind",
        "assistant",
    ]
    if model:
        command.extend(["--model", model])
    command.extend([
        "--reasoning-effort",
        effective_reasoning_effort,
        "--power",
        effective_power,
        "--permission",
        permission,
        "--timeout-seconds",
        str(timeout),
        "--json",
    ])
    return command


def _parse_json_from_text(text: str) -> dict[str, Any] | None:
    raw = text.strip()
    if not raw:
        return None
    jsonl_candidates: list[str] = []
    for line in reversed(raw.splitlines()):
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(event, dict):
            continue
        item = event.get("item") if isinstance(event.get("item"), dict) else {}
        text_value = item.get("text") if item.get("type") == "agent_message" else event.get("text")
        if isinstance(text_value, str) and text_value.strip():
            jsonl_candidates.append(text_value.strip())
    candidates = [raw]
    candidates.extend(jsonl_candidates)
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", raw, re.IGNORECASE | re.DOTALL)
    if fence_match:
        candidates.insert(0, fence_match.group(1).strip())
    decoder = json.JSONDecoder()
    fallback: dict[str, Any] | None = None
    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                result_text = parsed.get("result")
                if isinstance(result_text, str) and result_text.strip():
                    nested = _parse_json_from_text(result_text)
                    if nested:
                        return nested
                if any(key in parsed for key in ("actions", "summary", "findings", "recommendations")):
                    return parsed
                fallback = fallback or parsed
        except json.JSONDecodeError:
            pass
        for index, char in enumerate(candidate):
            if char != "{":
                continue
            try:
                parsed, _end = decoder.raw_decode(candidate[index:])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                if any(key in parsed for key in ("actions", "summary", "findings", "recommendations")):
                    return parsed
                fallback = fallback or parsed
    return fallback


def _read_cdx_output_path(parsed: dict[str, Any]) -> str:
    candidates = [
        parsed.get("stdout"),
        parsed.get("output"),
    ]
    artifacts = parsed.get("artifacts") if isinstance(parsed.get("artifacts"), dict) else {}
    candidates.extend([
        parsed.get("stdout_path"),
        parsed.get("stdoutPath"),
        artifacts.get("stdout_path"),
        artifacts.get("stdoutPath"),
    ])
    for candidate in candidates:
        if not isinstance(candidate, str) or not candidate.strip():
            continue
        value = candidate.strip()
        if "\n" in value or value.lstrip().startswith("{") or value.lstrip().startswith("```"):
            return value[:12000]
        path = Path(value).expanduser()
        if not path.is_file():
            continue
        try:
            with path.open("rb") as handle:
                size = path.stat().st_size
                if size > 60000:
                    handle.seek(size - 60000)
                return handle.read(60000).decode("utf-8", errors="replace")
        except OSError:
            continue
    return ""


def _merge_cdx_mission_output(parsed: Any) -> dict[str, Any] | None:
    if not isinstance(parsed, dict):
        return None
    merged = dict(parsed)
    embedded = _parse_json_from_text(_read_cdx_output_path(parsed))
    if embedded:
        merged["missionOutput"] = embedded
        if isinstance(embedded.get("actions"), list) and "actions" not in merged:
            merged["actions"] = embedded["actions"]
        if "summary" in embedded and "summary" not in merged:
            merged["summary"] = embedded["summary"]
    return merged


def _extract_cdx_permission_denials(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, dict):
        return []
    candidates: list[Any] = [value.get("permission_denials"), value.get("permissionDenials")]
    final_payload = value.get("final_payload") if isinstance(value.get("final_payload"), dict) else None
    if final_payload is not None:
        candidates.extend([final_payload.get("permission_denials"), final_payload.get("permissionDenials")])
    parsed = value.get("parsed") if isinstance(value.get("parsed"), dict) else None
    if parsed is not None:
        candidates.extend([parsed.get("permission_denials"), parsed.get("permissionDenials")])
    report = value.get("report") if isinstance(value.get("report"), dict) else None
    if report is not None:
        candidates.extend([report.get("permission_denials"), report.get("permissionDenials")])
    denials: list[dict[str, Any]] = []
    for candidate in candidates:
        if not isinstance(candidate, list):
            continue
        for item in candidate:
            if isinstance(item, dict):
                denials.append(dict(item))
    return denials


def _extract_cdx_usage(parsed: Any) -> dict[str, Any]:
    if not isinstance(parsed, dict):
        return {"available": False, "message": "CDX did not return structured usage."}
    candidates = [
        parsed.get("usage"),
        parsed.get("tokenUsage"),
        parsed.get("tokens"),
        (parsed.get("run") or {}).get("usage") if isinstance(parsed.get("run"), dict) else None,
        (parsed.get("result") or {}).get("usage") if isinstance(parsed.get("result"), dict) else None,
    ]
    usage = next((candidate for candidate in candidates if isinstance(candidate, dict)), None)
    if usage is None:
        return {"available": False, "message": "Token usage was not exposed by CDX for this run."}
    input_tokens = usage.get("input_tokens", usage.get("inputTokens", usage.get("prompt_tokens", usage.get("promptTokens"))))
    output_tokens = usage.get("output_tokens", usage.get("outputTokens", usage.get("completion_tokens", usage.get("completionTokens"))))
    total_tokens = usage.get("total_tokens", usage.get("totalTokens"))
    if total_tokens is None and isinstance(input_tokens, int) and isinstance(output_tokens, int):
        total_tokens = input_tokens + output_tokens
    return {
        "available": True,
        "inputTokens": input_tokens,
        "outputTokens": output_tokens,
        "totalTokens": total_tokens,
        "raw": usage,
    }
