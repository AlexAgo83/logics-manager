def _ci_badge_state(status: str, conclusion: str) -> str:
    normalized_status = status.strip().lower()
    normalized_conclusion = conclusion.strip().lower()
    if normalized_status in {"queued", "in_progress", "waiting", "requested", "pending"}:
        return "running" if normalized_status == "in_progress" else "queued"
    if normalized_conclusion == "success":
        return "passing"
    if normalized_conclusion in {"failure", "timed_out", "action_required"}:
        return "failing"
    if normalized_conclusion == "cancelled":
        return "cancelled"
    return "unknown"


def _gitlab_ci_badge_state(status: str) -> str:
    normalized = status.strip().lower()
    if normalized == "success":
        return "passing"
    if normalized == "failed":
        return "failing"
    if normalized in {"canceled", "cancelled"}:
        return "cancelled"
    if normalized in {"running"}:
        return "running"
    if normalized in {"created", "waiting_for_resource", "preparing", "pending", "scheduled", "manual"}:
        return "queued"
    return "unknown"


def _is_active_ci_status(run: dict[str, Any]) -> bool:
    return str(run.get("status") or "").strip().lower() in {"queued", "in_progress", "waiting", "requested", "pending"}


def _select_github_actions_run(runs: list[dict[str, Any]], head_sha: str) -> tuple[dict[str, Any], str]:
    ci_runs = [run for run in runs if str(run.get("name") or "").strip().lower() == "ci"]
    candidate_runs = ci_runs or runs
    head_runs = [run for run in candidate_runs if head_sha and str(run.get("head_sha") or "") == head_sha]
    active_head_run = next((run for run in head_runs if _is_active_ci_status(run)), None)
    if active_head_run is not None:
        return active_head_run, "head-active"
    if head_runs:
        head_state = _ci_badge_state(str(head_runs[0].get("status") or ""), str(head_runs[0].get("conclusion") or ""))
        if head_state in {"failing", "cancelled", "unknown"}:
            return head_runs[0], f"head-{head_state}"
        return head_runs[0], "head"
    active_branch_run = next((run for run in candidate_runs if _is_active_ci_status(run)), None)
    if active_branch_run is not None:
        return active_branch_run, "branch-active"
    return candidate_runs[0], "branch-latest"


def _parse_github_actions_run(run: dict[str, Any], *, match_source: str) -> dict[str, Any]:
    status = str(run.get("status") or "")
    conclusion = str(run.get("conclusion") or "")
    commit = run.get("head_commit") if isinstance(run.get("head_commit"), dict) else {}
    author = commit.get("author") if isinstance(commit.get("author"), dict) else {}
    commit_lines = str(commit.get("message") or run.get("display_title") or "").splitlines()
    return {
        "id": run.get("id"),
        "name": str(run.get("name") or run.get("display_title") or "GitHub Actions"),
        "workflowName": str(run.get("name") or "GitHub Actions"),
        "status": status,
        "conclusion": conclusion,
        "badgeState": _ci_badge_state(status, conclusion),
        "branch": str(run.get("head_branch") or ""),
        "headSha": str(run.get("head_sha") or ""),
        "event": str(run.get("event") or ""),
        "htmlUrl": str(run.get("html_url") or ""),
        "createdAt": str(run.get("created_at") or ""),
        "updatedAt": str(run.get("updated_at") or ""),
        "runStartedAt": str(run.get("run_started_at") or ""),
        "commitMessage": commit_lines[0][:240] if commit_lines else "",
        "author": str(author.get("name") or ""),
        "matchSource": match_source,
    }


def _parse_github_actions_jobs(output: str) -> list[dict[str, str]]:
    try:
        parsed = json.loads(output or "{}")
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict):
        return []
    jobs = parsed.get("jobs")
    if not isinstance(jobs, list):
        return []
    rows: list[dict[str, str]] = []
    for job in jobs[:30]:
        if not isinstance(job, dict):
            continue
        rows.append(
            {
                "name": str(job.get("name") or "Job"),
                "status": str(job.get("status") or ""),
                "conclusion": str(job.get("conclusion") or ""),
                "htmlUrl": str(job.get("html_url") or ""),
                "startedAt": str(job.get("started_at") or ""),
                "completedAt": str(job.get("completed_at") or ""),
            }
        )
    return rows


