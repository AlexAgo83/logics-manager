def cdx_export_payload(
    repo_root: Path,
    sessions: list[str],
    passphrase: str,
    include_auth: bool = True,
    *,
    runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"ok": False, "error": "CDX executable not available."}
    import tempfile, base64
    with tempfile.TemporaryDirectory() as tmp_dir:
        export_path = Path(tmp_dir) / "cdx-export.cdx"
        args = ["export", str(export_path), "--json"]
        if include_auth:
            args.append("--include-auth")
        if sessions:
            args += ["--sessions", ",".join(sessions)]
        env = {**os.environ}
        if passphrase:
            env["CDX_EXPORT_PASS"] = passphrase
            args += ["--passphrase-env", "CDX_EXPORT_PASS"]
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
            return {"ok": False, "error": "CDX export timed out."}
        if result.returncode != 0:
            msg = (result.stderr or result.stdout or "").strip()
            return {"ok": False, "error": msg or "CDX export failed."}
        if not export_path.exists():
            return {"ok": False, "error": "CDX export produced no file."}
        file_b64 = base64.b64encode(export_path.read_bytes()).decode()
    return {"ok": True, "fileBase64": file_b64, "filename": "cdx-accounts.cdx"}


def _slugify_viewer_doc(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return slug[:80] or "cdx_code_review_findings"


def _next_viewer_request_ref(repo_root: Path, title: str) -> str:
    request_dir = repo_root / "logics" / "request"
    highest = -1
    if request_dir.is_dir():
        for path in request_dir.glob("req_*.md"):
            match = re.match(r"^req_(\d{3})_", path.stem)
            if match:
                highest = max(highest, int(match.group(1)))
    return f"req_{highest + 1:03d}_{_slugify_viewer_doc(title)}"


def create_request_from_cdx_report(repo_root: Path, report_payload: dict[str, Any]) -> dict[str, Any]:
    report = report_payload.get("report") if isinstance(report_payload.get("report"), dict) else report_payload
    run = report.get("run") if isinstance(report.get("run"), dict) else {}
    task_report = report.get("task_report") if isinstance(report.get("task_report"), dict) else {}
    parsed = report.get("parsed") if isinstance(report.get("parsed"), dict) else {}
    mission_output = next(
        (
            candidate
            for candidate in (
                report.get("missionOutput"),
                report.get("mission_output"),
                parsed.get("missionOutput"),
                parsed.get("mission_output"),
                run.get("missionOutput"),
                run.get("mission_output"),
                task_report.get("missionOutput"),
                task_report.get("mission_output"),
            )
            if isinstance(candidate, dict)
        ),
        {},
    )
    run_id = str(run.get("run_id") or task_report.get("run_id") or "unknown")
    task_kind = str(task_report.get("kind") or run.get("kind") or "assistant")
    findings = task_report.get("findings") if isinstance(task_report.get("findings"), list) else []
    if not findings and isinstance(mission_output.get("findings"), list):
        findings = mission_output["findings"]
    recommendations = mission_output.get("recommendations") if isinstance(mission_output.get("recommendations"), list) else []
    request_files = mission_output.get("requestFiles") if isinstance(mission_output.get("requestFiles"), list) else []
    actionable_fixes = mission_output.get("actionableFixes") if isinstance(mission_output.get("actionableFixes"), list) else []
    release_plan = mission_output.get("releasePlan") if isinstance(mission_output.get("releasePlan"), list) else []
    if task_kind == "code-review":
        title = f"Address CDX code review findings for {run_id}"
        theme = "Code review follow-up"
        need = f"Follow up on CDX code-review run `{run_id}`."
    elif task_kind == "full-audit":
        title = f"Address CDX audit findings for {run_id}"
        theme = "Audit follow-up"
        need = f"Follow up on CDX full-audit run `{run_id}`."
    else:
        title = f"Address CDX {task_kind} follow-up for {run_id}"
        theme = "CDX mission follow-up"
        need = f"Follow up on CDX `{task_kind}` run `{run_id}`."
    ref = _next_viewer_request_ref(repo_root, title)
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True, exist_ok=True)
    rel_path = f"logics/request/{ref}.md"
    path = repo_root / rel_path

    def _item_message(item: Any, fallback: str) -> str:
        if isinstance(item, dict):
            title_value = item.get("title") or item.get("message") or item.get("summary") or item.get("path") or fallback
            details = []
            if item.get("purpose"):
                details.append(f"purpose: {item['purpose']}")
            if item.get("command"):
                details.append(f"command: `{item['command']}`")
            if item.get("risk"):
                details.append(f"risk: {item['risk']}")
            return f"{title_value}" + (f" ({'; '.join(details)})" if details else "")
        return str(item or fallback)

    finding_lines = []
    for index, finding in enumerate(findings, start=1):
        if not isinstance(finding, dict):
            finding_lines.append(f"- F{index}: {finding}")
            continue
        location = finding.get("path") or finding.get("file") or "unknown path"
        if finding.get("line"):
            location = f"{location}:{finding['line']}"
        severity = finding.get("severity") or "unknown"
        message = finding.get("message") or finding.get("title") or "Review finding"
        finding_lines.append(f"- F{index} [{severity}] `{location}`: {message}")
    if not finding_lines:
        finding_lines.append("- No structured findings were reported. Review the CDX artifacts linked below.")
    follow_up_lines = []
    for label, values in (
        ("Recommendation", recommendations),
        ("Request file", request_files),
        ("Actionable fix", actionable_fixes),
        ("Release plan", release_plan),
    ):
        for index, value in enumerate(values, start=1):
            follow_up_lines.append(f"- {label} {index}: {_item_message(value, label)}")
    if not follow_up_lines:
        follow_up_lines.append("- Review CDX output and split any actionable follow-up into tasks before implementation.")
    summary = task_report.get("summary") or mission_output.get("summary") or "No structured summary provided."
    text = "\n".join([
        f"## {ref} - {title}",
        "> Status: Draft",
        "> Understanding: 70%",
        "> Confidence: 70%",
        "> Complexity: Medium",
        f"> Theme: {theme}",
        "",
        "# Needs",
        f"- {need}",
        f"- Summary: {summary}",
        "",
        "# Findings",
        *finding_lines,
        "",
        "# Follow-up",
        *follow_up_lines,
        "",
        "# Traceability",
        f"- CDX run id: `{run_id}`",
        f"- Transcript: `{(report.get('artifacts') or {}).get('transcript_path') or ''}`",
        f"- Stdout: `{(report.get('artifacts') or {}).get('stdout_path') or ''}`",
        "",
        "# Acceptance Criteria",
        "- AC1: Each actionable finding is reviewed and either fixed, documented as not applicable, or split into follow-up work.",
        "- AC2: Validation evidence is added before closing this request.",
        "",
    ])
    path.write_text(text, encoding="utf-8")
    return {"id": ref, "path": rel_path, "title": title}


