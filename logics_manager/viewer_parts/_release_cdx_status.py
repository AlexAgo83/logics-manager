def _github_release_workflow_file(repo_root: Path) -> str:
    """Return the basename of the Release GitHub Actions workflow file, if present.

    The Release workflow is triggered on tag pushes, so its runs do not appear
    on the current branch. We target the workflow file directly via the
    ``actions/workflows/<file>/runs`` endpoint instead of filtering branch runs.
    """
    workflows_dir = repo_root / ".github" / "workflows"
    if not workflows_dir.is_dir():
        return ""
    for name in ("release.yml", "release.yaml"):
        if (workflows_dir / name).is_file():
            return name
    return ""


def _github_release_runs_payload(repo_root: Path, github_url: str, workflow_file: str, *, gh_runner: Any | None = None) -> dict[str, Any]:
    owner_repo = _github_owner_repo_from_web_url(github_url)
    if not owner_repo:
        return {"state": "hidden", "visible": False, "message": "GitHub remote could not be parsed."}

    owner, repo = owner_repo
    endpoint = f"repos/{owner}/{repo}/actions/workflows/{workflow_file}/runs?per_page=10"
    try:
        runs_result = _run_read_only_gh(repo_root, ["api", endpoint], runner=gh_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "Release workflow status timed out.", "repositoryUrl": github_url, "badgeState": "unavailable"}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect release workflow status: {exc}", "repositoryUrl": github_url, "badgeState": "unavailable"}
    if runs_result.returncode != 0:
        message = (runs_result.stderr or runs_result.stdout or "Release workflow status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": github_url, "badgeState": "unavailable"}

    try:
        parsed = json.loads(runs_result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "Release workflow status returned invalid JSON.", "repositoryUrl": github_url, "badgeState": "unavailable"}
    workflow_runs = parsed.get("workflow_runs") if isinstance(parsed, dict) else None
    runs = [run for run in workflow_runs if isinstance(run, dict)] if isinstance(workflow_runs, list) else []
    if not runs:
        return {"state": "ok", "visible": True, "message": "No release workflow runs found.", "repositoryUrl": github_url, "badgeState": "unknown", "run": None, "jobs": [], "activeCount": 0}

    # Runs are returned newest-first. Prefer the most recent active run for the
    # badge so an in-progress release is surfaced even if a later-listed run is
    # already complete; otherwise fall back to the latest run.
    active_count = sum(1 for run in runs if _is_active_ci_status(run))
    selected = next((run for run in runs if _is_active_ci_status(run)), runs[0])
    match_source = "release-active" if _is_active_ci_status(selected) else "release-latest"
    run_payload = _parse_github_actions_run(selected, match_source=match_source)
    # Release runs are tag-triggered, so head_branch carries the release tag
    # (e.g. "v2.12.3"). Surface it as the version for the badge label.
    version = run_payload.get("branch") or ""
    run_payload["version"] = version
    jobs: list[dict[str, str]] = []
    run_id = run_payload.get("id")
    if run_id:
        try:
            jobs_result = _run_read_only_gh(repo_root, ["api", f"repos/{owner}/{repo}/actions/runs/{run_id}/jobs?per_page=100"], runner=gh_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            jobs_result = None
        if jobs_result is not None and jobs_result.returncode == 0:
            jobs = _parse_github_actions_jobs(jobs_result.stdout)

    return {
        "state": "ok",
        "visible": True,
        "message": "",
        "repositoryUrl": github_url,
        "badgeState": run_payload["badgeState"],
        "version": version,
        "run": run_payload,
        "jobs": jobs,
        "activeCount": active_count,
    }


def release_runs_payload(
    repo_root: Path,
    *,
    git_runner: Any | None = None,
    gh_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    """Status of the GitHub Actions Release workflow runs (tag-triggered).

    Mirrors :func:`ci_status_payload` but targets the Release workflow file
    directly. GitLab is not covered in this surface yet and stays hidden.
    """
    git_which = which or shutil.which
    provider = repository_provider_payload(repo_root, runner=git_runner, which=git_which)
    if provider.get("provider") != "github":
        return {"state": "hidden", "visible": False, "message": "Release run tracking requires a GitHub remote.", "provider": provider.get("provider", "")}
    github_url = provider.get("webUrl", "")
    workflow_file = _github_release_workflow_file(repo_root)
    if not workflow_file:
        return {"state": "hidden", "visible": False, "message": "No release workflow detected.", "provider": "github", "repositoryUrl": github_url}
    if not git_which("gh"):
        return {
            "state": "unavailable",
            "visible": True,
            "message": "GitHub CLI is not available on PATH.",
            "provider": "github",
            "repositoryUrl": github_url,
            "badgeState": "unavailable",
        }
    payload = _github_release_runs_payload(repo_root, github_url, workflow_file, gh_runner=gh_runner)
    payload.setdefault("provider", "github")
    return payload


def cdx_status_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX is not available on PATH.", "status": {}}

    try:
        status = _run_read_only_cdx(repo_root, ["status", "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX status timed out.", "status": {}}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX status: {exc}", "status": {}}

    if status.returncode != 0:
        message = (status.stderr or status.stdout or "CDX status failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "status": {}}

    try:
        parsed = json.loads(status.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX status returned invalid JSON.", "status": {}}
    if not isinstance(parsed, dict):
        return {"state": "invalid-json", "message": "CDX status JSON must be an object.", "status": {}}

    _enrich_cdx_resume_status(repo_root, parsed, runner=runner)
    _enrich_cdx_launch_settings(repo_root, parsed, runner=runner)
    return {"state": "ok", "message": "", "status": parsed}


def _enrich_cdx_launch_settings(repo_root: Path, status: dict[str, Any], *, runner: Any | None = None) -> None:
    """Attach the active launch settings (permission/power/fast/model) to rows.

    `cdx status --json` rows do not carry launch settings; they live under each
    session's launch config. Fetch them all in a single `cdx configs --json`
    call and map them onto the rows by session name so the viewer permission
    selector and the session config modal reflect the active values.
    """
    rows = status.get("rows")
    if not isinstance(rows, list):
        rows = status.get("sessions")
    if not isinstance(rows, list):
        return
    try:
        result = _run_read_only_cdx(repo_root, ["configs", "--json"], runner=runner)
    except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
        return
    if result.returncode != 0:
        return
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return
    sessions = parsed.get("sessions") if isinstance(parsed, dict) else None
    if not isinstance(sessions, list):
        return
    launch_by_name: dict[str, dict[str, Any]] = {}
    for entry in sessions:
        if not isinstance(entry, dict):
            continue
        name = str(entry.get("name") or "").strip()
        launch = entry.get("launch")
        if name and isinstance(launch, dict):
            launch_by_name[name] = launch
    if not launch_by_name:
        return
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = str(row.get("session_name") or row.get("name") or row.get("id") or "").strip()
        launch = launch_by_name.get(name)
        if not launch:
            continue
        permission = str(launch.get("permission") or "").strip()
        if permission:
            row["permission"] = permission
        power = str(launch.get("power") or "").strip()
        if power:
            row["power"] = power
        model = str(launch.get("model") or "").strip()
        if model:
            row["model"] = model
        if "fast" in launch:
            row["fast"] = bool(launch.get("fast"))


def _enrich_cdx_resume_status(repo_root: Path, status: dict[str, Any], *, runner: Any | None = None) -> None:
    rows = status.get("rows")
    if not isinstance(rows, list):
        rows = status.get("sessions")
    if not isinstance(rows, list):
        return
    for row in rows:
        if not isinstance(row, dict):
            continue
        session = str(row.get("session_name") or row.get("name") or row.get("id") or "").strip()
        if not session:
            continue
        try:
            result = _run_read_only_cdx(repo_root, ["can-resume", session, "--json"], runner=runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            row["resume_available"] = False
            continue
        if result.returncode != 0:
            row["resume_available"] = False
            continue
        try:
            parsed = json.loads(result.stdout or "{}")
        except json.JSONDecodeError:
            row["resume_available"] = False
            continue
        if isinstance(parsed, dict):
            row["resume_available"] = bool(parsed.get("resumable"))
            if parsed.get("reason"):
                row["resume_reason"] = str(parsed["reason"])
            if parsed.get("strategy"):
                row["resume_strategy"] = str(parsed["strategy"])


def cdx_runs_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "runs": []}
    try:
        result = _run_read_only_cdx(repo_root, ["runs", "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX runs timed out.", "runs": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX runs: {exc}", "runs": []}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX runs failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "runs": []}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX runs returned invalid JSON.", "runs": []}
    runs = parsed.get("runs") if isinstance(parsed, dict) else None
    if not isinstance(runs, list):
        return {"state": "invalid-json", "message": "CDX runs JSON must include a runs array.", "runs": []}
    normalized_runs: list[dict[str, Any]] = []
    for run in runs:
        if not isinstance(run, dict):
            continue
        item = dict(run)
        denials = _extract_cdx_permission_denials(item)
        if denials:
            item["permissionDenials"] = denials
            if str(item.get("status") or item.get("state") or "").strip().lower() == "succeeded":
                item["raw_status"] = item.get("status") or item.get("state")
                item["status"] = "blocked"
                item["status_detail"] = "Run reported permission denials; review the report before treating it as successful."
        status = str(item.get("status") or item.get("state") or "").strip().lower()
        if status == "stale" and not item.get("ended_at") and not item.get("endedAt"):
            item["status"] = "running"
            item["status_detail"] = "CDX still marks this run active; no end timestamp has been reported yet."
            item["raw_status"] = "stale"
        usage = _extract_cdx_usage(item)
        if usage.get("available"):
            item["usage"] = usage
        normalized_runs.append(item)
    return {"state": "ok", "message": "", "runs": normalized_runs}


def cdx_history_payload(repo_root: Path, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "history": []}
    try:
        result = _run_read_only_cdx(repo_root, ["history", "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX history timed out.", "history": []}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX history: {exc}", "history": []}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX history failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "history": []}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX history returned invalid JSON.", "history": []}
    history = parsed.get("history") if isinstance(parsed, dict) else None
    if not isinstance(history, list):
        return {"state": "invalid-json", "message": "CDX history JSON must include a history array.", "history": []}
    normalized_history: list[dict[str, Any]] = []
    for entry in history:
        if not isinstance(entry, dict):
            continue
        item = dict(entry)
        usage = _extract_cdx_usage(item)
        if usage.get("available"):
            item["usage"] = usage
        normalized_history.append(item)
    return {
        "state": "ok",
        "message": str(parsed.get("message") or "") if isinstance(parsed, dict) else "",
        "history": normalized_history,
        "period": parsed.get("period") if isinstance(parsed, dict) and isinstance(parsed.get("period"), dict) else {},
    }


def cdx_run_report_payload(repo_root: Path, run_id: str, *, runner: Any | None = None, which: Any | None = None) -> dict[str, Any]:
    cdx_which = which or shutil.which
    if not run_id:
        return {"state": "error", "message": "Missing CDX run id.", "report": None}
    if not cdx_which("cdx"):
        return {"state": "unavailable", "message": "CDX executable is not available on PATH.", "report": None}
    try:
        result = _run_read_only_cdx(repo_root, ["run-report", run_id, "--json"], runner=runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "message": "CDX run report timed out.", "report": None}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "message": f"Unable to run CDX run-report: {exc}", "report": None}
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "CDX run-report failed.").strip().splitlines()[0]
        return {"state": "error", "message": message, "report": None}
    try:
        parsed = json.loads(result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "message": "CDX run-report returned invalid JSON.", "report": None}
    report = parsed.get("report") if isinstance(parsed, dict) else None
    if not isinstance(report, dict):
        return {"state": "invalid-json", "message": "CDX run-report JSON must include a report object.", "report": None}
    merged_report = _merge_cdx_mission_output(report)
    if merged_report:
        report = merged_report
    usage = _extract_cdx_usage(report)
    if usage.get("available"):
        report["usage"] = usage
    denials = _extract_cdx_permission_denials(report)
    if denials:
        report["permissionDenials"] = denials
        report["missionBlocked"] = True
        report["status_detail"] = "Run reported permission denials; generated output may be incomplete or unapplied."
        run = report.get("run") if isinstance(report.get("run"), dict) else None
        if run is not None and str(run.get("status") or "").strip().lower() == "succeeded":
            run["raw_status"] = run.get("status")
            run["status"] = "blocked"
    return {"state": "ok", "message": "", "report": report}


def cdx_mission_catalog_payload() -> dict[str, Any]:
    return {
        "missions": list(CDX_MISSION_CATALOG.values()),
        "strengths": list(CDX_MISSION_STRENGTHS.values()),
        "defaultMissionId": CDX_DEFAULT_MISSION_ID,
        "defaultStrengthId": "standard",
    }


def _cdx_status_sessions(status_payload: dict[str, Any]) -> list[str]:
    status = status_payload.get("status") if isinstance(status_payload.get("status"), dict) else {}
    sessions = status.get("sessions") if isinstance(status.get("sessions"), list) else []
    ids: list[str] = []
    for session in sessions:
        if not isinstance(session, dict):
            continue
        session_id = str(session.get("id") or session.get("name") or "").strip()
        if session_id:
            ids.append(session_id)
    return ids