def _select_gitlab_pipeline(pipelines: list[dict[str, Any]], head_sha: str) -> tuple[dict[str, Any], str]:
    head_pipelines = [pipeline for pipeline in pipelines if head_sha and str(pipeline.get("sha") or "") == head_sha]
    active_head = next((pipeline for pipeline in head_pipelines if _gitlab_ci_badge_state(str(pipeline.get("status") or "")) in {"running", "queued"}), None)
    if active_head is not None:
        return active_head, "head-active"
    if head_pipelines:
        head_state = _gitlab_ci_badge_state(str(head_pipelines[0].get("status") or ""))
        if head_state in {"failing", "cancelled", "unknown"}:
            return head_pipelines[0], f"head-{head_state}"
        return head_pipelines[0], "head"
    active_branch = next((pipeline for pipeline in pipelines if _gitlab_ci_badge_state(str(pipeline.get("status") or "")) in {"running", "queued"}), None)
    if active_branch is not None:
        return active_branch, "branch-active"
    return pipelines[0], "branch-latest"


def _parse_gitlab_pipeline_run(pipeline: dict[str, Any], *, match_source: str, context: dict[str, str]) -> dict[str, Any]:
    status = str(pipeline.get("status") or "")
    user = pipeline.get("user") if isinstance(pipeline.get("user"), dict) else {}
    return {
        "id": pipeline.get("id"),
        "name": str(pipeline.get("name") or "GitLab pipeline"),
        "workflowName": str(pipeline.get("name") or "GitLab pipeline"),
        "status": status,
        "conclusion": "",
        "badgeState": _gitlab_ci_badge_state(status),
        "branch": str(pipeline.get("ref") or context.get("branch", "")),
        "headSha": str(pipeline.get("sha") or ""),
        "event": str(pipeline.get("source") or ""),
        "htmlUrl": str(pipeline.get("web_url") or ""),
        "createdAt": str(pipeline.get("created_at") or ""),
        "updatedAt": str(pipeline.get("updated_at") or ""),
        "runStartedAt": str(pipeline.get("created_at") or ""),
        "commitMessage": context.get("subject", ""),
        "author": str(user.get("name") or context.get("author", "")),
        "matchSource": match_source,
    }


def _parse_gitlab_jobs(output: str) -> list[dict[str, str]]:
    try:
        parsed = json.loads(output or "[]")
    except json.JSONDecodeError:
        return []
    jobs = parsed if isinstance(parsed, list) else []
    rows: list[dict[str, str]] = []
    for job in jobs[:30]:
        if not isinstance(job, dict):
            continue
        rows.append(
            {
                "name": str(job.get("name") or "Job"),
                "status": str(job.get("status") or ""),
                "conclusion": "",
                "htmlUrl": str(job.get("web_url") or ""),
                "startedAt": str(job.get("started_at") or ""),
                "completedAt": str(job.get("finished_at") or ""),
            }
        )
    return rows


def _github_ci_status_payload(repo_root: Path, github_url: str, *, git_runner: Any | None = None, gh_runner: Any | None = None) -> dict[str, Any]:
    owner_repo = _github_owner_repo_from_web_url(github_url)
    if not owner_repo:
        return {"state": "hidden", "visible": False, "message": "GitHub remote could not be parsed."}

    owner, repo = owner_repo
    context = _current_git_ci_context(repo_root, runner=git_runner)
    branch = context.get("branch", "")
    head_sha = context.get("headSha", "")
    endpoint = f"repos/{owner}/{repo}/actions/runs?per_page=30"
    if branch:
        endpoint = f"{endpoint}&branch={quote(branch, safe='')}"
    try:
        runs_result = _run_read_only_gh(repo_root, ["api", endpoint], runner=gh_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "GitHub Actions status timed out.", "repositoryUrl": github_url, **context, "badgeState": "unavailable"}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect GitHub Actions status: {exc}", "repositoryUrl": github_url, **context, "badgeState": "unavailable"}
    if runs_result.returncode != 0:
        message = (runs_result.stderr or runs_result.stdout or "GitHub Actions status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": github_url, **context, "badgeState": "unavailable"}

    try:
        parsed = json.loads(runs_result.stdout or "{}")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "GitHub Actions status returned invalid JSON.", "repositoryUrl": github_url, **context, "badgeState": "unavailable"}
    workflow_runs = parsed.get("workflow_runs") if isinstance(parsed, dict) else None
    runs = [run for run in workflow_runs if isinstance(run, dict)] if isinstance(workflow_runs, list) else []
    if not runs:
        return {"state": "ok", "visible": True, "message": "No GitHub Actions runs found for the current branch.", "repositoryUrl": github_url, **context, "badgeState": "unknown", "run": None, "jobs": []}

    selected, match_source = _select_github_actions_run(runs, head_sha)
    run_payload = _parse_github_actions_run(selected, match_source=match_source)
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
        **context,
        "badgeState": run_payload["badgeState"],
        "run": run_payload,
        "jobs": jobs,
    }