def create_request_from_viewer_draft(repo_root: Path, draft: dict[str, Any]) -> dict[str, Any]:
    title = str(draft.get("title") or "").strip()
    intent = str(draft.get("intent") or draft.get("need") or "").strip()
    context = str(draft.get("context") or "").strip()
    if not intent:
        raise ValueError("Need is required.")
    if not title:
        title = intent.splitlines()[0].strip()[:80] or "New request"
    ref = _next_viewer_request_ref(repo_root, title)
    request_dir = repo_root / "logics" / "request"
    request_dir.mkdir(parents=True, exist_ok=True)
    rel_path = f"logics/request/{ref}.md"
    path = repo_root / rel_path
    context_lines = [f"- {line.strip()}" for line in context.splitlines() if line.strip()]
    if not context_lines:
        context_lines = ["- Add constraints, links, scope notes, or acceptance hints before triage."]
    text = "\n".join([
        f"## {ref} - {title}",
        "> Status: Draft",
        "> Understanding: 50%",
        "> Confidence: 50%",
        "> Complexity: Medium",
        "> Theme: Viewer request",
        "",
        "# Needs",
        f"- {intent}",
        "",
        "# Context",
        *context_lines,
        "",
        "# Authoring note",
        "- This request was created directly by the user from the viewer.",
        "- If an assistant reads this request, it may reformat it, translate it to English, and improve clarity while preserving the user's intent.",
        "",
        "# Acceptance Criteria",
        "- AC1: The request has been reviewed and clarified enough to triage.",
        "- AC2: Follow-up backlog items preserve the need and relevant context.",
        "",
    ])
    path.write_text(text, encoding="utf-8")
    return {"id": ref, "path": rel_path, "title": title}


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")


def _tree_latest_mtime_ns(root: Path, *, suffixes: tuple[str, ...] = (".md",)) -> int:
    if not root.is_dir():
        return 0
    latest = 0
    try:
        for path in root.rglob("*"):
            if not path.is_file() or (suffixes and path.suffix.lower() not in suffixes):
                continue
            try:
                latest = max(latest, path.stat().st_mtime_ns)
            except OSError:
                continue
    except OSError:
        return latest
    return latest


def _git_dir(repo_root: Path) -> Path | None:
    git_path = repo_root / ".git"
    if git_path.is_dir():
        return git_path
    if git_path.is_file():
        try:
            content = git_path.read_text(encoding="utf-8").strip()
        except OSError:
            return None
        prefix = "gitdir:"
        if content.lower().startswith(prefix):
            candidate = Path(content[len(prefix):].strip())
            if not candidate.is_absolute():
                candidate = (repo_root / candidate).resolve()
            return candidate if candidate.exists() else None
    return None


def _git_event_signature(repo_root: Path) -> dict[str, Any]:
    git_dir = _git_dir(repo_root)
    if git_dir is None:
        return {"available": False}
    files = [git_dir / "HEAD", git_dir / "packed-refs"]
    for dirname in ("refs/heads", "refs/remotes", "refs/tags"):
        ref_root = git_dir / dirname
        if ref_root.is_dir():
            try:
                files.extend(path for path in ref_root.rglob("*") if path.is_file())
            except OSError:
                pass
    signature: list[tuple[str, int, int]] = []
    for path in files:
        try:
            stat = path.stat()
            signature.append((str(path.relative_to(git_dir)), stat.st_mtime_ns, stat.st_size))
        except (OSError, ValueError):
            continue
    return {"available": True, "refs": sorted(signature)}


def _stable_json_signature(value: Any) -> str:
    return hashlib.sha1(json.dumps(value, sort_keys=True, default=str).encode("utf-8")).hexdigest()