def _gitlab_ci_status_payload(repo_root: Path, gitlab_url: str, *, git_runner: Any | None = None, glab_runner: Any | None = None) -> dict[str, Any]:
    project_path = _gitlab_project_path_from_web_url(gitlab_url)
    if not project_path:
        return {"state": "hidden", "visible": False, "message": "GitLab remote could not be parsed."}
    context = _current_git_ci_context(repo_root, runner=git_runner)
    branch = context.get("branch", "")
    project_id = quote(project_path, safe="")
    endpoint = f"projects/{project_id}/pipelines?per_page=30"
    if branch:
        endpoint = f"{endpoint}&ref={quote(branch, safe='')}"
    try:
        pipelines_result = _run_read_only_glab(repo_root, ["api", endpoint], runner=glab_runner)
    except subprocess.TimeoutExpired:
        return {"state": "timeout", "visible": True, "message": "GitLab CI status timed out.", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable"}
    except (OSError, subprocess.SubprocessError) as exc:
        return {"state": "error", "visible": True, "message": f"Unable to collect GitLab CI status: {exc}", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable"}
    if pipelines_result.returncode != 0:
        message = (pipelines_result.stderr or pipelines_result.stdout or "GitLab CI status failed.").strip().splitlines()[0]
        return {"state": "unavailable", "visible": True, "message": message, "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable"}

    try:
        parsed = json.loads(pipelines_result.stdout or "[]")
    except json.JSONDecodeError:
        return {"state": "invalid-json", "visible": True, "message": "GitLab CI status returned invalid JSON.", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unavailable"}
    pipelines = [pipeline for pipeline in parsed if isinstance(pipeline, dict)] if isinstance(parsed, list) else []
    if not pipelines:
        return {"state": "ok", "visible": True, "message": "No GitLab pipelines found for the current branch.", "repositoryUrl": gitlab_url, "provider": "gitlab", **context, "badgeState": "unknown", "run": None, "jobs": []}

    selected, match_source = _select_gitlab_pipeline(pipelines, context.get("headSha", ""))
    run_payload = _parse_gitlab_pipeline_run(selected, match_source=match_source, context=context)
    jobs: list[dict[str, str]] = []
    pipeline_id = run_payload.get("id")
    if pipeline_id:
        try:
            jobs_result = _run_read_only_glab(repo_root, ["api", f"projects/{project_id}/pipelines/{pipeline_id}/jobs?per_page=100"], runner=glab_runner)
        except (OSError, subprocess.SubprocessError, subprocess.TimeoutExpired):
            jobs_result = None
        if jobs_result is not None and jobs_result.returncode == 0:
            jobs = _parse_gitlab_jobs(jobs_result.stdout)

    return {
        "state": "ok",
        "visible": True,
        "message": "",
        "repositoryUrl": gitlab_url,
        "provider": "gitlab",
        **context,
        "badgeState": run_payload["badgeState"],
        "run": run_payload,
        "jobs": jobs,
    }


def ci_status_payload(
    repo_root: Path,
    *,
    git_runner: Any | None = None,
    gh_runner: Any | None = None,
    glab_runner: Any | None = None,
    which: Any | None = None,
) -> dict[str, Any]:
    git_which = which or shutil.which
    provider = repository_provider_payload(repo_root, runner=git_runner, which=git_which)
    if provider.get("provider") == "github":
        github_url = provider.get("webUrl", "")
        if not _has_github_actions_workflows(repo_root):
            return {"state": "hidden", "visible": False, "message": "No GitHub Actions workflows detected.", "provider": "github", "repositoryUrl": github_url}
        if not git_which("gh"):
            return {
                "state": "unavailable",
                "visible": True,
                "message": "GitHub CLI is not available on PATH.",
                "provider": "github",
                "repositoryUrl": github_url,
                "badgeState": "unavailable",
            }
        payload = _github_ci_status_payload(repo_root, github_url, git_runner=git_runner, gh_runner=gh_runner)
        payload.setdefault("provider", "github")
        return payload
    if provider.get("provider") == "gitlab":
        gitlab_url = provider.get("webUrl", "")
        if not _has_gitlab_ci_config(repo_root):
            return {"state": "hidden", "visible": False, "message": "No GitLab CI config detected.", "provider": "gitlab", "repositoryUrl": gitlab_url}
        if not git_which("glab"):
            return {
                "state": "unavailable",
                "visible": True,
                "message": "GitLab CLI is not available on PATH.",
                "provider": "gitlab",
                "repositoryUrl": gitlab_url,
                "badgeState": "unavailable",
            }
        return _gitlab_ci_status_payload(repo_root, gitlab_url, git_runner=git_runner, glab_runner=glab_runner)
    return {"state": "hidden", "visible": False, "message": "No GitHub or GitLab remote detected.", "provider": ""}
